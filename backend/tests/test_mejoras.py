"""Regresión de gestión de cuentas, indicadores reales, reportes y correo."""
from io import BytesIO
from uuid import uuid4
from datetime import datetime, timezone, timedelta
from unittest.mock import Mock
import pytest
from openpyxl import load_workbook
from app.db import transaction
from conftest import login, PWD


@pytest.fixture
def user(client,tokens):
    email='prueba-'+uuid4().hex[:10]+'@vastagoyco.pe'
    response=client.post('/api/auth/usuarios',headers=tokens['admin'],json={
        'nombre':'Usuario de prueba','email':email,'rol':'Gerente','password':PWD,'telefono':'999123456'})
    assert response.status_code==201
    return {**response.get_json(),'rol':'Gerente','telefono':'999123456'}


def test_edicion_cifra_telefono_y_revoca_acceso(client,tokens,user):
    old=login(client,user['email']).get_json()['access_token']
    d={'nombre':'Nombre actualizado','email':user['email'],'rol':'Almacenero','telefono':'+51 987654321'}
    assert client.put(f"/api/auth/usuarios/{user['id']}",headers=tokens['admin'],json=d).status_code==200
    assert client.get('/api/kpis',headers={'Authorization':'Bearer '+old}).status_code==401
    row=next(u for u in client.get('/api/auth/usuarios',headers=tokens['admin']).get_json() if u['id']==user['id'])
    assert row['telefono']==d['telefono'] and row['nombre']==d['nombre'] and row['rol']==d['rol']
    with transaction() as cur:
        cur.execute('SELECT telefono_cifrado FROM usuarios WHERE id=%s',(user['id'],))
        assert d['telefono'].encode() not in bytes(cur.fetchone()['telefono_cifrado'])


def test_edicion_rechaza_duplicado_y_sin_permiso(client,tokens,user):
    d={'nombre':user['nombre'],'email':'ADMIN@vastagoyco.pe','rol':'Gerente','telefono':''}
    assert client.put(f"/api/auth/usuarios/{user['id']}",headers=tokens['admin'],json=d).status_code==409
    assert client.put(f"/api/auth/usuarios/{user['id']}",headers=tokens['gerente'],json=d).status_code==403
    assert client.patch(f"/api/auth/usuarios/{user['id']}",headers=tokens['admin'],json={'activo':'false'}).status_code==400


def test_administrador_no_puede_cambiar_su_rol(client,tokens):
    with transaction() as cur:
        cur.execute("SELECT id,nombre,email FROM usuarios WHERE email='admin@vastagoyco.pe'");user=cur.fetchone()
    d={**user,'rol':'Gerente','telefono':''};d.pop('id')
    assert client.put(f"/api/auth/usuarios/{user['id']}",headers=tokens['admin'],json=d).status_code==400


def test_cambio_password_exige_actual_y_cierra_sesiones(client,user):
    old=login(client,user['email']).get_json()['access_token'];headers={'Authorization':'Bearer '+old}
    nueva='OtraClaveSegura#2026'
    assert client.post('/api/auth/password',headers=headers,json={'actual':'incorrecta','nueva':nueva}).status_code==400
    assert client.post('/api/auth/password',headers=headers,json={'actual':PWD,'nueva':'corta'}).status_code==400
    assert client.post('/api/auth/password',headers=headers,json={'actual':PWD,'nueva':nueva}).status_code==200
    assert client.get('/api/kpis',headers=headers).status_code==401
    assert login(client,user['email'],nueva).status_code==200
    assert login(client,user['email'],PWD).status_code==401


def test_restaurar_password_y_desactivar_revoca_tokens(client,tokens,user):
    old=login(client,user['email']).get_json()['access_token'];headers={'Authorization':'Bearer '+old}
    assert client.post(f"/api/auth/usuarios/{user['id']}/password",headers=tokens['admin'],json={'nueva':'NuevaClave#2026'}).status_code==200
    assert client.get('/api/kpis',headers=headers).status_code==401
    access=login(client,user['email'],'NuevaClave#2026').get_json()['access_token']
    assert client.patch(f"/api/auth/usuarios/{user['id']}",headers=tokens['admin'],json={'activo':False}).status_code==200
    assert client.get('/api/kpis',headers={'Authorization':'Bearer '+access}).status_code==401


