"""Repositorios de planta: etapas de orden, consumos por lote, producto terminado y trazabilidad."""
from .base import BaseRepository


class EtapaRepository(BaseRepository):
    tabla = "orden_etapas"

    def copiar_ruta(self, orden_id, producto_id):
        """Instancia la ruta del producto como etapas de la orden (todas 'Pendiente')."""
        return self._run("INSERT INTO orden_etapas (orden_id, secuencia, nombre, horas_estandar, tipo_equipo) "
                         "SELECT %s, secuencia, nombre, horas_estandar, tipo_equipo FROM ruta_etapas "
                         "WHERE producto_id = %s ORDER BY secuencia RETURNING id", (orden_id, producto_id))

    def bloquear(self, orden_id, secuencia):
        return self._run("SELECT * FROM orden_etapas WHERE orden_id = %s AND secuencia = %s FOR UPDATE",
                         (orden_id, secuencia), one=True)

    def maxima_secuencia(self, orden_id):
        return self._run("SELECT max(secuencia) AS m FROM orden_etapas WHERE orden_id = %s", (orden_id,), one=True)["m"]

    def estado_de(self, orden_id, secuencia):
        r = self._run("SELECT estado FROM orden_etapas WHERE orden_id = %s AND secuencia = %s", (orden_id, secuencia), one=True)
        return r["estado"] if r else None

    def iniciar(self, etapa_id, responsable_id, equipo_id, ahora):
        return self._run("UPDATE orden_etapas SET estado = 'En curso', responsable_id = %s, equipo_id = %s, "
                         "inicio = COALESCE(%s, now()) WHERE id = %s RETURNING id", (responsable_id, equipo_id, ahora, etapa_id), one=True)

    def finalizar(self, etapa_id, merma, observaciones, ahora):
        return self._run("UPDATE orden_etapas SET estado = 'Completada', merma_kg = %s, observaciones = %s, "
                         "fin = GREATEST(COALESCE(%s, now()), inicio) WHERE id = %s RETURNING id", (merma, observaciones, ahora, etapa_id), one=True)

    def equipo_ocupado(self, equipo_id):
        return self._run("SELECT 1 AS x FROM orden_etapas WHERE equipo_id = %s AND estado = 'En curso' LIMIT 1", (equipo_id,), one=True) is not None

    def insumos_planificados(self, orden_id):
        """Insumos que debe consumir cada etapa (BOM por etapa + centro elegido), con la cantidad planificada."""
        return self._run(
            "SELECT e.secuencia, i.id AS insumo_id, i.nombre AS insumo, i.categoria, i.unidad, "
            "round(b.cantidad_por_unidad * o.cantidad, 3)::float AS planificado "
            "FROM ordenes_produccion o JOIN bom b ON b.producto_id = o.producto_id "
            "JOIN orden_etapas e ON e.orden_id = o.id AND e.secuencia = b.etapa_secuencia "
            "JOIN insumos i ON i.id = b.insumo_id WHERE o.id = %s "
            "UNION ALL "
            "SELECT p.centro_etapa, i.id, i.nombre, i.categoria, i.unidad, round(p.centro_por_unidad * o.cantidad, 3)::float "
            "FROM ordenes_produccion o JOIN productos p ON p.id = o.producto_id "
            "JOIN insumos i ON i.id = o.centro_insumo_id WHERE o.id = %s AND p.lleva_centro "
            "ORDER BY 1, 3", (orden_id, orden_id))

    def detalle(self, orden_id):
        return self._run(
            "SELECT e.id, e.secuencia, e.nombre, e.horas_estandar::float AS \"horasEstandar\", e.tipo_equipo AS \"tipoEquipo\", e.estado, "
            "e.responsable_id, u.nombre AS responsable, e.equipo_id, q.codigo AS equipo, e.inicio, e.fin, "
            "CASE WHEN e.fin IS NOT NULL THEN round((extract(epoch FROM (e.fin - e.inicio)) / 3600)::numeric, 1)::float END AS \"horasReales\", "
            "e.merma_kg::float AS merma, e.observaciones "
            "FROM orden_etapas e LEFT JOIN usuarios u ON u.id = e.responsable_id LEFT JOIN equipos q ON q.id = e.equipo_id "
            "WHERE e.orden_id = %s ORDER BY e.secuencia", (orden_id,))

    def usuarios_responsables(self):
        return self._run("SELECT u.id, u.nombre, r.nombre AS rol FROM usuarios u JOIN roles r ON r.id = u.rol_id "
                         "WHERE u.activo AND r.nombre IN ('Operario','Jefe de Producción','Administrador') ORDER BY r.id DESC, u.nombre")

    def responsable_valido(self, usuario_id):
        return self._run("SELECT u.id FROM usuarios u JOIN roles r ON r.id = u.rol_id "
                         "WHERE u.id = %s AND u.activo AND r.nombre IN ('Operario','Jefe de Producción','Administrador')",
                         (usuario_id,), one=True) is not None

    def equipo(self, equipo_id):
        return self._run("SELECT id, codigo, tipo, activo FROM equipos WHERE id = %s", (equipo_id,), one=True)


