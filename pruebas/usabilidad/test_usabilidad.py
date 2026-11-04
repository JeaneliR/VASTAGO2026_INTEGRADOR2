"""APF3 · Casos UA01–UA22. Pruebas automatizadas de usabilidad (ISO/IEC 25010: capacidad de aprendizaje, protección frente a errores
de usuario, asistencia al usuario, participación del usuario) con Playwright y axe-core (WCAG 2.1 A/AA)."""
import time
import pytest
from conftest import BASE, PASSWORD, CAPTURAS, registrar

VISTAS_ADMIN = ["Dashboard", "Inventario", "Producción", "Producto terminado", "Trazabilidad", "Analítica IA",
                "Asistente", "Usuarios", "Auditoría", "Reportes", "Correo y alertas"]


def ir(page, nombre):
    page.locator("ul.nav").get_by_role("button", name=nombre, exact=True).click()
    page.wait_for_load_state("networkidle")


# ---------------------------------------------------------------- Capacidad de aprendizaje
def test_ua01_pagina_inicial_declara_idioma_titulo_y_viewport(browser):
    p = browser.new_page()
    p.goto(BASE + "/")
    assert p.locator("html").get_attribute("lang") == "es"
    assert "Vástago" in p.title()
    assert p.locator("meta[name=viewport]").count() == 1
    p.close()


def test_ua02_login_por_teclado_con_etiquetas_asociadas(browser):
    """El usuario nuevo puede ingresar solo con teclado: Tab/Tab/Enter, con campos etiquetados."""
    p = browser.new_page()
    p.goto(BASE + "/")
    campo_correo, campo_clave = p.get_by_label("Correo corporativo"), p.get_by_label("Contraseña")
    assert campo_correo.is_visible() and campo_clave.is_visible()
    campo_correo.focus()
    assert p.evaluate("document.activeElement.id") == "email"
    p.keyboard.press("Tab")
    assert p.evaluate("document.activeElement.id") == "pwd"
    p.keyboard.press("Tab")
    assert p.evaluate("document.activeElement.textContent.trim()") == "Ingresar"
    p.close()


def test_ua03_tarea_consultar_cobertura_de_suero_en_pocos_pasos(gerente):
    """Tarea 1: desde el Dashboard, saber para cuánto alcanza el suero de leche. Mide clics y tiempo."""
    t0, clics = time.perf_counter(), 0
    ir(gerente, "Asistente"); clics += 1
    gerente.get_by_role("button", name="¿Para cuánto alcanza el suero de leche?").first.click(); clics += 1
    gerente.get_by_text("Cobertura", exact=False).first.wait_for(timeout=15000)
    seg = round(time.perf_counter() - t0, 2)
    cuerpo = gerente.locator("main, .main, body").first.inner_text()
    assert "suero" in cuerpo.lower() and "día" in cuerpo.lower()
    gerente.screenshot(path=str(CAPTURAS / "U1_asistente_suero.png"))
    registrar("tarea1_cobertura_suero", {"clics": clics, "segundos": seg, "objetivo_clics": 2})
    assert clics <= 3 and seg < 10


def test_ua04_tarea_descargar_reporte_excel_en_pocos_pasos(gerente):
    """Tarea 2: exportar el inventario a Excel desde cualquier pantalla."""
    t0, clics = time.perf_counter(), 0
    ir(gerente, "Reportes"); clics += 1
    with gerente.expect_download(timeout=30000) as d:
        gerente.get_by_role("button", name="Descargar Excel").click(); clics += 1
    nombre = d.value.suggested_filename
    seg = round(time.perf_counter() - t0, 2)
    assert nombre.endswith(".xlsx")
    gerente.screenshot(path=str(CAPTURAS / "U2_reportes.png"))
    registrar("tarea2_reporte_excel", {"clics": clics, "segundos": seg, "archivo": nombre, "objetivo_clics": 2})
    assert clics <= 3


def test_ua05_navegacion_consistente_todas_las_vistas_del_administrador(admin):
    """Cada módulo tiene un título visible y se llega con un solo clic desde el menú."""
    vistos = []
    for nombre in VISTAS_ADMIN:
        ir(admin, nombre)
        assert admin.locator("h1, h2").first.is_visible(), nombre
        vistos.append(nombre)
    registrar("vistas_navegables_un_clic", {"total": len(vistos), "vistas": vistos})
    assert len(vistos) == len(VISTAS_ADMIN)


def test_ua06_todos_los_botones_tienen_nombre_accesible(admin):
    for nombre in ("Dashboard", "Inventario", "Reportes", "Correo y alertas"):
        ir(admin, nombre)
        sin = admin.evaluate("""() => [...document.querySelectorAll('button')].filter(b => !(b.innerText||'').trim() && !b.getAttribute('aria-label')).length""")
        assert sin == 0, f"{nombre}: {sin} botones sin nombre"


