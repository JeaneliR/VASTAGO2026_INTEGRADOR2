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
    def inventario_actual(self):
        return self._run("""
            SELECT count(*) AS total,
                   count(*) FILTER (WHERE v.estado = 'ok') AS optimos,
                   coalesce(sum(i.stock_actual * i.costo_unitario), 0) AS valor,
                   count(*) FILTER (
                       WHERE i.stock_actual > 0 AND i.costo_unitario = 0
                   ) AS sin_costo,
                   count(*) FILTER (
                       WHERE i.stock_actual > 0 AND i.costo_unitario > 0
                   ) AS valorados
            FROM v_inventario v JOIN insumos i ON i.id = v.id
        """, one=True)

    def cumplimiento(self, desde, hasta):
        return self._run("""
            WITH inicios AS (
                SELECT orden_id, min(inicio) AS inicio
                FROM orden_etapas
                WHERE inicio IS NOT NULL
                GROUP BY orden_id
            )
            SELECT count(*) AS iniciadas,
                   count(*) FILTER (
                       WHERE o.estado = 'Completada' AND o.fecha_fin >= i.inicio
                         AND (o.fecha_fin AT TIME ZONE 'America/Lima')::date < %s
                   ) AS completadas
            FROM inicios i JOIN ordenes_produccion o ON o.id = i.orden_id
            WHERE (i.inicio AT TIME ZONE 'America/Lima')::date >= %s
              AND (i.inicio AT TIME ZONE 'America/Lima')::date < %s
        """, (hasta, desde, hasta), one=True)

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
        hist = self._run("SELECT s.nombre, to_char(d.mes,'YYYY-MM') AS mes, d.kg::float AS kg, d.imputado FROM demanda_historica d "
                         "JOIN series_demanda s ON s.id = d.serie_id ORDER BY s.nombre, d.mes")
        fut = self._run("SELECT s.nombre, to_char(f.mes,'YYYY-MM') AS mes, f.kg::float AS kg, f.mape::float AS mape, f.wape::float AS wape, f.modelo "
                        "FROM pronosticos f JOIN series_demanda s ON s.id = f.serie_id ORDER BY s.nombre, f.mes")
        out = {"meses_hist": [], "meses_sin_registro": [], "series": {}}
        for r in hist:
            s = out["series"].setdefault(r["nombre"], {"historico": [], "meses_forecast": [], "forecast": [], "mape": None, "wape": None, "modelo": None})
            s["historico"].append(r["kg"])
            if r["mes"] not in out["meses_hist"]:
                out["meses_hist"].append(r["mes"])
            if r["imputado"] and r["mes"] not in out["meses_sin_registro"]:
                out["meses_sin_registro"].append(r["mes"])
        for r in fut:
            s = out["series"][r["nombre"]]
            s["meses_forecast"].append(r["mes"]); s["forecast"].append(r["kg"])
            s["mape"], s["wape"], s["modelo"] = r["mape"], r["wape"], r["modelo"]
        return out

    def mape_promedio(self):
        r = self._run("SELECT COALESCE(avg(m),0)::float AS v FROM (SELECT DISTINCT serie_id, mape AS m FROM pronosticos) t", one=True)
        return r["v"]

    def wape_promedio(self):
        r = self._run("SELECT COALESCE(avg(w),0)::float AS v FROM (SELECT DISTINCT serie_id, wape AS w FROM pronosticos) t", one=True)
        return r["v"]


class HistoricoRepository(BaseRepository):
    """Control de producción real de grageado (tandas de los archivos de planta, operarios anonimizados)."""
    tabla = "produccion_historica"

    def mensual(self):
        return self._run("SELECT to_char(mes,'YYYY-MM') AS mes, count(*)::int AS tandas, round(sum(bruto_kg),1)::float AS kg, "
                         "round(sum(bruto_kg) FILTER (WHERE centro='Maní'),1)::float AS kg_mani, "
                         "round(sum(bruto_kg) FILTER (WHERE centro='Pasas'),1)::float AS kg_pasas, "
                         "round(sum(bruto_kg) FILTER (WHERE centro NOT IN ('Maní','Pasas')),1)::float AS kg_otros, "
                         "round(sum(reproceso_kg),2)::float AS reproceso_kg, "
                         "round(sum(bruto_kg) FILTER (WHERE reproceso_kg IS NOT NULL),1)::float AS kg_con_reproceso "
                         "FROM produccion_historica GROUP BY mes ORDER BY mes")

    def por_centro(self):
        return self._run("SELECT centro, count(*)::int AS tandas, round(sum(bruto_kg),1)::float AS kg, "
                         "round(avg(bruto_kg),1)::float AS kg_por_tanda, "
                         "round((sum(centro_kg) FILTER (WHERE centro_kg IS NOT NULL) / NULLIF(sum(bruto_kg) FILTER (WHERE centro_kg IS NOT NULL),0) * 100)::numeric,1)::float AS pct_centro "
                         "FROM produccion_historica GROUP BY centro ORDER BY sum(bruto_kg) DESC")

    def reproceso_reciente(self):
        """Reproceso (kg y %) de los dos últimos meses que registran reproceso."""
        return self._run("SELECT to_char(mes,'YYYY-MM') AS mes, round(sum(reproceso_kg),2)::float AS reproceso_kg, "
                         "round((sum(reproceso_kg) / sum(bruto_kg) * 100)::numeric,2)::float AS pct, count(*)::int AS tandas "
                         "FROM produccion_historica WHERE reproceso_kg IS NOT NULL GROUP BY mes ORDER BY mes DESC LIMIT 2")


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
