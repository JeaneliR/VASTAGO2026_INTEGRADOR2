import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const VACIO = { destinatario: "", habilitado: false, alertas_inmediatas: false, hora: 8 };
export default function Correo({ permisos }) {
  const puede = permisos.includes("correo:configurar");
  const [data, setData] = useState(null), [form, setForm] = useState(VACIO), [err, setErr] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  const changed = data && JSON.stringify(form) !== JSON.stringify(data.configuracion);
  async function cargar(updateForm = false) {
    try { const result = await api.correo(); setData(result); if (updateForm) setForm(result.configuracion); }
    catch (e) { setErr(e.message); }
  }
  useEffect(() => {
    cargar(true); const timer = setInterval(() => { if (!document.hidden) cargar(); }, 15000);
    return () => clearInterval(timer);
  }, []);
  async function guardar(e) {
    e.preventDefault(); setBusy(true); setErr(""); setNotice("");
    try { await api.configurarCorreo(form); setNotice("Configuración guardada."); await cargar(true); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  async function enviar() {
    if (!window.confirm("¿Enviar ahora el resumen de insumos críticos al destinatario configurado?")) return;
    setBusy(true); setErr(""); setNotice("");
    try { const result = await api.enviarCorreo(); setNotice(result.mensaje); await cargar(); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  async function reintentar(id) {
    setBusy(true); setErr(""); try { await api.reintentarCorreo(id); setNotice("Envío en cola para reintentar."); await cargar(); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  if (!data) return <>{err && <p className="err" role="alert">{err}</p>}<p>Cargando configuración…</p></>;
  return <>
    <div className="toolbar"><p className="muted">Envía resúmenes y alertas de stock al correo configurado.</p><button className="btn" disabled={busy || changed || !data.proveedor_configurado || !data.configuracion.destinatario} onClick={enviar}>Enviar resumen ahora</button></div>
    {!data.proveedor_configurado && <div className="panel setup-notice"><h3>Correo pendiente de conectar</h3><p>Configura la clave <strong>RESEND_API_KEY</strong> en las variables del servidor para habilitar los envíos. No ingreses claves en esta pantalla.</p><p className="muted">Si utilizas el remitente de pruebas de Resend, el destinatario debe ser el correo de tu cuenta de Resend.</p></div>}
    {err && <p className="err" role="alert">{err}</p>}{notice && <p className="success" role="status">{notice}</p>}
    <form className="panel" onSubmit={guardar}><h3>Preferencias de correo</h3><div className="grid2">
      <div className="field"><label htmlFor="correo-destino">Correo destinatario</label><input id="correo-destino" type="email" maxLength={120} required disabled={!puede || busy} value={form.destinatario} onChange={e => setForm({ ...form, destinatario: e.target.value })} /></div>
      <div className="field"><label htmlFor="correo-hora">Hora del resumen diario (Lima)</label><select id="correo-hora" disabled={!puede || busy} value={form.hora} onChange={e => setForm({ ...form, hora: Number(e.target.value) })}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}</select></div>
    </div><label className="check"><input type="checkbox" disabled={!puede || busy || !data.proveedor_configurado} checked={form.habilitado} onChange={e => setForm({ ...form, habilitado: e.target.checked })} /> Activar resumen diario automático</label>
      <label className="check"><input type="checkbox" disabled={!puede || busy || !data.proveedor_configurado} checked={form.alertas_inmediatas} onChange={e => setForm({ ...form, alertas_inmediatas: e.target.checked })} /> Avisar también cuando un insumo pase por debajo de su mínimo</label>
      <p className="muted">El resumen se envía una vez al día si hay insumos críticos. Los envíos automáticos se procesan mientras el servicio está activo; si se suspende, se retoman al reactivarlo.</p>
      {puede && <button className="btn" disabled={busy}>Guardar preferencias</button>}
    </form>
    <div className="panel"><div className="toolbar"><h3>Historial de envíos</h3><button className="btn g sm" disabled={busy} onClick={() => cargar()}>Actualizar</button></div>
      <p className="muted">Aceptado significa que el proveedor recibió la solicitud; confirma la recepción en la bandeja del destinatario.</p>
      <table><thead><tr><th>Fecha</th><th>Destinatario</th><th>Asunto</th><th>Origen</th><th>Estado</th><th>Detalle</th></tr></thead><tbody>{data.historial.map(row => <tr key={row.id}>
        <td>{new Date(row.creado_en).toLocaleString("es-PE")}</td><td>{row.destinatario}</td><td>{row.asunto}</td><td>{row.origen}</td>
        <td><span className={"badge " + (row.estado === "Aceptado" ? "b-ok" : row.estado === "Fallido" ? "b-crit" : "b-warn")}>{row.estado}</span></td><td>{row.error || row.proveedor_id || "Esperando procesamiento"}
          {puede && row.estado === "Fallido" && <button className="btn g sm" disabled={busy} onClick={() => reintentar(row.id)}>Reintentar</button>}</td></tr>)}</tbody></table>
      {!data.historial.length && <p className="empty">Todavía no se han solicitado envíos.</p>}
    </div>
  </>;
}
