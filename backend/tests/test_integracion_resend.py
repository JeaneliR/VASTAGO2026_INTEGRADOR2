"""APF3 · Pruebas automatizadas de integración con el sistema externo Resend (API de correo).

Se levanta un servidor HTTP local que imita el contrato de POST /emails de Resend y se redirige hacia él
el adaptador real (correo_service.enviar_proveedor). Así se prueba la serialización HTTP real
(cabeceras, JSON, timeouts, redirecciones, códigos de estado) sin enviar correos reales ni gastar cuota.
"""
import json
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest
import requests

from app.db import transaction
from app.services import correo_service as service

CLAVE_FALSA = "re_clave_de_prueba_no_real"


class FakeResend:
    """Estado compartido del servidor falso: respuesta programada y peticiones recibidas."""
    def __init__(self):
        self.estado = 200
        self.cuerpo = {"id": "resend-msg-001"}
        self.demora = 0
        self.redirigir = False
        self.recibidas = []


@pytest.fixture(scope="module")
def resend_falso():
    fake = FakeResend()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def do_POST(self):
            largo = int(self.headers.get("Content-Length", 0))
            cuerpo = json.loads(self.rfile.read(largo) or b"{}")
            fake.recibidas.append({"ruta": self.path, "headers": dict(self.headers), "json": cuerpo})
            if fake.demora:
                time.sleep(fake.demora)
            if fake.redirigir:
                self.send_response(302)
                self.send_header("Location", "http://127.0.0.1:9/robo")
                self.end_headers()
                return
            datos = json.dumps(fake.cuerpo).encode()
            self.send_response(fake.estado)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(datos)))
            self.end_headers()
            self.wfile.write(datos)

    servidor = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    hilo = threading.Thread(target=servidor.serve_forever, daemon=True)
    hilo.start()
    fake.url = f"http://127.0.0.1:{servidor.server_port}"
    yield fake
    servidor.shutdown()


@pytest.fixture()
def api(app, resend_falso, monkeypatch):
    """Redirige las llamadas del adaptador hacia el servidor falso y activa la 'clave' de Resend."""
    resend_falso.estado, resend_falso.cuerpo = 200, {"id": "resend-msg-001"}
    resend_falso.demora, resend_falso.redirigir = 0, False
    resend_falso.recibidas.clear()
    original = requests.post

    def post_redirigido(url, **kw):
        assert url == "https://api.resend.com/emails", "El adaptador debe usar la URL fija de Resend"
        if resend_falso.demora:
            kw["timeout"] = (1, 0.5)         # acelera la prueba de timeout manteniendo la lógica
        return original(resend_falso.url + "/emails", **kw)

    monkeypatch.setattr(service.requests, "post", post_redirigido)
    app.config["RESEND_API_KEY"] = CLAVE_FALSA
    app.config["EMAIL_TO"] = "gerencia@vastagoyco.pe"
    with app.app_context():
        with transaction() as cur:
            cur.execute("DELETE FROM correo_envios")
        yield resend_falso
        app.config["RESEND_API_KEY"] = ""
        app.config["EMAIL_TO"] = ""
        with transaction() as cur:
            cur.execute("DELETE FROM correo_envios")


def _forzar_critico(client, tokens):
    """Garantiza al menos un insumo bajo el mínimo para que exista algo que notificar."""
    items = client.get("/api/inventario", headers=tokens["admin"]).get_json()
    return any(i["estado"] == "crit" for i in items)


def _ultimo(client, tokens):
    return client.get("/api/correo", headers=tokens["admin"]).get_json()["historial"][0]


def _solicitar_y_procesar(client, tokens):
    assert _forzar_critico(client, tokens), "El dato demo debe tener un insumo crítico"
    r = client.post("/api/correo/enviar", headers=tokens["gerente"])
    assert r.status_code == 202
    assert service.procesar_uno()
    return _ultimo(client, tokens)


