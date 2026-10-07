import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { num, fecha, fechaHora, SEMAFORO as B } from "../util.js";

export default function ProductoTerminado({ permisos, irA }) {
  const puede = permisos.includes("pt:escribir");
  const [d, setD] = useState({ stock: [], lotes: [] }), [err, setErr] = useState(""), [sel, setSel] = useState(null);
  const [f, setF] = useState({ cantidad: "", destino: "", motivo: "" }), [movs, setMovs] = useState([]);
  const cargar = () => api.productoTerminado().then(setD).catch((e) => setErr(e.message));
  useEffect(() => { cargar(); }, []);
  async function abrir(l) { setSel(l); setF({ cantidad: "", destino: "", motivo: "" }); setErr(""); setMovs(await api.movimientosPT(l.id).catch(() => [])); }
  async function despachar(e) {
    e.preventDefault();
    try { await api.despachar(sel.id, { ...f, cantidad: Number(f.cantidad) }); setSel(null); cargar(); } catch (x) { setErr(x.message); }
  }
  // Productos con variantes (centro): se agrupan para mostrar el total y el detalle por centro
  const grupos = d.stock.reduce((m, s) => { (m[s.productoId] = m[s.productoId] || { ...s, filas: [] }).filas.push(s); return m; }, {});
  return (<>
    {err && !sel && <p className="err">{err}</p>}
    <div className="panel"><h3>Existencias de producto terminado</h3>
      <table><thead><tr><th>Código</th><th>Producto</th><th>Variante (centro)</th><th>Stock</th><th>Mínimo</th><th>Estado</th></tr></thead>
        <tbody>{Object.values(grupos).flatMap((g) => g.filas.map((s, i) => (
          <tr key={g.productoId + "-" + (s.centroId || 0)}>
            <td className="muted">{i === 0 ? g.codigo : ""}</td><td>{i === 0 ? <strong>{g.producto}</strong> : ""}</td>
            <td>{s.centro || <span className="muted">—</span>}</td><td>{num(s.stock, 0)} {s.unidad}</td>
            <td>{i === 0 ? num(g.minimo, 0) : ""}</td>
            <td>{i === 0 && <span className={"badge " + B[g.estado][0]}>{B[g.estado][1]}</span>}{i === 0 && g.filas.length > 1 && <small className="muted"> total {num(g.stockTotal, 0)}</small>}</td></tr>)))}</tbody></table>
      <p className="muted">El semáforo compara el stock total del producto con su mínimo. Las grageas se separan por centro (maní, pasas, almendra…).</p></div>
    <div className="panel"><h3>Lotes de producto terminado</h3>
      <table><thead><tr><th>Lote</th><th>Producto</th><th>Centro</th><th>Producido</th><th>Disponible</th><th>Producción</th><th>Vence</th><th></th></tr></thead>
        <tbody>{d.lotes.map((l) => <tr key={l.id}><td><button className="link" onClick={() => irA && irA("trazabilidad", l.codigo)}>{l.codigo}</button></td><td>{l.producto}</td><td>{l.centro || "—"}</td>
          <td>{l.producido}</td><td><strong>{l.disponible}</strong></td><td>{fecha(l.produccion)}</td><td>{fecha(l.vencimiento)}</td>
          <td><button className="btn g sm" onClick={() => abrir(l)}>{puede ? "Despachar / historial" : "Historial"}</button></td></tr>)}</tbody></table></div>
    {sel && (<div className="modal-bg" onClick={(e) => e.target === e.currentTarget && setSel(null)}><form className="modal" onSubmit={despachar}>
      <h3>Lote {sel.codigo}</h3><p className="muted" style={{ marginTop: -8 }}>{sel.producto}{sel.centro ? " · " + sel.centro : ""} — disponible: <strong>{sel.disponible}</strong></p>
      {puede && sel.disponible > 0 && (<>
        <div className="field"><label>Unidades a despachar</label><input type="number" min="1" max={sel.disponible} step="1" required value={f.cantidad} onChange={(e) => setF({ ...f, cantidad: e.target.value })} /></div>
        <div className="field"><label>Destino (cliente, tienda o canal)</label><input required maxLength={120} value={f.destino} onChange={(e) => setF({ ...f, destino: e.target.value })} /></div>
        <div className="field"><label>Motivo / guía</label><input maxLength={120} value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} /></div>
        {err && <p className="err">{err}</p>}</>)}
      <p className="muted">Movimientos del lote</p>
      {movs.map((m) => <p key={m.id} className="muted" style={{ margin: "2px 0" }}>{fechaHora(m.fecha)} · {m.tipo === "INGRESO" ? "＋" : "−"}{m.cantidad} {m.destino ? "→ " + m.destino : ""} <em>({m.usuario})</em></p>)}
      <div className="row" style={{ marginTop: 14 }}>{puede && sel.disponible > 0 && <button className="btn">Registrar despacho</button>}<button type="button" className="btn g" onClick={() => setSel(null)}>Cerrar</button></div>
    </form></div>)}
  </>);
}
