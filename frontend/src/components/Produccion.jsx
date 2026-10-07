import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { num, fechaHora } from "../util.js";

const B = { Planificada: "b-n", "En proceso": "b-warn", Completada: "b-ok", Pendiente: "b-n", "En curso": "b-warn" };

export default function Produccion({ permisos, usuario, irA }) {
  const puede = permisos.includes("produccion:escribir");
  const [ordenes, setOrdenes] = useState([]), [prods, setProds] = useState([]), [centros, setCentros] = useState([]), [open, setOpen] = useState(false);
  const [pid, setPid] = useState(""), [cant, setCant] = useState(100), [cid, setCid] = useState(""), [ruta, setRuta] = useState({ etapas: [], bom: [] });
  const [err, setErr] = useState(""), [ver, setVer] = useState(null);
  const cargar = () => api.ordenes().then(setOrdenes).catch((e) => setErr(e.message));
  useEffect(() => { cargar(); api.productos().then((p) => { setProds(p); if (p[0]) setPid(p[0].id); }).catch(() => {}); api.centros().then(setCentros).catch(() => {}); }, []);
  useEffect(() => { if (pid) api.ruta(pid).then(setRuta).catch(() => setRuta({ etapas: [], bom: [] })); }, [pid]);
  const prod = prods.find((p) => String(p.id) === String(pid));
  const centro = centros.find((c) => String(c.id) === String(cid));

  async function crear(e) {
    e.preventDefault(); setErr("");
    try { await api.crearOrden(Number(pid), Number(cant), prod?.llevaCentro ? Number(cid) : null); setOpen(false); cargar(); } catch (x) { setErr(x.message); }
  }
  return (<>
    {puede && <div style={{ marginBottom: 12 }}><button className="btn" onClick={() => { setOpen(true); setErr(""); }}>+ Nueva orden de producción</button></div>}
    <div className="panel">{err && !open && <p className="err">{err}</p>}
      <table><thead><tr><th>Lote</th><th>Producto</th><th>Cantidad</th><th>Inicio</th><th>Avance</th><th>Estado</th><th></th></tr></thead>
        <tbody>{ordenes.map((o) => (<tr key={o.id}><td>{o.lote}</td><td>{o.producto}{o.centro ? <small className="muted"> · centro: {o.centro}</small> : null}</td><td>{o.cantidad}</td><td>{String(o.fecha_inicio).slice(5, 16)}</td>
          <td><div className="bar"><i style={{ width: (o.etapasTotal ? (100 * o.etapasHechas) / o.etapasTotal : 0) + "%" }} /></div><small className="muted">{o.etapasHechas}/{o.etapasTotal} etapas</small></td>
          <td><span className={"badge " + B[o.estado]}>{o.estado}</span></td>
          <td><button className="btn g sm" onClick={() => setVer(o.id)}>Etapas y lotes</button></td></tr>))}</tbody></table></div>
    {open && (<div className="modal-bg" onClick={(e) => e.target === e.currentTarget && setOpen(false)}><form className="modal wide" onSubmit={crear}>
      <h3>Nueva orden de producción</h3>
      <div className="grid2">
        <div className="field"><label>Producto</label><select value={pid} onChange={(e) => { setPid(e.target.value); setCid(""); }}>{prods.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
        <div className="field"><label>Cantidad (unidades)</label><input type="number" min="1" max="100000" step="1" required value={cant} onChange={(e) => setCant(e.target.value)} /></div>
      </div>
      {prod?.llevaCentro && <div className="field"><label>Centro de la gragea</label><select required value={cid} onChange={(e) => setCid(e.target.value)}><option value="">Elige el centro…</option>{centros.map((c) => <option key={c.id} value={c.id}>{c.nombre} (stock {num(c.stock)} {c.unidad})</option>)}</select></div>}
      <p className="muted">Ruta del proceso (se copiará a la orden):</p>
      <ol className="ruta">{ruta.etapas.map((e) => (<li key={e.secuencia}><strong>{e.nombre}</strong> <span className="muted">· {e.horas} h estándar · {e.equipo}</span>
        <ul>{ruta.bom.filter((r) => r.etapa === e.secuencia).map((r) => <li key={r.insumo_id}>{r.insumo}: <strong>{num(r.cantidadPorUnidad * (Number(cant) || 0), 2)} {r.unidad}</strong></li>)}
          {prod?.llevaCentro && prod.centroEtapa === e.secuencia && <li>Centro{centro ? ` (${centro.nombre})` : ""}: <strong>{num(prod.centroPorUnidad * (Number(cant) || 0), 2)} kg</strong></li>}</ul></li>))}</ol>
      {err && <p className="err">{err}</p>}
      <div className="row" style={{ marginTop: 16 }}><button className="btn">Crear orden</button><button type="button" className="btn g" onClick={() => setOpen(false)}>Cancelar</button></div>
    </form></div>)}
    {ver && <OrdenDetalle id={ver} permisos={permisos} usuario={usuario} irA={irA} onClose={() => { setVer(null); cargar(); }} />}
  </>);
}

function OrdenDetalle({ id, permisos, usuario, irA, onClose }) {
  const [o, setO] = useState(null), [err, setErr] = useState(""), [resp, setResp] = useState([]), [equipos, setEquipos] = useState([]);
  const opera = permisos.includes("produccion:etapas");
  const cargar = () => api.orden(id).then(setO).catch((e) => setErr(e.message));
  useEffect(() => { cargar(); if (opera) { api.responsables().then(setResp).catch(() => {}); } api.equipos().then(setEquipos).catch(() => {}); }, [id]);
  const recargar = async () => { setEquipos(await api.equipos().catch(() => [])); await cargar(); };
  return (<div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}><div className="modal xwide">
    {!o ? <p>{err || "Cargando…"}</p> : (<>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3 style={{ margin: 0 }}>{o.lote} · {o.producto}{o.centro ? " con " + o.centro.toLowerCase() : ""}</h3>
        <span className={"badge " + B[o.estado]}>{o.estado}</span></div>
      <p className="muted">{o.cantidad} unidades planificadas{o.cantidadProducida != null ? ` · ${o.cantidadProducida} producidas` : ""}
        {o.lotePT && <> · <button className="link" onClick={() => irA && irA("trazabilidad", o.lotePT.codigo)}>ver trazabilidad del lote {o.lotePT.codigo}</button></>}</p>
      <div className="etapas">{o.etapas.map((e, idx) => (
        <Etapa key={e.id} e={e} orden={o} esUltima={idx === o.etapas.length - 1} previaLista={idx === 0 || o.etapas[idx - 1].estado === "Completada"}
          opera={opera} usuario={usuario} resp={resp} equipos={equipos} irA={irA} onChange={recargar} />))}</div>
    </>)}
    <div className="row" style={{ marginTop: 14 }}><button className="btn g" onClick={onClose}>Cerrar</button></div>
  </div></div>);
}

