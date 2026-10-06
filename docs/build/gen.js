// Librería de generación del informe (docx-js). Numera figuras y tablas automáticamente y soporta referencias cruzadas.
const fs = require("fs");
const path = require("path");
const D = require("docx");
const { Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, AlignmentType, HeadingLevel, WidthType, ShadingType, BorderStyle,
        VerticalAlign, LevelFormat, PageBreak, TabStopType } = D;
const sizeOf = (b) => { return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) }; };

const FONT = "Arial";
const C = { cacao: "2E1B12", cacao2: "4A2C1F", car: "C89B3C", crema: "FAF3E7", gris: "E4DED2", ok: "2E7D4F", crit: "B3261E", warn: "B8860B", head: "4A2C1F", band: "F6EFE3" };
const PAGE_W = 11906, MARGIN = 1304, CONTENT_W = PAGE_W - 2 * MARGIN;      // A4, márgenes 2.3 cm → 9298 DXA
const REG_FILE = path.join(__dirname, ".registry.json");

const state = { headings: [], fig: 0, tab: 0, cod: 0, ids: {}, prev: fs.existsSync(REG_FILE) ? JSON.parse(fs.readFileSync(REG_FILE, "utf8")) : {} };
function reset() { state.headings = []; state.fig = 0; state.tab = 0; state.cod = 0; state.ids = {}; }
function saveRegistry() { fs.writeFileSync(REG_FILE, JSON.stringify(state.ids, null, 1)); }

// Referencia cruzada: R("fig:asis") → "Figura 4" (usa el número calculado en la pasada anterior)
function R(id) { const n = (state.prev[id] || state.ids[id]); const kind = id.startsWith("fig:") ? "Figura" : id.startsWith("cod:") ? "Código" : "Tabla"; return `${kind} ${n || "?"}`; }

// ---------- texto
function runs(text, base = {}) {
  // **negrita**, _cursiva_, `código`, {fig:id}/{tab:id} → referencia
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\{(?:fig|tab|cod):[a-z0-9_]+\}|__[^_]+__)/gi;
  String(text).split(re).forEach((p) => {
    if (!p) return;
    if (p.startsWith("**")) out.push(new TextRun({ text: p.slice(2, -2), bold: true, font: FONT, ...base }));
    else if (p.startsWith("__")) out.push(new TextRun({ text: p.slice(2, -2), italics: true, font: FONT, ...base }));
    else if (p.startsWith("`")) out.push(new TextRun({ text: p.slice(1, -1), font: "Consolas", size: (base.size || 22) - 2, ...{ ...base, size: undefined }, shading: { type: ShadingType.CLEAR, fill: "F1ECE2" } }));
    else if (p.startsWith("{")) out.push(new TextRun({ text: R(p.slice(1, -1)), bold: true, font: FONT, ...base }));
    else out.push(new TextRun({ text: p, font: FONT, ...base }));
  });
  return out;
}
const P = (text, o = {}) => new Paragraph({ children: runs(text, { size: o.size || 22, color: o.color, italics: o.italics, bold: o.bold }), alignment: o.align || AlignmentType.JUSTIFIED,
  spacing: { after: o.after ?? 120, line: 300, before: o.before || 0 }, indent: o.indent, keepNext: o.keepNext });
const H1 = (t) => (state.headings.push({ lvl: 1, text: t }), new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun({ text: t, font: FONT, bold: true, size: 32, color: C.cacao })], spacing: { before: 0, after: 200 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.car, space: 4 } } }));
const H2 = (t) => (state.headings.push({ lvl: 2, text: t }), new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, children: [new TextRun({ text: t, font: FONT, bold: true, size: 26, color: C.cacao2 })], spacing: { before: 280, after: 120 } }));
const H3 = (t) => (state.headings.push({ lvl: 3, text: t }), new Paragraph({ heading: HeadingLevel.HEADING_3, keepNext: true, children: [new TextRun({ text: t, font: FONT, bold: true, size: 23, color: C.cacao2 })], spacing: { before: 200, after: 100 } }));
const bullets = (items, ref = "bul") => items.map((t) => new Paragraph({ numbering: { reference: ref, level: 0 }, children: runs(t, { size: 22 }), spacing: { after: 70, line: 290 }, alignment: AlignmentType.LEFT }));
let numCount = 0; const numbering = [];
const numbered = (items) => { const ref = "num" + (++numCount); numbering.push({ reference: ref, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] });
  return items.map((t) => new Paragraph({ numbering: { reference: ref, level: 0 }, children: runs(t, { size: 22 }), spacing: { after: 70, line: 290 }, alignment: AlignmentType.LEFT })); };
const spacer = (n = 120) => new Paragraph({ children: [], spacing: { after: n } });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

