import React, { useEffect, useState } from "react";
import { api, descargarReporte } from "../api.js";

const INICIAL = { tipo: "inventario", q: "", estado: "", categoria: "", desde: "", hasta: "" };
const ESTADOS = { ok: "OK", warn: "Bajo", crit: "Crítico" };
function valor(value, key) {
  if (value === null || value === undefined) return "—";
  if (key === "fecha") return new Date(value).toLocaleDateString("es-PE", { timeZone: "UTC" });
  if (key === "estado") return ESTADOS[value] || value;
  return typeof value === "number" ? value.toLocaleString("es-PE", { maximumFractionDigits: 3 }) : value;
}

export default function Reportes() {
  const [draft, setDraft] = useState(INICIAL), [applied, setApplied] = useState(INICIAL), [data, setData] = useState(null);
  const [busy, setBusy] = useState(false), [err, setErr] = useState(""), [notice, setNotice] = useState("");
  async function consultar(e, filters = draft) {
    e?.preventDefault(); setBusy(true); setErr(""); setNotice("");
    try { const result = await api.reportes(filters); setData(result); setApplied({ ...filters }); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  useEffect(() => { consultar(null, INICIAL); }, []);
  async function descargar(format) {
    setBusy(true); setErr(""); setNotice("");
    try { await descargarReporte(applied, format); setNotice("Reporte descargado correctamente."); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  function tipo(value) { setDraft({ ...INICIAL, tipo: value }); setData(null); setNotice(""); }
  const changed = JSON.stringify(draft) !== JSON.stringify(applied);
  return <>
    <p className="muted">Consulta inventario y producción con filtros. Las descargas utilizan los mismos filtros aplicados en pantalla.</p>
    <form className="panel" onSubmit={consultar}><div className="report-filters">
      <div className="field"><label htmlFor="reporte-tipo">Reporte</label><select id="reporte-tipo" value={draft.tipo} onChange={e => tipo(e.target.value)}><option value="inventario">Inventario</option><option value="produccion">Producción</option></select></div>
      <div className="field"><label htmlFor="reporte-q">Buscar</label><input id="reporte-q" type="search" maxLength={80} placeholder={draft.tipo === "inventario" ? "Nombre del insumo" : "Lote o producto"} value={draft.q} onChange={e => setDraft({ ...draft, q: e.target.value })} /></div>
      <div className="field"><label htmlFor="reporte-estado">Estado</label><select id="reporte-estado" value={draft.estado} onChange={e => setDraft({ ...draft, estado: e.target.value })}><option value="">Todos</option>
        {(draft.tipo === "inventario" ? [["crit", "Crítico"], ["warn", "Bajo"], ["ok", "OK"]] : [["Planificada", "Planificada"], ["En proceso", "En proceso"], ["Completada", "Completada"]]).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
      {draft.tipo === "inventario" ? <div className="field"><label htmlFor="reporte-categoria">Categoría</label><select id="reporte-categoria" value={draft.categoria} onChange={e => setDraft({ ...draft, categoria: e.target.value })}><option value="">Todas</option>{["Materia prima", "Centro", "Insumo auxiliar", "Empaque"].map(c => <option key={c}>{c}</option>)}</select></div> : <>
        <div className="field"><label htmlFor="reporte-desde">Inicio de orden desde</label><input id="reporte-desde" type="date" value={draft.desde} onChange={e => setDraft({ ...draft, desde: e.target.value })} /></div>
        <div className="field"><label htmlFor="reporte-hasta">Inicio de orden hasta</label><input id="reporte-hasta" type="date" min={draft.desde} value={draft.hasta} onChange={e => setDraft({ ...draft, hasta: e.target.value })} /></div></>}
    </div><div className="row"><button className="btn" disabled={busy}>{busy ? "Procesando…" : "Aplicar filtros"}</button><button type="button" className="btn g" disabled={busy} onClick={() => { const clean = { ...INICIAL, tipo: draft.tipo }; setDraft(clean); consultar(null, clean); }}>Limpiar filtros</button></div></form>
    {err && <p className="err" role="alert">{err}</p>}{notice && <p className="success" role="status">{notice}</p>}
    {data && <div className="panel"><div className="toolbar"><div><h3>{data.titulo}</h3><p className="muted">{data.total} registros · Consultado: {new Date(data.generado_en).toLocaleString("es-PE")}</p></div><div className="row">
      <button className="btn g" disabled={busy || changed} onClick={() => descargar("xlsx")}>Descargar Excel</button><button className="btn g" disabled={busy || changed} onClick={() => descargar("pdf")}>Descargar PDF</button></div></div>
      {changed && <p className="muted" role="status">Aplica los filtros modificados para actualizar y exportar el resultado.</p>}
      <table><thead><tr>{data.columnas.map(c => <th key={c.clave}>{c.titulo}</th>)}</tr></thead><tbody>{data.filas.map((row, index) => <tr key={index}>{data.columnas.map(c => <td key={c.clave}>{valor(row[c.clave], c.clave)}</td>)}</tr>)}</tbody></table>
      {!data.total && <p className="empty">No se encontraron registros. Prueba otros filtros.</p>}
    </div>}
  </>;
}
