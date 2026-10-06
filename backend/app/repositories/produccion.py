from .base import BaseRepository


class ProductoRepository(BaseRepository):
    tabla = "productos"

    def listar(self):
        return self._run("SELECT id, nombre, precio::float AS precio FROM productos ORDER BY nombre")

    def bom(self, producto_id):
        return self._run("SELECT i.id AS insumo_id, i.nombre AS insumo, b.cantidad_por_unidad::float AS \"cantidadPorUnidad\", "
                         "i.unidad FROM bom b JOIN insumos i ON i.id = b.insumo_id WHERE b.producto_id = %s "
                         "ORDER BY i.nombre", (producto_id,))


class OrdenRepository(BaseRepository):
    tabla = "ordenes_produccion"

    def listar(self):
        return self._run("SELECT o.id, o.lote, p.nombre AS producto, o.cantidad, o.fecha_inicio, o.estado "
                         "FROM ordenes_produccion o JOIN productos p ON p.id = o.producto_id "
                         "ORDER BY o.fecha_inicio DESC, o.id DESC")

    def siguiente_lote(self):
        r = self._run("SELECT COALESCE(max(substring(lote from '[0-9]+$')::int), 0) + 1 AS n "
                      "FROM ordenes_produccion", one=True)
        return f"L-2026-{r['n']:03d}"

    def crear(self, lote, producto_id, cantidad, fecha_inicio, usuario_id):
        return self._run("INSERT INTO ordenes_produccion (lote, producto_id, cantidad, fecha_inicio, creado_por) "
                         "VALUES (%s,%s,%s,%s,%s) RETURNING id, lote, estado", (lote, producto_id, cantidad, fecha_inicio, usuario_id), one=True)

    def cambiar_estado(self, id_, estado):
        return self._run("UPDATE ordenes_produccion SET estado = %s WHERE id = %s RETURNING id, lote, estado, producto_id, cantidad",
                         (estado, id_), one=True)

    def contar_activas(self):
        return self._run("SELECT count(*) FILTER (WHERE estado='En proceso') AS en_proceso, "
                         "count(*) FILTER (WHERE estado='Planificada') AS planificadas FROM ordenes_produccion", one=True)
