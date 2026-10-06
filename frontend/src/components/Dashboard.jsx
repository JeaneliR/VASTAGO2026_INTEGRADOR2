import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export function Alerta({ a }) {
  return <div className={"alert " + a.nivel}><span>{a.nivel === "crit" ? "🔴" : "🟠"}</span><div><strong>{a.titulo}</strong><small>{a.detalle}</small></div></div>;
}

export function Dashboard() {
  const [k, setK] = useState(null), [al, setAl] = useState([]), [err, setErr] = useState("");
  useEffect(() => { Promise.all([api.kpis(), api.alertas()]).then(([a, b]) => { setK(a); setAl(b); }).catch((e) => setErr(e.message)); }, []);
  if (err) return <p className="err">{err}</p>;
  if (!k) return <p>Cargando…</p>;
  const items = [["Quiebres de stock", k.quiebresStock], ["Merma de producción (mes)", k.mermaMes], ["Órdenes activas", k.ordenesActivas], ["Precisión del modelo IA", k.precisionModelo]];
  return (<>
    <div className="kpis">{items.map(([l, d]) => <div className="kpi" key={l}><div className="l">{l}</div><div className="v">{d.valor}</div><div className={"d " + d.tipo}>{d.delta}</div></div>)}</div>
    <div className="panel"><h3>Alertas</h3>{al.map((a) => <Alerta a={a} key={a.id} />)}</div>
  </>);
}
