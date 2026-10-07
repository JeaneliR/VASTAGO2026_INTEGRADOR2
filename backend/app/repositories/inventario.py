from .base import BaseRepository


class InsumoRepository(BaseRepository):
    tabla = "insumos"

    def listar(self):
        return self._run("SELECT v.id, v.nombre AS insumo, i.categoria, v.unidad, v.stock_actual::float AS stock, "
                         "v.stock_minimo::float AS minimo, v.estado FROM v_inventario v JOIN insumos i ON i.id = v.id "
                         "ORDER BY i.categoria, v.nombre")

    def obtener(self, id_):
        return self._run("SELECT v.id, v.nombre AS insumo, i.categoria, v.unidad, v.stock_actual::float AS stock, "
                         "v.stock_minimo::float AS minimo, v.estado FROM v_inventario v JOIN insumos i ON i.id = v.id "
                         "WHERE v.id = %s", (id_,), one=True)

    def bloquear_para_actualizar(self, id_):
        return self._run("SELECT id, nombre, stock_actual FROM insumos WHERE id = %s FOR UPDATE", (id_,), one=True)

    def centros(self):
        return self._run("SELECT id, nombre, unidad, stock_actual::float AS stock FROM insumos WHERE categoria = 'Centro' ORDER BY nombre")

    def contar_quiebres(self):
        return self._run("SELECT count(*) AS n FROM insumos WHERE stock_actual < stock_minimo", one=True)["n"]


class MovimientoRepository(BaseRepository):
    tabla = "movimientos_inventario"

    def registrar(self, insumo_id, tipo, cantidad, motivo, usuario_id, orden_id=None, lote_insumo_id=None):
        # El trigger fn_aplicar_movimiento actualiza el stock del insumo y el saldo de su lote.
        return self._run(
            "INSERT INTO movimientos_inventario (insumo_id, tipo, cantidad, motivo, usuario_id, orden_id, lote_insumo_id) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id, fecha",
            (insumo_id, tipo, cantidad, motivo, usuario_id, orden_id, lote_insumo_id), one=True)

    def ultimos(self, insumo_id, limite=20):
        return self._run("SELECT m.id, m.tipo, m.cantidad::float AS cantidad, m.motivo, m.fecha, u.nombre AS usuario, "
                         "l.codigo AS lote FROM movimientos_inventario m JOIN usuarios u ON u.id = m.usuario_id "
                         "LEFT JOIN lotes_insumo l ON l.id = m.lote_insumo_id "
                         "WHERE m.insumo_id = %s ORDER BY m.fecha DESC, m.id DESC LIMIT %s", (insumo_id, limite))


class LoteInsumoRepository(BaseRepository):
    tabla = "lotes_insumo"

    _COLS = ("l.id, l.insumo_id, i.nombre AS insumo, i.unidad, l.codigo, l.proveedor, "
             "to_char(l.fecha_ingreso,'YYYY-MM-DD') AS ingreso, to_char(l.fecha_vencimiento,'YYYY-MM-DD') AS vencimiento, "
             "l.cantidad_disponible::float AS disponible")

    def listar(self, insumo_id=None, solo_con_saldo=False):
        sql = (f"SELECT {self._COLS} FROM lotes_insumo l JOIN insumos i ON i.id = l.insumo_id WHERE (%s::int IS NULL OR l.insumo_id = %s) "
               "AND (NOT %s OR l.cantidad_disponible > 0) "
               "ORDER BY i.nombre, l.fecha_vencimiento NULLS LAST, l.fecha_ingreso, l.id")  # nosec B608 - _COLS es constante
        return self._run(sql, (insumo_id, insumo_id, solo_con_saldo))

    def bloquear(self, lote_id):
        return self._run(f"SELECT {self._COLS} FROM lotes_insumo l JOIN insumos i ON i.id = l.insumo_id "
                         "WHERE l.id = %s FOR UPDATE OF l", (lote_id,), one=True)  # nosec B608

    def obtener_o_crear(self, insumo_id, codigo, proveedor=None, vencimiento=None):
        r = self._run("SELECT id FROM lotes_insumo WHERE insumo_id = %s AND codigo = %s FOR UPDATE", (insumo_id, codigo), one=True)
        if r:
            return r["id"]
        return self._run("INSERT INTO lotes_insumo (insumo_id, codigo, proveedor, fecha_vencimiento) VALUES (%s,%s,%s,%s) RETURNING id",
                         (insumo_id, codigo, proveedor, vencimiento), one=True)["id"]

    def siguiente_codigo_auto(self, insumo_id):
        n = self._run("SELECT count(*) AS n FROM lotes_insumo WHERE insumo_id = %s AND codigo LIKE 'ING-%%'", (insumo_id,), one=True)["n"]
        return f"ING-{insumo_id:02d}-{n + 1:04d}"

    def fefo(self, insumo_id):
        """Lotes con saldo del insumo, ordenados primero-que-vence-primero-sale (FEFO); bloquea las filas."""
        return self._run("SELECT id, cantidad_disponible::float AS disponible FROM lotes_insumo "
                         "WHERE insumo_id = %s AND cantidad_disponible > 0 "
                         "ORDER BY fecha_vencimiento NULLS LAST, fecha_ingreso, id FOR UPDATE", (insumo_id,))
