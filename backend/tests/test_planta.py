"""Pruebas de planta: producto terminado, ruta de etapas, consumo por lote y trazabilidad (adelante y atrás)."""
import pytest
from app.db import transaction


def _liberar_equipos():
    """Libera los equipos que quedaron en uso por órdenes creadas por otras pruebas (las órdenes de la semilla no se tocan)."""
    with transaction() as cur:
        cur.execute("UPDATE orden_etapas SET estado = 'Completada', fin = now() WHERE estado = 'En curso' "
                    "AND orden_id IN (SELECT id FROM ordenes_produccion WHERE lote > 'L-2026-019')")


def _prod(client, tokens, prefijo):
    return next(p for p in client.get("/api/productos", headers=tokens["jefe"]).get_json() if p["nombre"].startswith(prefijo))


def _centro(client, tokens, nombre):
    return next(c for c in client.get("/api/centros", headers=tokens["jefe"]).get_json() if c["nombre"] == nombre)


def _equipo(client, tokens, codigo):
    return next(e for e in client.get("/api/equipos", headers=tokens["jefe"]).get_json() if e["codigo"] == codigo)["id"]


def _nueva_gragea(client, tokens, cantidad=20, centro="Maní tostado"):
    r = client.post("/api/produccion", json={"producto_id": _prod(client, tokens, "Gragea")["id"], "cantidad": cantidad,
                                             "centro_id": _centro(client, tokens, centro)["id"]}, headers=tokens["jefe"])
    assert r.status_code == 201, r.get_json()
    return r.get_json()["id"]


def _detalle(client, tokens, oid):
    return client.get(f"/api/produccion/{oid}", headers=tokens["jefe"]).get_json()


def _consumir_todo(client, tokens, oid, seq, quien="op1"):
    det = _detalle(client, tokens, oid)
    lotes = client.get("/api/lotes-insumo", headers=tokens["jefe"]).get_json()
    for ins in det["etapas"][seq - 1]["insumos"]:
        lote = next(l for l in lotes if l["insumo_id"] == ins["insumo_id"] and l["disponible"] >= ins["planificado"])
        r = client.post(f"/api/produccion/{oid}/etapas/{seq}/consumos",
                        json={"lote_insumo_id": lote["id"], "cantidad": ins["planificado"]}, headers=tokens[quien])
        assert r.status_code == 201, r.get_json()


def test_orden_de_gragea_instancia_la_ruta_y_planifica_el_centro(client, tokens):
    oid = _nueva_gragea(client, tokens, cantidad=20)
    det = _detalle(client, tokens, oid)
    assert [e["nombre"] for e in det["etapas"]] == ["Refinado", "Grageado", "Abrillantado", "Envasado"]
    assert [e["horasEstandar"] for e in det["etapas"]] == [8.0, 6.0, 3.0, 2.0]
    assert all(e["estado"] == "Pendiente" for e in det["etapas"]) and det["centro"] == "Maní tostado"
    centro = next(i for i in det["etapas"][1]["insumos"] if i["categoria"] == "Centro")
    assert centro["insumo"] == "Maní tostado" and centro["planificado"] == 2.0          # 0.100 kg x 20


def test_gragea_exige_centro_valido_y_los_demas_productos_no_lo_llevan(client, tokens):
    g, t = _prod(client, tokens, "Gragea"), _prod(client, tokens, "Tableta 70")
    h = tokens["jefe"]
    assert client.post("/api/produccion", json={"producto_id": g["id"], "cantidad": 5}, headers=h).status_code == 400
    azucar = next(i for i in client.get("/api/inventario", headers=h).get_json() if i["insumo"].startswith("Azúcar"))
    assert client.post("/api/produccion", json={"producto_id": g["id"], "cantidad": 5, "centro_id": azucar["id"]}, headers=h).status_code == 400
    assert client.post("/api/produccion", json={"producto_id": t["id"], "cantidad": 5, "centro_id": _centro(client, tokens, "Pasas morenas")["id"]}, headers=h).status_code == 400
    assert client.post("/api/produccion", json={"producto_id": g["id"], "cantidad": 2.5, "centro_id": _centro(client, tokens, "Pasas morenas")["id"]}, headers=h).status_code == 400


