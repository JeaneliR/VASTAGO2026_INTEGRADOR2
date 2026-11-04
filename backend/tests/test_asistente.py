"""Pruebas del asistente de consultas: las respuestas se contrastan con un cálculo independiente hecho directo sobre los CSV."""
import csv
import datetime as dt
import os

import pytest

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def _csv(nombre):
    with open(os.path.join(RAIZ, "db", nombre), encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


INSUMOS = {r["codigo"]: r for r in _csv("kardex_insumos.csv")}
MOVS = _csv("kardex_movimientos.csv")
SEP = [m for m in MOVS if m["fuente"] == "kardex_sep"]
INICIO = min(dt.date.fromisoformat(m["fecha"]) for m in SEP if m["tipo"] == "saldo_inicial")
CORTE = max(dt.date.fromisoformat(m["fecha"]) for m in SEP)
DIAS = (CORTE - INICIO).days + 1


def _salidas(codigo, desde=INICIO, hasta=CORTE):
    return sum(float(m["cantidad_kg"]) for m in SEP if m["codigo"] == codigo and m["tipo"] == "salida"
               and desde <= dt.date.fromisoformat(m["fecha"]) <= hasta)


def preguntar(client, tokens, texto, rol="gerente"):
    r = client.post("/api/asistente/preguntar", json={"pregunta": texto}, headers=tokens[rol])
    assert r.status_code == 200, r.get_json()
    return r.get_json()


# ------------------------------------------------------------------ integridad de los datos cargados
def test_kardex_septiembre_cuadra_con_el_stock_actual(app):
    """saldo inicial + ingresos - salidas del kardex vigente debe dar el stock actual de CADA insumo."""
    from app.db import transaction
    with transaction() as cur:
        cur.execute("SELECT i.codigo, i.stock_actual, COALESCE(sum(CASE m.tipo WHEN 'salida' THEN -m.cantidad_kg ELSE m.cantidad_kg END),0) AS calc "
                    "FROM kardex_insumos i LEFT JOIN kardex_movimientos m ON m.codigo = i.codigo AND m.fuente = 'kardex_sep' GROUP BY i.codigo, i.stock_actual")
        filas = cur.fetchall()
    assert len(filas) == 44
    for f in filas:
        assert abs(float(f["stock_actual"]) - float(f["calc"])) < 0.05, f["codigo"]


# ------------------------------------------------------------------ respuestas calculadas
def test_cobertura_del_suero_coincide_con_el_calculo_independiente(client, tokens):
    stock = float(INSUMOS["LAC-SDL-02"]["stock_actual"])
    tasa = _salidas("LAC-SDL-02") / DIAS
    esperado = int(stock / tasa)
    r = preguntar(client, tokens, "¿Para cuánto alcanza el suero de leche?")
    assert r["intencion"] == "cobertura"
    assert f"{esperado} días" in r["respuesta"] and "LAC-SDL-02" in r["respuesta"]
    tarjetas = {t["etiqueta"]: t["valor"] for t in r["tarjetas"]}
    assert tarjetas["Stock al corte"] == "265.55 kg"
    assert tarjetas["Se agotaría hacia"].startswith(str((CORTE + dt.timedelta(days=esperado)).day))
    assert "6 de octubre de 2026" in r["respuesta"]                 # el 'hoy' es el corte del kardex, no el reloj del servidor


def test_pregunta_por_codigo_y_con_otras_palabras(client, tokens):
    a = preguntar(client, tokens, "LAC-SDL-02")
    b = preguntar(client, tokens, "cuándo se acaba el suero")
    assert a["intencion"] == b["intencion"] == "cobertura"
    assert a["respuesta"] == b["respuesta"]


def test_ranking_ordena_por_dias_de_cobertura(client, tokens):
    r = preguntar(client, tokens, "¿Qué insumos se acaban primero?")
    dias = [int(f[3]) for f in r["tabla"]["filas"]]
    assert dias == sorted(dias) and len(dias) == 8
    cob = {}
    for cod, ins in INSUMOS.items():
        s = _salidas(cod)
        if s > 0:
            cob[cod] = int(float(ins["stock_actual"]) / (s / DIAS))
    assert dias == sorted(cob.values())[:8]


def test_bajo_minimo_cuenta_igual_que_el_csv(client, tokens):
    esperado = [c for c, i in INSUMOS.items() if float(i["stock_minimo"]) > 0 and float(i["stock_actual"]) < float(i["stock_minimo"])]
    r = preguntar(client, tokens, "¿Qué debo comprar?")
    assert r["intencion"] == "bajo_minimo" and len(r["tabla"]["filas"]) == len(esperado)
    assert {t["etiqueta"]: t["valor"] for t in r["tarjetas"]}["Bajo el mínimo"] == str(len(esperado))


def test_consumo_mensual_y_default(client, tokens):
    sep = _salidas("LAC-SDL-02", dt.date(2026, 9, 1), dt.date(2026, 9, 30))
    r = preguntar(client, tokens, "¿Cuánto suero de leche consumimos en septiembre?")
    assert r["intencion"] == "consumo" and "172.8 kg" in r["respuesta"] and abs(sep - 172.8) < 1e-6
    r2 = preguntar(client, tokens, "suero de leche en julio")           # mes sin verbo: se interpreta como consumo
    assert r2["intencion"] == "consumo" and "julio de 2026" in r2["respuesta"]
    assert r2["nota"] and "omitir salidas" in r2["nota"]                    # mayo-agosto viene del kardex parcial y se avisa


def test_stock_e_ingreso(client, tokens):
    r = preguntar(client, tokens, "¿Cuánto maní tostado entero queda?")
    assert r["intencion"] == "stock" and "236 kg" in r["respuesta"]
    r = preguntar(client, tokens, "¿Cuándo fue el último ingreso de azúcar blanca?")
    assert r["intencion"] == "ingreso" and "250 kg" in r["respuesta"]


def test_nombre_ambiguo_pide_precision_en_vez_de_adivinar(client, tokens):
    r = preguntar(client, tokens, "¿Cuánta leche queda?")
    assert "varios insumos" in r["respuesta"] and "Suero de leche" in r["respuesta"] and not r["tarjetas"]
    assert any("LAC-SDL-02" in s for s in r["sugerencias"])


def test_produccion_reproceso_y_pronostico_usan_los_datos_reales(client, tokens):
    r = preguntar(client, tokens, "¿Cuánto grageado produjimos en septiembre?")
    filas = [f for f in _csv("historico_grageado.csv") if f["anio_mes"] == "2026-09"]
    kg = sum(float(f["bruto_kg"]) for f in filas)
    assert f"{len(filas)} tandas" in r["respuesta"] and f"{kg:,.1f}".rstrip("0").rstrip(".") in r["respuesta"]
    r = preguntar(client, tokens, "reproceso en abril")
    assert r["intencion"] == "reproceso" and "abril de 2026" in r["respuesta"]
    r = preguntar(client, tokens, "¿Cuánto vamos a producir el próximo mes?")
    assert r["intencion"] == "pronostico" and "WAPE" in r["respuesta"]   # nunca presenta el pronóstico sin su error


def test_pregunta_que_no_entiende_lo_dice_y_ofrece_ejemplos(client, tokens):
    r = preguntar(client, tokens, "¿Qué clima hará mañana?")
    assert r["intencion"] == "no_entendi" and len(r["sugerencias"]) >= 3
    assert preguntar(client, tokens, "hola")["intencion"] == "ayuda"


def test_texto_hostil_no_rompe_ni_inyecta(client, tokens):
    for q in ["'; DROP TABLE kardex_insumos; --", "<script>alert(1)</script> suero", "%" * 50, "suero " * 40]:
        assert client.post("/api/asistente/preguntar", json={"pregunta": q}, headers=tokens["admin"]).status_code == 200
    assert preguntar(client, tokens, "¿Para cuánto alcanza el suero de leche?")["tarjetas"]      # la tabla sigue ahí


# ------------------------------------------------------------------ seguridad
def test_roles_y_validacion(client, tokens):
    assert client.post("/api/asistente/preguntar", json={"pregunta": "hola"}).status_code == 401
    assert client.post("/api/asistente/preguntar", json={"pregunta": "hola"}, headers=tokens["op1"]).status_code == 403
    assert client.get("/api/asistente/sugerencias", headers=tokens["op2"]).status_code == 403
    for rol in ("admin", "jefe", "almacen", "gerente"):
        assert client.post("/api/asistente/preguntar", json={"pregunta": "hola"}, headers=tokens[rol]).status_code == 200
    for malo in ("", "   ", None, 123, "x" * 301, ["a"]):
        assert client.post("/api/asistente/preguntar", json={"pregunta": malo}, headers=tokens["admin"]).status_code == 400
    assert client.post("/api/asistente/preguntar", data="no es json", headers=tokens["admin"]).status_code == 400


def test_cada_consulta_queda_en_la_bitacora(client, tokens):
    preguntar(client, tokens, "¿Cuánto azúcar rubia queda?", rol="almacen")
    log = client.get("/api/auth/auditoria", headers=tokens["admin"]).get_json()
    reg = next(a for a in log if a["accion"] == "ASISTENTE_CONSULTA")
    assert reg["detalle"]["intencion"] == "stock" and "azúcar rubia" in reg["detalle"]["pregunta"]


# ------------------------------------------------------------------ funciones puras
def test_calcular_cobertura_casos_borde():
    from app.services.asistente_service import calcular_cobertura
    corte = dt.date(2026, 10, 6)
    ins = {"stock_actual": 100.0, "stock_minimo": 20.0}
    c = calcular_cobertura(ins, {"kg": 36.0, "salidas": 4, "mediana": 9.0}, None, 36, corte)
    assert c["tasa_base"] == 1.0 and c["dias"] == 100 and c["dias_a_minimo"] == 80 and c["dias_reciente"] is None
    assert c["agotamiento"] == corte + dt.timedelta(days=100)
    sin = calcular_cobertura(ins, None, None, 36, corte)             # sin consumo: no inventa un ritmo
    assert sin["dias"] is None and sin["agotamiento"] is None
    bajo = calcular_cobertura({"stock_actual": 5.0, "stock_minimo": 20.0}, {"kg": 10.0, "salidas": 1, "mediana": 10.0}, None, 10, corte)
    assert bajo["bajo_minimo"] and bajo["dias_a_minimo"] is None


def test_busqueda_de_insumos_pondera_por_rareza():
    from app.services.asistente_service import buscar_insumos
    cat = [{"codigo": "A", "nombre": "SUERO DE LECHE"}, {"codigo": "B", "nombre": "LECHE DESCREMADA"}, {"codigo": "C", "nombre": "ESENCIA DE LECHE"},
           {"codigo": "D", "nombre": "COBERTURA DE LECHE"}, {"codigo": "E", "nombre": "PASAS MEDIANAS"}]
    assert [i["codigo"] for i in buscar_insumos("suero de leche", cat)[0]] == ["A"]
    coinc, ambiguo = buscar_insumos("leche", cat)
    assert ambiguo and len(coinc) == 4
    assert [i["codigo"] for i in buscar_insumos("las pasa", cat)[0]] == ["E"]       # singular/plural
    assert buscar_insumos("clima", cat) == ([], False)


# ------------------------------------------------------------------ variantes de periodo y casos límite
def test_consumo_por_ventanas_y_varios_insumos(client, tokens):
    r = preguntar(client, tokens, "cuánto suero de leche usamos en los últimos 7 días")
    ult7 = _salidas("LAC-SDL-02", CORTE - dt.timedelta(days=6), CORTE)
    assert r["intencion"] == "consumo" and "últimos 7 días" in r["respuesta"] and f"{ult7:g}" in r["respuesta"]
    r = preguntar(client, tokens, "cuánto suero de leche consumimos")            # sin periodo: ventana vigente + tabla mensual
    assert r["tabla"] and "209.45 kg" in r["respuesta"]
    r = preguntar(client, tokens, "cuánto maní queda")                           # entero y partido: responde ambos, no adivina
    assert "NUC-MAE-02" in r["respuesta"] and "NUC-MAP-03" in r["respuesta"]


def test_insumo_casi_agotado_y_sin_consumo(client, tokens):
    r = preguntar(client, tokens, "para cuánto alcanza el polvo de cacao china nh")
    assert "1 día" in r["respuesta"] and "por debajo del stock mínimo" in r["respuesta"]
    r = preguntar(client, tokens, "para cuánto alcanza la lecitina de soya")      # sin salidas: no inventa un ritmo
    assert "no registró salidas" in r["respuesta"] and not any(t["etiqueta"] == "Días de cobertura" for t in r["tarjetas"])
    assert preguntar(client, tokens, "para cuánto alcanza")["respuesta"].startswith("¿De qué insumo?")


def test_produccion_y_reproceso_por_centro_y_mes(client, tokens):
    r = preguntar(client, tokens, "cuánto grageado con pasas produjimos en agosto")
    filas = [f for f in _csv("historico_grageado.csv") if f["anio_mes"] == "2026-08" and f["centro"] == "Pasas"]
    assert f"{len(filas)} tandas" in r["respuesta"] and "pasas" in r["respuesta"]
    r = preguntar(client, tokens, "cuánto produjimos este mes")                  # octubre aún no tiene tandas: lo dice y muestra el último
    assert "todavía no tiene tandas" in r["respuesta"] and "septiembre de 2026" in r["respuesta"]
    r = preguntar(client, tokens, "cuánto reproceso hubo")
    assert r["intencion"] == "reproceso" and "septiembre de 2026" in r["respuesta"]
    assert "no hay reproceso registrado" in preguntar(client, tokens, "reproceso en enero de 2025")["respuesta"]
