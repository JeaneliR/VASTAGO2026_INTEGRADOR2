// Presentación de sustentación APF2 (pptxgenjs, 16:9 panorámico 13.33 x 7.5 in)
const pptxgen = require("pptxgenjs");
const fs = require("fs"), path = require("path");
const SK = fs.readdirSync("/root/.claude/skills/synced").map(d => "/root/.claude/skills/synced/" + d + "/pptx").find(p => fs.existsSync(p));
const { applyTheme } = require(SK + "/scripts/apply_theme.js");
const A = (f) => path.join(__dirname, "assets", f);
const E = (f) => path.join(__dirname, "..", "..", "evidencias", f);
const png = (p) => { const b = fs.readFileSync(p); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };

const THEME = { name: "Vastago Cacao", headFontFace: "Georgia", bodyFontFace: "Calibri",
  colors: { dk1: "2E1B12", lt1: "FFFFFF", dk2: "4A2C1F", lt2: "FAF3E7", accent1: "C89B3C", accent2: "2E7D4F", accent3: "B3261E", accent4: "7A4B35", accent5: "8A6D3B", accent6: "E4DED2", hlink: "7A4B35", folHlink: "4A2C1F" } };
const K = { dk: "2E1B12", dk2: "4A2C1F", car: "C89B3C", crema: "FAF3E7", gris: "E4DED2", ok: "2E7D4F", bad: "B3261E", txt: "3B2A20", mut: "7A6A5C" };
const W = 13.33, H = 7.5;
const pres = new pptxgen(); pres.layout = "LAYOUT_WIDE"; pres.author = "Equipo Vástago & Co"; pres.title = "Sustentación APF2 — Vástago & Co"; pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;

pres.defineSlideMaster({ title: "CONTENIDO", background: { color: "FFFFFF" },
  objects: [ { rect: { x: 0, y: 0, w: W, h: 1.05, fill: { color: K.crema } } },
    { rect: { x: 0, y: 1.05, w: W, h: 0.04, fill: { color: K.car } } },
    { text: { text: "Vástago & Co · Integrador 2 · APF2", options: { x: 0.5, y: 7.08, w: 7, h: 0.3, fontSize: 10, color: K.mut, fontFace: "Calibri", margin: 0 } } } ],
  slideNumber: { x: 12.3, y: 7.08, w: 0.6, h: 0.3, fontSize: 10, color: K.mut, align: "right" },
  placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.12, w: 10.6, h: 0.82, fontSize: 28, bold: true, color: K.dk, fontFace: "Georgia", valign: "middle", margin: 0 }, text: "" } });
pres.defineSlideMaster({ title: "OSCURA", background: { color: K.dk },
  placeholder: { options: { name: "title", type: "title", x: 0.8, y: 2.2, w: 11.7, h: 1.6, fontSize: 40, bold: true, color: "FFFFFF", fontFace: "Georgia", valign: "top", margin: 0 }, text: "" } });

let presenter = {};
function ponente(slide, who) {   // etiqueta de quién expone
  const col = { Jeaneli: K.car, Arnold: K.ok, Luis: "7A4B35", Todos: K.dk2 }[who] || K.dk2;
  slide.addShape(pres.ShapeType.roundRect, { x: 11.2, y: 0.3, w: 1.7, h: 0.45, fill: { color: col }, rectRadius: 0.2, line: { color: col } });
  slide.addText(who, { x: 11.2, y: 0.3, w: 1.7, h: 0.45, fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle", isTextBox: true, margin: 0 });
}
function content(title, who, notes) {
  const s = pres.addSlide({ masterName: "CONTENIDO" }); s.addText(title, { x: 0.5, y: 0.12, w: 10.6, h: 0.82, fontSize: 28, bold: true, color: K.dk, fontFace: "Georgia", valign: "middle", isTextBox: true, margin: 0 }); if (who) ponente(s, who); if (notes) s.addNotes(notes); return s;
}
function img(s, file, x, y, w, h, o = {}) {   // contiene la imagen dentro de la caja sin deformarla
  const d = png(file); const r = Math.min(w / d.w, h / d.h); const iw = d.w * r, ih = d.h * r;
  s.addImage({ path: file, x: x + (w - iw) / 2, y: y + (h - ih) / 2, w: iw, h: ih, altText: o.alt || "figura" });
  if (o.border) s.addShape(pres.ShapeType.rect, { x: x + (w - iw) / 2, y: y + (h - ih) / 2, w: iw, h: ih, fill: { type: "none" }, line: { color: K.gris, width: 1 } });
}
function card(s, x, y, w, h, head, body, o = {}) {
  s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: o.fill || K.crema }, line: { color: o.line || K.gris, width: 1 }, rectRadius: 0.08 });
  s.addText(head, { x: x + 0.15, y: y + 0.08, w: w - 0.3, h: 0.45, fontSize: o.hs || 16, bold: true, color: o.hc || K.dk2, isTextBox: true, margin: 0, valign: "middle" });
  s.addText(body, { x: x + 0.15, y: y + 0.55, w: w - 0.3, h: h - 0.65, fontSize: o.bs || 13, color: K.txt, isTextBox: true, margin: 0, valign: "top" });
}
function stat(s, x, y, w, num, label, color) {
  s.addText(num, { x, y, w, h: 0.9, fontSize: 44, bold: true, color: color || K.dk2, fontFace: "Georgia", align: "center", isTextBox: true, margin: 0 });
  s.addText(label, { x, y: y + 0.9, w, h: 0.6, fontSize: 13, color: K.mut, align: "center", isTextBox: true, margin: 0, valign: "top" });
}
const bl = (arr, o = {}) => arr.map((t, i) => ({ text: t, options: { bullet: { indent: 16 }, breakLine: i < arr.length - 1, paraSpaceAfter: 6, ...o } }));