def test_no_se_puede_saltar_etapas_ni_usar_equipo_de_otro_tipo(client, tokens):
    oid = _nueva_gragea(client, tokens)
    assert client.post(f"/api/produccion/{oid}/etapas/2/iniciar", json={"equipo_id": _equipo(client, tokens, "B-03")}, headers=tokens["op2"]).status_code == 409
    r = client.post(f"/api/produccion/{oid}/etapas/1/iniciar", json={"equipo_id": _equipo(client, tokens, "E-01")}, headers=tokens["op1"])
    assert r.status_code == 400 and "Refinadora" in r.get_json()["error"]
    assert client.post(f"/api/produccion/{oid}/etapas/1/iniciar", json={}, headers=tokens["op1"]).status_code == 400   # equipo obligatorio


def test_consumo_valida_etapa_en_curso_insumo_correcto_y_saldo(client, tokens):
    _liberar_equipos()
    oid = _nueva_gragea(client, tokens)
    lotes = client.get("/api/lotes-insumo", headers=tokens["jefe"]).get_json()
    cacao = next(l for l in lotes if l["insumo"].startswith("Cacao"))
    mani = next(l for l in lotes if l["insumo"] == "Maní tostado")
    # sin iniciar la etapa no se puede consumir
    assert client.post(f"/api/produccion/{oid}/etapas/1/consumos", json={"lote_insumo_id": cacao["id"], "cantidad": 1}, headers=tokens["op1"]).status_code == 409
    assert client.post(f"/api/produccion/{oid}/etapas/1/iniciar", json={"equipo_id": _equipo(client, tokens, "R-02")}, headers=tokens["op1"]).status_code == 200
    # el maní no corresponde al refinado
    assert client.post(f"/api/produccion/{oid}/etapas/1/consumos", json={"lote_insumo_id": mani["id"], "cantidad": 1}, headers=tokens["op1"]).status_code == 409
    # más que el saldo del lote
    r = client.post(f"/api/produccion/{oid}/etapas/1/consumos", json={"lote_insumo_id": cacao["id"], "cantidad": cacao["disponible"] + 1}, headers=tokens["op1"])
    assert r.status_code == 409 and "Saldo insuficiente" in r.get_json()["error"]
    # otro operario no puede operar la etapa de su compañero, pero el Jefe de Producción sí
    assert client.post(f"/api/produccion/{oid}/etapas/1/consumos", json={"lote_insumo_id": cacao["id"], "cantidad": 0.1}, headers=tokens["op2"]).status_code == 403
    assert client.post(f"/api/produccion/{oid}/etapas/1/consumos", json={"lote_insumo_id": cacao["id"], "cantidad": 0.1}, headers=tokens["jefe"]).status_code == 201
    # cantidades inválidas
    for c in (0, -1, "x", None):
        assert client.post(f"/api/produccion/{oid}/etapas/1/consumos", json={"lote_insumo_id": cacao["id"], "cantidad": c}, headers=tokens["op1"]).status_code == 400


