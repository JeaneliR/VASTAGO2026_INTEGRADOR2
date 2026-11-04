"""APF3 · Integración de v2 con sistemas externos, vista del cliente HTTP (equivalente a una colección de Insomnia/Postman).

Un cliente externo (requests) consume la API REST desplegada y comprueba contratos, seguridad y formatos de intercambio
(JSON, XLSX, PDF). Sirve para el entorno local y para Render cambiando VASTAGO_URL.
"""
import io
import time
import requests
from openpyxl import load_workbook


def get(http, base, ruta, tok=None, **kw):
    return http.get(base + ruta, headers=tok or {}, timeout=60, **kw)


def test_ir01_health_publico(http, base):
    r = get(http, base, "/api/health")
    assert r.status_code == 200 and r.json() == {"status": "ok"}


def test_ir02_login_correcto_devuelve_token_y_permisos(http, base, tokens):
    assert all(t["Authorization"].startswith("Bearer ey") for t in tokens.values())


def test_ir03_login_incorrecto_no_revela_si_el_usuario_existe(http, base):
    a = http.post(base + "/api/auth/login", json={"email": "admin@vastagoyco.pe", "password": "incorrecta-1"}, timeout=60)
    b = http.post(base + "/api/auth/login", json={"email": "no-existe@vastagoyco.pe", "password": "incorrecta-1"}, timeout=60)
    assert a.status_code == b.status_code == 401
    assert a.json()["error"] == b.json()["error"]


def test_ir04_rutas_protegidas_exigen_token(http, base):
    for ruta in ("/api/inventario", "/api/kpis", "/api/dashboard", "/api/reportes?tipo=inventario", "/api/correo"):
        assert get(http, base, ruta).status_code == 401, ruta


def test_ir05_contrato_json_de_inventario(http, base, tokens):
    r = get(http, base, "/api/inventario", tokens["almacen"])
    assert r.status_code == 200 and r.headers["Content-Type"].startswith("application/json")
    fila = r.json()[0]
    assert {"id", "insumo", "stock", "minimo", "estado", "unidad"} <= set(fila)


def test_ir06_rbac_operario_no_accede_a_correo_ni_usuarios(http, base, tokens):
    assert get(http, base, "/api/correo", tokens["operario"]).status_code == 403
    assert get(http, base, "/api/auth/usuarios", tokens["operario"]).status_code == 403


def test_ir07_admin_ve_estado_del_proveedor_de_correo_sin_exponer_la_clave(http, base, tokens):
    r = get(http, base, "/api/correo", tokens["admin"])
    assert r.status_code == 200 and "proveedor_configurado" in r.json()
    assert "re_" not in r.text and "api_key" not in r.text.lower()


def test_ir08_exportacion_excel_es_un_xlsx_valido(http, base, tokens):
    r = get(http, base, "/api/reportes/exportar?tipo=inventario&formato=xlsx", tokens["gerente"])
    assert r.status_code == 200 and "spreadsheetml" in r.headers["Content-Type"]
    ws = load_workbook(io.BytesIO(r.content)).active
    celdas = [str(c.value) for fila in ws.iter_rows(max_row=8) for c in fila if c.value]
    assert ws.max_row > 10 and "Insumo" in celdas and "Almendra entera" in [str(c.value) for f in ws.iter_rows() for c in f]


def test_ir09_exportacion_pdf_tiene_cabecera_pdf(http, base, tokens):
    r = get(http, base, "/api/reportes/exportar?tipo=inventario&formato=pdf", tokens["gerente"])
    assert r.status_code == 200 and r.content[:5] == b"%PDF-" and "pdf" in r.headers["Content-Type"]


def test_ir10_asistente_responde_con_datos_del_kardex(http, base, tokens):
    r = http.post(base + "/api/asistente/preguntar", headers=tokens["gerente"],
                  json={"pregunta": "¿Para cuánto alcanza el suero de leche?"}, timeout=60)
    assert r.status_code == 200
    texto = str(r.json()).lower()
    assert r.json()["intencion"] == "cobertura" and "suero" in texto and "día" in texto


def test_ir11_entradas_maliciosas_se_rechazan_sin_error_500(http, base, tokens):
    for ruta in ("/api/reportes?tipo=inventario&q=%27%3B%20DROP%20TABLE%20insumos%3B--",
                 "/api/reportes?tipo=otro", "/api/reportes?tipo=inventario&desde=2026-13-45"):
        assert get(http, base, ruta, tokens["gerente"]).status_code < 500, ruta
    r = http.post(base + "/api/asistente/preguntar", headers=tokens["gerente"], json={"pregunta": "<script>alert(1)</script>" * 50}, timeout=60)
    assert r.status_code < 500


def test_ir12_cabeceras_de_seguridad_presentes(http, base):
    h = get(http, base, "/").headers
    for nombre in ("Content-Security-Policy", "X-Content-Type-Options", "X-Frame-Options"):
        assert nombre in h, nombre


def test_ir13_tiempo_de_respuesta_de_endpoints_clave(http, base, tokens):
    for ruta in ("/api/inventario", "/api/kpis", "/api/dashboard"):
        t = time.perf_counter()
        r = get(http, base, ruta, tokens["admin"])
        assert r.status_code == 200 and time.perf_counter() - t < 2.0, ruta


def test_ir14_metodo_no_permitido_y_ruta_inexistente(http, base, tokens):
    assert http.delete(base + "/api/inventario", headers=tokens["admin"], timeout=60).status_code in (404, 405)
    assert get(http, base, "/api/no-existe", tokens["admin"]).status_code == 404
