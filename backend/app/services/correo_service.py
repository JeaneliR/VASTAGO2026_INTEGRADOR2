"""Cola de correo persistente, idempotencia y resumen diario en horario de Lima."""
from datetime import datetime, timedelta, timezone
from html import escape
import threading
import uuid
import requests
from flask import current_app
from app.db import transaction
from app.repositories.correo import CorreoRepository
from app.repositories.analitica import AlertaRepository, AuditoriaRepository

LIMA=timezone(timedelta(hours=-5))


def configuracion(repo=None):
    config=(repo or CorreoRepository()).configuracion()
    if not config['destinatario']:
        config['destinatario']=current_app.config['EMAIL_TO']
    return config


def contenido(rows):
    body=''.join(f"<tr><td>{escape(r['nombre'])}</td><td>{r['stock']:g} {escape(r['unidad'])}</td><td>{r['minimo']:g} {escape(r['unidad'])}</td></tr>" for r in rows)
    return ('<h2>Vástago y Co · Alerta de inventario</h2><p>Insumos por debajo del stock mínimo:</p>'
            '<table border="1" cellpadding="8" cellspacing="0"><tr><th>Insumo</th><th>Stock actual</th><th>Mínimo</th></tr>'+body+
            '</table><p>Consulta el sistema para revisar la reposición. Generado: '+datetime.now(LIMA).strftime('%d/%m/%Y %H:%M')+'</p>')


def encolar_resumen(origen='manual',ahora=None):
    cfg=configuracion()
    if not current_app.config['RESEND_API_KEY'] or not cfg['destinatario']:
        raise ValueError('Configura la clave de Resend en Render y el correo destinatario antes de enviar')
    now=ahora or datetime.now(LIMA)
    with transaction() as cur:
        rows=AlertaRepository(cur).criticos()
        if not rows:
            return None
        key=f"diario:{now.date()}:{cfg['destinatario']}" if origen=='diario' else 'manual:'+uuid.uuid4().hex
        return CorreoRepository(cur).encolar(key,cfg['destinatario'],'Vástago y Co: resumen de insumos críticos',contenido(rows),origen)


def alerta_stock(cur,insumo_id,stock_anterior):
    if not current_app.config.get('RESEND_API_KEY'):
        return
    repo=CorreoRepository(cur);cfg=configuracion(repo)
    if not cfg['alertas_inmediatas'] or not cfg['destinatario']:
        return
    item=repo.stock(insumo_id)
    if item and float(stock_anterior)>=item['minimo'] and item['stock']<item['minimo']:
        repo.encolar('stock:'+uuid.uuid4().hex,cfg['destinatario'],'Vástago y Co: '+item['nombre'][:80]+' bajo el mínimo',contenido([item]),'stock')


def enviar_proveedor(job):
    key=current_app.config['RESEND_API_KEY']
    if not key:
        raise ValueError('Falta configurar RESEND_API_KEY en el servidor')
    # URL fija HTTPS. No se aceptan destinos de API proporcionados por usuarios.
    response=requests.post('https://api.resend.com/emails',headers={
        'Authorization':'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':'vastago-'+job['clave']},
        json={'from':current_app.config['EMAIL_FROM'],'to':[job['destinatario']],
              'subject':job['asunto'],'html':job['contenido']},timeout=(3,10),allow_redirects=False)
    if response.status_code not in (200,201):
        messages={401:'La clave de Resend no es válida',403:'Resend no autoriza el remitente o destinatario; en pruebas utiliza el correo de tu cuenta',
                  429:'Se alcanzó el límite de envíos del proveedor',422:'El proveedor rechazó los datos del correo'}
        raise ValueError(messages.get(response.status_code,f'El proveedor respondió HTTP {response.status_code}'))
    identifier=response.json().get('id')
    if not isinstance(identifier,str) or not identifier or len(identifier)>100:
        raise ValueError('El proveedor devolvió una confirmación inválida')
    return identifier


def procesar_uno():
    with transaction() as cur:
        job=CorreoRepository(cur).reclamar()
    if not job:
        return False
    try:
        identifier=enviar_proveedor(job)
        CorreoRepository().finalizar(job['id'],'Aceptado',identifier)
        AuditoriaRepository().registrar('CORREO_ACEPTADO',entidad='correo_envios',detalle={'id':job['id'],'origen':job['origen']})
    except (requests.RequestException,ValueError) as exc:
        message=str(exc) if isinstance(exc,ValueError) else 'No se pudo confirmar el envío. Puedes reintentarlo sin duplicar la solicitud.'
        CorreoRepository().finalizar(job['id'],'Fallido',error=message[:250])
        AuditoriaRepository().registrar('CORREO_FALLIDO',entidad='correo_envios',detalle={'id':job['id']},exito=False)
    return True


def ciclo_diario(ahora=None):
    if not current_app.config['RESEND_API_KEY']:
        return
    cfg=configuracion()
    now=ahora or datetime.now(LIMA)
    if cfg['habilitado'] and cfg['destinatario'] and now.hour>=cfg['hora']:
        encolar_resumen('diario',now)
    for _ in range(5):
        if not procesar_uno():
            break


def iniciar_worker(app):
    if app.testing or not app.config['EMAIL_SCHEDULER_ENABLED']:
        return
    def loop():
        while True:
            threading.Event().wait(20)
            try:
                with app.app_context():
                    ciclo_diario()
            except Exception:
                app.logger.exception('No se pudo procesar la cola de correo')
    threading.Thread(target=loop,name='vastago-correo',daemon=True).start()
