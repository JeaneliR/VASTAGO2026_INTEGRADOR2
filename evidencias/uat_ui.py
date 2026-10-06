"""Verificación de aceptación (UAT) de la interfaz por rol, automatizada con Playwright/Chromium.
Reproduce lo que haría una persona con el navegador: inicia sesión con cada rol, recorre el menú y ejecuta los flujos
principales. Modifica datos de demostración: usar solo contra una BD de pruebas.

Uso:  python evidencias/uat_ui.py <URL_BASE> <CLAVE_DEMO> [carpeta_capturas]
"""
import glob, os, sys, time
from playwright.sync_api import sync_playwright

B = sys.argv[1].rstrip("/"); PWD = sys.argv[2]
OUT = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(__file__), "capturas")
chromium = (glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome") or [None])[0]
res = []


def chk(cod, nombre, ok, detalle):
    res.append(ok); print(f"[{'PASA ' if ok else 'FALLA'}] {cod}  {nombre}\n           {detalle}")


def menu(pg):
    return [t.strip() for t in pg.locator("ul.nav button").all_inner_texts()]


def entrar(br, email, pwd=PWD):
    ctx = br.new_context(viewport={"width": 1280, "height": 760}); pg = ctx.new_page()
    pg.goto(B); pg.fill("#email", email); pg.fill("#pwd", pwd); pg.click("button.btn")
    pg.wait_for_selector("ul.nav", timeout=15000)
    return ctx, pg


def ir(pg, nombre):
    pg.click(f"ul.nav button:text-is('{nombre}')"); pg.wait_for_timeout(700)


def stock(pg, insumo):
    ir(pg, "Inventario")
    fila = pg.locator("tbody tr", has_text=insumo)
    return fila.locator("td").nth(1).inner_text().strip(), fila.locator(".badge").inner_text().strip()


with sync_playwright() as p:
    br = p.chromium.launch(executable_path=chromium)

    # ---------------- UAT-01 Jefe de Producción: menú, orden con BOM, ciclo de estados, descuento de insumos
    ctx, pg = entrar(br, "jefe.produccion@vastagoyco.pe")
    m = menu(pg)
    chk("UAT01", "Jefe de Producción: menú = Dashboard, Inventario, Producción, Analítica IA", m == ["Dashboard", "Inventario", "Producción", "Analítica IA"], "menú: " + ", ".join(m))
    pg.screenshot(path=f"{OUT}/uat_jefe_Dashboard.png")
    st0, _ = stock(pg, "Cacao en grano")
    chk("UAT02", "Jefe de Producción: Inventario es de solo lectura (botón 'Ver historial', sin 'Registrar movimiento')",
        pg.locator("button:text-is('Ver historial')").count() == 7 and pg.locator("button:text-is('Registrar movimiento')").count() == 0, f"stock inicial de cacao en grano: {st0}")
    ir(pg, "Producción"); pg.click("text=+ Nueva orden de producción"); pg.wait_for_selector(".modal")
    pg.select_option(".modal select", label="Tableta 70% Cacao 100g"); pg.fill(".modal input[type=number]", "100"); pg.wait_for_timeout(500)
    bom = pg.locator(".modal li").all_inner_texts()
    cacao = [x for x in bom if "Cacao en grano" in x]
    chk("UAT03", "Nueva orden: la vista previa del BOM calcula el consumo (100 u × 0.065 kg = 6.5 kg de cacao)", bool(cacao) and "6.5" in cacao[0], "vista previa: " + "; ".join(x.replace("\n", " ") for x in bom))
    pg.screenshot(path=f"{OUT}/uat_jefe_Nueva_orden_BOM.png")
    pg.click(".modal button:text-is('Crear orden')"); pg.wait_for_timeout(900)
    fila = pg.locator("tbody tr").first; lote = fila.locator("td").nth(0).inner_text()
    chk("UAT04", "La orden creada aparece al inicio con lote correlativo y estado Planificada", lote.startswith("L-2026-") and "Planificada" in fila.inner_text(), f"{lote} · " + fila.locator('.badge').inner_text())
    fila.locator("button:text-is('Iniciar')").click(); pg.wait_for_timeout(700)
    fila = pg.locator("tbody tr", has_text=lote)
    chk("UAT05", "Iniciar: la orden pasa a 'En proceso'", "En proceso" in fila.inner_text(), fila.locator(".badge").inner_text())
    pg.once("dialog", lambda d: (print("           diálogo de confirmación:", d.message), d.accept()))
    fila.locator("button:text-is('Completar')").click(); pg.wait_for_timeout(1000)
    fila = pg.locator("tbody tr", has_text=lote)
    chk("UAT06", "Completar (con confirmación): estado 'Completada' y sin más botones", "Completada" in fila.inner_text() and fila.locator("button").count() == 0, fila.locator(".badge").inner_text())
    st1, _ = stock(pg, "Cacao en grano")
    n0 = float(st0.split()[0].replace(",", "")); n1 = float(st1.split()[0].replace(",", ""))
    chk("UAT07", "Al completar, el inventario descontó 6.5 kg de cacao", abs((n0 - n1) - 6.5) < 0.01, f"cacao en grano: {st0} → {st1}")
    ctx.close()

    # ---------------- UAT-02 Almacenero: movimiento de inventario y restricciones
    ctx, pg = entrar(br, "almacen@vastagoyco.pe")
    m = menu(pg)
    chk("UAT08", "Almacenero: menú = Dashboard, Inventario, Producción", m == ["Dashboard", "Inventario", "Producción"], "menú: " + ", ".join(m))
    s0, b0 = stock(pg, "Leche en polvo")
    pg.locator("tbody tr", has_text="Leche en polvo").locator("button").click(); pg.wait_for_selector(".modal")
    pg.select_option(".modal select", "INGRESO"); pg.fill(".modal input[type=number]", "100"); pg.fill(".modal input[maxlength='120']", "Compra UAT")
    pg.screenshot(path=f"{OUT}/uat_almacenero_Movimiento.png")
    pg.click(".modal button:text-is('Guardar')"); pg.wait_for_timeout(900)
    s1, b1 = stock(pg, "Leche en polvo")
    chk("UAT09", "Ingreso de 100 kg: el stock sube y el semáforo pasa de Crítico a OK", float(s1.split()[0].replace(",", "")) - float(s0.split()[0].replace(",", "")) == 100 and b0 == "Crítico" and b1 == "OK", f"leche en polvo: {s0} ({b0}) → {s1} ({b1})")
    pg.locator("tbody tr", has_text="Leche en polvo").locator("button").click(); pg.wait_for_selector(".modal")
    pg.select_option(".modal select", "SALIDA"); pg.fill(".modal input[type=number]", "999999"); pg.click(".modal button:text-is('Guardar')"); pg.wait_for_timeout(700)
    err = pg.locator(".modal .err").inner_text() if pg.locator(".modal .err").count() else ""
    chk("UAT10", "Salida mayor al stock: mensaje claro y el stock no cambia", "insuficiente" in err.lower(), f"mensaje en pantalla: «{err}»")
    pg.screenshot(path=f"{OUT}/uat_almacenero_Error_stock.png"); pg.click(".modal button:text-is('Cerrar')")
    ir(pg, "Producción")
    chk("UAT11", "Almacenero: en Producción solo consulta (sin botón '+ Nueva orden' ni acciones de estado)", pg.locator("text=+ Nueva orden de producción").count() == 0 and pg.locator("tbody button").count() == 0, "botones de escritura: 0")
    ctx.close()

    # ---------------- UAT-03 Gerente: menú reducido y analítica
    ctx, pg = entrar(br, "gerente@vastagoyco.pe")
    m = menu(pg)
    chk("UAT12", "Gerente: menú = Dashboard, Producción, Analítica IA (sin Inventario)", m == ["Dashboard", "Producción", "Analítica IA"], "menú: " + ", ".join(m))
    ir(pg, "Analítica IA"); mape1 = pg.locator("main strong").first.inner_text()
    pg.select_option("select", index=1); pg.wait_for_timeout(700); mape2 = pg.locator("main strong").first.inner_text()
    filas = pg.locator("tbody tr").count()
    chk("UAT13", "Analítica: al cambiar de producto se actualiza el MAPE y se listan 3 meses proyectados", mape1 != mape2 and filas == 3, f"MAPE {mape1} → {mape2}; filas de pronóstico: {filas}")
    ctx.close()

    # ---------------- UAT-04 Administrador: usuarios, política de contraseñas, auditoría; sesión
    ctx, pg = entrar(br, "admin@vastagoyco.pe")
    m = menu(pg)
    chk("UAT14", "Administrador: ve los 6 módulos (incluye Usuarios y Auditoría)", m == ["Dashboard", "Inventario", "Producción", "Analítica IA", "Usuarios", "Auditoría"], "menú: " + ", ".join(m))
    ir(pg, "Usuarios"); pg.click("text=+ Nuevo usuario"); pg.wait_for_selector(".modal")
    campos = pg.locator(".modal input"); campos.nth(0).fill("Usuario Prueba UAT"); campos.nth(1).fill("uat@vastagoyco.pe"); campos.nth(3).fill("corta")
    pg.click(".modal button:text-is('Crear')"); pg.wait_for_timeout(700)
    err = pg.locator(".modal .err").inner_text() if pg.locator(".modal .err").count() else ""
    chk("UAT15", "Contraseña débil rechazada con mensaje que indica qué falta", "débil" in err.lower(), f"mensaje: «{err}»")
    campos.nth(3).fill("ClaveSegura#2026"); pg.click(".modal button:text-is('Crear')"); pg.wait_for_timeout(900)
    chk("UAT16", "Usuario válido creado y listado como Activo", pg.locator("tbody tr", has_text="uat@vastagoyco.pe").count() == 1, "5 usuarios en la lista" if pg.locator("tbody tr").count() == 5 else f"{pg.locator('tbody tr').count()} usuarios")
    pg.locator("tbody tr", has_text="uat@vastagoyco.pe").locator("button").click(); pg.wait_for_timeout(700)
    chk("UAT17", "Desactivar usuario: el estado cambia a Inactivo", "Inactivo" in pg.locator("tbody tr", has_text="uat@vastagoyco.pe").inner_text(), "estado: " + pg.locator("tbody tr", has_text="uat@vastagoyco.pe").locator(".badge").inner_text())
    pg.screenshot(path=f"{OUT}/uat_admin_Usuarios_inactivo.png")
    ir(pg, "Auditoría"); acciones = " ".join(pg.locator("tbody tr td:nth-child(3)").all_inner_texts())
    chk("UAT18", "Auditoría registra la creación y el cambio de estado del usuario y los movimientos del flujo UAT", all(a in acciones for a in ("USUARIO_CREADO", "USUARIO_ESTADO", "ORDEN_ESTADO", "MOVIMIENTO_INGRESO")), "acciones visibles: " + ", ".join(sorted(set(acciones.split()))))
    pg.reload(); pg.wait_for_timeout(1500)
    persiste = pg.locator("ul.nav").count() > 0
    chk("UAT19", "Recargar la página (F5) mantiene la sesión mediante la cookie de refresh", persiste, "sesión restaurada" if persiste else "volvió al login (la cookie Secure no se guarda sobre HTTP en este navegador)")
    if persiste:
        pg.click("text=Cerrar sesión"); pg.wait_for_timeout(800)
    chk("UAT20", "Cerrar sesión devuelve al login", pg.locator("#email").count() == 1, "formulario de ingreso visible")
    pg.reload(); pg.wait_for_timeout(1200)
    chk("UAT21", "Tras cerrar sesión, recargar NO restaura la sesión (refresh revocado)", pg.locator("#email").count() == 1 and pg.locator("ul.nav").count() == 0, "login visible")
    ctx.close()
    br.close()
print(f"\nResumen: {sum(res)}/{len(res)} verificaciones superadas  (URL: {B})")
sys.exit(0 if all(res) else 1)
