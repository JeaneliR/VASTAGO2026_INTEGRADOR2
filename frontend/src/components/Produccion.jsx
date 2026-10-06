import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const B = { Planificada: "b-n", "En proceso": "b-warn", Completada: "b-ok" };

export default function Produccion({ permisos }) {
  const puede = permisos.includes("produccion:escribir");
  const [ordenes, setOrdenes] = useState([]), [prods, setProds] = useState([]), [open, setOpen] = useState(false);
  const [pid, setPid] = useState(""), [cant, setCant] = useState(100), [bom, setBom] = useState([]), [err, setErr] = useState("");
  const cargar = () => api.ordenes().then(setOrdenes).catch((e) => setErr(e.message));
  useEffect(() => { cargar(); api.productos().then((p) => { setProds(p); if (p[0]) setPid(p[0].id); }).catch(() => {}); }, []);
  useEffect(() => { if (pid) api.bom(pid).then(setBom).catch(() => setBom([])); }, [pid]);

  async function crear(e) { e.preventDefault(); try { await api.crearOrden(Number(pid), Number(cant)); setOpen(false); cargar(); } catch (x) { setErr(x.message); } }
  async function avanzar(o) {
    const sig = o.estado === "Planificada" ? "En proceso" : "Completada";
    if (sig === "Completada" && !window.confirm(`Completar ${o.lote} descontará los insumos del inventario. ¿Continuar?`)) return;
    try { await api.estadoOrden(o.id, sig); cargar(); } catch (x) { setErr(x.message); }
  }
  return (<>
    {puede && <div style={{ marginBottom: 12 }}><button className="btn" onClick={() => { setOpen(true); setErr(""); }}>+ Nueva orden de producción</button></div>}
    <div className="panel">{err && !open && <p className="err">{err}</p>}
      <table><thead><tr><th>Lote</th><th>Producto</th><th>Cantidad</th><th>Inicio</th><th>Estado</th><th></th></tr></thead>
        <tbody>{ordenes.map((o) => (<tr key={o.id}><td>{o.lote}</td><td>{o.producto}</td><td>{o.cantidad}</td><td>{String(o.fecha_inicio).slice(0, 16)}</td>
          <td><span className={"badge " + B[o.estado]}>{o.estado}</span></td>
          <td>{puede && o.estado !== "Completada" && <button className="btn g sm" onClick={() => avanzar(o)}>{o.estado === "Planificada" ? "Iniciar" : "Completar"}</button>}</td></tr>))}</tbody></table></div>
    {open && (<div className="modal-bg" onClick={(e) => e.target === e.currentTarget && setOpen(false)}><form className="modal" onSubmit={crear}>
      <h3>Nueva orden de producción</h3>
      <div className="field"><label>Producto</label><select value={pid} onChange={(e) => setPid(e.target.value)}>{prods.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
      <div className="field"><label>Cantidad (unidades)</label><input type="number" min="1" max="100000" step="1" required value={cant} onChange={(e) => setCant(e.target.value)} /></div>
      <p className="muted">Consumo estimado de insumos (receta / BOM):</p>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>{bom.map((r) => <li key={r.insumo_id}>{r.insumo}: <strong>{(r.cantidadPorUnidad * (Number(cant) || 0)).toFixed(1)} {r.unidad}</strong></li>)}</ul>
      {err && <p className="err">{err}</p>}
      <div className="row" style={{ marginTop: 16 }}><button className="btn">Crear orden</button><button type="button" className="btn g" onClick={() => setOpen(false)}>Cancelar</button></div>
    </form></div>)}
  </>);
}
