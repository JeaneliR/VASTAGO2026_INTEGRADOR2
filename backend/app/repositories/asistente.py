"""Consultas de solo lectura que usa el asistente: kardex real de insumos y control de producción.

Todo el SQL del asistente vive aquí (patrón Repository); el servicio solo recibe diccionarios.
"""
from .base import BaseRepository


class KardexRepository(BaseRepository):
    tabla = "kardex_insumos"

    def insumos(self):
        return self._run("SELECT codigo, nombre, familia, unidad, stock_minimo::float AS stock_minimo, stock_actual::float AS stock_actual "
                         "FROM kardex_insumos ORDER BY nombre")

    def corte(self):
        """Fecha del último movimiento del kardex vigente (sirve de 'hoy' de los datos)."""
        r = self._run("SELECT max(fecha) AS corte, min(fecha) FILTER (WHERE tipo = 'saldo_inicial') AS inicio "
                      "FROM kardex_movimientos WHERE fuente = 'kardex_sep'", one=True)
        return r["inicio"], r["corte"]

    def consumo(self, desde, hasta):
        """Salidas por insumo en [desde, hasta]: total, número de salidas y salida mediana."""
        filas = self._run("SELECT codigo, sum(cantidad_kg)::float AS kg, count(*)::int AS salidas, "
                          "percentile_cont(0.5) WITHIN GROUP (ORDER BY cantidad_kg)::float AS mediana "
                          "FROM kardex_movimientos WHERE tipo = 'salida' AND fecha BETWEEN %s AND %s GROUP BY codigo", (desde, hasta))
        return {f["codigo"]: f for f in filas}

    def consumo_por_mes(self, codigo):
        return self._run("SELECT to_char(date_trunc('month', fecha), 'YYYY-MM') AS mes, sum(cantidad_kg)::float AS kg, count(*)::int AS salidas, "
                         "bool_or(fuente = 'kardex_may_ago') AS parcial FROM kardex_movimientos "
                         "WHERE codigo = %s AND tipo = 'salida' GROUP BY 1 ORDER BY 1", (codigo,))

    def ultimos_ingresos(self, codigo, limite=3):
        return self._run("SELECT fecha, cantidad_kg::float AS kg FROM kardex_movimientos "
                         "WHERE codigo = %s AND tipo = 'ingreso' ORDER BY fecha DESC, id DESC LIMIT %s", (codigo, limite))

    def ultima_salida(self, codigo):
        r = self._run("SELECT max(fecha) AS fecha FROM kardex_movimientos WHERE codigo = %s AND tipo = 'salida'", (codigo,), one=True)
        return r["fecha"]


class ProduccionConsultaRepository(BaseRepository):
    tabla = "produccion_historica"

    def centros(self):
        return [r["centro"] for r in self._run("SELECT DISTINCT centro FROM produccion_historica ORDER BY centro")]

    def meses(self):
        return [r["mes"] for r in self._run("SELECT DISTINCT to_char(mes,'YYYY-MM') AS mes FROM produccion_historica ORDER BY 1")]

    def resumen_mes(self, mes, centro=None):
        """Tandas, kg, reproceso y kg con reproceso registrado de un mes ('YYYY-MM'), opcionalmente de un centro."""
        return self._run("SELECT count(*)::int AS tandas, COALESCE(round(sum(bruto_kg),1),0)::float AS kg, "
                         "COALESCE(round(sum(reproceso_kg),2),0)::float AS reproceso_kg, "
                         "COALESCE(round(sum(bruto_kg) FILTER (WHERE reproceso_kg IS NOT NULL),1),0)::float AS kg_con_reproceso "
                         "FROM produccion_historica WHERE to_char(mes,'YYYY-MM') = %s AND (%s::text IS NULL OR centro = %s)",
                         (mes, centro, centro), one=True)

    def por_centro_mes(self, mes):
        return self._run("SELECT centro, count(*)::int AS tandas, round(sum(bruto_kg),1)::float AS kg FROM produccion_historica "
                         "WHERE to_char(mes,'YYYY-MM') = %s GROUP BY centro ORDER BY sum(bruto_kg) DESC", (mes,))