// ---------- leyendas numeradas
function caption(kind, id, title) {
  const n = kind === "Figura" ? ++state.fig : kind === "Código" ? ++state.cod : ++state.tab;
  if (id) { const key = (kind === "Figura" ? "fig:" : kind === "Código" ? "cod:" : "tab:") + id; if (state.ids[key]) console.warn("ID DUPLICADO:", key); state.ids[key] = n; }
  return n;
}
// Figura: imagen centrada + "Figura N. Título" + descripción + "Fuente: ..."
function fig(file, title, o = {}) {
  const n = caption("Figura", o.id, title);
  const abs = path.isAbsolute(file) ? file : path.join(__dirname, file);
  const dim = sizeOf(fs.readFileSync(abs));
  const w = Math.min(o.width || 600, 610), h = Math.round(w * dim.height / dim.width);
  const out = [new Paragraph({ children: [new ImageRun({ type: "png", data: fs.readFileSync(abs), transformation: { width: w, height: h },
      altText: { title, description: title, name: title } })], alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 }, keepNext: true }),
    new Paragraph({ children: [new TextRun({ text: `Figura ${n}. `, bold: true, font: FONT, size: 20, color: C.cacao2 }), new TextRun({ text: title, font: FONT, size: 20, color: C.cacao2 })],
      alignment: AlignmentType.CENTER, spacing: { after: o.desc ? 40 : 40 }, keepLines: true })];
  if (o.desc) out.push(new Paragraph({ children: runs(o.desc, { size: 19, italics: true, color: "5B4636" }), alignment: AlignmentType.CENTER, spacing: { after: 40 }, indent: { left: 400, right: 400 } }));
  out.push(new Paragraph({ children: [new TextRun({ text: "Fuente: " + (o.source || "Elaboración propia."), font: FONT, size: 18, color: "6B5B4B" })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }));
  return out;
}
// Tabla: "Tabla N. Título" arriba + tabla + "Fuente"
const border = { style: BorderStyle.SINGLE, size: 4, color: "CDBFA8" };
const borders = { top: border, bottom: border, left: border, right: border };
function cellContent(v, o = {}) {
  const lines = Array.isArray(v) ? v : [v];
  return lines.map((t, i) => new Paragraph({ children: runs(String(t), { size: o.size || 19, bold: o.bold, color: o.color }), alignment: o.align || AlignmentType.LEFT, spacing: { after: i < lines.length - 1 ? 40 : 0, line: 252 } }));
}
function table(headers, rows, o = {}) {
  const n = caption("Tabla", o.id, o.title);
  const total = o.total || CONTENT_W;
  const widths = o.widths ? o.widths.map((w) => Math.round(w * total / o.widths.reduce((a, b) => a + b, 0))) : headers.map(() => Math.floor(total / headers.length));
  widths[widths.length - 1] += total - widths.reduce((a, b) => a + b, 0);
  const mk = (v, i, hdr, ri) => new TableCell({ borders, width: { size: widths[i], type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
    shading: { type: ShadingType.CLEAR, fill: hdr ? C.head : (o.zebra === false ? "FFFFFF" : (ri % 2 ? "FAF6EE" : "FFFFFF")), color: "auto" },
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    children: cellContent(v, hdr ? { bold: true, color: "FFFFFF", size: o.hsize || 19, align: AlignmentType.CENTER } : { size: o.size || 19, align: (o.align && o.align[i]) || AlignmentType.LEFT, bold: o.boldFirst && i === 0 }) });
  const trs = [new TableRow({ tableHeader: true, cantSplit: true, children: headers.map((h, i) => mk(h, i, true)) }),
    ...rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((v, i) => mk(v, i, false, ri)) }))];
  const out = [new Paragraph({ children: [new TextRun({ text: `Tabla ${n}. `, bold: true, font: FONT, size: 20, color: C.cacao2 }), new TextRun({ text: o.title || "", font: FONT, size: 20, color: C.cacao2 })],
      alignment: AlignmentType.CENTER, spacing: { before: 160, after: 80 }, keepNext: true, keepLines: true }),
    new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: widths, rows: trs, alignment: AlignmentType.CENTER })];
  out.push(new Paragraph({ children: [new TextRun({ text: "Fuente: " + (o.source || "Elaboración propia."), font: FONT, size: 18, color: "6B5B4B" })], alignment: AlignmentType.CENTER, spacing: { before: 60, after: 200 } }));
  return out;
}
// Bloque de código (monoespaciado, fondo claro) — una línea por párrafo
function code(text, o = {}) {
  const lines = String(text).replace(/\t/g, "    ").split("\n");
  const out = lines.map((ln, i) => new Paragraph({ children: [new TextRun({ text: ln === "" ? " " : ln, font: "Consolas", size: o.size || 16 })], keepLines: true,
    shading: { type: ShadingType.CLEAR, fill: "F5F1E8" }, spacing: { after: 0, line: 232 }, indent: { left: 120, right: 120 },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: C.car, space: 6 } }, alignment: AlignmentType.LEFT }));
  if (o.title) { const n = caption("Código", o.id, o.title);
    out.unshift(new Paragraph({ children: [new TextRun({ text: `Código ${n}. `, bold: true, font: FONT, size: 20, color: C.cacao2 }), new TextRun({ text: o.title, font: FONT, size: 20, color: C.cacao2 })], spacing: { before: 160, after: 60 }, keepNext: true })); }
  out.push(spacer(160)); return out;
}
// Cuadro de nota / destacado
function note(text, o = {}) {
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [CONTENT_W], rows: [new TableRow({ children: [new TableCell({
    width: { size: CONTENT_W, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: o.fill || "FFF4CC" }, margins: { top: 100, bottom: 100, left: 160, right: 160 },
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, left: { style: BorderStyle.SINGLE, size: 24, color: o.bar || C.car } },
    children: [new Paragraph({ children: runs(text, { size: 20 }), spacing: { after: 0, line: 276 } })] })] })] });
}
const cap = (kind) => kind; // compat

module.exports = { D, FONT, C, CONTENT_W, PAGE_W, MARGIN, state, reset, saveRegistry, R, runs, P, H1, H2, H3, bullets, numbered, spacer, pageBreak, fig, table, code, note, numbering,
  AlignmentType, WidthType, ShadingType, BorderStyle };