def test_int01_envio_exitoso_respeta_el_contrato_http_de_resend(client, tokens, api):
    fila = _solicitar_y_procesar(client, tokens)
    assert fila["estado"] == "Aceptado" and fila["proveedor_id"] == "resend-msg-001"
    peticion = api.recibidas[-1]
    assert peticion["ruta"] == "/emails"
    assert peticion["headers"]["Authorization"] == "Bearer " + CLAVE_FALSA
    assert peticion["headers"]["Content-Type"] == "application/json"
    assert peticion["headers"]["Idempotency-Key"].startswith("vastago-")
    cuerpo = peticion["json"]
    assert set(cuerpo) == {"from", "to", "subject", "html"}
    assert cuerpo["to"] == ["gerencia@vastagoyco.pe"] and "Stock actual" in cuerpo["html"]


def test_int02_resend_responde_201_tambien_se_acepta(client, tokens, api):
    api.estado = 201
    assert _solicitar_y_procesar(client, tokens)["estado"] == "Aceptado"


@pytest.mark.parametrize("codigo,fragmento", [
    (401, "clave de Resend no es válida"),
    (403, "no autoriza"),
    (422, "rechazó los datos"),
    (429, "límite de envíos"),
    (500, "HTTP 500"),
])
def test_int03_errores_del_proveedor_se_muestran_como_fallido_con_mensaje_claro(client, tokens, api, codigo, fragmento):
    api.estado, api.cuerpo = codigo, {"message": "error simulado"}
    fila = _solicitar_y_procesar(client, tokens)
    assert fila["estado"] == "Fallido" and fila["proveedor_id"] is None
    assert fragmento in fila["error"]
    assert CLAVE_FALSA not in json.dumps(fila)       # la clave nunca llega a la interfaz


def test_int04_respuesta_sin_identificador_no_se_acepta(client, tokens, api):
    api.cuerpo = {"ok": True}
    assert _solicitar_y_procesar(client, tokens)["estado"] == "Fallido"


def test_int05_timeout_del_proveedor_queda_fallido_y_reintentable(client, tokens, api):
    api.demora = 2
    fila = _solicitar_y_procesar(client, tokens)
    assert fila["estado"] == "Fallido" and "No se pudo confirmar" in fila["error"]
    api.demora = 0
    assert client.post(f"/api/correo/{fila['id']}/reintentar", headers=tokens["admin"]).status_code == 202
    assert service.procesar_uno()
    assert _ultimo(client, tokens)["estado"] == "Aceptado"


def test_int06_reintento_reutiliza_la_misma_clave_de_idempotencia(client, tokens, api):
    api.estado = 500
    fila = _solicitar_y_procesar(client, tokens)
    api.estado = 200
    client.post(f"/api/correo/{fila['id']}/reintentar", headers=tokens["admin"])
    service.procesar_uno()
    claves = {p["headers"]["Idempotency-Key"] for p in api.recibidas}
    assert len(api.recibidas) == 2 and len(claves) == 1


def test_int07_no_se_siguen_redirecciones_del_proveedor(client, tokens, api):
    api.redirigir = True
    assert _solicitar_y_procesar(client, tokens)["estado"] == "Fallido"
    assert len(api.recibidas) == 1                   # no se llamó al destino redirigido


def test_int08_sin_clave_configurada_el_sistema_no_intenta_enviar(client, tokens, api, app):
    app.config["RESEND_API_KEY"] = ""
    r = client.post("/api/correo/enviar", headers=tokens["admin"])
    assert r.status_code == 400 and "Resend" in r.get_json()["error"]
    assert api.recibidas == []


def test_int09_auditoria_registra_aceptado_y_fallido_sin_secretos(client, tokens, api):
    _solicitar_y_procesar(client, tokens)
    api.estado = 403
    _solicitar_y_procesar(client, tokens)
    registros = client.get("/api/auth/auditoria", headers=tokens["admin"]).get_json()
    acciones = [r.get("accion") for r in registros]
    assert "CORREO_ACEPTADO" in acciones and "CORREO_FALLIDO" in acciones
    assert CLAVE_FALSA not in json.dumps(registros)


def test_int10_solo_roles_autorizados_disparan_la_integracion(client, tokens, api):
    assert client.post("/api/correo/enviar", headers=tokens["op1"]).status_code == 403
    assert api.recibidas == []