def test_dashboard_calcula_merma_y_limita_indicadores_por_rol(client,tokens):
    response=client.get('/api/dashboard?mes=2026-09',headers=tokens['admin'])
    assert response.status_code==200
    data=response.get_json();cards={r['id']:r for r in data['indicadores']}
    assert len(data['serie'])==6 and cards['merma']['valor']!='Sin datos'
    assert cards['cumplimiento']['valor']=='66.67%'  # Dos cierres de tres inicios; las planificadas no cuentan.
    with transaction() as cur:
        cur.execute("SELECT sum(merma_kg)::float AS m FROM orden_etapas WHERE estado='Completada' AND (fin AT TIME ZONE 'America/Lima')::date BETWEEN '2026-09-01' AND '2026-09-30'")
        assert f"{cur.fetchone()['m']:g} kg" in cards['merma']['detalle']
        cur.execute("SELECT count(*) FILTER (WHERE estado='ok') AS optimos, count(*) AS total FROM v_inventario")
        inventario=cur.fetchone()
        assert cards['optimos']['valor']==f"{100 * inventario['optimos'] / inventario['total']:.2f}%"
        cur.execute("SELECT sum(stock_actual * costo_unitario) AS valor FROM insumos")
        assert cards['valor_inventario']['valor']==f"S/ {cur.fetchone()['valor']:,.2f}"
    otro_mes=client.get('/api/dashboard?mes=2000-01',headers=tokens['admin']).get_json()
    otros={r['id']:r for r in otro_mes['indicadores']}
    assert otros['cumplimiento']['valor']=='Sin datos'
    assert otros['valor_inventario']==cards['valor_inventario']
    almacen=client.get('/api/dashboard?mes=2026-09',headers=tokens['almacen']).get_json()
    assert {r['id'] for r in almacen['indicadores']}=={'criticos','bajos','optimos','valor_inventario','ingresos','salidas'} and almacen['serie']==[]
    assert client.get('/api/dashboard',headers=tokens['op1']).status_code==403
    assert client.get('/api/dashboard?mes=xxx',headers=tokens['admin']).status_code==400


def test_alertas_desaparecen_al_reponer_y_vuelven_al_consumir(client,tokens):
    inv=client.get('/api/inventario',headers=tokens['admin']).get_json();item=next(i for i in inv if i['estado']=='crit')
    qty=item['minimo']*1.3-item['stock']
    route=f"/api/inventario/{item['id']}/movimientos"
    assert item['id'] in {a['id'] for a in client.get('/api/alertas',headers=tokens['admin']).get_json()}
    assert client.post(route,headers=tokens['admin'],json={'tipo':'INGRESO','cantidad':qty}).status_code==200
    assert item['id'] not in {a['id'] for a in client.get('/api/alertas',headers=tokens['admin']).get_json()}
    assert client.post(route,headers=tokens['admin'],json={'tipo':'SALIDA','cantidad':qty}).status_code==200
    assert item['id'] in {a['id'] for a in client.get('/api/alertas',headers=tokens['admin']).get_json()}


def test_reportes_filtran_y_excel_conserva_datos(client,tokens):
    result=client.get('/api/reportes?tipo=inventario&estado=crit',headers=tokens['gerente'])
    assert result.status_code==200
    rows=result.get_json()['filas'];assert rows and all(r['estado']=='crit' for r in rows)
    xlsx=client.get('/api/reportes/exportar?tipo=inventario&estado=crit&formato=xlsx',headers=tokens['gerente'])
    assert xlsx.status_code==200
    sheet=load_workbook(BytesIO(xlsx.data)).active
    assert sheet.max_row==len(rows)+5 and sheet['A6'].value==rows[0]['insumo']
    assert sheet.freeze_panes=='A6'


def test_reportes_pdf_fechas_y_autorizacion(client,tokens):
    r=client.get('/api/reportes/exportar?tipo=produccion&estado=Completada&formato=pdf',headers=tokens['jefe'])
    assert r.status_code==200 and r.data.startswith(b'%PDF-') and 'attachment' in r.headers['Content-Disposition']
    assert client.get('/api/reportes?tipo=produccion&desde=2026-12-01&hasta=2026-01-01',headers=tokens['gerente']).status_code==400
    assert client.get('/api/reportes?tipo=produccion&estado=Planificada',headers=tokens['op1']).status_code==403


