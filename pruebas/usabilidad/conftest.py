"""Fixtures de usabilidad (Playwright + axe-core). Variables: VASTAGO_URL, VASTAGO_PASSWORD, AXE_JS (ruta a axe.min.js)."""
import json, os, pathlib, time
import pytest
from playwright.sync_api import sync_playwright

BASE = os.environ.get("VASTAGO_URL", "http://127.0.0.1:8100").rstrip("/")
PASSWORD = os.environ.get("VASTAGO_PASSWORD", "")
AXE_JS = os.environ.get("AXE_JS", "/tmp/apf3npm/node_modules/axe-core/axe.min.js")
SALIDA = pathlib.Path(os.environ.get("USAB_SALIDA", pathlib.Path(__file__).resolve().parents[2] / "evidencias" / "apf3"))
CAPTURAS = SALIDA / "capturas_usabilidad"
CAPTURAS.mkdir(parents=True, exist_ok=True)
METRICAS = {}


def registrar(clave, valor):
    METRICAS[clave] = valor


@pytest.fixture(scope="session")
def browser():
    if not PASSWORD:
        pytest.skip("Define VASTAGO_PASSWORD")
    with sync_playwright() as p:
        b = p.chromium.launch()
        yield b
        b.close()


def _sesion(browser, email, ancho=1366, alto=800):
    ctx = browser.new_context(viewport={"width": ancho, "height": alto}, locale="es-PE", accept_downloads=True)
    page = ctx.new_page()
    page.goto(BASE + "/")
    page.get_by_label("Correo corporativo").fill(email)
    page.get_by_label("Contraseña").fill(PASSWORD)
    page.get_by_role("button", name="Ingresar").click()
    page.locator("main.content").wait_for(timeout=20000)
    return ctx, page


@pytest.fixture(scope="session")
def admin(browser):
    ctx, page = _sesion(browser, "admin@vastagoyco.pe")
    yield page
    ctx.close()


@pytest.fixture(scope="session")
def gerente(browser):
    ctx, page = _sesion(browser, "gerente@vastagoyco.pe")
    yield page
    ctx.close()


@pytest.fixture(scope="session", autouse=True)
def guardar_metricas():
    yield
    (SALIDA / "U_metricas_usabilidad.json").write_text(json.dumps(METRICAS, ensure_ascii=False, indent=2), encoding="utf-8")


@pytest.fixture()
def axe():
    return pathlib.Path(AXE_JS).read_text(encoding="utf-8")
