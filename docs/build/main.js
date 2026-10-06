// Ensamblador del informe APF2. Uso: NODE_PATH=... node main.js [salida.docx]
const fs = require("fs"), path = require("path");
const g = require("./gen.js");
const { D, FONT, C, CONTENT_W, PAGE_W, MARGIN, state } = g;
const { Document, Packer, Paragraph, TextRun, Footer, Header, PageNumber, AlignmentType, TabStopType, LevelFormat, BorderStyle, ImageRun } = D;

const OUT = process.argv[2] || path.join(__dirname, "out", "Informe_APF2.docx");
const ONLY = (process.env.ONLY || "").split(",").filter(Boolean);   // p.ej. ONLY=cap3 para probar un capítulo
const MODULES = ["cap0", "cap1", "cap2", "cap3", "cap4", "cap5", "cap6", "cap7", "cap8", "cap9", "cap10", "cap11", "anexos", "refs"];

g.reset();
const body = [];
for (const m of MODULES) {
  if (ONLY.length && !ONLY.includes(m)) continue;
  const f = path.join(__dirname, m + ".js");
  if (!fs.existsSync(f)) { console.warn("(falta " + m + ".js)"); continue; }
  body.push(...require(f)(g));
}
g.saveRegistry();
fs.writeFileSync(path.join(__dirname, ".headings.json"), JSON.stringify(g.state.headings.filter((h) => h.lvl <= 2)));

// ---------- portada
const T = (text, o = {}) => new Paragraph({ alignment: o.align || AlignmentType.CENTER, spacing: { before: o.before || 0, after: o.after ?? 80 },
  children: [new TextRun({ text, font: FONT, size: o.size || 24, bold: o.bold, color: o.color || C.cacao, italics: o.italics, allCaps: o.caps })] });
const rule = (color = C.car) => new Paragraph({ children: [], spacing: { after: 160 }, border: { bottom: { style: BorderStyle.SINGLE, size: 18, color, space: 1 } } });
const cover = [
  T("UNIVERSIDAD TECNOLÓGICA DEL PERÚ", { size: 30, bold: true, before: 300, after: 40 }),
  T("Facultad de Ingeniería", { size: 22, color: "6B5B4B", after: 60 }),
  T("Carrera de Ingeniería de Sistemas e Informática", { size: 22, color: "6B5B4B", after: 360 }),
  rule(),
  T("AVANCE DE PROYECTO FINAL 2 (APF2)", { size: 26, bold: true, color: C.car, before: 120, after: 160 }),
  T("Sistema Web Inteligente para la Gestión de Producción e Inventarios en una Empresa Chocolatera mediante Analítica Predictiva e IA", { size: 36, bold: true, after: 200 }),
  rule(),
  T("Curso: Integrador 2", { size: 24, before: 200, after: 40 }),
  T("Empresa: Vástago & Co — RUC 20613556240", { size: 24, after: 40 }),
  T("Docente: Yovana Connie Roca Ávila", { size: 24, after: 360 }),
  T("Integrantes", { size: 24, bold: true, after: 100, color: C.cacao2 }),
  T("Jeaneli Rosmery Caso Valenzuela — Product Owner", { size: 23, after: 40 }),
  T("Arnold Steven Lujan Aderiano — Scrum Master", { size: 23, after: 40 }),
  T("Luis Facundo Matamoros Ylizarbe — Desarrollador", { size: 23, after: 520 }),
  T("Lima, Perú — 2026", { size: 24, bold: true, after: 40 }),
  T("Repositorio: github.com/JeaneliR/VASTAGO2026_INTEGRADOR2", { size: 20, color: "6B5B4B", italics: true }),
];

// ---------- índice estático con números de página reales (segunda pasada)
const tocFile = path.join(__dirname, ".toc.json");
const pages = fs.existsSync(tocFile) ? JSON.parse(fs.readFileSync(tocFile, "utf8")) : [];
const heads = g.state.headings.filter((h) => h.lvl <= 2);
const toc = [new Paragraph({ children: [new TextRun({ text: "Índice", font: FONT, bold: true, size: 32, color: C.cacao })], spacing: { after: 200 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.car, space: 4 } } })];
heads.forEach((h, i) => {
  const l1 = h.lvl === 1;
  toc.push(new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W, leader: "dot" }], indent: { left: l1 ? 0 : 360 },
    spacing: { before: l1 ? 110 : 0, after: l1 ? 30 : 10 },
    children: [new TextRun({ text: h.text, font: FONT, size: l1 ? 21 : 19, bold: l1, color: l1 ? C.cacao : "4A3A2E" }), new TextRun({ text: "\t" + (pages[i] ?? "0"), font: FONT, size: l1 ? 21 : 19, bold: l1 })] }));
});

const footer = new Footer({ children: [new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
  border: { top: { style: BorderStyle.SINGLE, size: 4, color: "CDBFA8", space: 4 } },
  children: [new TextRun({ text: "Vástago & Co — Informe APF2 · Integrador 2 · UTP", font: FONT, size: 16, color: "6B5B4B" }),
    new TextRun({ children: ["\tPágina ", PageNumber.CURRENT], font: FONT, size: 16, color: "6B5B4B" })] })] });

const page = { size: { width: PAGE_W, height: 16838 }, margin: { top: 1300, bottom: 1200, left: MARGIN, right: MARGIN } };
const doc = new Document({
  creator: "Equipo Vástago & Co", title: "Informe APF2 — Sistema Web Inteligente de Producción e Inventarios", description: "Avance de Proyecto Final 2",
  styles: { default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 32, bold: true, font: FONT }, paragraph: { outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, font: FONT }, paragraph: { outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 23, bold: true, font: FONT }, paragraph: { outlineLevel: 2 } } ] },
  numbering: { config: [
    { reference: "bul", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
    ...g.numbering ] },
  sections: [
    { properties: { page }, children: cover },
    { properties: { page }, footers: { default: footer }, children: [...(ONLY.length ? [] : toc), ...body] } ],
});
fs.mkdirSync(path.dirname(OUT), { recursive: true });
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(OUT, b); console.log("OK", OUT, (b.length / 1024).toFixed(0) + " KB", "figs", g.state.fig, "tabs", g.state.tab); });
