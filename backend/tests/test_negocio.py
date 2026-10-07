"""Pruebas funcionales (requerimientos de inventario, producción y analítica)."""


def test_inventario_lista_con_estado(client, tokens):
    r = client.get("/api/inventario", headers=tokens["almacen"]).get_json()
    assert len(r) == 12
    leche = next(i for i in r if i["insumo"] == "Leche en polvo")
    assert leche["estado"] == "crit"


def test_ingreso_actualiza_stock_via_trigger(client, tokens):
    r = client.get("/api/inventario", headers=tokens["almacen"]).get_json()
    leche = next(i for i in r if i["insumo"] == "Leche en polvo")
    out = client.post(f"/api/inventario/{leche['id']}/movimientos", json={"tipo": "INGRESO", "cantidad": 100, "motivo": "Compra"},
                      headers=tokens["almacen"]).get_json()
    assert out["stock"] == leche["stock"] + 100 and out["estado"] == "ok"
    h = client.get(f"/api/inventario/{leche['id']}/movimientos", headers=tokens["almacen"]).get_json()
    assert h[0]["tipo"] == "INGRESO"


def test_salida_mayor_al_stock_rechazada(client, tokens):
    r = client.post("/api/inventario/4/movimientos", json={"tipo": "SALIDA", "cantidad": 999999}, headers=tokens["almacen"])
    assert r.status_code == 409


def test_validacion_de_cantidades(client, tokens):
    for c in (-5, 0, "abc", None, 10**9):
        assert client.post("/api/inventario/1/movimientos", json={"cantidad": c}, headers=tokens["almacen"]).status_code == 400


def test_crear_orden_y_completar_etapas_descuenta_bom(client, tokens):
    """El descuento de insumos ocurre por etapa y por lote: al cerrar la ruta completa queda el total de la receta."""
    antes = {i["insumo"]: i["stock"] for i in client.get("/api/inventario", headers=tokens["jefe"]).get_json()}
    prods = client.get("/api/productos", headers=tokens["jefe"]).get_json()
    tab = next(p for p in prods if p["nombre"].startswith("Tableta 70"))
    o = client.post("/api/produccion", json={"producto_id": tab["id"], "cantidad": 100}, headers=tokens["jefe"])
    assert o.status_code == 201 and o.get_json()["lote"].startswith("L-2026-")
    oid = o.get_json()["id"]
    lotes = client.get("/api/lotes-insumo", headers=tokens["jefe"]).get_json()
    equipos = {e["codigo"]: e["id"] for e in client.get("/api/equipos", headers=tokens["jefe"]).get_json()}
    for seq, eq in ((1, "R-02"), (2, "M-01"), (3, "E-01")):
        if seq == 2:
            # M-01 sigue ocupada por la orden L-2026-014 (etapa en curso): la regla de equipo ocupado se aplica
            assert client.post(f"/api/produccion/{oid}/etapas/{seq}/iniciar", json={"equipo_id": equipos[eq]}, headers=tokens["op2"]).status_code == 409
            from app.db import transaction
            with transaction() as cur:
                cur.execute("UPDATE orden_etapas SET estado='Completada', fin=now() WHERE estado='En curso' AND equipo_id=%s", (equipos[eq],))
        assert client.post(f"/api/produccion/{oid}/etapas/{seq}/iniciar", json={"equipo_id": equipos[eq]}, headers=tokens["op1"]).status_code == 200
        det = client.get(f"/api/produccion/{oid}", headers=tokens["jefe"]).get_json()
        for ins in det["etapas"][seq - 1]["insumos"]:
            lote = next(l for l in lotes if l["insumo_id"] == ins["insumo_id"])
            r = client.post(f"/api/produccion/{oid}/etapas/{seq}/consumos", json={"lote_insumo_id": lote["id"], "cantidad": ins["planificado"]}, headers=tokens["op1"])
            assert r.status_code == 201, r.get_json()
        body = {"merma_kg": 0.5}
        if seq == 3:
            body["cantidad_producida"] = 98
        assert client.post(f"/api/produccion/{oid}/etapas/{seq}/finalizar", json=body, headers=tokens["op1"]).status_code == 200
    despues = {i["insumo"]: i["stock"] for i in client.get("/api/inventario", headers=tokens["jefe"]).get_json()}
    assert round(antes["Cacao en grano (San Martín)"] - despues["Cacao en grano (San Martín)"], 3) == 6.5   # 0.065 kg x 100
    assert antes["Empaque tableta 100g"] - despues["Empaque tableta 100g"] == 100
    assert client.get(f"/api/produccion/{oid}", headers=tokens["jefe"]).get_json()["estado"] == "Completada"


def test_bom_de_producto(client, tokens):
    prods = client.get("/api/productos", headers=tokens["jefe"]).get_json()
    bom = client.get(f"/api/productos/{prods[0]['id']}/bom", headers=tokens["jefe"]).get_json()
    assert len(bom) >= 3 and "cantidadPorUnidad" in bom[0]


def test_kpis_y_alertas(client, tokens):
    k = client.get("/api/kpis", headers=tokens["gerente"]).get_json()
    assert set(k) == {"quiebresStock", "mermaMes", "ordenesActivas", "precisionModelo"}
    assert len(client.get("/api/alertas", headers=tokens["gerente"]).get_json()) == 4


def test_forecast_estructura(client, tokens):
    f = client.get("/api/forecast", headers=tokens["gerente"]).get_json()
    assert len(f["meses_hist"]) == 24 and len(f["series"]) == 3
    s = f["series"]["Bombones Caja x6"]
    assert len(s["historico"]) == 24 and len(s["forecast"]) == 3 and s["mape"] == 4.5