// ---------------------------------------------------------------- 1 portada
{ const s = pres.addSlide({ masterName: "OSCURA" });
  s.addText("AVANCE DE PROYECTO FINAL 2", { x: 0.8, y: 0.9, w: 11, h: 0.5, fontSize: 18, bold: true, color: K.car, charSpacing: 4, isTextBox: true, margin: 0 });
  s.addText("Sistema Web Inteligente de Producción e Inventarios para una empresa chocolatera", { x: 0.8, y: 1.7, w: 11.7, h: 2.1, fontSize: 40, bold: true, color: "FFFFFF", fontFace: "Georgia", valign: "top", isTextBox: true, margin: 0 });
  s.addText("Base de datos · Seguridad · Despliegue en la nube", { x: 0.8, y: 4.0, w: 11, h: 0.5, fontSize: 22, color: "E9DCC3", isTextBox: true, margin: 0 });
  s.addShape(pres.ShapeType.line, { x: 0.8, y: 4.8, w: 3, h: 0, line: { color: K.car, width: 2 } });
  s.addText([{ text: "Jeaneli Caso Valenzuela · Product Owner", options: { breakLine: true } }, { text: "Arnold Lujan Aderiano · Scrum Master", options: { breakLine: true } }, { text: "Luis Matamoros Ylizarbe · Desarrollador" }],
    { x: 0.8, y: 5.0, w: 8, h: 1.1, fontSize: 18, color: "FFFFFF", isTextBox: true, margin: 0, paraSpaceAfter: 4 });
  s.addText("Vástago & Co · Integrador 2 · UTP · Docente: Yovana Roca Ávila · Octubre 2026", { x: 0.8, y: 6.7, w: 11.5, h: 0.4, fontSize: 14, color: "B9A98F", isTextBox: true, margin: 0 });
  s.addNotes("Presenta Jeaneli. Saludo, objetivo del avance: ejecutar el despliegue inicial con base de datos, seguridad y verificación."); }

// ---------------------------------------------------------------- 2 agenda
{ const s = content("Ruta de la sustentación", "Todos", "Cada integrante expone sus aportes sin repetir al otro. Orden: observaciones → problema/modelo → arquitectura → BD → seguridad → pruebas → nube → demo.");
  const cols = [["Jeaneli", K.car, "Product Owner", ["Levantamiento de observaciones APF1", "Problema, AS-IS / TO-BE", "Prototipos, KPIs y backlog", "Plan de pruebas y pruebas UAT"]],
    ["Arnold", K.ok, "Scrum Master", ["Diseño físico de BD y script SQL", "Replicación, respaldo y monitoreo", "Autenticación, controles y cifrado", "Pruebas de seguridad y despliegue Render"]],
    ["Luis", "7A4B35", "Desarrollador", ["Arquitectura y patrón Repository", "Módulos de inventario, producción e IA", "Optimización WPO", "Pruebas automáticas y demo en vivo"]]];
  cols.forEach((c, i) => { const x = 0.6 + i * 4.1;
    s.addShape(pres.ShapeType.roundRect, { x, y: 1.5, w: 3.85, h: 5.2, fill: { color: K.crema }, line: { color: K.gris }, rectRadius: 0.1 });
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.3, y: 1.75, w: 0.85, h: 0.85, fill: { color: c[1] }, line: { color: c[1] } });
    s.addText(c[0][0], { x: x + 0.3, y: 1.75, w: 0.85, h: 0.85, fontSize: 30, bold: true, color: "FFFFFF", align: "center", valign: "middle", fontFace: "Georgia", isTextBox: true, margin: 0 });
    s.addText(c[0], { x: x + 1.3, y: 1.75, w: 2.4, h: 0.45, fontSize: 22, bold: true, color: K.dk, fontFace: "Georgia", isTextBox: true, margin: 0 });
    s.addText(c[2], { x: x + 1.3, y: 2.2, w: 2.4, h: 0.4, fontSize: 14, color: K.mut, isTextBox: true, margin: 0 });
    s.addText(bl(c[3]), { x: x + 0.3, y: 3.0, w: 3.35, h: 3.5, fontSize: 16, color: K.txt, isTextBox: true, margin: 0, valign: "top" }); });
  s.addText("Reparto propuesto según las responsabilidades del cronograma; el equipo puede reasignarlo.", { x: 0.6, y: 6.75, w: 12, h: 0.3, fontSize: 11, italic: true, color: K.mut, isTextBox: true, margin: 0 }); }

