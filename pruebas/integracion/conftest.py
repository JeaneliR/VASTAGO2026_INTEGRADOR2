"""Fixtures de las pruebas de integración por HTTP (caja negra) contra una instancia en ejecución.

Variables de entorno:
  VASTAGO_URL        URL base (por defecto http://127.0.0.1:8100; usa la URL de Render para probar la nube)
  VASTAGO_PASSWORD   contraseña de las cuentas demo (no se guarda en el repositorio)
"""
import os
import pytest
import requests

BASE = os.environ.get("VASTAGO_URL", "http://127.0.0.1:8100").rstrip("/")
PASSWORD = os.environ.get("VASTAGO_PASSWORD", "")
CUENTAS = {"admin": "admin@vastagoyco.pe", "gerente": "gerente@vastagoyco.pe",
           "almacen": "almacen@vastagoyco.pe", "operario": "operario1@vastagoyco.pe"}


@pytest.fixture(scope="session")
def base():
    return BASE


@pytest.fixture(scope="session")
def http():
    s = requests.Session()
    s.headers["X-Requested-With"] = "vastago-web"
    s.timeout = 30
    return s


@pytest.fixture(scope="session")
def tokens(http):
    if not PASSWORD:
        pytest.skip("Define VASTAGO_PASSWORD para ejecutar las pruebas de integración")
    out = {}
    for rol, email in CUENTAS.items():
        r = http.post(f"{BASE}/api/auth/login", json={"email": email, "password": PASSWORD}, timeout=60)
        assert r.status_code == 200, f"login {rol}: {r.status_code}"
        out[rol] = {"Authorization": "Bearer " + r.json()["access_token"]}
    return out