def test_no_se_cierra_etapa_sin_registrar_lotes_de_todos_los_insumos(client, tokens):
    _liberar_equipos()
    oid = _nueva_gragea(client, tokens)
    assert client.post(f"/api/produccion/{oid}/etapas/1/iniciar", json={"equipo_id": _equipo(client, tokens, "R-01")}, headers=tokens["op1"]).status_code == 200
    r = client.post(f"/api/produccion/{oid}/etapas/1/finalizar", json={"merma_kg": 0}, headers=tokens["op1"])
    assert r.status_code == 409 and "Falta registrar el consumo" in r.get_json()["error"]
    _consumir_todo(client, tokens, oid, 1)
    assert client.post(f"/api/produccion/{oid}/etapas/1/finalizar", json={"merma_kg": -3}, headers=tokens["op1"]).status_code == 400
    assert client.post(f"/api/produccion/{oid}/etapas/1/finalizar", json={"merma_kg": 0.4, "observaciones": "ok"}, headers=tokens["op1"]).status_code == 200
    e1 = _detalle(client, tokens, oid)["etapas"][0]
    assert e1["estado"] == "Completada" and e1["responsable"].startswith("Operario") and e1["equipo"] == "R-01" and e1["merma"] == 0.4
    assert e1["horasReales"] is not None


def test_flujo_completo_gragea_y_trazabilidad_hacia_atras_y_adelante(client, tokens):
    _liberar_equipos()
    oid = _nueva_gragea(client, tokens, cantidad=20, centro="Almendra entera")
    lote_orden = _detalle(client, tokens, oid)["lote"]
    stock_antes = {i["insumo"]: i["stock"] for i in client.get("/api/inventario", headers=tokens["jefe"]).get_json()}
    pt_antes = client.get("/api/producto-terminado", headers=tokens["gerente"]).get_json()
    plan = [("op1", "R-02"), ("op2", "B-03"), ("op2", "B-02"), ("op1", "E-01")]
    for seq, (quien, eq) in enumerate(plan, start=1):
        r = client.post(f"/api/produccion/{oid}/etapas/{seq}/iniciar", json={"equipo_id": _equipo(client, tokens, eq)}, headers=tokens[quien])
        assert r.status_code == 200, r.get_json()
        _consumir_todo(client, tokens, oid, seq, quien)
        body = {"merma_kg": 0.1}
        if seq == 4:
            assert client.post(f"/api/produccion/{oid}/etapas/4/finalizar", json=body, headers=tokens[quien]).status_code == 400   # faltan unidades
            body["cantidad_producida"] = 500                                                                                    # > 110 % de lo planificado
            assert client.post(f"/api/produccion/{oid}/etapas/4/finalizar", json=body, headers=tokens[quien]).status_code == 400
            body["cantidad_producida"] = 19
        r = client.post(f"/api/produccion/{oid}/etapas/{seq}/finalizar", json=body, headers=tokens[quien])
        assert r.status_code == 200, r.get_json()
    det = _detalle(client, tokens, oid)
    assert det["estado"] == "Completada" and det["cantidadProducida"] == 19 and det["lotePT"]["codigo"] == lote_orden
    # insumos descontados según la receta (0.1 kg de almendra x 20 uds = 2 kg)
    stock_despues = {i["insumo"]: i["stock"] for i in client.get("/api/inventario", headers=tokens["jefe"]).get_json()}
    assert round(stock_antes["Almendra entera"] - stock_despues["Almendra entera"], 3) == 2.0
    assert stock_antes["Bolsa gragea 200g"] - stock_despues["Bolsa gragea 200g"] == 20
    # producto terminado: ingresó el lote y se refleja por variante
    pt = client.get("/api/producto-terminado", headers=tokens["gerente"]).get_json()
    fila = next(s for s in pt["stock"] if s["centro"] == "Almendra entera")
    assert fila["stock"] == 19 and any(l["codigo"] == lote_orden and l["disponible"] == 19 for l in pt["lotes"])
    assert sum(s["stock"] for s in pt["stock"]) == sum(s["stock"] for s in pt_antes["stock"]) + 19
    # despacho
    lp = next(l for l in pt["lotes"] if l["codigo"] == lote_orden)
    assert client.post(f"/api/lotes-pt/{lp['id']}/despachos", json={"cantidad": 8, "destino": "Tienda Barranco"}, headers=tokens["almacen"]).status_code == 201
    assert client.post(f"/api/lotes-pt/{lp['id']}/despachos", json={"cantidad": 999, "destino": "X"}, headers=tokens["almacen"]).status_code == 409
    assert client.post(f"/api/lotes-pt/{lp['id']}/despachos", json={"cantidad": 1, "destino": ""}, headers=tokens["almacen"]).status_code == 400
    # --- hacia atrás: del lote de PT a responsables, equipos y lotes de insumo
    t = client.get(f"/api/trazabilidad/lote-pt/{lote_orden}", headers=tokens["gerente"]).get_json()
    assert t["lote"]["centro"] == "Almendra entera" and t["resumen"]["etapas"] == 4 and t["resumen"]["despachado"] == 8
    assert [e["equipo"] for e in t["etapas"]] == ["R-02", "B-03", "B-02", "E-01"]
    assert all(e["responsable"] for e in t["etapas"]) and all(e["consumos"] for e in t["etapas"])
    alm = next(c for c in t["etapas"][1]["consumos"] if c["insumo"] == "Almendra entera")
    assert alm["lote"] == "ALM-2026-09A" and alm["proveedor"] == "Frutos Secos del Sur"
    # --- hacia adelante: del lote de almendra a las órdenes, lotes de PT y destinos
    f = client.get("/api/trazabilidad/lote-insumo/ALM-2026-09A", headers=tokens["jefe"]).get_json()["resultados"][0]
    assert lote_orden in {u["orden"] for u in f["usos"]}
    mio = next(p for p in f["lotesPT"] if p["codigo"] == lote_orden)
    assert mio["despachos"][0]["destino"] == "Tienda Barranco" and "Tienda Barranco" in f["resumen"]["destinos"]