// ---------------------------------------------------------------- 3-4 observaciones
{ const s = content("Levantamiento de las observaciones del APF1", "Jeaneli", "Las nueve observaciones de la docente Yovana Roca (12-sep) están resueltas en el informe; cada una indica la sección. En el Kanban, retrospectiva y cierre del Sprint 3 están en Por hacer porque el sprint sigue en curso.");
  const o = [["1", "Problemática", "Reescrita: síntomas, árbol de causas, objetivos SMART", "Sec. 1.1"], ["2", "AS-IS y TO-BE", "Diagramas por carriles con problemas P1–P5", "Sec. 1.6–1.7"], ["3", "Figuras y tablas", "Numeradas, con título, descripción y fuente", "Todo el informe"],
    ["4", "Gantt", "Meses, semanas, sprints y responsables", "Sec. 2.3"], ["5", "Kanban", "Retro y cierre del Sprint 3 en «Por hacer»", "Sec. 2.6"], ["6", "Épicas e HU", "Análisis de medio: WhatsApp Business + correo", "Sec. 2.7–2.8"],
    ["7", "Herramientas", "Configuración con comandos y salidas reales", "Sec. 3.2"], ["8", "Prototipos", "Título, descripción y fuente en cada figura", "Sec. 4.1–4.2"], ["9", "Tabla de KPIs", "Dividida en 3 tablas legibles, 9 pt", "Sec. 6.1"]];
  o.forEach((r, i) => { const x = 0.6 + (i % 3) * 4.1, y = 1.4 + Math.floor(i / 3) * 1.85;
    s.addShape(pres.ShapeType.roundRect, { x, y, w: 3.85, h: 1.65, fill: { color: K.crema }, line: { color: K.gris }, rectRadius: 0.08 });
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.15, y: y + 0.15, w: 0.5, h: 0.5, fill: { color: K.ok }, line: { color: K.ok } });
    s.addText("✓", { x: x + 0.15, y: y + 0.15, w: 0.5, h: 0.5, fontSize: 18, bold: true, color: "FFFFFF", align: "center", valign: "middle", isTextBox: true, margin: 0 });
    s.addText(r[1], { x: x + 0.8, y: y + 0.12, w: 2.9, h: 0.5, fontSize: 18, bold: true, color: K.dk, isTextBox: true, margin: 0, valign: "middle" });
    s.addText(r[2], { x: x + 0.2, y: y + 0.75, w: 3.5, h: 0.55, fontSize: 13, color: K.txt, isTextBox: true, margin: 0, valign: "top" });
    s.addText(r[3], { x: x + 0.2, y: y + 1.3, w: 3.5, h: 0.3, fontSize: 12, bold: true, color: K.car, isTextBox: true, margin: 0 }); }); }

{ const s = content("Problema y modelo propuesto (TO-BE)", "Jeaneli", "El problema: quiebres de stock, producción por experiencia, mermas sin trazabilidad, registros manuales. El TO-BE: stock en tiempo real por trigger, alertas, pronóstico a 3 meses, órdenes con receta, trazabilidad y roles.");
  img(s, A("tobe.png"), 0.5, 1.35, 8.2, 5.5, { border: true, alt: "Proceso TO-BE" });
  card(s, 8.95, 1.4, 3.95, 2.45, "Antes (AS-IS)", "Conteo semanal manual, cuaderno/Excel, compra urgente con sobrecosto y producción «por experiencia».", { fill: "FBE9E7", line: "E8B4AE", hc: K.bad });
  card(s, 8.95, 4.05, 3.95, 2.8, "Con el sistema (TO-BE)", "Stock en tiempo real, alertas de mínimos, orden con vista previa de insumos (BOM), pronóstico de 3 meses y trazabilidad por rol.", { fill: "E8F3EC", line: "B5D8C2", hc: K.ok }); }

