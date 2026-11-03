from .base import BaseRepository


class AlertaRepository(BaseRepository):
    tabla = "alertas"

    def listar(self):
        return self._run("SELECT i.id,v.estado AS nivel,i.nombre || CASE WHEN v.estado='crit' THEN ' bajo el mínimo' "
                         "ELSE ' cerca del mínimo' END AS titulo, "
                         "concat(i.stock_actual,' ',i.unidad,' disponibles; mínimo ',i.stock_minimo,' ',i.unidad) AS detalle, "
                         "i.actualizado_en AS creada_en FROM v_inventario v JOIN insumos i ON i.id=v.id "
                         "WHERE v.estado IN ('crit','warn') ORDER BY CASE WHEN v.estado='crit' THEN 0 ELSE 1 END,i.nombre")

    def criticos(self):
        return self._run("SELECT id,nombre,stock_actual::float AS stock,stock_minimo::float AS minimo,unidad "
                         "FROM insumos WHERE stock_actual<stock_minimo ORDER BY nombre")


class DashboardRepository(BaseRepository):
    def metricas(self, desde, hasta):
        return self._run("SELECT "
            "(SELECT count(*) FROM insumos WHERE stock_actual<stock_minimo) AS criticos, "
            "(SELECT count(*) FROM insumos WHERE stock_actual>=stock_minimo AND stock_actual<stock_minimo*1.2) AS bajos, "
            "(SELECT count(*) FROM ordenes_produccion WHERE estado IN ('Planificada','En proceso')) AS activas, "
            "(SELECT coalesce(sum(cantidad_producida),0) FROM ordenes_produccion WHERE estado='Completada' "
            " AND (fecha_fin AT TIME ZONE 'America/Lima')::date >= %s AND (fecha_fin AT TIME ZONE 'America/Lima')::date < %s) AS producidas, "
            "(SELECT coalesce(sum(merma_kg),0)::float FROM orden_etapas WHERE estado='Completada' "
            " AND (fin AT TIME ZONE 'America/Lima')::date >= %s AND (fin AT TIME ZONE 'America/Lima')::date < %s) AS merma, "
            "(SELECT coalesce(sum(c.cantidad),0)::float FROM etapa_consumos c JOIN orden_etapas e ON e.id=c.orden_etapa_id "
            " JOIN lotes_insumo l ON l.id=c.lote_insumo_id JOIN insumos i ON i.id=l.insumo_id WHERE i.unidad='kg' AND e.estado='Completada' "
            " AND (e.fin AT TIME ZONE 'America/Lima')::date >= %s AND (e.fin AT TIME ZONE 'America/Lima')::date < %s) AS consumido, "
            "(SELECT count(*) FROM movimientos_inventario WHERE tipo='INGRESO' AND (fecha AT TIME ZONE 'America/Lima')::date >= %s "
            " AND (fecha AT TIME ZONE 'America/Lima')::date < %s) AS ingresos, "
            "(SELECT count(*) FROM movimientos_inventario WHERE tipo='SALIDA' AND (fecha AT TIME ZONE 'America/Lima')::date >= %s "
            " AND (fecha AT TIME ZONE 'America/Lima')::date < %s) AS salidas", (desde,hasta)*5, one=True)

    def estados(self):
        return self._run("SELECT estado,count(*)::int AS total FROM ordenes_produccion GROUP BY estado ORDER BY estado")

    def serie(self, desde, hasta):
        return self._run("SELECT to_char(m,'YYYY-MM') AS mes,coalesce(sum(o.cantidad_producida),0)::int AS unidades "
                         "FROM generate_series(%s::date-interval '5 months',%s::date,interval '1 month') m "
                         "LEFT JOIN ordenes_produccion o ON o.estado='Completada' AND "
                         "date_trunc('month',o.fecha_fin AT TIME ZONE 'America/Lima')=m GROUP BY m ORDER BY m", (desde,desde))


class PronosticoRepository(BaseRepository):
    tabla = "pronosticos"

    def serie(self):
        hist = self._run("SELECT p.nombre, to_char(d.mes,'YYYY-MM') AS mes, d.kg::float AS kg FROM demanda_historica d "
                         "JOIN productos p ON p.id = d.producto_id ORDER BY p.nombre, d.mes")
        fut = self._run("SELECT p.nombre, to_char(f.mes,'YYYY-MM') AS mes, f.kg::float AS kg, f.mape::float AS mape "
                        "FROM pronosticos f JOIN productos p ON p.id = f.producto_id ORDER BY p.nombre, f.mes")
        out = {"meses_hist": [], "series": {}}
        for r in hist:
            s = out["series"].setdefault(r["nombre"], {"historico": [], "meses_forecast": [], "forecast": [], "mape": None})
            s["historico"].append(r["kg"])
            if r["mes"] not in out["meses_hist"]:
                out["meses_hist"].append(r["mes"])
        for r in fut:
            s = out["series"][r["nombre"]]
            s["meses_forecast"].append(r["mes"]); s["forecast"].append(r["kg"]); s["mape"] = r["mape"]
        return out

    def mape_promedio(self):
        r = self._run("SELECT COALESCE(avg(m),0)::float AS v FROM (SELECT DISTINCT producto_id, mape AS m FROM pronosticos) t", one=True)
        return r["v"]


class AuditoriaRepository(BaseRepository):
    tabla = "auditoria"

    def registrar(self, accion, usuario_id=None, email=None, entidad=None, detalle=None, ip=None, exito=True):
        import json
        self._run("INSERT INTO auditoria (usuario_id, email, accion, entidad, detalle, ip, exito) "
                  "VALUES (%s,%s,%s,%s,%s::jsonb,%s,%s)",
                  (usuario_id, email, accion, entidad, json.dumps(detalle or {}, default=str), ip, exito))

    def ultimos(self, limite=100):
        return self._run("SELECT id, fecha, email, accion, entidad, detalle, ip, exito FROM auditoria "
                         "ORDER BY id DESC LIMIT %s", (limite,))
