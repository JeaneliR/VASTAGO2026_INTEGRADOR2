import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { num, fecha, SEMAFORO as B } from "../util.js";

const CATEGORIAS = ["Todos", "Materia prima", "Centro", "Insumo auxiliar", "Empaque"];

export default function Inventario({ permisos, irA }) {
  const puede = permisos.includes("inventario:escribir");
  const [items, setItems] = useState([]), [err, setErr] = useState(""), [sel, setSel] = useState(null), [cat, setCat] = useState("Todos");
  const [f, setF] = useState({ tipo: "INGRESO", cantidad: "", motivo: "", lote: "", proveedor: "", vencimiento: "" });
  const [hist, setHist] = useState([]), [lotes, setLotes] = useState([]);
  const cargar = () => api.inventario().then(setItems).catch((e) => setErr(e.message));
  useEffect(() => { cargar(); }, []);

  async function abrir(i) {
    setSel(i); setF({ tipo: "INGRESO", cantidad: "", motivo: "", lote: "", proveedor: "", vencimiento: "" }); setErr("");
    setHist(await api.historial(i.id).catch(() => [])); setLotes(await api.lotesInsumo(i.id).catch(() => []));
  }
  async function guardar(e) {
    e.preventDefault();
    try { await api.movimiento(sel.id, { ...f, cantidad: Number(f.cantidad) }); setSel(null); cargar(); } catch (x) { setErr(x.message); }
  }
  const visibles = items.filter((i) => cat === "Todos" || i.categoria === cat);
  return (
    <div className="panel">
      <div className="row" style={{ marginBottom: 12 }}>{CATEGORIAS.map((c) => <button key={c} className={"btn sm " + (c === cat ? "" : "g")} onClick={() => setCat(c)}>{c}</button>)}</div>
      {err && !sel && <p className="err">{err}</p>}
      <table><thead><tr><th>Insumo</th><th>Categoría</th><th>Stock actual</th><th>Stock mínimo</th><th>Estado</th><th></th></tr></thead>
        <tbody>{visibles.map((i) => (<tr key={i.id}><td>{i.insumo}</td><td className="muted">{i.categoria}</td><td>{num(i.stock)} {i.unidad}</td><td>{num(i.minimo)} {i.unidad}</td>
          <td><span className={"badge " + B[i.estado][0]}>{B[i.estado][1]}</span></td>
          <td><button className="btn g sm" onClick={() => abrir(i)}>{puede ? "Movimiento y lotes" : "Ver lotes"}</button></td></tr>))}</tbody></table>
      {sel && (<div className="modal-bg" onClick={(e) => e.target === e.currentTarget && setSel(null)}><form className="modal wide" onSubmit={guardar}>
        <h3>{sel.insumo}</h3>
        <p className="muted" style={{ marginTop: -8 }}>Cada ingreso queda asociado a un lote; las salidas por producción descuentan del lote que el operario indique, y las salidas manuales siguen FEFO (vence primero, sale primero).</p>
        <table style={{ marginBottom: 14 }}><thead><tr><th>Lote</th><th>Proveedor</th><th>Ingreso</th><th>Vence</th><th>Saldo</th></tr></thead>
          <tbody>{lotes.map((l) => <tr key={l.id}><td><button type="button" className="link" onClick={() => irA && irA("trazabilidad", l.codigo)}>{l.codigo}</button></td><td>{l.proveedor || "—"}</td><td>{fecha(l.ingreso)}</td><td>{l.vencimiento ? fecha(l.vencimiento) : "—"}</td><td>{num(l.disponible)} {sel.unidad}</td></tr>)}</tbody></table>
        {puede && (<>
          <div className="grid2">
            <div className="field"><label>Tipo</label><select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}><option value="INGRESO">Ingreso (nuevo lote)</option><option value="SALIDA">Salida manual (FEFO)</option></select></div>
            <div className="field"><label>Cantidad ({sel.unidad})</label><input type="number" min="0.001" step="any" required value={f.cantidad} onChange={(e) => setF({ ...f, cantidad: e.target.value })} /></div>
          </div>
          {f.tipo === "INGRESO" && (<div className="grid2">
            <div className="field"><label>Código de lote (vacío = automático)</label><input maxLength={30} value={f.lote} onChange={(e) => setF({ ...f, lote: e.target.value })} /></div>
            <div className="field"><label>Vencimiento</label><input type="date" value={f.vencimiento} onChange={(e) => setF({ ...f, vencimiento: e.target.value })} /></div>
            <div className="field"><label>Proveedor</label><input maxLength={100} value={f.proveedor} onChange={(e) => setF({ ...f, proveedor: e.target.value })} /></div>
          </div>)}
          <div className="field"><label>Motivo</label><input maxLength={120} value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} /></div>
          {err && <p className="err">{err}</p>}
        </>)}
        <p className="muted">Últimos movimientos</p>
        {hist.length === 0 ? <p className="muted">Sin movimientos.</p> : hist.slice(0, 5).map((h) => <p key={h.id} className="muted" style={{ margin: "2px 0" }}>{h.tipo} {num(h.cantidad)} {h.lote ? "· lote " + h.lote : ""} — {h.usuario}{h.motivo ? " · " + h.motivo : ""}</p>)}
        <div className="row" style={{ marginTop: 14 }}>{puede && <button className="btn">Guardar</button>}<button type="button" className="btn g" onClick={() => setSel(null)}>Cerrar</button></div>
      </form></div>)}
    </div>);
}
