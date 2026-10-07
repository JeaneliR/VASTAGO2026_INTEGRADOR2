import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { num, fecha, fechaHora } from "../util.js";

export default function Trazabilidad({ param }) {
  const [q, setQ] = useState(""), [sug, setSug] = useState([]), [res, setRes] = useState(null), [err, setErr] = useState("");
  useEffect(() => { if (q.trim().length < 2) { setSug([]); return; } const t = setTimeout(() => api.buscarLote(q.trim()).then(setSug).catch(() => {}), 250); return () => clearTimeout(t); }, [q]);
  useEffect(() => { if (param) abrir(param); }, [param]);

  async function abrir(codigo, tipo) {
    setErr(""); setSug([]); setQ(codigo);
    try {
      if (tipo === "INSUMO") return setRes(await api.trazaInsumo(codigo));
      if (tipo === "PT") return setRes(await api.trazaPT(codigo));
      try { setRes(await api.trazaPT(codigo)); } catch { setRes(await api.trazaInsumo(codigo)); }   // sin tipo: prueba PT y luego insumo
    } catch (x) { setRes(null); setErr("No se encontró un lote con el código «" + codigo + "»."); }
  }
  return (<>
    <div className="panel">
      <p className="muted" style={{ marginTop: 0 }}>Busca un <strong>lote de producto terminado</strong> (p. ej. <em>L-2026-017</em>) para ver de dónde salió, o un <strong>lote de insumo</strong> (p. ej. <em>MNI-2026-08A</em>) para ver dónde terminó.</p>
      <form className="row" onSubmit={(e) => { e.preventDefault(); if (q.trim()) abrir(q.trim()); }}>
        <input style={{ flex: 1, minWidth: 220, padding: "10px 12px", border: "1px solid var(--gris)", borderRadius: 8 }} placeholder="Código de lote…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn">Buscar</button></form>
      {sug.length > 0 && <ul className="sug">{sug.map((s) => <li key={s.tipo + s.codigo}><button className="link" onClick={() => abrir(s.codigo, s.tipo)}><strong>{s.codigo}</strong> <span className="badge b-n">{s.tipo === "PT" ? "Producto terminado" : "Insumo"}</span> {s.descripcion}</button></li>)}</ul>}
      {err && <p className="err">{err}</p>}
    </div>
    {res?.direccion === "atras" && <Atras r={res} abrir={abrir} />}
    {res?.direccion === "adelante" && res.resultados.map((x) => <Adelante key={x.lote.id} x={x} abrir={abrir} />)}
  </>);
}

function Atras({ r, abrir }) {
  const l = r.lote;
  return (<>
    <div className="panel"><div className="row" style={{ justifyContent: "space-between" }}><h3 style={{ margin: 0 }}>Hacia atrás · lote {l.codigo}</h3><span className="badge b-ok">Producto terminado</span></div>
      <p style={{ margin: "8px 0" }}><strong>{l.producto}</strong>{l.centro ? ` con ${l.centro.toLowerCase()}` : ""} · {l.producido} unidades producidas · {l.disponible} disponibles · producido el {fecha(l.produccion)} · vence {fecha(l.vencimiento)}</p>
      <p className="muted" style={{ margin: 0 }}>{r.resumen.etapas} etapas · {r.resumen.lotesInsumo} lotes de insumo · {r.resumen.despachado} unidades despachadas</p></div>
    <div className="panel"><h3>Recorrido por el proceso</h3>
      <ol className="timeline">{r.etapas.map((e) => (<li key={e.id}>
        <div className="row" style={{ justifyContent: "space-between" }}><strong>{e.secuencia}. {e.nombre}</strong>
          <span className="muted">{e.horasReales != null ? `${num(e.horasReales, 1)} h reales` : "—"} / {e.horasEstandar} h estándar{e.horasReales != null && e.horasReales > e.horasEstandar * 1.1 ? " ⚠" : ""}</span></div>
        <p className="muted" style={{ margin: "2px 0 6px" }}>Responsable: <strong>{e.responsable || "—"}</strong> · Equipo: <strong>{e.equipo || "—"}</strong> · {fechaHora(e.inicio)} → {fechaHora(e.fin)} · merma {num(e.merma)} kg{e.observaciones ? " · " + e.observaciones : ""}</p>
        <table className="mini"><thead><tr><th>Insumo</th><th>Lote</th><th>Proveedor</th><th>Vence</th><th>Cantidad</th></tr></thead>
          <tbody>{e.consumos.map((c, i) => <tr key={i}><td>{c.insumo}</td><td><button className="link" onClick={() => abrir(c.lote, "INSUMO")}>{c.lote}</button></td><td>{c.proveedor || "—"}</td><td>{c.vencimiento ? fecha(c.vencimiento) : "—"}</td><td>{num(c.cantidad)} {c.unidad}</td></tr>)}
            {e.consumos.length === 0 && <tr><td colSpan="5" className="muted">Sin consumos de insumos en esta etapa.</td></tr>}</tbody></table></li>))}</ol></div>
    <div className="panel"><h3>Destino del producto (despachos)</h3>
      {r.despachos.length === 0 ? <p className="muted">Aún no se despachó este lote.</p> : <table><thead><tr><th>Fecha</th><th>Unidades</th><th>Destino</th><th>Motivo</th></tr></thead>
        <tbody>{r.despachos.map((d, i) => <tr key={i}><td>{fechaHora(d.fecha)}</td><td>{d.cantidad}</td><td>{d.destino}</td><td>{d.motivo || "—"}</td></tr>)}</tbody></table>}</div>
  </>);
}