function Etapa({ e, orden, esUltima, previaLista, opera, usuario, resp, equipos, irA, onChange }) {
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const [inicio, setInicio] = useState({ responsable_id: usuario.id, equipo_id: "" });
  const [cons, setCons] = useState({}), [cierre, setCierre] = useState({ merma_kg: 0, observaciones: "", cantidad_producida: orden.cantidad });
  const esOperario = usuario.rol === "Operario";
  const puedeOperar = opera && (!esOperario || e.responsable_id === usuario.id);
  async function run(fn) { setBusy(true); setErr(""); try { await fn(); await onChange(); } catch (x) { setErr(x.message); } finally { setBusy(false); } }
  const libres = equipos.filter((q) => q.tipo === e.tipoEquipo);
  const horas = e.horasReales != null ? `${num(e.horasReales, 1)} h reales` : "";
  return (<div className={"etapa " + e.estado.replace(" ", "-").toLowerCase()}>
    <div className="row" style={{ justifyContent: "space-between" }}>
      <strong>{e.secuencia}. {e.nombre}</strong>
      <span><span className="muted">{e.horasEstandar} h estándar {horas && "· "}{horas}</span> <span className={"badge " + B[e.estado]}>{e.estado}</span></span></div>
    {(e.responsable || e.equipo) && <p className="muted" style={{ margin: "4px 0" }}>Responsable: <strong>{e.responsable}</strong> · Equipo: <strong>{e.equipo}</strong> · {fechaHora(e.inicio)}{e.fin ? " → " + fechaHora(e.fin) : ""}</p>}

    {e.insumos.length > 0 && (<table className="mini"><thead><tr><th>Insumo</th><th>Planificado</th><th>Consumido</th><th>Lotes usados</th>{e.estado === "En curso" && puedeOperar && <th>Registrar consumo</th>}</tr></thead>
      <tbody>{e.insumos.map((i) => {
        const c = cons[i.insumo_id] || { lote: "", cantidad: "" };
        const falta = Math.max(0, i.planificado - i.consumido);
        return (<tr key={i.insumo_id}><td>{i.insumo}</td><td>{num(i.planificado)} {i.unidad}</td>
          <td className={i.consumido > i.planificado * 1.001 ? "warn-txt" : ""}>{num(i.consumido)} {i.unidad}</td>
          <td>{i.lotes.length ? i.lotes.map((l, k) => <button key={k} className="link" onClick={() => irA && irA("trazabilidad", l.lote)}>{l.lote} ({num(l.cantidad)}) </button>) : <span className="muted">—</span>}</td>
          {e.estado === "En curso" && puedeOperar && (<td><div className="row" style={{ flexWrap: "nowrap" }}>
            <select value={c.lote} onChange={(ev) => setCons({ ...cons, [i.insumo_id]: { ...c, lote: ev.target.value, cantidad: c.cantidad || (falta || "") } })}><option value="">Lote…</option>
              {i.disponibles.map((l) => <option key={l.id} value={l.id}>{l.codigo} · saldo {num(l.disponible)}{l.vencimiento ? " · vence " + l.vencimiento : ""}</option>)}</select>
            <input type="number" min="0.001" step="any" style={{ width: 90 }} value={c.cantidad} onChange={(ev) => setCons({ ...cons, [i.insumo_id]: { ...c, cantidad: ev.target.value } })} />
            <button className="btn sm" disabled={busy || !c.lote || !c.cantidad} onClick={() => run(async () => { await api.consumir(orden.id, e.secuencia, { lote_insumo_id: Number(c.lote), cantidad: Number(c.cantidad) }); setCons({ ...cons, [i.insumo_id]: { lote: "", cantidad: "" } }); })}>Consumir</button></div></td>)}
        </tr>);
      })}</tbody></table>)}

    {e.estado === "Pendiente" && previaLista && orden.estado !== "Completada" && opera && (
      <div className="row" style={{ marginTop: 8 }}>
        <select disabled={esOperario} value={inicio.responsable_id} onChange={(ev) => setInicio({ ...inicio, responsable_id: Number(ev.target.value) })}>
          {(resp.length ? resp : [{ id: usuario.id, nombre: usuario.nombre, rol: usuario.rol }]).map((u) => <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>)}</select>
        <select value={inicio.equipo_id} onChange={(ev) => setInicio({ ...inicio, equipo_id: ev.target.value })}><option value="">Equipo ({e.tipoEquipo})…</option>
          {libres.map((q) => <option key={q.id} value={q.id} disabled={q.enUso}>{q.codigo} — {q.nombre}{q.enUso ? " (en uso)" : ""}</option>)}</select>
        <button className="btn sm" disabled={busy || !inicio.equipo_id} onClick={() => run(() => api.iniciarEtapa(orden.id, e.secuencia, { responsable_id: inicio.responsable_id, equipo_id: Number(inicio.equipo_id) }))}>Iniciar etapa</button></div>)}
    {e.estado === "Pendiente" && !previaLista && <p className="muted" style={{ margin: "6px 0 0" }}>Se habilita al completar la etapa anterior.</p>}

    {e.estado === "En curso" && puedeOperar && (
      <div className="row" style={{ marginTop: 10 }}>
        <label className="muted">Merma (kg) <input type="number" min="0" step="any" style={{ width: 80 }} value={cierre.merma_kg} onChange={(ev) => setCierre({ ...cierre, merma_kg: ev.target.value })} /></label>
        {esUltima && <label className="muted">Unidades producidas <input type="number" min="1" step="1" style={{ width: 90 }} value={cierre.cantidad_producida} onChange={(ev) => setCierre({ ...cierre, cantidad_producida: ev.target.value })} /></label>}
        <input placeholder="Observaciones" maxLength={300} style={{ flex: 1, minWidth: 160 }} value={cierre.observaciones} onChange={(ev) => setCierre({ ...cierre, observaciones: ev.target.value })} />
        <button className="btn sm" disabled={busy} onClick={() => run(() => api.finalizarEtapa(orden.id, e.secuencia, { merma_kg: Number(cierre.merma_kg) || 0, observaciones: cierre.observaciones, ...(esUltima ? { cantidad_producida: Number(cierre.cantidad_producida) } : {}) }))}>Finalizar etapa</button></div>)}
    {e.estado === "En curso" && !puedeOperar && <p className="muted" style={{ margin: "6px 0 0" }}>Solo el responsable asignado o la jefatura pueden operar esta etapa.</p>}
    {e.estado === "Completada" && <p className="muted" style={{ margin: "6px 0 0" }}>Merma: {num(e.merma)} kg{e.observaciones ? " · " + e.observaciones : ""}</p>}
    {err && <p className="err" style={{ margin: "6px 0 0" }}>{err}</p>}
  </div>);
}
