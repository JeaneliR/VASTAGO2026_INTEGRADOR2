import os, subprocess, sys
import pytest
from urllib.parse import urlparse

os.environ.setdefault("RATELIMIT_ENABLED", "false")
os.environ.setdefault("BCRYPT_ROUNDS", "4")


@pytest.fixture(scope="session")
def app():
    target=urlparse(os.environ.get('DATABASE_URL',''))
    if target.hostname not in ('127.0.0.1','localhost') or not target.path.endswith('_test'):
        raise RuntimeError('Las pruebas solo pueden recrear una base local con nombre terminado en _test')
    from app import create_app
    from app.seed import main
    os.environ["BCRYPT_ROUNDS"] = "4"
    main()                                   # esquema limpio + datos demo
    return create_app({"TESTING": True, "RATELIMIT_ENABLED": False, "BCRYPT_ROUNDS": 4, "EMAIL_SCHEDULER_ENABLED":False, "RESEND_API_KEY":""})


@pytest.fixture()
def client(app):
    return app.test_client()


PWD = "Vastago#2026!"


def login(client, email, password=PWD):
    return client.post("/api/auth/login", json={"email": email, "password": password})


@pytest.fixture()
def tokens(client):
    out = {}
    for rol, email in {"admin": "admin@vastagoyco.pe", "jefe": "jefe.produccion@vastagoyco.pe",
                       "almacen": "almacen@vastagoyco.pe", "gerente": "gerente@vastagoyco.pe",
                       "op1": "operario1@vastagoyco.pe", "op2": "operario2@vastagoyco.pe"}.items():
        out[rol] = {"Authorization": "Bearer " + login(client, email).get_json()["access_token"]}
    return out