# ---------------------------------------------------------------- Protección frente a errores de usuario
def test_ua07_credenciales_incorrectas_mensaje_claro_y_sin_filtrar_datos(browser):
    p = browser.new_page()
    p.goto(BASE + "/")
    p.get_by_label("Correo corporativo").fill("operario2@vastagoyco.pe")
    p.get_by_label("Contraseña").fill("clave-equivocada-1")
    p.get_by_role("button", name="Ingresar").click()
    alerta = p.get_by_role("alert")
    alerta.wait_for(timeout=15000)
    texto = alerta.inner_text()
    assert texto and "Traceback" not in texto and "SELECT" not in texto and "psycopg" not in texto
    assert p.get_by_label("Contraseña").input_value() == ""             # la clave se limpia tras el error
    p.screenshot(path=str(CAPTURAS / "U3_error_login.png"))
    registrar("mensaje_error_login", texto)
    p.close()


def test_ua08_formulario_de_login_impide_envio_vacio_o_con_correo_invalido(browser):
    p = browser.new_page()
    p.goto(BASE + "/")
    p.get_by_role("button", name="Ingresar").click()
    assert p.evaluate("document.querySelector('#email').validity.valueMissing") is True
    p.get_by_label("Correo corporativo").fill("esto-no-es-un-correo")
    p.get_by_label("Contraseña").fill("x")
    assert p.evaluate("document.querySelector('#email').validity.typeMismatch") is True
    p.close()


def test_ua09_cantidad_negativa_o_cero_se_bloquea_en_movimientos_de_inventario(admin):
    ir(admin, "Inventario")
    admin.get_by_role("button", name="Movimiento y lotes").first.click()
    cantidad = admin.locator("input[type=number]").first
    cantidad.fill("-5")
    assert admin.evaluate("document.querySelector('input[type=number]').validity.rangeUnderflow") is True
    cantidad.fill("")
    assert admin.evaluate("document.querySelector('input[type=number]').validity.valueMissing") is True
    admin.screenshot(path=str(CAPTURAS / "U4_validacion_cantidad.png"))
    admin.get_by_role("button", name="Cerrar", exact=True).click()


def test_ua10_salida_mayor_al_stock_se_rechaza_con_mensaje_en_pantalla(admin):
    ir(admin, "Inventario")
    admin.get_by_role("button", name="Movimiento y lotes").first.click()
    admin.locator("select").first.select_option("SALIDA")
    admin.locator("input[type=number]").first.fill("999999")
    admin.get_by_role("button", name="Guardar").click()
    err = admin.locator("p.err").first
    err.wait_for(timeout=10000)
    assert err.inner_text().strip()
    admin.screenshot(path=str(CAPTURAS / "U5_error_salida_mayor_stock.png"))
    assert "insuficiente" in err.inner_text().lower()
    registrar("mensaje_salida_mayor_al_stock", err.inner_text())
    admin.get_by_role("button", name="Cerrar", exact=True).click()


def test_ua11_correo_destinatario_invalido_no_se_guarda(admin):
    ir(admin, "Correo y alertas")
    campo = admin.get_by_label("Correo destinatario")
    campo.fill("sin-arroba")
    assert admin.evaluate("document.querySelector('#correo-destino').validity.typeMismatch") is True
    admin.screenshot(path=str(CAPTURAS / "U6_correo_validacion.png"))


def test_ua12_desactivar_usuario_pide_confirmacion_y_cancelar_no_cambia_nada(admin):
    ir(admin, "Usuarios")
    mensajes = []
    admin.once("dialog", lambda d: (mensajes.append(d.message), d.dismiss()))
    admin.locator("table tbody tr").first.wait_for(timeout=15000)
    antes = admin.locator("table tbody tr").count()
    boton = admin.get_by_role("button", name="Desactivar").first
    boton.click()
    assert mensajes and "Desactivar" in mensajes[0]
    assert admin.locator("table tbody tr").count() == antes
    registrar("confirmacion_desactivar_usuario", mensajes[0])


# ---------------------------------------------------------------- Asistencia al usuario
def test_ua13_asistente_muestra_sugerencias_de_ayuda_al_abrir(gerente):
    ir(gerente, "Asistente")
    gerente.locator(".asis-sug button").first.wait_for(timeout=15000)
    n = gerente.locator(".asis-sug button").count()
    registrar("sugerencias_iniciales_asistente", n)
    assert n >= 3


def test_ua14_pregunta_no_entendida_recibe_orientacion_y_no_error(gerente):
    ir(gerente, "Asistente")
    caja = gerente.get_by_label("Escribe tu pregunta")
    caja.fill("blablabla qwerty")
    caja.press("Enter")
    from playwright.sync_api import expect
    expect(gerente.locator(".msg.bot").last).not_to_have_text("Calculando…", timeout=15000)
    texto = gerente.locator(".msg.bot").last.inner_text()
    assert "Traceback" not in texto and len(texto) > 20
    gerente.screenshot(path=str(CAPTURAS / "U7_asistente_no_entiende.png"))
    registrar("respuesta_pregunta_no_entendida", texto[:300])


