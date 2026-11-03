from .base import BaseRepository


class CorreoRepository(BaseRepository):
    def configuracion(self):
        return self._run("SELECT destinatario,habilitado,alertas_inmediatas,hora FROM correo_config WHERE id=1",one=True)

    def configurar(self,destinatario,habilitado,inmediatas,hora):
        return self._run("UPDATE correo_config SET destinatario=%s,habilitado=%s,alertas_inmediatas=%s,hora=%s,actualizado_en=now() "
                         "WHERE id=1 RETURNING destinatario,habilitado,alertas_inmediatas,hora",(destinatario,habilitado,inmediatas,hora),one=True)

    def encolar(self,clave,destinatario,asunto,contenido,origen):
        return self._run("INSERT INTO correo_envios (clave,destinatario,asunto,contenido,origen) VALUES (%s,%s,%s,%s,%s) "
                         "ON CONFLICT (clave) DO NOTHING RETURNING id,estado",(clave,destinatario,asunto,contenido,origen),one=True)

    def historial(self):
        return self._run("SELECT id,destinatario,asunto,origen,estado,proveedor_id,error,intentos,creado_en,actualizado_en "
                         "FROM correo_envios ORDER BY id DESC LIMIT 100")

    def reclamar(self):
        self._run("UPDATE correo_envios SET estado='Fallido',error='El envío pendiente ha caducado',actualizado_en=now() "
                  "WHERE estado IN ('Pendiente','Procesando') AND creado_en<now()-interval '23 hours'")
        return self._run("UPDATE correo_envios SET estado='Procesando',intentos=intentos+1,actualizado_en=now() WHERE id=( "
                         "SELECT id FROM correo_envios WHERE (estado='Pendiente' OR (estado='Procesando' AND actualizado_en<now()-interval '5 minutes')) "
                         "AND intentos<3 ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *",one=True)

    def finalizar(self,id_,estado,proveedor_id=None,error=None):
        self._run("UPDATE correo_envios SET estado=%s,proveedor_id=%s,error=%s,actualizado_en=now() WHERE id=%s",
                  (estado,proveedor_id,error,id_))

    def reintentar(self,id_):
        return self._run("UPDATE correo_envios SET estado='Pendiente',intentos=0,error=NULL,actualizado_en=now() "
                         "WHERE id=%s AND estado='Fallido' AND creado_en>now()-interval '23 hours' RETURNING id",(id_,),one=True)

    def stock(self,insumo_id):
        return self._run("SELECT id,nombre,stock_actual::float AS stock,stock_minimo::float AS minimo,unidad FROM insumos WHERE id=%s",(insumo_id,),one=True)