def test_trazabilidad_buscar_y_no_encontrado(client, tokens):
    r = client.get("/api/trazabilidad/buscar?q=L-2026-01", headers=tokens["op1"]).get_json()
    assert any(x["tipo"] == "PT" and x["codigo"] == "L-2026-017" for x in r)
    assert any(x["tipo"] == "INSUMO" for x in client.get("/api/trazabilidad/buscar?q=CAC", headers=tokens["op1"]).get_json())
    assert client.get("/api/trazabilidad/buscar?q=%25", headers=tokens["op1"]).get_json() == []          # el comodín no se interpreta
    assert client.get("/api/trazabilidad/lote-pt/NOEXISTE", headers=tokens["op1"]).status_code == 404
    assert client.get("/api/trazabilidad/lote-insumo/NOEXISTE", headers=tokens["op1"]).status_code == 404


def test_semilla_historica_es_trazable(client, tokens):
    t = client.get("/api/trazabilidad/lote-pt/L-2026-017", headers=tokens["gerente"]).get_json()
    assert t["lote"]["producto"] == "Gragea de chocolate 200g" and t["lote"]["centro"] == "Maní tostado" and t["resumen"]["despachado"] == 180
    refinado = t["etapas"][0]
    assert refinado["horasEstandar"] == 8.0 and 8.0 <= refinado["horasReales"] <= 9.0 and refinado["responsable"]