class ConsumoRepository(BaseRepository):
    tabla = "etapa_consumos"

    def registrar(self, etapa_id, lote_id, cantidad, movimiento_id, usuario_id, ahora=None):
        return self._run("INSERT INTO etapa_consumos (orden_etapa_id, lote_insumo_id, cantidad, movimiento_id, registrado_por, fecha) "
                         "VALUES (%s,%s,%s,%s,%s,COALESCE(%s, now())) RETURNING id", (etapa_id, lote_id, cantidad, movimiento_id, usuario_id, ahora), one=True)

    def de_orden(self, orden_id):
        return self._run(
            "SELECT c.id, e.secuencia, i.id AS insumo_id, i.nombre AS insumo, i.unidad, l.codigo AS lote, l.proveedor, "
            "to_char(l.fecha_vencimiento,'YYYY-MM-DD') AS vencimiento, c.cantidad::float AS cantidad, c.fecha, u.nombre AS registrado_por "
            "FROM etapa_consumos c JOIN orden_etapas e ON e.id = c.orden_etapa_id JOIN lotes_insumo l ON l.id = c.lote_insumo_id "
            "JOIN insumos i ON i.id = l.insumo_id JOIN usuarios u ON u.id = c.registrado_por "
            "WHERE e.orden_id = %s ORDER BY e.secuencia, c.id", (orden_id,))

    def total_por_insumo(self, etapa_id):
        return self._run("SELECT l.insumo_id, sum(c.cantidad)::float AS total FROM etapa_consumos c "
                         "JOIN lotes_insumo l ON l.id = c.lote_insumo_id WHERE c.orden_etapa_id = %s GROUP BY l.insumo_id", (etapa_id,))


class LotePTRepository(BaseRepository):
    tabla = "lotes_pt"

    def crear(self, codigo, producto_id, orden_id, centro_id, cantidad, vida_util_dias, fecha=None):
        return self._run("INSERT INTO lotes_pt (codigo, producto_id, orden_id, centro_insumo_id, cantidad_producida, fecha_produccion, fecha_vencimiento) "
                         "VALUES (%s,%s,%s,%s,%s, COALESCE(%s, CURRENT_DATE), COALESCE(%s, CURRENT_DATE) + %s) RETURNING id, codigo",
                         (codigo, producto_id, orden_id, centro_id, cantidad, fecha, fecha, vida_util_dias), one=True)

    def stock(self):
        return self._run("SELECT producto_id AS \"productoId\", codigo, producto, tipo, unidad, centro_id AS \"centroId\", centro, "
                         "stock, stock_total AS \"stockTotal\", minimo, estado, lotes_activos AS \"lotesActivos\" FROM v_stock_pt ORDER BY tipo DESC, producto, centro NULLS FIRST")

    def lotes(self):
        return self._run(
            "SELECT l.id, l.codigo, p.nombre AS producto, c.nombre AS centro, l.cantidad_producida AS producido, "
            "l.cantidad_disponible AS disponible, to_char(l.fecha_produccion,'YYYY-MM-DD') AS produccion, "
            "to_char(l.fecha_vencimiento,'YYYY-MM-DD') AS vencimiento "
            "FROM lotes_pt l JOIN productos p ON p.id = l.producto_id LEFT JOIN insumos c ON c.id = l.centro_insumo_id "
            "ORDER BY l.fecha_produccion DESC, l.id DESC")

    def bloquear(self, lote_id):
        return self._run("SELECT l.id, l.codigo, l.cantidad_disponible, p.nombre AS producto FROM lotes_pt l "
                         "JOIN productos p ON p.id = l.producto_id WHERE l.id = %s FOR UPDATE OF l", (lote_id,), one=True)


class MovimientoPTRepository(BaseRepository):
    tabla = "movimientos_pt"

    def registrar(self, lote_id, tipo, cantidad, destino, motivo, usuario_id, ahora=None):
        return self._run("INSERT INTO movimientos_pt (lote_pt_id, tipo, cantidad, destino, motivo, usuario_id, fecha) "
                         "VALUES (%s,%s,%s,%s,%s,%s,COALESCE(%s, now())) RETURNING id", (lote_id, tipo, cantidad, destino, motivo, usuario_id, ahora), one=True)

    def de_lote(self, lote_id):
        return self._run("SELECT m.id, m.tipo, m.cantidad, m.destino, m.motivo, m.fecha, u.nombre AS usuario "
                         "FROM movimientos_pt m JOIN usuarios u ON u.id = m.usuario_id WHERE m.lote_pt_id = %s "
                         "ORDER BY m.fecha, m.id", (lote_id,))


