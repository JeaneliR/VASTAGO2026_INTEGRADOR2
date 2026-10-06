"""Patrón Repository — clase base.

Toda consulta SQL del sistema vive en un repositorio. Las capas superiores (rutas /
servicios) nunca arman SQL: reciben diccionarios. Todas las consultas son
parametrizadas (%s), lo que elimina la inyección SQL por construcción.
"""
from abc import ABC
from app.db import transaction


class BaseRepository(ABC):
    tabla = None

    def __init__(self, cur=None):
        # Si se inyecta un cursor, el repositorio participa en la transacción del llamador.
        self._cur = cur

    def _run(self, sql, params=(), many=False, one=False, write=False):
        def exec_(cur):
            cur.execute(sql, params)
            if cur.description is None:
                return None
            if one:
                return cur.fetchone()
            return cur.fetchall()
        if self._cur is not None:
            return exec_(self._cur)
        with transaction() as cur:
            return exec_(cur)

    def find_all(self, order_by="id"):
        if order_by not in self.COLUMNAS_ORDENABLES:
            raise ValueError("columna de orden no permitida")
        return self._run(f"SELECT * FROM {self.tabla} ORDER BY {order_by}")  # nosec B608 - tabla es constante de clase; order_by validado contra lista blanca

    def find_by_id(self, id_):
        return self._run(f"SELECT * FROM {self.tabla} WHERE id = %s", (id_,), one=True)  # nosec B608 - tabla es constante de clase; id parametrizado

    COLUMNAS_ORDENABLES = ("id",)
