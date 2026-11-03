import re
from flask import Blueprint, current_app, g, jsonify, request
from app.security import login_required
from app.extensions import limiter
from app.repositories.correo import CorreoRepository
from app.repositories.analitica import AuditoriaRepository
from app.services import correo_service as service

bp=Blueprint('correo',__name__,url_prefix='/api/correo')


@bp.get('')
@login_required('correo:ver')
def estado():
    return jsonify(configuracion=service.configuracion(),proveedor_configurado=bool(current_app.config['RESEND_API_KEY']),
                   historial=CorreoRepository().historial())


@bp.put('/configuracion')
@login_required('correo:configurar')
def configurar():
    d=request.get_json(silent=True)
    if not isinstance(d,dict) or set(d)!={'destinatario','habilitado','alertas_inmediatas','hora'}:
        return jsonify(error='Configuración incompleta'),400
    email=d['destinatario'].strip().lower() if isinstance(d['destinatario'],str) else ''
    if len(email)>120 or not re.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+',email):
        return jsonify(error='Ingresa un correo destinatario válido'),400
    if type(d['hora']) is not int or not 0<=d['hora']<=23 or type(d['habilitado']) is not bool or type(d['alertas_inmediatas']) is not bool:
        return jsonify(error='Horario o estado inválido'),400
    if (d['habilitado'] or d['alertas_inmediatas']) and not current_app.config['RESEND_API_KEY']:
        return jsonify(error='Primero configura RESEND_API_KEY en Render'),400
    out=CorreoRepository().configurar(email,d['habilitado'],d['alertas_inmediatas'],d['hora'])
    AuditoriaRepository().registrar('CORREO_CONFIGURADO',g.usuario['id'],entidad='correo_config',ip=request.remote_addr)
    return jsonify(out)


@bp.post('/enviar')
@login_required('correo:ver')
@limiter.limit('3 per minute')
def enviar():
    try:
        result=service.encolar_resumen()
    except ValueError as exc:
        return jsonify(error=str(exc)),400
    if not result:
        return jsonify(mensaje='No hay insumos críticos; no se envió ningún correo',encolado=False)
    AuditoriaRepository().registrar('CORREO_SOLICITADO',g.usuario['id'],entidad='correo_envios',detalle=result,ip=request.remote_addr)
    return jsonify(**result,encolado=True,mensaje='Resumen en cola de envío'),202


@bp.post('/<int:id_>/reintentar')
@login_required('correo:configurar')
@limiter.limit('3 per minute')
def reintentar(id_):
    if not current_app.config['RESEND_API_KEY']:
        return jsonify(error='Configura primero la clave de Resend'),400
    result=CorreoRepository().reintentar(id_)
    if not result:
        return jsonify(error='Solo se pueden reintentar fallos de las últimas 23 horas'),409
    return jsonify(ok=True),202