class TrazabilidadRepository(BaseRepository):
    """Consultas de genealogía: hacia atrás (de PT a lotes de insumo) y hacia adelante (de lote de insumo a PT y destinos)."""
    tabla = "lotes_pt"

    def buscar(self, q):
        patron = "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        pt = self._run("SELECT l.codigo, 'PT' AS tipo, p.nombre AS descripcion FROM lotes_pt l JOIN productos p ON p.id = l.producto_id "
                       "WHERE l.codigo ILIKE %s ORDER BY l.codigo LIMIT 15", (patron,))
        ins = self._run("SELECT l.codigo, 'INSUMO' AS tipo, i.nombre AS descripcion FROM lotes_insumo l JOIN insumos i ON i.id = l.insumo_id "
                        "WHERE l.codigo ILIKE %s ORDER BY l.codigo LIMIT 15", (patron,))
        return pt + ins

    def lote_pt(self, codigo):
        return self._run(
            "SELECT l.id, l.codigo, p.nombre AS producto, p.codigo AS sku, c.nombre AS centro, l.cantidad_producida AS producido, "
            "l.cantidad_disponible AS disponible, to_char(l.fecha_produccion,'YYYY-MM-DD') AS produccion, "
            "to_char(l.fecha_vencimiento,'YYYY-MM-DD') AS vencimiento, l.orden_id, o.cantidad AS \"cantidadOrden\" "
            "FROM lotes_pt l JOIN productos p ON p.id = l.producto_id JOIN ordenes_produccion o ON o.id = l.orden_id "
            "LEFT JOIN insumos c ON c.id = l.centro_insumo_id WHERE l.codigo = %s", (codigo,), one=True)

    def etapas_con_consumos(self, orden_id):
        etapas = self._run(
            "SELECT e.id, e.secuencia, e.nombre, e.horas_estandar::float AS \"horasEstandar\", u.nombre AS responsable, q.codigo AS equipo, "
            "e.inicio, e.fin, CASE WHEN e.fin IS NOT NULL THEN round((extract(epoch FROM (e.fin - e.inicio)) / 3600)::numeric, 1)::float END AS \"horasReales\", "
            "e.merma_kg::float AS merma, e.observaciones "
            "FROM orden_etapas e LEFT JOIN usuarios u ON u.id = e.responsable_id LEFT JOIN equipos q ON q.id = e.equipo_id "
            "WHERE e.orden_id = %s ORDER BY e.secuencia", (orden_id,))
        cons = self._run(
            "SELECT c.orden_etapa_id, i.nombre AS insumo, i.unidad, l.codigo AS lote, l.proveedor, "
            "to_char(l.fecha_vencimiento,'YYYY-MM-DD') AS vencimiento, c.cantidad::float AS cantidad "
            "FROM etapa_consumos c JOIN orden_etapas e ON e.id = c.orden_etapa_id JOIN lotes_insumo l ON l.id = c.lote_insumo_id "
            "JOIN insumos i ON i.id = l.insumo_id WHERE e.orden_id = %s ORDER BY c.id", (orden_id,))
        for e in etapas:
            e["consumos"] = [{k: v for k, v in c.items() if k != "orden_etapa_id"} for c in cons if c["orden_etapa_id"] == e["id"]]
        return etapas

    def despachos(self, lote_pt_id):
        return self._run("SELECT m.fecha, m.cantidad, m.destino, m.motivo FROM movimientos_pt m "
                         "WHERE m.lote_pt_id = %s AND m.tipo = 'SALIDA' ORDER BY m.fecha, m.id", (lote_pt_id,))

    def lotes_insumo(self, codigo):
        return self._run("SELECT l.id, l.codigo, i.nombre AS insumo, i.unidad, l.proveedor, to_char(l.fecha_ingreso,'YYYY-MM-DD') AS ingreso, "
                         "to_char(l.fecha_vencimiento,'YYYY-MM-DD') AS vencimiento, l.cantidad_disponible::float AS disponible "
                         "FROM lotes_insumo l JOIN insumos i ON i.id = l.insumo_id WHERE l.codigo = %s ORDER BY i.nombre", (codigo,))

    def usos_de_lote_insumo(self, lote_id):
        """Órdenes y etapas donde se consumió el lote de insumo, con los lotes de PT resultantes (adelante)."""
        return self._run(
            "SELECT o.id AS orden_id, o.lote AS orden, p.nombre AS producto, e.secuencia, e.nombre AS etapa, c.cantidad::float AS cantidad, c.fecha, "
            "lp.codigo AS lote_pt, lp.cantidad_producida AS producido, lp.cantidad_disponible AS disponible, lp.id AS lote_pt_id "
            "FROM etapa_consumos c JOIN orden_etapas e ON e.id = c.orden_etapa_id JOIN ordenes_produccion o ON o.id = e.orden_id "
            "JOIN productos p ON p.id = o.producto_id LEFT JOIN lotes_pt lp ON lp.orden_id = o.id "
            "WHERE c.lote_insumo_id = %s ORDER BY c.fecha, c.id", (lote_id,))
