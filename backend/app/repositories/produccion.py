from .base import BaseRepository


class ProductoRepository(BaseRepository):
    tabla = "productos"

    def listar(self):
        return self._run("SELECT id, codigo, nombre, tipo, unidad, precio::float AS precio, stock_minimo_pt AS minimo, "
                         "lleva_centro AS \"llevaCentro\", centro_por_unidad::float AS \"centroPorUnidad\", "
                         "centro_etapa AS \"centroEtapa\" FROM productos ORDER BY tipo DESC, nombre")

    def bom(self, producto_id):
        return self._run("SELECT i.id AS insumo_id, i.nombre AS insumo, b.cantidad_por_unidad::float AS \"cantidadPorUnidad\", "
                         "i.unidad, b.etapa_secuencia AS etapa FROM bom b JOIN insumos i ON i.id = b.insumo_id "
                         "WHERE b.producto_id = %s ORDER BY b.etapa_secuencia, i.nombre", (producto_id,))

    def ruta(self, producto_id):
        return self._run("SELECT secuencia, nombre, descripcion, horas_estandar::float AS horas, tipo_equipo AS equipo "
                         "FROM ruta_etapas WHERE producto_id = %s ORDER BY secuencia", (producto_id,))

    def bloquear(self, producto_id):
        return self._run("SELECT * FROM productos WHERE id = %s", (producto_id,), one=True)


class EquipoRepository(BaseRepository):
    tabla = "equipos"

    def listar(self):
        return self._run("SELECT e.id, e.codigo, e.nombre, e.tipo, "
                         "EXISTS (SELECT 1 FROM orden_etapas x WHERE x.equipo_id = e.id AND x.estado = 'En curso') AS \"enUso\" "
                         "FROM equipos e WHERE e.activo ORDER BY e.tipo, e.codigo")


class OrdenRepository(BaseRepository):
    tabla = "ordenes_produccion"

    def listar(self):
        return self._run(
            "SELECT o.id, o.lote, p.nombre AS producto, c.nombre AS centro, o.cantidad, o.fecha_inicio, o.estado, "
            "(SELECT count(*) FROM orden_etapas e WHERE e.orden_id = o.id AND e.estado = 'Completada')::int AS \"etapasHechas\", "
            "(SELECT count(*) FROM orden_etapas e WHERE e.orden_id = o.id)::int AS \"etapasTotal\" "
            "FROM ordenes_produccion o JOIN productos p ON p.id = o.producto_id "
            "LEFT JOIN insumos c ON c.id = o.centro_insumo_id ORDER BY o.fecha_inicio DESC, o.id DESC")

    def bloquear(self, oid):
        return self._run("SELECT o.*, p.nombre AS producto, p.centro_etapa, p.dias_vida_util, p.unidad "
                         "FROM ordenes_produccion o JOIN productos p ON p.id = o.producto_id WHERE o.id = %s FOR UPDATE OF o",
                         (oid,), one=True)

    def obtener(self, oid):
        return self._run("SELECT o.*, p.nombre AS producto, c.nombre AS centro FROM ordenes_produccion o "
                         "JOIN productos p ON p.id = o.producto_id LEFT JOIN insumos c ON c.id = o.centro_insumo_id "
                         "WHERE o.id = %s", (oid,), one=True)

    def siguiente_lote(self):
        r = self._run("SELECT COALESCE(max(substring(lote from '[0-9]+$')::int), 0) + 1 AS n "
                      "FROM ordenes_produccion", one=True)
        return f"L-2026-{r['n']:03d}"

    def crear(self, lote, producto_id, cantidad, fecha_inicio, usuario_id, centro_insumo_id=None):
        return self._run("INSERT INTO ordenes_produccion (lote, producto_id, cantidad, fecha_inicio, creado_por, centro_insumo_id) "
                         "VALUES (%s,%s,%s,%s,%s,%s) RETURNING id, lote, estado",
                         (lote, producto_id, cantidad, fecha_inicio, usuario_id, centro_insumo_id), one=True)

    def contar_activas(self):
        return self._run("SELECT count(*) FILTER (WHERE estado='En proceso') AS en_proceso, "
                         "count(*) FILTER (WHERE estado='Planificada') AS planificadas FROM ordenes_produccion", one=True)
