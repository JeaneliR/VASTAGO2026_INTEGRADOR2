import React, { useEffect, useRef, useState } from "react";
import { api } from "../api.js";

function Chart({ data, producto }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current, s = data.series[producto]; if (!c || !s) return;
    const dpr = window.devicePixelRatio || 1, W = c.clientWidth || 640, H = 260;
    c.width = W * dpr; c.height = H * dpr; c.style.height = H + "px";
    const x = c.getContext("2d"); x.scale(dpr, dpr);
    const hist = s.historico, fo = s.forecast, labels = data.meses_hist.concat(s.meses_forecast);
    const all = hist.concat(fo), max = Math.max(...all) * 1.15, pl = 42, pr = 26, pt = 16, pb = 30;
    const w = W - pl - pr, h = H - pt - pb, X = (i) => pl + (w / (all.length - 1)) * i, Y = (v) => pt + h - (v / max) * h;
    x.strokeStyle = "#e4ded2"; for (let i = 0; i <= 4; i++) { const y = pt + (h / 4) * i; x.beginPath(); x.moveTo(pl, y); x.lineTo(pl + w, y); x.stroke(); }
    x.strokeStyle = "#6b3f2a"; x.lineWidth = 2.2; x.beginPath(); hist.forEach((v, i) => (i ? x.lineTo(X(i), Y(v)) : x.moveTo(X(i), Y(v)))); x.stroke();
    x.strokeStyle = "#c89b3c"; x.setLineDash([6, 4]); x.beginPath(); x.moveTo(X(hist.length - 1), Y(hist.at(-1))); fo.forEach((v, i) => x.lineTo(X(hist.length + i), Y(v))); x.stroke(); x.setLineDash([]);
    x.fillStyle = "#c89b3c"; fo.forEach((v, i) => { x.beginPath(); x.arc(X(hist.length + i), Y(v), 3.5, 0, 7); x.fill(); });
    x.fillStyle = "#8a5636"; x.font = "10px sans-serif"; x.textAlign = "right"; for (let i = 0; i <= 4; i++) x.fillText(Math.round(max - (max / 4) * i), pl - 6, pt + (h / 4) * i + 3);
    x.textAlign = "center"; labels.forEach((l, i) => { if (i % 3 === 0 || i === labels.length - 1) x.fillText(l, X(i), H - 8); });
  }, [data, producto]);
  return <canvas ref={ref} style={{ width: "100%" }} role="img" aria-label={"Demanda histórica y proyectada de " + producto} />;
}

export default function Analitica() {
  const [d, setD] = useState(null), [p, setP] = useState(""), [err, setErr] = useState("");
  useEffect(() => { api.forecast().then((x) => { setD(x); setP(Object.keys(x.series)[0]); }).catch((e) => setErr(e.message)); }, []);
  if (err) return <p className="err">{err}</p>;
  if (!d) return <p>Cargando…</p>;
  const s = d.series[p];
  return (<div className="panel">
    <div className="field" style={{ maxWidth: 360 }}><label>Producto</label><select value={p} onChange={(e) => setP(e.target.value)}>{Object.keys(d.series).map((k) => <option key={k}>{k}</option>)}</select></div>
    <Chart data={d} producto={p} />
    <p>Error de validación del modelo (MAPE): <strong>{s.mape}%</strong></p>
    <table><thead><tr><th>Mes proyectado</th><th>Demanda estimada</th><th>Margen de error</th></tr></thead>
      <tbody>{s.meses_forecast.map((m, i) => <tr key={m}><td>{m}</td><td>{s.forecast[i].toLocaleString("es-PE")} kg</td><td>±{Math.round(s.forecast[i] * (s.mape / 100))} kg</td></tr>)}</tbody></table>
  </div>);
}
