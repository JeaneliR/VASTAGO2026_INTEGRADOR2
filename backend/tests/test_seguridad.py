"""Pruebas de autenticación, autorización, sesiones y controles de seguridad."""
import jwt, time
from conftest import login, PWD


def test_login_correcto_devuelve_token_y_cookie_httponly(client):
    r = login(client, "admin@vastagoyco.pe")
    assert r.status_code == 200
    assert r.get_json()["usuario"]["rol"] == "Administrador"
    cookie = r.headers.get("Set-Cookie")
    assert "HttpOnly" in cookie and "SameSite=Strict" in cookie and "Path=/api/auth" in cookie


def test_login_incorrecto_mensaje_generico(client):
    a = login(client, "admin@vastagoyco.pe", "mala")
    b = login(client, "noexiste@vastagoyco.pe", "mala")
    assert a.status_code == b.status_code == 401
    assert a.get_json() == b.get_json()                      # no permite enumerar usuarios


def test_sin_token_401(client):
    assert client.get("/api/inventario").status_code == 401


def test_token_manipulado_o_alg_none_rechazado(client, tokens):
    assert client.get("/api/inventario", headers={"Authorization": "Bearer abc.def.ghi"}).status_code == 401
    none_token = jwt.encode({"sub": "1", "rol": "Administrador", "exp": time.time() + 600}, key=None, algorithm="none")
    assert client.get("/api/auth/usuarios", headers={"Authorization": "Bearer " + none_token}).status_code == 401


def test_token_expirado(client, app):
    t = jwt.encode({"sub": "1", "rol": "Administrador", "exp": time.time() - 10}, app.config["JWT_SECRET"], algorithm="HS256")
    assert client.get("/api/inventario", headers={"Authorization": "Bearer " + t}).status_code == 401


def test_escalada_de_privilegios_bloqueada_por_rol(client, tokens):
    assert client.get("/api/auth/usuarios", headers=tokens["almacen"]).status_code == 403
    assert client.get("/api/auth/auditoria", headers=tokens["jefe"]).status_code == 403
    assert client.post("/api/produccion", json={"producto_id": 1, "cantidad": 10}, headers=tokens["almacen"]).status_code == 403
    assert client.post("/api/inventario/1/movimientos", json={"cantidad": 5}, headers=tokens["jefe"]).status_code == 403
    assert client.get("/api/inventario", headers=tokens["gerente"]).status_code == 403
    assert client.get("/api/auth/usuarios", headers=tokens["admin"]).status_code == 200


def test_bloqueo_por_intentos_fallidos(client):
    for _ in range(5):
        login(client, "almacen@vastagoyco.pe", "incorrecta")
    r = login(client, "almacen@vastagoyco.pe", PWD)          # aun con la clave correcta
    assert r.status_code == 423
    from app.db import transaction
    with transaction() as cur:                                # restablecer para otras pruebas
        cur.execute("UPDATE usuarios SET intentos_fallidos=0, bloqueado_hasta=NULL WHERE email='almacen@vastagoyco.pe'")


def test_refresh_rota_el_token_y_detecta_reutilizacion(client):
    r0 = login(client, "gerente@vastagoyco.pe")
    viejo = r0.headers["Set-Cookie"].split(";")[0]            # vastago_rt=<token original>
    h = {"X-Requested-With": "vastago-web"}
    assert client.post("/api/auth/refresh", headers=h).status_code == 200      # rota el token
    # un atacante que reutiliza el token ya rotado/revocado es rechazado
    atacante = client.application.test_client()                # cliente sin jar: solo presenta el token robado
    r = atacante.post("/api/auth/refresh", headers={**h, "Cookie": viejo})
    assert r.status_code == 401


def test_refresh_sin_cabecera_csrf_rechazado(client):
    login(client, "gerente@vastagoyco.pe")
    assert client.post("/api/auth/refresh").status_code == 403


def test_logout_revoca_sesion(client, tokens):
    login(client, "jefe.produccion@vastagoyco.pe")
    h = {"X-Requested-With": "vastago-web"}
    tk = login(client, "jefe.produccion@vastagoyco.pe").get_json()["access_token"]
    assert client.post("/api/auth/logout", headers={"Authorization": "Bearer " + tk}).status_code == 200
    assert client.post("/api/auth/refresh", headers=h).status_code == 401


def test_politica_de_contrasenas_y_hash_bcrypt(client, tokens):
    r = client.post("/api/auth/usuarios", headers=tokens["admin"],
                    json={"nombre": "Test", "email": "t1@vastagoyco.pe", "rol": "Gerente", "password": "corta"})
    assert r.status_code == 400
    r = client.post("/api/auth/usuarios", headers=tokens["admin"],
                    json={"nombre": "Test", "email": "t2@vastagoyco.pe", "rol": "Gerente", "password": "ClaveSegura#2026", "telefono": "999111222"})
    assert r.status_code == 201
    from app.db import transaction
    with transaction() as cur:
        cur.execute("SELECT password_hash, telefono_cifrado FROM usuarios WHERE email='t2@vastagoyco.pe'")
        row = cur.fetchone()
    assert row["password_hash"].startswith("$2b$")           # bcrypt, jamás texto plano
    assert b"999111222" not in bytes(row["telefono_cifrado"])  # AES-GCM: no se ve el dato en la BD


def test_cifrado_aes_gcm_ida_y_vuelta_y_manipulacion(app):
    from app.security import cifrar, descifrar
    import pytest
    with app.app_context():
        blob = cifrar("987654321")
        assert descifrar(blob) == "987654321"
        alterado = bytearray(blob); alterado[-1] ^= 1
        with pytest.raises(Exception):
            descifrar(bytes(alterado))                       # el tag GCM detecta alteraciones


def test_inyeccion_sql_no_funciona(client, tokens):
    r = client.post("/api/auth/login", json={"email": "admin@vastagoyco.pe' OR '1'='1", "password": "x' OR '1'='1"})
    assert r.status_code == 401
    r = client.get("/api/inventario/1%27%20OR%201=1--/movimientos", headers=tokens["admin"])
    assert r.status_code == 404


def test_cabeceras_de_seguridad(client):
    r = client.get("/api/health")
    for h in ("X-Content-Type-Options", "X-Frame-Options", "Content-Security-Policy", "Referrer-Policy"):
        assert h in r.headers
    assert r.headers["Cache-Control"] == "no-store"


def test_errores_sin_traza(client, tokens):
    r = client.post("/api/produccion", data="no-json", headers=tokens["admin"], content_type="text/plain")
    assert r.status_code in (400, 415) and "Traceback" not in r.get_data(as_text=True)


def test_auditoria_registra_y_es_inmutable(client, tokens):
    login(client, "admin@vastagoyco.pe", "mala")
    logs = client.get("/api/auth/auditoria", headers=tokens["admin"]).get_json()
    assert any(l["accion"] == "LOGIN_FALLIDO" for l in logs)
    from app.db import transaction
    import psycopg2, pytest
    with pytest.raises(psycopg2.Error):
        with transaction() as cur:
            cur.execute("DELETE FROM auditoria")
