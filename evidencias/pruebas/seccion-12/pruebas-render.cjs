const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const base = process.env.VASTAGO_URL || "https://vastago-sistema.onrender.com/";
const password = process.env.VASTAGO_DEMO_PASSWORD;
const out = path.join(__dirname, "ejecucion", new Date().toISOString().replace(/[:.]/g, "-"));
const results = [];

async function main() {
  assert(password, "Configura VASTAGO_DEMO_PASSWORD antes de ejecutar");
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(12000);
  const nav = name => page.locator("ul.nav").getByRole("button", { name, exact: true });
  const apiPath = (res, pathname) => new URL(res.url()).pathname === pathname;
  const shot = id => page.screenshot({ path: path.join(out, id + ".png"), fullPage: true });
  async function run(id, name, check) {
    const start = Date.now();
    try {
      const detail = await check();
      await shot(id);
      results.push({ id, name, status: "Aprobado", detail, ms: Date.now() - start });
    } catch (error) {
      await shot(id + "-fallo").catch(() => {});
      results.push({ id, name, status: "Fallido", detail: String(error.message).replaceAll(password, "[oculto]"), ms: Date.now() - start });
    }
    console.log(id, results.at(-1).status, results.at(-1).detail);
    return results.at(-1).status === "Aprobado";
  }
  const block = (id, name) => results.push({ id, name, status: "Bloqueado", detail: "Requiere sesión de administrador", ms: 0 });
  async function login(email, secret) {
    await page.locator("#email").fill(email);
    await page.locator("#pwd").fill(secret);
    const response = page.waitForResponse(r => apiPath(r, "/api/auth/login"));
    await page.getByRole("button", { name: "Ingresar", exact: true }).click();
    return response;
  }
  try {
    await page.goto(base, { timeout: 90000 });
    await run("CF01", "Rechazo de credenciales inválidas", async () => {
      const response = await login("qa-no-existe@example.com", "ClaveIncorrecta");
      assert.equal(response.status(), 401);
      await page.locator("#pwd").fill("");
      return "HTTP 401 y formulario de acceso visible";
    });
    const admin = await run("CF02", "Inicio de sesión como administrador", async () => {
      const response = await login("admin@vastagoyco.pe", password);
      assert.equal(response.status(), 200);
      await nav("Inventario").waitFor();
      assert.equal((await response.json()).usuario.rol, "Administrador");
      return "HTTP 200 y rol Administrador";
    });
    const cases = [
      ["CF03", "Consulta de inventario"],
      ["CF04", "Porcentaje óptimo y KPI del Sprint 4"],
      ["CF05", "Filtro de insumos críticos"],
      ["CF06", "Exportación Excel"],
      ["CF07", "Exportación PDF"]
    ];
    if (!admin) cases.forEach(([id, name]) => block(id, name));
    else {
      let inventory;
      await run(...cases[0], async () => {
        const response = page.waitForResponse(r => apiPath(r, "/api/inventario"));
        await nav("Inventario").click();
        const r = await response;
        assert.equal(r.status(), 200);
        inventory = await r.json();
        assert(inventory.length > 0);
        await page.locator("tbody tr").first().waitFor();
        assert.equal(await page.locator("tbody tr").count(), inventory.length);
        return inventory.length + " insumos consultados";
      });
      await run(...cases[1], async () => {
        assert(inventory?.length, "Inventario requerido para calcular el porcentaje esperado");
        await nav("Dashboard").click();
        const count = inventory.filter(row => row.estado === "ok").length;
        const expected = (100 * count / inventory.length).toFixed(2) + "%";
        const card = page.locator(".kpi").filter({ hasText: "Insumos en estado óptimo" });
        assert.equal(await card.locator(".v").innerText(), expected);
        for (const label of ["Valor actual del inventario", "Cumplimiento de órdenes"]) {
          await page.locator(".kpi").filter({ hasText: label }).waitFor();
        }
        return count + "/" + inventory.length + " insumos OK, esperado y mostrado " + expected;
      });
      await run(...cases[2], async () => {
        await nav("Reportes").click();
        await page.getByRole("heading", { name: "Reporte de inventario" }).waitFor();
        await page.getByLabel("Estado", { exact: true }).selectOption("crit");
        const response = page.waitForResponse(r => apiPath(r, "/api/reportes"));
        await page.getByRole("button", { name: "Aplicar filtros" }).click();
        const r = await response;
        assert.equal(r.status(), 200);
        const data = await r.json();
        assert(data.filas.length > 0, "Se necesitan insumos críticos para la evidencia");
        assert(data.filas.every(row => row.estado === "crit"));
        return data.filas.length + " registros críticos";
      });
      for (const [index, label, ext, signature] of [[3,"Excel","xlsx","PK"],[4,"PDF","pdf","%PDF"]]) {
        await run(...cases[index], async () => {
          assert(results.find(r => r.id === "CF05")?.status === "Aprobado", "Filtro crítico requerido");
          const download = page.waitForEvent("download");
          await page.getByRole("button", { name: "Descargar " + label }).click();
          const file = path.join(out, "inventario-critico." + ext);
          await (await download).saveAs(file);
          const bytes = fs.readFileSync(file);
          assert.equal(bytes.subarray(0, signature.length).toString(), signature);
          return label + " descargado, " + bytes.length + " bytes";
        });
      }
    }
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(out, "resultados.json"), JSON.stringify({ url: base, fecha: new Date().toISOString(), results }, null, 2));
    console.log(out);
  }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
