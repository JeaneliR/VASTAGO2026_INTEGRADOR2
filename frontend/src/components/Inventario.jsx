import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const B = { ok: ["b-ok", "OK"], warn: ["b-warn", "Bajo"], crit: ["b-crit", "Crítico"] };

export default function Inventario({ permisos }) {
  const puede = permisos.includes("inventario:escribir");
  const [items, setItems] = useState([]), [err, setErr] = useState(""), [sel, setSel] = useState(null);
  const [tipo, setTipo] = useState("INGRESO"), [cant, setCant] = useState(""), [motivo, setMotivo] = useState("");
  const [hist, setHist] = useState([]);
  const cargar = () => api.inventario().then(setItems).catch((e) => setErr(e.message));
  useEffect(() => { cargar(); }, []);

  async function abrir(i) { setSel(i); setTipo("INGRESO"); setCant(""); setMotivo(""); setErr(""); setHist(await api.historial(i.id).catch(() => [])); }
  async function guardar(e) {
    e.preventDefault();
    try { await api.movimiento(sel.id, tipo, Number(cant), motivo); setSel(null); cargar(); } catch (x) { setErr(x.message); }
  }
  return (
    <div className="panel">
      {err && !sel && <p className="err">{err}</p>}
      <table><thead><tr><th>Insumo</th><th>Stock actual</th><th>Stock mínimo</th><th>Estado</th><th></th></tr></thead>
        <tbody>{items.map((i) => (<tr key={i.id}><td>{i.insumo}</td><td>{i.stock.toLocaleString("es-PE")} {i.unidad}</td><td>{i.minimo.toLocaleString("es-PE")} {i.unidad}</td>
          <td><span className={"badge " + B[i.estado][0]}>{B[i.estado][1]}</span></td>
          <td><button className="btn g sm" onClick={() => abrir(i)}>{puede ? "Registrar movimiento" : "Ver historial"}</button></td></tr>))}</tbody></table>
      {sel && (<div className="modal-bg" onClick={(e) => e.target === e.currentTarget && setSel(null)}><form className="modal" onSubmit={guardar}>
        <h3>{sel.insumo}</h3>
        {puede && (<>
          <div className="field"><label>Tipo</label><select value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="INGRESO">Ingreso</option><option value="SALIDA">Salida</option></select></div>
          <div className="field"><label>Cantidad ({sel.unidad})</label><input type="number" min="0.001" step="any" required value={cant} onChange={(e) => setCant(e.target.value)} /></div>
          <div className="field"><label>Motivo</label><input maxLength={120} value={motivo} onChange={(e) => setMotivo(e.target.value)} /></div>
          {err && <p className="err">{err}</p>}
        </>)}
        <p className="muted">Últimos movimientos</p>
        {hist.length === 0 ? <p className="muted">Sin movimientos.</p> : hist.slice(0, 4).map((h) => <p key={h.id} className="muted" style={{ margin: "2px 0" }}>{h.tipo} {h.cantidad} — {h.usuario}</p>)}
        <div className="row" style={{ marginTop: 14 }}>{puede && <button className="btn">Guardar</button>}<button type="button" className="btn g" onClick={() => setSel(null)}>Cerrar</button></div>
      </form></div>)}
    </div>);
}
