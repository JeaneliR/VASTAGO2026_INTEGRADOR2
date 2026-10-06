from .base import BaseRepository


class InsumoRepository(BaseRepository):
    tabla = "insumos"

    def listar(self):
        return self._run("SELECT id, nombre AS insumo, unidad, stock_actual::float AS stock, "
                         "stock_minimo::float AS minimo, estado FROM v_inventario ORDER BY nombre")

    def obtener(self, id_):
        return self._run("SELECT id, nombre AS insumo, unidad, stock_actual::float AS stock, "
                         "stock_minimo::float AS minimo, estado FROM v_inventario WHERE id = %s", (id_,), one=True)

    def bloquear_para_actualizar(self, id_):
        return self._run("SELECT id, nombre, stock_actual FROM insumos WHERE id = %s FOR UPDATE", (id_,), one=True)

    def contar_quiebres(self):
        return self._run("SELECT count(*) AS n FROM insumos WHERE stock_actual < stock_minimo", one=True)["n"]


class MovimientoRepository(BaseRepository):
    tabla = "movimientos_inventario"

    def registrar(self, insumo_id, tipo, cantidad, motivo, usuario_id, orden_id=None):
        # El trigger fn_aplicar_movimiento actualiza el stock del insumo.
        return self._run(
            "INSERT INTO movimientos_inventario (insumo_id, tipo, cantidad, motivo, usuario_id, orden_id) "
            "VALUES (%s,%s,%s,%s,%s,%s) RETURNING id, fecha",
            (insumo_id, tipo, cantidad, motivo, usuario_id, orden_id), one=True)

    def ultimos(self, insumo_id, limite=20):
        return self._run("SELECT m.id, m.tipo, m.cantidad::float AS cantidad, m.motivo, m.fecha, u.nombre AS usuario "
                         "FROM movimientos_inventario m JOIN usuarios u ON u.id = m.usuario_id "
                         "WHERE m.insumo_id = %s ORDER BY m.fecha DESC LIMIT %s", (insumo_id, limite))