def test_excel_no_ejecuta_formulas(client,tokens,monkeypatch):
    from app.repositories.reportes import ReporteRepository
    monkeypatch.setattr(ReporteRepository,'inventario',lambda *a:[{'insumo':'=1+1','categoria':'Centro','unidad':'kg','stock':1,'minimo':2,'estado':'crit'}])
    r=client.get('/api/reportes/exportar?formato=xlsx',headers=tokens['admin'])
    cell=load_workbook(BytesIO(r.data)).active['A6']
    assert cell.data_type!='f' and cell.value=="'=1+1"


@pytest.fixture
def mail(app,monkeypatch):
    monkeypatch.setitem(app.config,'RESEND_API_KEY','clave-de-prueba-no-real')
    with transaction() as cur:
        cur.execute("UPDATE correo_config SET destinatario='demo@example.com',habilitado=true,alertas_inmediatas=true,hora=0")
        cur.execute('DELETE FROM correo_envios')
    with app.app_context():
        yield
    with transaction() as cur:
        cur.execute("UPDATE correo_config SET destinatario='',habilitado=false,alertas_inmediatas=false,hora=8")
        cur.execute('DELETE FROM correo_envios')


def test_correo_requiere_configuracion_y_permisos(client,tokens):
    assert client.get('/api/correo',headers=tokens['almacen']).status_code==403
    assert client.get('/api/correo',headers=tokens['admin']).get_json()['proveedor_configurado'] is False
    assert client.post('/api/correo/enviar',headers=tokens['admin']).status_code==400


def test_correo_cola_envio_real_del_adaptador_sin_secretos(client,tokens,mail,monkeypatch):
    from app.services import correo_service as service
    response=Mock(status_code=200);response.json.return_value={'id':'proveedor-123'}
    send=Mock(return_value=response);monkeypatch.setattr(service.requests,'post',send)
    assert client.post('/api/correo/enviar',headers=tokens['gerente']).status_code==202
    assert service.procesar_uno()
    row=client.get('/api/correo',headers=tokens['admin']).get_json()['historial'][0]
    assert row['estado']=='Aceptado' and row['proveedor_id']=='proveedor-123'
    assert send.call_args.args[0]=='https://api.resend.com/emails'
    assert 'Idempotency-Key' in send.call_args.kwargs['headers']
    assert 'Stock actual' in send.call_args.kwargs['json']['html']


def test_correo_error_no_se_presenta_como_exito(client,tokens,mail,monkeypatch):
    from app.services import correo_service as service
    monkeypatch.setattr(service.requests,'post',Mock(return_value=Mock(status_code=403)))
    client.post('/api/correo/enviar',headers=tokens['admin']);assert service.procesar_uno()
    row=client.get('/api/correo',headers=tokens['admin']).get_json()['historial'][0]
    assert row['estado']=='Fallido' and row['proveedor_id'] is None
    assert client.post(f"/api/correo/{row['id']}/reintentar",headers=tokens['admin']).status_code==202


def test_resumen_diario_no_se_duplica(mail,monkeypatch):
    from app.services import correo_service as service
    response=Mock(status_code=200);response.json.return_value={'id':'diario-1'}
    send=Mock(return_value=response);monkeypatch.setattr(service.requests,'post',send)
    now=datetime.now(timezone(timedelta(hours=-5)))
    service.ciclo_diario(now);service.ciclo_diario(now)
    assert send.call_count==1


def test_alerta_stock_se_encola_solo_al_cruzar_minimo(client,tokens,mail):
    item=next(i for i in client.get('/api/inventario',headers=tokens['admin']).get_json() if i['estado']=='crit')
    qty=item['minimo']-item['stock']+20;route=f"/api/inventario/{item['id']}/movimientos"
    assert client.post(route,headers=tokens['admin'],json={'tipo':'INGRESO','cantidad':qty}).status_code==200
    assert client.post(route,headers=tokens['admin'],json={'tipo':'SALIDA','cantidad':qty}).status_code==200
    with transaction() as cur:
        cur.execute("SELECT count(*) AS n FROM correo_envios WHERE origen='stock'");assert cur.fetchone()['n']==1
