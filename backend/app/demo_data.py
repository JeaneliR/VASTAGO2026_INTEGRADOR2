"""Amplía una sola vez los datos de demostración, sin crear ni cambiar usuarios."""
from datetime import datetime, timedelta, timezone
import psycopg2
from psycopg2.extras import RealDictCursor
from app import create_app
from app.config import Config
from app.services import planta_service as svc
from app.repositories.planta import EtapaRepository

VERSION='demo_apf3_v1'
LIMA=timezone(timedelta(hours=-5))


def cargar(cur):
    cur.execute("SELECT pg_advisory_xact_lock(730202605)")
    cur.execute("SELECT 1 FROM app_migraciones WHERE version=%s",(VERSION,))
    if cur.fetchone():
        return False
    cur.execute("SELECT u.id,u.email,r.nombre AS rol FROM usuarios u JOIN roles r ON r.id=u.rol_id WHERE u.activo ORDER BY u.id")
    users=cur.fetchall()
    def actor(roles):
        return next((u for u in users if u['rol'] in roles),None)
    jefe=actor(('Jefe de Producción','Administrador'))
    almacen=actor(('Almacenero','Administrador'))
    operario=actor(('Operario','Jefe de Producción','Administrador'))
    if not all((jefe,almacen,operario)):
        raise RuntimeError('Faltan usuarios autorizados para cargar la demostración')
    today=datetime.now(LIMA).date()
    extras=[('Nibs de cacao','Materia prima','kg',160,200,24),('Avellana tostada','Centro','kg',50,40,42),
            ('Pistacho natural','Centro','kg',12,20,65),('Coco deshidratado','Centro','kg',75,60,19),
            ('Extracto de vainilla','Insumo auxiliar','kg',0,10,70),('Estuche regalo 150g','Empaque','unid.',1200,1000,1.2),
            ('Caja bombón x12','Empaque','unid.',180,250,2.1),('Cacao en polvo','Materia prima','kg',35,30,23)]
    for name,category,unit,stock,minimum,cost in extras:
        cur.execute("INSERT INTO insumos(nombre,categoria,unidad,stock_actual,stock_minimo,costo_unitario) "
                    "VALUES(%s,%s,%s,0,%s,%s) ON CONFLICT(nombre) DO NOTHING RETURNING id",(name,category,unit,minimum,cost))
        row=cur.fetchone()
        if row and stock:
            svc.ingresar_insumo(cur,row['id'],stock,'DEMO-INICIAL-'+str(row['id']),'Proveedor de demostración',
                               (today+timedelta(days=360)).isoformat() if unit=='kg' else None,'Existencia inicial de demostración',almacen)
    templates=[('Tableta 85% Cacao 100g','DE-T85','Tableta 70% Cacao 100g',15.5,1.1),
               ('Tableta 60% Cacao 100g','DE-T60','Tableta 70% Cacao 100g',11.9,.95),
               ('Tableta con nibs 100g','DE-NIB','Tableta 70% Cacao 100g',14.9,1),
               ('Bombones Caja x12','DE-B12','Bombones Caja x6',49.9,2),
               ('Gragea de chocolate 250g','DE-G25','Gragea de chocolate 200g',19.9,1.25),
               ('Mini tableta 70% 50g','DE-M50','Tableta 70% Cacao 100g',7.5,.5)]
    for name,code,template,price,factor in templates:
        cur.execute("INSERT INTO productos(codigo,nombre,tipo,precio,stock_minimo_pt,dias_vida_util,lleva_centro,centro_por_unidad,centro_etapa) "
                    "SELECT %s,%s,tipo,%s,60,dias_vida_util,lleva_centro,centro_por_unidad*%s,centro_etapa FROM productos WHERE nombre=%s "
                    "ON CONFLICT(nombre) DO NOTHING RETURNING id",(code,name,price,factor,template))
        created=cur.fetchone()
        if not created:
            continue
        pid=created['id']
        cur.execute("INSERT INTO ruta_etapas(producto_id,secuencia,nombre,descripcion,horas_estandar,tipo_equipo) "
                    "SELECT %s,secuencia,nombre,descripcion,horas_estandar,tipo_equipo FROM ruta_etapas "
                    "WHERE producto_id=(SELECT id FROM productos WHERE nombre=%s)",(pid,template))
        cur.execute("INSERT INTO bom(producto_id,insumo_id,cantidad_por_unidad,etapa_secuencia) "
                    "SELECT %s,b.insumo_id,round(b.cantidad_por_unidad*CASE WHEN i.unidad='kg' THEN %s ELSE 1 END,4),b.etapa_secuencia "
                    "FROM bom b JOIN insumos i ON i.id=b.insumo_id WHERE b.producto_id=(SELECT id FROM productos WHERE nombre=%s)",(pid,factor,template))
        if name=='Tableta con nibs 100g':
            cur.execute("INSERT INTO bom VALUES(%s,(SELECT id FROM insumos WHERE nombre='Nibs de cacao'),0.005,1)",(pid,))
    equipo_tipos=[('DE-R','Refinadora'),('DE-M','Moldeo'),('DE-E','Envasadora'),('DE-G','Bombo de grageado'),('DE-A','Bombo de abrillantado')]
    for code,kind in equipo_tipos:
        cur.execute("INSERT INTO equipos(codigo,nombre,tipo) VALUES(%s,%s,%s) ON CONFLICT(codigo) DO NOTHING",(code,kind+' de demostración',kind))
    cur.execute("SELECT id,tipo FROM equipos WHERE codigo LIKE 'DE-%%'")
    equipos={r['tipo']:r['id'] for r in cur.fetchall()}
    cur.execute("SELECT id,nombre,lleva_centro FROM productos ORDER BY id");products=cur.fetchall()
    cur.execute("SELECT id FROM insumos WHERE categoria='Centro' ORDER BY id");centros=[r['id'] for r in cur.fetchall()]
    for index in range(46):
        product=products[index%len(products)]
        day=today-timedelta(days=(36-index)*2-1) if index<36 else today+timedelta(days=index-35)
        qty=30+(index%7)*10
        order=svc.crear_orden(cur,product['id'],qty,centros[index%len(centros)] if product['lleva_centro'] else None,
                             jefe,hoy=day,lote=f'DEMO-{today.year}-{index+1:03d}')
        if index>=36:
            continue
        stages=EtapaRepository(cur).detalle(order['id'])
        plan=EtapaRepository(cur).insumos_planificados(order['id'])
        start=datetime.combine(day,datetime.min.time(),tzinfo=LIMA)+timedelta(hours=4)
        for stage in stages:
            seq=stage['secuencia'];end=start+timedelta(hours=float(stage['horasEstandar']))
            svc.iniciar_etapa(cur,order['id'],seq,operario,operario['id'],equipos[stage['tipoEquipo']],ahora=start)
            consumed_kg=0
            for item in [p for p in plan if p['secuencia']==seq]:
                lot_code='DEMO-PROD-'+str(item['insumo_id'])
                svc.ingresar_insumo(cur,item['insumo_id'],float(item['planificado']),lot_code,'Proveedor de demostración',
                                   (today+timedelta(days=365)).isoformat(),'Reposición para orden de demostración',almacen)
                cur.execute("UPDATE movimientos_inventario SET fecha=%s WHERE id=(SELECT max(id) FROM movimientos_inventario)",(start-timedelta(hours=1),))
                cur.execute("SELECT id FROM lotes_insumo WHERE insumo_id=%s AND codigo=%s",(item['insumo_id'],lot_code));lot_id=cur.fetchone()['id']
                svc.registrar_consumo(cur,order['id'],seq,lot_id,float(item['planificado']),operario,ahora=start+timedelta(minutes=10))
                cur.execute("UPDATE movimientos_inventario SET fecha=%s WHERE id=(SELECT max(id) FROM movimientos_inventario)",(start+timedelta(minutes=10),))
                cur.execute("SELECT unidad FROM insumos WHERE id=%s",(item['insumo_id'],))
                if cur.fetchone()['unidad']=='kg':consumed_kg+=float(item['planificado'])
            merma=round(consumed_kg*(.012+.003*(index%5)),3)
            final=seq==stages[-1]['secuencia']
            svc.finalizar_etapa(cur,order['id'],seq,operario,merma,'Producción de demostración',qty-(index%3) if final else None,ahora=end)
            start=end+timedelta(minutes=10)
        if index%3!=0:
            cur.execute("SELECT id,cantidad_disponible FROM lotes_pt WHERE orden_id=%s",(order['id'],));lot=cur.fetchone()
            svc.despachar_pt(cur,lot['id'],max(1,int(lot['cantidad_disponible'])//2),
                             ['Tienda Miraflores','Tienda Barranco','Distribuidor Lima','Feria de cacao'][index%4],
                             'Despacho de demostración',almacen,ahora=start+timedelta(hours=1))
    cur.execute("INSERT INTO app_migraciones(version) VALUES(%s)",(VERSION,))
    return True


def main():
    if not Config.SEED_EXTRA_DEMO:
        return
    app=create_app({'EMAIL_SCHEDULER_ENABLED':False,'RESEND_API_KEY':''})
    with app.app_context():
        with psycopg2.connect(Config.DATABASE_URL,cursor_factory=RealDictCursor) as conn:
            with conn.cursor() as cur:
                result=cargar(cur)
    print('Datos de demostración ampliados.' if result else 'Los datos ampliados ya existen; no se repiten.')


if __name__=='__main__':
    main()
