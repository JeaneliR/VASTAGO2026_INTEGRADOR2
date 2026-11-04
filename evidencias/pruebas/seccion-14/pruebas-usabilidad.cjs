const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const url = process.env.VASTAGO_URL || 'https://vastago-sistema.onrender.com/';
const password = process.env.VASTAGO_DEMO_PASSWORD;
const started = new Date();
const out = path.join(__dirname, 'ejecucion', started.toISOString().replace(/[:.]/g, '-'));
const results = [];
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

async function main() {
  assert(password, 'Configura VASTAGO_DEMO_PASSWORD');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, timezoneId: 'America/Lima' });
  page.setDefaultTimeout(12000);
  const active = () => page.evaluate(() => document.activeElement.id || document.activeElement.textContent.trim());
  const nav = name => page.locator('ul.nav').getByRole('button', { name, exact: true });
  const enter = () => page.getByRole('button', { name:'Ingresar', exact:true });
  const login = () => page.waitForResponse(r => new URL(r.url()).pathname === '/api/auth/login' && r.request().method() === 'POST');
  async function run(id, criterio, check) {
    const start = Date.now();
    let estado = 'Aprobado', detalle;
    try { detalle = await check(); }
    catch (error) {
      estado = error.blocked ? 'Bloqueado' : 'Fallido';
      detalle = error.message.replaceAll(password, '[oculto]');
    }
    const capture = id + '.png';
    let imagen = null;
    try {
      await page.screenshot({ path: path.join(out, capture), mask: [page.locator('#email'),page.locator('#pwd')] });
      imagen = capture;
    } catch {}
    results.push({ id, criterio, estado, detalle, ms: Date.now() - start, imagen });
    console.log(id, estado, detalle);
  }
  function requireSession() {
    if (!results.some(r => r.id === 'US03' && r.estado === 'Aprobado')) {
      throw Object.assign(new Error('Se requiere una sesión demo válida'), { blocked: true });
    }
  }
  try {
    await page.goto(url, { timeout: 90000 });
    await page.locator('#email').waitFor({ timeout: 90000 });
    await run('US01', 'Etiquetas y foco de teclado en el acceso', async () => {
      assert.equal(await page.getByLabel('Correo corporativo', { exact: true }).count(), 1);
      assert.equal(await page.getByLabel('Contraseña', { exact: true }).count(), 1);
      const sequence = [];
      for (let i=0; i<3; i++) {
        await page.keyboard.press('Tab');
        sequence.push(await active());
      }
      assert.deepEqual(sequence, ['email','pwd','Ingresar']);
      return 'Tab recorre Correo corporativo → Contraseña → Ingresar. Ambos campos tienen etiqueta asociada.';
    });
    await run('US02', 'Protección ante campos obligatorios vacíos', async () => {
      await page.locator('#email').fill('');
      await page.locator('#pwd').fill('');
      let requests = 0;
      const listener = r => { if (new URL(r.url()).pathname === '/api/auth/login') requests++; };
      page.on('request', listener);
      try {
        await enter().click();
        assert.equal(await active(), 'email');
        assert(await page.locator('#email').evaluate(e => e.validity.valueMissing));
        assert.equal(requests, 0);
      } finally { page.off('request', listener); }
      return 'El navegador bloquea el envío y lleva el foco al correo obligatorio. No se observa una solicitud de acceso.';
    });
    await run('US03', 'Mensaje de error y recuperación del acceso', async () => {
      await page.locator('#email').fill('qa-usabilidad@example.com');
      await page.locator('#pwd').fill('ClaveInvalida');
      const invalid = login();
      await enter().click();
      assert.equal((await invalid).status(), 401);
      const alert = page.getByRole('alert');
      const message = (await alert.innerText()).trim();
      assert(message.length > 0);
      assert.equal(await page.locator('#pwd').inputValue(), '');
      await page.screenshot({ path:path.join(out,'US03-error.png'), mask:[page.locator('#email')] });
      await page.locator('#email').fill('admin@vastagoyco.pe');
      await page.locator('#pwd').fill(password);
      const valid = login();
      await page.locator('#pwd').press('Enter');
      assert.equal((await valid).status(), 200);
      await nav('Dashboard').waitFor();
      return 'Mensaje con rol alert: «'+message+'». Se limpia la contraseña y Enter permite volver a iniciar sesión.';
    });
    await run('US04', 'Navegación con menú móvil a 390 × 844 px', async () => {
      requireSession();
      await page.setViewportSize({ width:390, height:844 });
      const menu = page.getByRole('button', { name:'Menú', exact:true });
      await menu.click();
      const close = page.getByRole('button', { name:'Cerrar menú', exact:true });
      assert.equal(await close.getAttribute('aria-expanded'), 'true');
      await page.screenshot({ path:path.join(out,'US04-menu.png') });
      await nav('Inventario').click();
      await page.locator('tbody tr').first().waitFor();
      assert.equal(await menu.getAttribute('aria-expanded'), 'false');
      return 'El menú se abre, permite entrar a Inventario y se cierra al elegir la pestaña.';
    });
    await run('US05', 'Ajuste horizontal del Dashboard móvil', async () => {
      requireSession();
      await page.getByRole('button', { name:'Menú', exact:true }).click();
      await nav('Dashboard').click();
      await page.locator('.kpi').first().waitFor();
      const sizes = await page.evaluate(() => ({ viewport:document.documentElement.clientWidth, contenido:document.documentElement.scrollWidth }));
      assert(sizes.contenido <= sizes.viewport, 'Contenido '+sizes.contenido+' px para un viewport de '+sizes.viewport+' px');
      return 'Viewport '+sizes.viewport+' px, contenido '+sizes.contenido+' px. Sin desplazamiento horizontal global.';
    });
  } finally {
    await browser.close();
    const totals = Object.fromEntries(['Aprobado','Fallido','Bloqueado'].map(status => [status, results.filter(r=>r.estado===status).length]));
    fs.writeFileSync(path.join(out,'resultados.json'), JSON.stringify({url,fecha:started.toISOString(),totals,results},null,2));
    const rows = results.map(r => '<tr>'+[r.id,r.criterio,r.estado,r.detalle,r.ms].map(x=>'<td>'+escape(x)+'</td>').join('')+'<td>'+(r.imagen?'<a href="'+r.imagen+'">Ver captura</a>':'Sin captura')+'</td></tr>').join('');
    fs.writeFileSync(path.join(out,'reporte.html'), '<!doctype html><html lang="es"><meta charset="utf-8"><title>Pruebas de usabilidad</title><style>body{font:16px system-ui;margin:36px;max-width:1200px}table{border-collapse:collapse}td,th{border:1px solid #bbb;padding:8px;text-align:left}th{background:#eee}</style><h1>Pruebas automatizadas de usabilidad</h1><p>Playwright con Chrome · '+escape(url)+' · '+started.toISOString()+'</p><p>'+totals.Aprobado+' aprobados, '+totals.Fallido+' fallidos, '+totals.Bloqueado+' bloqueados.</p><table><thead><tr><th>Caso</th><th>Criterio</th><th>Estado</th><th>Resultado observado</th><th>ms</th><th>Evidencia</th></tr></thead><tbody>'+rows+'</tbody></table><p><a href="US03-error.png">Mensaje de acceso</a> · <a href="US04-menu.png">Menú móvil abierto</a> · <a href="resultados.json">Resultados JSON</a></p><p>Los tiempos corresponden al script. La ejecución comprueba criterios observables del navegador.</p></html>');
    console.log(out);
    if(totals.Fallido || totals.Bloqueado) process.exitCode=1;
  }
}
main().catch(e => { console.error(e.message.replaceAll(password || '[sin clave]','[oculto]')); process.exitCode=1; });