def test_ua15_campos_de_reportes_tienen_etiqueta_y_ayuda(gerente):
    ir(gerente, "Reportes")
    for etiqueta in ("Reporte", "Buscar", "Estado"):
        assert gerente.get_by_label(etiqueta, exact=True).count() == 1, etiqueta
    assert gerente.locator("#reporte-q").get_attribute("placeholder")


# ---------------------------------------------------------------- Participación del usuario
def test_ua16_dashboard_muestra_indicadores_y_alertas_accionables(gerente):
    ir(gerente, "Dashboard")
    gerente.screenshot(path=str(CAPTURAS / "U8_dashboard.png"), full_page=True)
    kpis = gerente.locator(".kpi, .kpis > *, .card").count()
    registrar("elementos_indicadores_dashboard", kpis)
    assert kpis >= 3


def test_ua17_la_sesion_se_conserva_al_recargar(gerente):
    gerente.reload()
    gerente.locator("ul.nav").wait_for(timeout=20000)
    assert gerente.locator("ul.nav").is_visible()


def test_ua18_carga_inicial_del_dashboard_es_rapida(browser):
    ctx = browser.new_context()
    p = ctx.new_page()
    t = time.perf_counter()
    p.goto(BASE + "/")
    p.get_by_label("Correo corporativo").wait_for()
    seg = round(time.perf_counter() - t, 2)
    registrar("segundos_hasta_formulario_login", seg)
    assert seg < 3
    ctx.close()


def test_ua19_diseno_adaptable_sin_desplazamiento_horizontal_en_movil(browser):
    ctx = browser.new_context(viewport={"width": 375, "height": 740})
    p = ctx.new_page()
    p.goto(BASE + "/")
    ancho = p.evaluate("[document.documentElement.scrollWidth, window.innerWidth]")
    p.screenshot(path=str(CAPTURAS / "U9_login_movil.png"))
    registrar("login_movil_scroll_vs_ancho", ancho)
    assert ancho[0] <= ancho[1] + 1
    ctx.close()


def test_ua20_menu_movil_se_abre_y_cierra(browser):
    from conftest import _sesion
    ctx, p = _sesion(browser, "gerente@vastagoyco.pe", 375, 740)
    boton = p.locator("button.mobile-menu")
    assert boton.is_visible()
    boton.click()
    assert p.locator("aside.sidebar.open").count() == 1
    p.screenshot(path=str(CAPTURAS / "U10_menu_movil.png"))
    ctx.close()


# ---------------------------------------------------------------- Accesibilidad (WCAG 2.1 A/AA con axe-core)
def test_ua21_accesibilidad_axe_en_todas_las_vistas(admin, axe):
    resumen, graves = {}, []
    for nombre in VISTAS_ADMIN:
        ir(admin, nombre)
        admin.evaluate(axe)
        res = admin.evaluate("""() => axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})
                                     .then(r => r.violations.map(v => ({id:v.id, impact:v.impact, nodos:v.nodes.length, ayuda:v.help})))""")
        resumen[nombre] = res
        graves += [(nombre, v["id"], v["impact"], v["nodos"]) for v in res if v["impact"] in ("critical", "serious")]
    registrar("axe_violaciones_por_vista", resumen)
    registrar("axe_graves_o_criticas", graves)
    assert not graves, graves


def test_ua22_accesibilidad_axe_en_formularios_modales(admin, axe):
    """Los formularios que se abren sobre la vista (movimiento de inventario, nuevo usuario) también cumplen WCAG 2.1 A/AA."""
    consulta = """() => axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})
                       .then(r => r.violations.map(v => ({id:v.id, impact:v.impact, nodos:v.nodes.length})))"""
    resultado = {}
    ir(admin, "Inventario")
    admin.get_by_role("button", name="Movimiento y lotes").first.click()
    admin.locator("input[type=number]").first.wait_for()
    admin.evaluate(axe)
    resultado["Inventario · movimiento y lotes"] = admin.evaluate(consulta)
    admin.get_by_role("button", name="Cerrar", exact=True).click()
    ir(admin, "Usuarios")
    admin.get_by_role("button", name="Nuevo usuario").first.click()
    admin.get_by_role("dialog").or_(admin.locator(".modal-bg")).first.wait_for()
    admin.evaluate(axe)
    resultado["Usuarios · nuevo usuario"] = admin.evaluate(consulta)
    registrar("axe_violaciones_formularios_modales", resultado)
    assert all(not v for v in resultado.values()), resultado