// ---------------------------------------------------------------- 5 arquitectura
{ const s = content("Arquitectura del sistema", "Luis", "SPA React servida por Flask en el mismo origen; API REST con Flask+gunicorn; capa de servicios y repositorios; PostgreSQL 16; módulo de pronóstico en Python. Un solo contenedor Docker listo para Render.");
  img(s, A("arquitectura.png"), 0.5, 1.3, 5.2, 5.65, { border: true, alt: "Arquitectura por capas" });
  const items = [["React 19 + esbuild", "SPA con menú filtrado por rol; el token de acceso vive solo en memoria."], ["Flask 3 + gunicorn", "API REST con validación, límites de tasa y cabeceras de seguridad."], ["Repository + Unit of Work", "SQL parametrizado y transacciones atómicas; un repositorio por agregado."], ["PostgreSQL 16", "Trigger de stock, vista de semáforo y auditoría inmutable."], ["Docker + Render", "Imagen multi-etapa y Blueprint (render.yaml) para el primer despliegue."]];
  items.forEach((it, i) => { const y = 1.4 + i * 1.08;
    s.addShape(pres.ShapeType.ellipse, { x: 6.1, y: y + 0.08, w: 0.42, h: 0.42, fill: { color: K.car }, line: { color: K.car } });
    s.addText(String(i + 1), { x: 6.1, y: y + 0.08, w: 0.42, h: 0.42, fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle", isTextBox: true, margin: 0 });
    s.addText(it[0], { x: 6.7, y, w: 6.1, h: 0.4, fontSize: 18, bold: true, color: K.dk, isTextBox: true, margin: 0 });
    s.addText(it[1], { x: 6.7, y: y + 0.42, w: 6.1, h: 0.55, fontSize: 14, color: K.txt, isTextBox: true, margin: 0, valign: "top" }); }); }

// ---------------------------------------------------------------- 6 BD diseño
{ const s = content("Diseño físico de la base de datos", "Arnold", "12 tablas, 73 columnas, 12 claves foráneas. Script schema.sql idéntico a la BD verificada con information_schema. Trigger fn_aplicar_movimiento mantiene el stock; CHECK impide stock negativo; auditoría con trigger que bloquea UPDATE/DELETE.");
  img(s, A("er_fisico_compacto.png"), 0.5, 1.3, 6.9, 5.65, { border: true, alt: "Modelo físico ER" });
  stat(s, 7.7, 1.35, 1.7, "12", "tablas", K.dk2); stat(s, 9.5, 1.35, 1.7, "73", "columnas", K.dk2); stat(s, 11.3, 1.35, 1.7, "12", "claves foráneas", K.dk2);
  s.addText(bl(["**Integridad en la BD:** CHECK (stock ≥ 0), claves foráneas y restricciones de dominio.".replace(/\*\*/g, ""), "Trigger que aplica cada movimiento al stock de forma atómica.", "Vista v_inventario con el semáforo ok / warn / crit.", "Teléfono cifrado (AES-256-GCM) y bitácora de auditoría de solo anexado.", "Consistencia verificada: script SQL ≡ base real ≡ diagrama."]),
    { x: 7.7, y: 3.15, w: 5.2, h: 3.7, fontSize: 16, color: K.txt, isTextBox: true, margin: 0, valign: "top" }); }

// ---------------------------------------------------------------- 7 Repository
{ const s = content("Patrón de acceso a datos: Repository", "Luis", "Elegimos Repository porque aísla el SQL de las reglas de negocio, permite inyectar el cursor para transacciones y facilita probar. Frente a DAO puro, expresa operaciones del dominio; frente a un ORM, mantenemos control del SQL con un equipo pequeño.");
  img(s, A("clases_repository.png"), 0.5, 1.3, 7.6, 5.6, { border: true, alt: "Diagrama de clases del patrón Repository" });
  card(s, 8.4, 1.4, 4.5, 1.65, "¿Por qué Repository?", "Separa SQL de la lógica, permite pruebas y deja un único lugar para cada consulta.", { bs: 14 });
  card(s, 8.4, 3.2, 4.5, 1.65, "Seguridad", "Consultas siempre parametrizadas: sin concatenar texto del usuario (prueba de inyección SQL superada).", { bs: 14 });
  card(s, 8.4, 5.0, 4.5, 1.85, "Transacciones", "`transaction()` abre una unidad de trabajo: o se guardan movimiento, stock y auditoría juntos, o ninguno.".replace(/`/g, ""), { bs: 14 }); }

// ---------------------------------------------------------------- 8 Admin BD
{ const s = content("Administración, replicación y respaldo", "Arnold", "Replicación streaming asíncrona primario 5433 → réplica 5434 con slot replica1_slot; lag 0 bytes; escritura en la réplica rechazada. Respaldo pg_dump -Fc con restauración verificada por conteo de filas. Monitoreo con consultas a pg_stat: caché 99.92 %. Honestidad: la réplica se demostró en local; en Render gratuito no hay réplica.");
  img(s, A("replicacion.png"), 0.5, 1.3, 12.3, 2.2, { alt: "Arquitectura de replicación" });
  stat(s, 0.6, 3.75, 2.9, "0 bytes", "retraso de replicación", K.ok); stat(s, 3.7, 3.75, 2.9, "OK", "restauración: filas originales = restauradas", K.ok);
  stat(s, 6.8, 3.75, 2.9, "99.92 %", "aciertos de caché", K.dk2); stat(s, 9.9, 3.75, 2.9, "0", "deadlocks registrados", K.dk2);
  s.addShape(pres.ShapeType.roundRect, { x: 0.6, y: 5.5, w: 12.2, h: 1.3, fill: { color: "FFF4CC" }, line: { color: "E8D48A" }, rectRadius: 0.08 });
  s.addText([{ text: "Alcance honesto: ", options: { bold: true } }, { text: "la réplica y el failover se demostraron en el entorno local. En Render (plan gratuito) se usará el respaldo programado; la réplica de lectura depende de un plan de pago." }],
    { x: 0.8, y: 5.55, w: 11.8, h: 1.2, fontSize: 15, color: K.txt, isTextBox: true, margin: 0, valign: "middle" }); }

// ---------------------------------------------------------------- 9 Auth
{ const s = content("Autenticación y autorización", "Arnold", "Contraseñas con bcrypt costo 12; JWT de 15 minutos con algoritmo fijado; refresh token opaco rotatorio en cookie HttpOnly SameSite=Strict y cabecera anti-CSRF; bloqueo tras 5 intentos; rate limiting; RBAC con 4 roles. 24 pruebas de seguridad.");
  img(s, A("cap9_secuencia_auth.png"), 0.5, 1.3, 6.6, 5.6, { border: true, alt: "Secuencia de autenticación" });
  const it = [["bcrypt (costo 12)", "Contraseñas nunca en claro; política mínima y mensaje de error genérico."], ["JWT 15 min + refresh rotatorio", "Cookie HttpOnly, SameSite=Strict y cabecera anti-CSRF."], ["Bloqueo y límite de tasa", "5 intentos fallidos → bloqueo; 429 al exceder el límite."], ["RBAC de 4 roles", "Administrador, Gerente, Jefe de producción y Almacenero."]];
  it.forEach((t, i) => card(s, 7.4, 1.4 + i * 1.4, 5.5, 1.28, t[0], t[1], { bs: 13, hs: 15 })); }

// ---------------------------------------------------------------- 10 Controles y cifrado
{ const s = content("Catálogo de controles y cifrado", "Arnold", "43 controles alineados con ISO/IEC 27001:2022, OWASP Top 10/ASVS y NIST. 30 implementados, 7 parciales, 6 planificados. AES-256-GCM para el teléfono; TLS en Render; trazabilidad con tabla de auditoría append-only. Observaciones propias reconocidas: TRUNCATE sobre auditoría no bloqueado, límite 72 bytes de bcrypt.");
  s.addChart(pres.charts.DOUGHNUT, [{ name: "Controles", labels: ["Implementados", "Parciales", "Planificados"], values: [30, 7, 6] }],
    { x: 0.5, y: 1.4, w: 4.6, h: 4.6, holeSize: 58, chartColors: [K.ok, K.car, K.mut], showLegend: true, legendPos: "b", legendFontSize: 13, legendColor: K.txt, dataLabelColor: "FFFFFF", showPercent: false, showValue: true, dataLabelFontSize: 14, showTitle: true, title: "43 controles", titleFontSize: 16, titleColor: K.dk });
  card(s, 5.4, 1.4, 3.7, 2.55, "Confidencialidad", "AES-256-GCM en el teléfono; TLS en tránsito; hash bcrypt y SHA-256 del refresh; SCRAM-SHA-256 en la BD.", { bs: 14 });
  card(s, 9.2, 1.4, 3.7, 2.55, "Integridad", "JWT con firma fijada; etiqueta GCM; restricciones CHECK y claves foráneas; consultas parametrizadas.", { bs: 14 });
  card(s, 5.4, 4.15, 3.7, 2.7, "Trazabilidad", "Bitácora de auditoría de solo anexado (trigger bloquea UPDATE/DELETE): quién, qué, cuándo, desde dónde.", { bs: 14 });
  card(s, 9.2, 4.15, 3.7, 2.7, "Mejoras reconocidas", "Bloquear TRUNCATE en auditoría, limitar contraseñas a 72 bytes y revocar la cadena de sesiones al detectar reutilización.", { bs: 14, fill: "FFF4CC", line: "E8D48A" }); }

// ---------------------------------------------------------------- 11 Pentest
{ const s = content("Pruebas de seguridad web", "Arnold", "Metodología OWASP WSTG con herramientas de Kali (nmap, nikto, sqlmap) instaladas en Linux, más script propio y bandit/pip-audit/npm audit. Hallazgos reales corregidos: cabecera Server, ETag con inodo, catch-all de la SPA, PyJWT 2.14.0 vulnerable → 2.15.1. Verificaciones propias 18/20 → 20/20. Pendiente: repetir sobre la URL de Render.");
  s.addChart(pres.charts.BAR, [{ name: "Verificaciones superadas (de 20)", labels: ["Antes de corregir", "Después de corregir"], values: [18, 20] }],
    { x: 0.5, y: 1.4, w: 5.4, h: 4.2, barDir: "col", chartColors: [K.car, K.ok], showValue: true, dataLabelFontSize: 16, dataLabelColor: K.dk, catAxisLabelFontSize: 14, valAxisLabelFontSize: 12, valAxisMaxVal: 22, valAxisMinVal: 0, showLegend: false, valGridLine: { color: K.gris, size: 0.5 }, catGridLine: { style: "none" }, showTitle: true, title: "Script OWASP propio", titleFontSize: 15, titleColor: K.dk });
  const rows = [["Hallazgo", "Herramienta", "Estado"], ["Cabecera Server expone versión", "nikto", "Corregido"], ["ETag filtra el inodo", "nikto", "Corregido"], ["robots.txt devolvía la SPA", "nikto", "Corregido"], ["PyJWT 2.14.0 con CVE", "pip-audit", "Actualizado"], ["Inyección SQL en login", "sqlmap", "No vulnerable"]];
  s.addTable(rows.map((r, i) => r.map((c) => ({ text: c, options: { bold: i === 0, color: i === 0 ? "FFFFFF" : K.txt, fill: { color: i === 0 ? K.dk2 : (i % 2 ? "FFFFFF" : K.crema) }, fontSize: 14, valign: "middle" } }))),
    { x: 6.2, y: 1.45, w: 6.7, colW: [3.3, 1.7, 1.7], rowH: 0.55, border: { type: "solid", color: K.gris, pt: 1 } });
  s.addText("Herramientas: nmap · nikto · sqlmap · bandit · pip-audit · npm audit · pentest_manual.py (OWASP)", { x: 0.5, y: 6.0, w: 12.4, h: 0.5, fontSize: 14, italic: true, color: K.mut, isTextBox: true, margin: 0 }); }

// ---------------------------------------------------------------- 12 Pruebas
{ const s = content("Validación: plan y resultados de pruebas", "Jeaneli", "Plan de pruebas estructurado con matriz RF/RNF, 54 casos: 24 automáticos pytest, UAT por rol, rendimiento y seguridad. 24/24 pasan, cobertura 90 %. RF11 (exportar) y RF12 (WhatsApp) están planificados para el Sprint 4, no ejecutados.");
  stat(s, 0.6, 1.5, 3.0, "24/24", "pruebas automáticas superadas", K.ok); stat(s, 3.8, 1.5, 3.0, "90 %", "cobertura de código (pytest-cov)", K.dk2); stat(s, 7.0, 1.5, 3.0, "54", "casos en el plan de pruebas", K.dk2); stat(s, 10.2, 1.5, 2.7, "2", "RF planificados (S4)", K.car);
  img(s, A("cap10_pentest.png"), 0.6, 3.3, 6.0, 3.5, { alt: "Resultados de pentest", border: true });
  s.addText(bl(["Pirámide: unitarias e integración (pytest), seguridad, rendimiento (WPO) y aceptación manual por rol.", "Matriz de trazabilidad: cada requerimiento tiene al menos un caso.", "Defectos hallados y corregidos durante las pruebas (p. ej. fallos de login sin auditoría por rollback).", "Casos que dependen de la nube quedan en estado PENDIENTE hasta el despliegue."], { fontSize: 16 }),
    { x: 6.9, y: 3.3, w: 6.0, h: 3.5, fontSize: 16, color: K.txt, isTextBox: true, margin: 0, valign: "top" }); }

// ---------------------------------------------------------------- 13 WPO
{ const s = content("Optimización de rendimiento web (WPO)", "Luis", "Medido con Chromium y limitación de red vía CDP. Antes: FCP 2812 ms, 1.27 MB. Después: FCP 480 ms, 82 KB. Estrategias: minificación con esbuild, gzip/brotli, caché con ETag, bundle único.");
  s.addChart(pres.charts.BAR, [{ name: "Antes", labels: ["Primer contenido (FCP)", "Carga completa"], values: [2812, 2780] }, { name: "Después", labels: ["Primer contenido (FCP)", "Carga completa"], values: [480, 449] }],
    { x: 0.5, y: 1.4, w: 7.0, h: 5.0, barDir: "col", barGrouping: "clustered", chartColors: [K.car, K.ok], showValue: true, dataLabelFontSize: 14, dataLabelColor: K.dk, showLegend: true, legendPos: "b", legendFontSize: 14, catAxisLabelFontSize: 14, valAxisLabelFontSize: 12, valGridLine: { color: K.gris, size: 0.5 }, catGridLine: { style: "none" }, showTitle: true, title: "Tiempo en milisegundos (menor es mejor)", titleFontSize: 15, titleColor: K.dk });
  stat(s, 7.9, 1.5, 2.5, "−83 %", "tiempo al primer contenido", K.ok); stat(s, 10.4, 1.5, 2.5, "−94 %", "bytes transferidos (1.27 MB → 82 KB)", K.ok);
  s.addText(bl(["Minificación del bundle con esbuild.", "Compresión gzip/brotli con Flask-Compress.", "Caché de estáticos con ETag.", "Un solo bundle y pool de conexiones a la BD."]), { x: 7.9, y: 3.4, w: 5.0, h: 2.8, fontSize: 16, color: K.txt, isTextBox: true, margin: 0, valign: "top" }); }

// ---------------------------------------------------------------- 14 Despliegue
{ const s = content("Despliegue en la nube con Render", "Arnold", "Manual completo en el informe (Cap. 11) y docs/MANUAL_DESPLIEGUE.md. Flujo: repositorio GitHub → New Blueprint (render.yaml) → variables de entorno → deploy → /api/health → login → cambiar contraseñas demo. Honestidad: la URL en Render y las capturas se completan con la cuenta del equipo; la imagen Docker no pudo construirse en el sandbox.");
  const fl = ["Repositorio\nGitHub", "New Blueprint\n(render.yaml)", "Variables de\nentorno", "Build Docker\n+ BD gestionada", "Verificar\n/api/health", "Login y cambio\nde claves demo"];
  fl.forEach((t, i) => { const x = 0.55 + i * 2.1;
    s.addShape(pres.ShapeType.roundRect, { x, y: 1.6, w: 1.85, h: 1.5, fill: { color: i === 5 ? K.ok : K.crema }, line: { color: i === 5 ? K.ok : K.car, width: 2 }, rectRadius: 0.1 });
    s.addText([{ text: String(i + 1), options: { bold: true, fontSize: 22, color: i === 5 ? "FFFFFF" : K.car, breakLine: true, fontFace: "Georgia" } }, { text: t, options: { fontSize: 13, color: i === 5 ? "FFFFFF" : K.dk, bold: true } }], { x, y: 1.6, w: 1.85, h: 1.5, align: "center", valign: "middle", isTextBox: true, margin: 4 });
    if (i < 5) s.addShape(pres.ShapeType.rightArrow, { x: x + 1.88, y: 2.18, w: 0.2, h: 0.34, fill: { color: K.dk2 }, line: { color: K.dk2 } }); });
  card(s, 0.6, 3.7, 4.0, 2.4, "Listo", "Dockerfile multi-etapa, render.yaml (BD gestionada + servicio web), CI en GitHub Actions y manual paso a paso.", { fill: "E8F3EC", line: "B5D8C2", hc: K.ok, bs: 14 });
  card(s, 4.75, 3.7, 4.0, 2.4, "Verificado en local", "Smoke tests en modo producción: /api/health, login, cabeceras, compresión y HSTS.", { bs: 14 });
  card(s, 8.9, 3.7, 4.0, 2.4, "Pendiente (equipo)", "URL pública en Render y capturas del sistema en la nube; repetir el pentest sobre esa URL.", { fill: "FFF4CC", line: "E8D48A", bs: 14 }); }

// ---------------------------------------------------------------- 15 Demo
{ const s = content("Demostración del sistema en ejecución", "Luis", "Guion de la demo: 1) login como Almacenero → registrar ingreso de un insumo y ver el semáforo; 2) como Jefe de producción → crear orden con vista previa de BOM y completarla; 3) como Gerente → dashboard y pronóstico; 4) como Administrador → usuarios y bitácora de auditoría. Mostrar la URL de Render cuando esté publicada.");
  const shots = [["Dashboard gerencial", E("capturas/gerente_Dashboard.png")], ["Inventario con semáforo", E("capturas/almacenero_Inventario.png")], ["Pronóstico con IA", E("capturas/gerente_Analitica_IA.png")], ["Bitácora de auditoría", E("capturas/admin_Auditoria.png")]];
  shots.forEach((sh, i) => { const x = 0.6 + (i % 2) * 6.2, y = 1.2 + Math.floor(i / 2) * 2.75;
    img(s, sh[1], x, y, 6.0, 2.4, { border: true, alt: sh[0] }); s.addText(sh[0], { x, y: y + 2.42, w: 6.0, h: 0.28, fontSize: 13, bold: true, color: K.dk2, align: "center", isTextBox: true, margin: 0 }); });
  s.addText("[PENDIENTE: URL pública en Render — mostrar la aplicación en la nube durante la defensa]", { x: 0.6, y: 6.78, w: 12.2, h: 0.28, fontSize: 12, bold: true, color: K.bad, isTextBox: true, margin: 0 }); }

// ---------------------------------------------------------------- 16 Gestión
{ const s = content("Gestión del proyecto: cronograma y avance", "Jeaneli", "Gantt de 18 semanas con meses y responsables. Estamos en el Sprint 3 (día 9 de 21). Sprints 1 y 2 completados. Retrospectiva y cierre del Sprint 3 siguen en Por hacer. Riesgos: R1 cambios de alcance es el de mayor nivel (12); R3, R5 y R10 críticos por impacto pero poco probables y mitigados.");
  img(s, A("gantt.png"), 0.5, 1.3, 8.2, 5.6, { border: true, alt: "Diagrama de Gantt" });
  const steps = [["S1", "Análisis y backlog", "Completado", K.ok], ["S2", "Prototipos y diseño de BD", "Completado", K.ok], ["S3", "BD, seguridad, despliegue v1", "En curso", K.car], ["S4–S6", "KPIs, alertas, IA, cierre", "Por hacer", K.mut]];
  steps.forEach((t, i) => { const y = 1.4 + i * 1.35;
    s.addShape(pres.ShapeType.roundRect, { x: 9.0, y, w: 3.9, h: 1.2, fill: { color: K.crema }, line: { color: t[3], width: 2 }, rectRadius: 0.08 });
    s.addText(t[0], { x: 9.15, y: y + 0.1, w: 1.0, h: 1.0, fontSize: 22, bold: true, color: t[3], fontFace: "Georgia", valign: "middle", isTextBox: true, margin: 0 });
    s.addText([{ text: t[1], options: { bold: true, breakLine: true, fontSize: 14, color: K.dk } }, { text: t[2], options: { fontSize: 13, color: t[3], bold: true } }], { x: 10.15, y: y + 0.1, w: 2.7, h: 1.0, valign: "middle", isTextBox: true, margin: 0 }); }); }

// ---------------------------------------------------------------- 17 Prototipos y KPIs
{ const s = content("Prototipos y KPIs del dashboard", "Jeaneli", "Wireframes de baja fidelidad y mockups de alta fidelidad (capturas reales de la app). KPIs: quiebres de stock, merma, cumplimiento de órdenes, precisión del pronóstico (MAPE). Observación: la tarjeta de merma muestra un valor de demostración (2.3 %) hasta registrar mermas reales. Enlace Figma pendiente.");
  img(s, A("wire/01_dashboard.png"), 0.5, 1.35, 4.0, 2.7, { border: true, alt: "Wireframe dashboard" });
  img(s, A("hifi/01_dashboard.png"), 4.7, 1.35, 4.0, 2.7, { border: true, alt: "Mockup dashboard" });
  s.addText("Wireframe", { x: 0.5, y: 4.1, w: 4.0, h: 0.3, fontSize: 13, bold: true, color: K.dk2, align: "center", isTextBox: true, margin: 0 });
  s.addText("Mockup de alta fidelidad", { x: 4.7, y: 4.1, w: 4.0, h: 0.3, fontSize: 13, bold: true, color: K.dk2, align: "center", isTextBox: true, margin: 0 });
  const rows = [["KPI", "Fuente", "Meta"], ["Quiebres de stock / mes", "insumos, v_inventario", "0"], ["Cumplimiento de órdenes", "ordenes_produccion", "≥ 90 %"], ["Merma de producción", "movimientos_inventario", "≤ 3 %"], ["Precisión del pronóstico", "pronosticos", "MAPE ≤ 10 %"]];
  s.addTable(rows.map((r, i) => r.map((c) => ({ text: c, options: { bold: i === 0, color: i === 0 ? "FFFFFF" : K.txt, fill: { color: i === 0 ? K.dk2 : (i % 2 ? "FFFFFF" : K.crema) }, fontSize: 12, valign: "middle" } }))),
    { x: 8.95, y: 1.4, w: 4.0, colW: [1.35, 1.65, 1.0], rowH: 0.55, border: { type: "solid", color: K.gris, pt: 1 } });
  s.addShape(pres.ShapeType.roundRect, { x: 0.5, y: 4.7, w: 12.4, h: 2.1, fill: { color: "FFF4CC" }, line: { color: "E8D48A" }, rectRadius: 0.08 });
  s.addText([{ text: "Enlace del diseño: ", options: { bold: true } }, { text: "[PENDIENTE: pegar enlace de Figma]  ·  Los archivos fuente de wireframes y mockups están en docs/build/assets del repositorio.", options: { breakLine: true } },
    { text: "Principios aplicados: ", options: { bold: true } }, { text: "heurísticas de Nielsen, semáforo de estado, menú por rol y contraste de color verificado (WCAG)." }],
    { x: 0.7, y: 4.8, w: 12.0, h: 1.9, fontSize: 15, color: K.txt, isTextBox: true, margin: 0, valign: "middle", paraSpaceAfter: 8 }); }

// ---------------------------------------------------------------- 18 cierre
{ const s = pres.addSlide({ masterName: "OSCURA" });
  s.addText("Lo logrado y lo que sigue", { x: 0.8, y: 1.6, w: 11.7, h: 1.2, fontSize: 40, bold: true, color: "FFFFFF", fontFace: "Georgia", valign: "top", isTextBox: true, margin: 0 });
  s.addText([{ text: "Logrado en el APF2: ", options: { bold: true, color: K.car } }, { text: "BD PostgreSQL con replicación y respaldo · patrón Repository · autenticación con roles · cifrado y auditoría · 24/24 pruebas · pentest corregido · rendimiento −83 %.", options: { breakLine: true } },
    { text: "Pendiente del equipo: ", options: { bold: true, color: K.car } }, { text: "URL y capturas en Render · enlace Figma · pentest sobre la nube.", options: { breakLine: true } },
    { text: "Próximos sprints: ", options: { bold: true, color: K.car } }, { text: "alertas por WhatsApp Business y correo, exportación de reportes, afinar el modelo de IA." }],
    { x: 0.8, y: 3.6, w: 11.7, h: 2.8, fontSize: 20, color: "FFFFFF", isTextBox: true, margin: 0, valign: "top", paraSpaceAfter: 14 });
  s.addText("¡Gracias! · Preguntas", { x: 0.8, y: 6.6, w: 8, h: 0.5, fontSize: 22, bold: true, color: "E9DCC3", fontFace: "Georgia", isTextBox: true, margin: 0 });
  s.addNotes("Cierre: Jeaneli resume lo logrado y pendientes; invitar a preguntas."); }

const OUT = path.join(__dirname, "out", "Presentacion_APF2.pptx");
pres.writeFile({ fileName: OUT }).then(() => applyTheme(OUT, THEME)).then(() => console.log("OK", OUT));
