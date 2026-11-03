import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export function Alerta({ a }) {
  return <div className={"alert " + a.nivel}><span aria-hidden="true">{a.nivel === "crit" ? "●" : "◐"}</span><div><strong>{a.titulo}</strong><small>{a.detalle}</small></div></div>;
}

export function Dashboard({ usuario, permisos, irA }) {
  const [mes, setMes] = useState(() => { const parts = new Intl.DateTimeFormat("en", { year: "numeric", month: "2-digit", timeZone: "America/Lima" }).formatToParts(new Date()); return parts.find(p => p.type === "year").value + "-" + parts.find(p => p.type === "month").value; });
  const [data, setData] = useState(null), [err, setErr] = useState(""), [loading, setLoading] = useState(false), [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true, running = false;
    async function cargar() {
      if (document.hidden || running) return; running = true; setLoading(true);
      try { const result = await api.dashboard(mes); if (alive) { setData(result); setErr(""); } }
      catch (e) { if (alive) setErr(e.message); } finally { running = false; if (alive) setLoading(false); }
    }
    cargar(); const timer = setInterval(cargar, 30000); document.addEventListener("visibilitychange", cargar);
    return () => { alive = false; clearInterval(timer); document.removeEventListener("visibilitychange", cargar); };
  }, [mes, tick]);
  const max = Math.max(1, ...(data?.serie || []).map(r => r.unidades));
  return <>
    <div className="toolbar"><div><p className="muted">Resumen de {usuario.rol.toLowerCase()}. El stock y las órdenes activas muestran el estado actual.</p>
      {data && <small className="muted">Última actualización: {new Date(data.actualizado_en).toLocaleTimeString("es-PE")}</small>}</div>
      <div className="row"><div className="field compact"><label htmlFor="dashboard-mes">Mes de producción y movimientos</label><input id="dashboard-mes" type="month" min="2000-01" max="2100-12" required value={mes} onChange={e => { if (e.target.value) setMes(e.target.value); }} /></div>
        <button className="btn g" disabled={loading} onClick={() => setTick(tick + 1)}>{loading ? "Actualizando…" : "Actualizar"}</button></div></div>
    {err && <p className="err" role="alert">{err}</p>}
    {!data ? <p>Cargando indicadores…</p> : <>
      <div className="kpis dashboard-kpis">{data.indicadores.map(k => <div className="kpi" key={k.id}><div className="l">{k.titulo}</div><div className="v">{k.valor}</div><div className="d neutral">{k.detalle}</div></div>)}</div>
      <div className="dashboard-grid"><div className="panel"><div className="toolbar"><h3>Alertas de inventario</h3>{permisos.includes("inventario:ver") && <button className="btn g sm" onClick={() => irA("inventario")}>Ver inventario</button>}</div>
        <p className="muted">Se recalculan con las existencias actuales; una alerta desaparece al reponer el insumo.</p>
        {data.alertas.length ? data.alertas.map(a => <Alerta key={a.id} a={a} />) : <p className="empty">Todos los insumos tienen existencias suficientes.</p>}</div>
        <div>{data.serie.length > 0 && <div className="panel"><h3>Unidades producidas por mes</h3><div className="monthly-bars" role="img" aria-label="Unidades producidas durante los últimos seis meses">
          {data.serie.map(r => <div className="month-row" key={r.mes}><span>{r.mes}</span><div className="month-track"><i style={{ width: `${r.unidades / max * 100}%` }} /></div><strong>{r.unidades.toLocaleString("es-PE")}</strong></div>)}</div>
          <h3 style={{ marginTop: 22 }}>Órdenes por estado</h3><div className="row">{data.produccion.map(r => <span className="badge b-n" key={r.estado}>{r.estado}: {r.total}</span>)}</div></div>}
          <div className="panel"><h3>Accesos rápidos</h3><div className="row">
            {permisos.includes("reportes:ver") && <button className="btn" onClick={() => irA("reportes")}>Consultar reportes</button>}
            {permisos.includes("produccion:escribir") && <button className="btn g" onClick={() => irA("produccion")}>Gestionar producción</button>}
            {permisos.includes("correo:ver") && <button className="btn g" onClick={() => irA("correo")}>Alertas por correo</button>}
          </div></div></div></div>
    </>}
  </>;
}