def test_ingreso_con_lote_y_salida_fefo_mantienen_stock_igual_a_suma_de_lotes(client, tokens):
    ins = next(i for i in client.get("/api/inventario", headers=tokens["almacen"]).get_json() if i["insumo"] == "Pasas morenas")
    r = client.post(f"/api/inventario/{ins['id']}/movimientos", headers=tokens["almacen"],
                    json={"tipo": "INGRESO", "cantidad": 50, "lote": "PAS-TEST-01", "proveedor": "Proveedor de prueba", "vencimiento": "2028-01-31"})
    assert r.status_code == 200 and r.get_json()["lote"] == "PAS-TEST-01"
    assert client.post(f"/api/inventario/{ins['id']}/movimientos", headers=tokens["almacen"],
                       json={"tipo": "INGRESO", "cantidad": 5, "vencimiento": "31/01/2028"}).status_code == 400
    lotes = client.get(f"/api/inventario/{ins['id']}/lotes", headers=tokens["almacen"]).get_json()
    assert any(l["codigo"] == "PAS-TEST-01" and l["disponible"] == 50 for l in lotes)
    # salida FEFO: toma primero el lote que vence antes (PAS-2026-08A vence en 2027-08)
    antes = {l["codigo"]: l["disponible"] for l in lotes}
    assert client.post(f"/api/inventario/{ins['id']}/movimientos", headers=tokens["almacen"], json={"tipo": "SALIDA", "cantidad": 10, "motivo": "Muestra"}).status_code == 200
    despues = {l["codigo"]: l["disponible"] for l in client.get(f"/api/inventario/{ins['id']}/lotes", headers=tokens["almacen"]).get_json()}
    assert round(antes["PAS-2026-08A"] - despues["PAS-2026-08A"], 3) == 10 and despues["PAS-TEST-01"] == 50


def test_invariante_stock_igual_a_suma_de_lotes(client):
    with transaction() as cur:
        cur.execute("SELECT i.nombre FROM insumos i LEFT JOIN lotes_insumo l ON l.insumo_id = i.id "
                    "GROUP BY i.id HAVING abs(i.stock_actual - COALESCE(sum(l.cantidad_disponible), 0)) > 0.0005")
        assert cur.fetchall() == []
        cur.execute("SELECT p.codigo FROM lotes_pt p JOIN (SELECT lote_pt_id, sum(CASE tipo WHEN 'INGRESO' THEN cantidad ELSE -cantidad END) AS s "
                    "FROM movimientos_pt GROUP BY lote_pt_id) m ON m.lote_pt_id = p.id WHERE m.s <> p.cantidad_disponible")
        assert cur.fetchall() == []


def test_permisos_de_planta_por_rol(client, tokens):
    _liberar_equipos()
    oid = _nueva_gragea(client, tokens)
    eq = _equipo(client, tokens, "R-01")
    ruta = f"/api/produccion/{oid}/etapas/1/iniciar"
    assert client.post(ruta, json={"equipo_id": eq}, headers=tokens["gerente"]).status_code == 403     # solo lectura
    assert client.post(ruta, json={"equipo_id": eq}, headers=tokens["almacen"]).status_code == 403
    assert client.post("/api/produccion", json={"producto_id": 1, "cantidad": 5}, headers=tokens["op1"]).status_code == 403   # el operario no crea órdenes
    assert client.get("/api/producto-terminado", headers=tokens["op1"]).status_code == 403
    assert client.post("/api/lotes-pt/1/despachos", json={"cantidad": 1, "destino": "X"}, headers=tokens["jefe"]).status_code == 403
    assert client.get("/api/trazabilidad/lote-pt/L-2026-017", headers={}).status_code == 401
    assert client.get("/api/responsables", headers=tokens["gerente"]).status_code == 403
    assert client.get("/api/responsables", headers=tokens["jefe"]).status_code == 200
    # un operario no puede asignar la etapa a otra persona
    otro = next(u for u in client.get("/api/responsables", headers=tokens["jefe"]).get_json() if u["nombre"].startswith("Operario de Grageado"))
    assert client.post(ruta, json={"equipo_id": eq, "responsable_id": otro["id"]}, headers=tokens["op1"]).status_code == 403
    assert client.post(ruta, json={"equipo_id": eq, "responsable_id": otro["id"]}, headers=tokens["jefe"]).status_code == 200


def test_auditoria_registra_acciones_de_planta(client, tokens):
    acciones = {r["accion"] for r in client.get("/api/auth/auditoria", headers=tokens["admin"]).get_json()}
    assert {"ORDEN_CREADA", "ETAPA_INICIADA", "CONSUMO_REGISTRADO", "ETAPA_FINALIZADA", "LOTE_PT_CREADO", "DESPACHO_PT"} <= acciones
