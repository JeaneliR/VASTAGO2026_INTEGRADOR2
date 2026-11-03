from .base import BaseRepository


class ReporteRepository(BaseRepository):
    def inventario(self, q="", estado="", categoria=""):
        return self._run("SELECT i.nombre AS insumo,i.categoria,i.unidad,i.stock_actual::float AS stock, "
                         "i.stock_minimo::float AS minimo,v.estado FROM insumos i JOIN v_inventario v ON v.id=i.id "
                         "WHERE (%s='' OR i.nombre ILIKE %s) AND (%s='' OR v.estado=%s) AND (%s='' OR i.categoria=%s) "
                         "ORDER BY i.nombre LIMIT 5001", (q,"%"+q+"%",estado,estado,categoria,categoria))

    def produccion(self, q="", estado="", desde=None, hasta=None):
        return self._run("SELECT o.lote,p.nombre AS producto,o.cantidad,o.cantidad_producida AS producidas, "
                         "o.fecha_inicio AS fecha,o.estado,u.nombre AS responsable, "
                         "coalesce((SELECT sum(e.merma_kg) FROM orden_etapas e WHERE e.orden_id=o.id),0)::float AS merma_kg "
                         "FROM ordenes_produccion o JOIN productos p ON p.id=o.producto_id JOIN usuarios u ON u.id=o.creado_por "
                         "WHERE (%s='' OR o.lote ILIKE %s OR p.nombre ILIKE %s) AND (%s='' OR o.estado=%s) "
                         "AND (%s::date IS NULL OR o.fecha_inicio >= %s::date) AND (%s::date IS NULL OR o.fecha_inicio <= %s::date) "
                         "ORDER BY o.fecha_inicio DESC,o.id DESC LIMIT 5001", (q,"%"+q+"%","%"+q+"%",estado,estado,desde,desde,hasta,hasta))