function Adelante({ x, abrir }) {
  const l = x.lote;
  return (<>
    <div className="panel"><div className="row" style={{ justifyContent: "space-between" }}><h3 style={{ margin: 0 }}>Hacia adelante · lote {l.codigo}</h3><span className="badge b-warn">Insumo</span></div>
      <p style={{ margin: "8px 0" }}><strong>{l.insumo}</strong> · proveedor {l.proveedor || "—"} · ingresó {fecha(l.ingreso)} · vence {l.vencimiento ? fecha(l.vencimiento) : "—"} · saldo {num(l.disponible)} {l.unidad}</p>
      <p className="muted" style={{ margin: 0 }}>Usado en {x.resumen.ordenes} órdenes · {num(x.resumen.consumido)} {l.unidad} consumidos · {x.resumen.lotesPT} lotes de producto terminado · destinos: {x.resumen.destinos.join(", ") || "sin despachos aún"}</p></div>
    <div className="panel"><h3>Dónde se usó</h3>
      <table><thead><tr><th>Orden</th><th>Producto</th><th>Etapa</th><th>Cantidad</th><th>Fecha</th></tr></thead>
        <tbody>{x.usos.map((u, i) => <tr key={i}><td>{u.orden}</td><td>{u.producto}</td><td>{u.secuencia}. {u.etapa}</td><td>{num(u.cantidad)} {l.unidad}</td><td>{fechaHora(u.fecha)}</td></tr>)}
          {x.usos.length === 0 && <tr><td colSpan="5" className="muted">Este lote aún no se consumió en producción.</td></tr>}</tbody></table>
      <p className="muted">La trazabilidad es por orden: todo el producto de una orden que usó este lote queda asociado a él.</p></div>
    <div className="panel"><h3>Producto terminado resultante y sus destinos</h3>
      {x.lotesPT.length === 0 ? <p className="muted">Ninguna orden que usó este lote terminó aún.</p> : x.lotesPT.map((p) => (<div key={p.codigo} style={{ marginBottom: 10 }}>
        <p style={{ margin: "4px 0" }}><button className="link" onClick={() => abrir(p.codigo, "PT")}><strong>{p.codigo}</strong></button> · {p.producido} producidas · {p.disponible} disponibles</p>
        {p.despachos.length ? <table className="mini"><tbody>{p.despachos.map((d, i) => <tr key={i}><td>{fechaHora(d.fecha)}</td><td>{d.cantidad} uds.</td><td>→ {d.destino}</td></tr>)}</tbody></table> : <p className="muted" style={{ margin: 0 }}>Sin despachos.</p>}</div>))}</div>
  </>);
}
