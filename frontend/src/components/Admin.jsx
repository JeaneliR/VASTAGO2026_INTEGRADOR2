import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const ROLES = ["Administrador", "Jefe de Producción", "Almacenero", "Gerente", "Operario"];

export function Usuarios() {
  const [us, setUs] = useState([]), [open, setOpen] = useState(false), [err, setErr] = useState("");
  const [f, setF] = useState({ nombre: "", email: "", rol: "Almacenero", password: "", telefono: "" });
  const cargar = () => api.usuarios().then(setUs).catch((e) => setErr(e.message));
  useEffect(() => { cargar(); }, []);
  async function crear(e) { e.preventDefault(); setErr(""); try { await api.crearUsuario(f); setOpen(false); setF({ ...f, nombre: "", email: "", password: "", telefono: "" }); cargar(); } catch (x) { setErr(x.message); } }
  async function alternar(u) { try { await api.estadoUsuario(u.id, !u.activo); cargar(); } catch (x) { setErr(x.message); } }
  return (<>
    <div style={{ marginBottom: 12 }}><button className="btn" onClick={() => { setOpen(true); setErr(""); }}>+ Nuevo usuario</button></div>
    <div className="panel">{err && !open && <p className="err">{err}</p>}
      <table><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
        <tbody>{us.map((u) => <tr key={u.id}><td>{u.nombre}</td><td>{u.email}</td><td>{u.rol}</td>
          <td><span className={"badge " + (u.activo ? "b-ok" : "b-crit")}>{u.activo ? "Activo" : "Inactivo"}</span></td>
          <td><button className="btn g sm" onClick={() => alternar(u)}>{u.activo ? "Desactivar" : "Activar"}</button></td></tr>)}</tbody></table></div>
    {open && <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && setOpen(false)}><form className="modal" onSubmit={crear}>
      <h3>Nuevo usuario</h3>
      {[["nombre", "Nombre completo", "text"], ["email", "Correo", "email"], ["telefono", "Teléfono (se guarda cifrado)", "tel"], ["password", "Contraseña (mín. 10, mayús., minús., número y símbolo)", "password"]].map(([k, l, t]) =>
        <div className="field" key={k}><label>{l}</label><input type={t} required={k !== "telefono"} autoComplete="off" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>)}
      <div className="field"><label>Rol</label><select value={f.rol} onChange={(e) => setF({ ...f, rol: e.target.value })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></div>
      {err && <p className="err">{err}</p>}
      <div className="row"><button className="btn">Crear</button><button type="button" className="btn g" onClick={() => setOpen(false)}>Cancelar</button></div>
    </form></div>}
  </>);
}

export function Auditoria() {
  const [l, setL] = useState([]), [err, setErr] = useState("");
  useEffect(() => { api.auditoria().then(setL).catch((e) => setErr(e.message)); }, []);
  return (<div className="panel"><p className="muted">Bitácora de solo-anexar: ningún usuario puede modificar ni borrar estos registros.</p>{err && <p className="err">{err}</p>}
    <table><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>IP</th><th>Resultado</th></tr></thead>
      <tbody>{l.map((r) => <tr key={r.id}><td>{new Date(r.fecha).toLocaleString("es-PE")}</td><td>{r.email || "—"}</td><td>{r.accion}</td><td>{r.entidad || "—"}</td><td>{r.ip || "—"}</td>
        <td><span className={"badge " + (r.exito ? "b-ok" : "b-crit")}>{r.exito ? "OK" : "Fallido"}</span></td></tr>)}</tbody></table></div>);
}
