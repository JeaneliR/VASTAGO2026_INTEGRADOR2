"""Datos reales de la empresa: control de producción de grageado, pronóstico y kardex de insumos.

Se aplican desde app.migrate.upgrade(), que ejecutan tanto la semilla (BD nueva) como el arranque del contenedor
(BD existente, p. ej. Render). Es aditivo e idempotente: no toca usuarios, insumos ni órdenes.
"""
import csv
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
VERSION = "datos_reales_v1"


def _csv(nombre):
    with open(RAIZ / "db" / nombre, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def _historico(cur):
    """Control de producción real de grageado (operarios anonimizados) y el pronóstico calculado con él (ml-service)."""
    for r in _csv("historico_grageado.csv"):
        nz = lambda k: r[k] if r[k] != "" else None
        cur.execute("INSERT INTO produccion_historica (mes, fecha, operador, centro, variante, centro_kg, chocolate_kg, bruto_kg, reproceso_kg, lote) "
                    "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                    (r["anio_mes"] + "-01", nz("fecha"), r["operador"], r["centro"], r["variante"], nz("centro_kg"), nz("chocolate_kg"),
                     r["bruto_kg"], nz("reproceso_kg"), nz("lote")))
    fc = json.loads((RAIZ / "ml-service" / "forecast_output.json").read_text(encoding="utf-8"))
    for nombre, s in fc["series"].items():
        cur.execute("INSERT INTO series_demanda (nombre) VALUES (%s) RETURNING id", (nombre,))
        sid = cur.fetchone()[0]
        for mes, kg in zip(fc["meses_hist"], s["historico"]):
            cur.execute("INSERT INTO demanda_historica (serie_id, mes, kg, imputado) VALUES (%s,%s,%s,%s)",
                        (sid, mes + "-01", kg, mes in fc.get("meses_sin_registro", [])))
        for mes, kg in zip(s["meses_forecast"], s["forecast"]):
            cur.execute("INSERT INTO pronosticos (serie_id, mes, kg, mape, wape, modelo) VALUES (%s,%s,%s,%s,%s,%s)",
                        (sid, mes + "-01", kg, s["mape"], s["wape"], s["modelo"]))


def _kardex(cur):
    """Kardex real de insumos (stock al corte y movimientos)."""
    for r in _csv("kardex_insumos.csv"):
        cur.execute("INSERT INTO kardex_insumos (codigo, nombre, familia, unidad, stock_minimo, stock_actual) VALUES (%s,%s,%s,%s,%s,%s)",
                    (r["codigo"], r["nombre"], r["familia"], r["unidad"], r["stock_minimo"], r["stock_actual"]))
    for r in _csv("kardex_movimientos.csv"):
        cur.execute("INSERT INTO kardex_movimientos (codigo, fecha, tipo, cantidad_kg, fuente) VALUES (%s,%s,%s,%s,%s)",
                    (r["codigo"], r["fecha"], r["tipo"], r["cantidad_kg"], r["fuente"]))


def aplicar(cur):
    """Crea las tablas si faltan, reemplaza el pronóstico simulado anterior y carga los datos reales una sola vez."""
    cur.execute("SELECT pg_advisory_xact_lock(730202606)")
    cur.execute("SELECT 1 FROM app_migraciones WHERE version = %s", (VERSION,))
    if cur.fetchone():
        return False
    cur.execute((RAIZ / "db" / "upgrade_datos_reales.sql").read_text(encoding="utf-8"))
    cur.execute("SELECT (SELECT count(*) FROM produccion_historica), (SELECT count(*) FROM kardex_insumos)")
    hist, kar = cur.fetchone()
    if hist == 0:
        _historico(cur)
    if kar == 0:
        _kardex(cur)
    cur.execute("INSERT INTO app_migraciones (version) VALUES (%s)", (VERSION,))
    return True
