import React, { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import Dialog from "./Dialog.jsx";
const ROLES = ["Administrador", "Jefe de Producción", "Almacenero", "Gerente", "Operario"];
const VACIO = { nombre: "", email: "", rol: "Almacenero", password: "", telefono: "", repetir: "" };

export function Usuarios({ usuario, onSesionCerrada }) {
  const [users, setUsers] = useState([]), [mode, setMode] = useState(null), [selected, setSelected] = useState(null);
  const [form, setForm] = useState(VACIO), [err, setErr] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  const [q, setQ] = useState(""), [estado, setEstado] = useState("activos"), [loading, setLoading] = useState(true);
  const cargar = useCallback(async () => { try { setUsers(await api.usuarios()); } catch (e) { setErr(e.message); } finally { setLoading(false); } }, []);
  useEffect(() => { cargar(); }, [cargar]);
  const cerrar = useCallback(() => { setMode(null); setErr(""); }, []);
  function abrir(mode, user = null) {
    setSelected(user); setMode(mode); setErr(""); setNotice("");
    setForm(user ? { nombre: user.nombre, email: user.email, rol: user.rol, telefono: user.telefono || "", password: "", repetir: "" } : { ...VACIO });
  }
  async function guardar(e) {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      if (mode === "password") {
        if (form.password !== form.repetir) throw new Error("Las contraseñas no coinciden");
        await api.restablecerPassword(selected.id, form.password);
      } else if (mode === "editar") {
        await api.editarUsuario(selected.id, { nombre: form.nombre, email: form.email, rol: form.rol, telefono: form.telefono });
      } else await api.crearUsuario({ nombre: form.nombre, email: form.email, rol: form.rol, telefono: form.telefono, password: form.password });
      setMode(null); setNotice(mode === "password" ? "Contraseña actualizada. Las sesiones anteriores fueron cerradas." : "Usuario guardado correctamente.");
      if (mode === "editar" && selected.id === usuario.id) { onSesionCerrada("Datos actualizados. Inicia sesión nuevamente."); return; }
      await cargar();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  async function alternar(user) {
    if (!window.confirm(`${user.activo ? "Desactivar" : "Activar"} a ${user.nombre}?${user.activo ? " Se cerrarán sus sesiones." : ""}`)) return;
    setBusy(true); setErr("");
    try { await api.estadoUsuario(user.id, !user.activo); setNotice("Estado actualizado."); await cargar(); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  const visibles = users.filter(user => (estado === "todos" || user.activo === (estado === "activos")) && `${user.nombre} ${user.email} ${user.rol}`.toLowerCase().includes(q.toLowerCase()));
  return <>
    <div className="toolbar"><p className="muted">Administra cuentas y permisos. Las cuentas inactivas conservan su historial.</p><button className="btn" onClick={() => abrir("crear")}>+ Nuevo usuario</button></div>
    <div className="panel">
      <div className="row filters"><div className="field"><label htmlFor="usuarios-buscar">Buscar usuario</label><input id="usuarios-buscar" type="search" placeholder="Nombre, correo o rol" value={q} onChange={e => setQ(e.target.value)} /></div>
        <div className="field"><label htmlFor="usuarios-estado">Estado</label><select id="usuarios-estado" value={estado} onChange={e => setEstado(e.target.value)}><option value="activos">Activos</option><option value="inactivos">Inactivos</option><option value="todos">Todos</option></select></div></div>
      {err && !mode && <p className="err" role="alert">{err}</p>}{notice && <p className="success" role="status">{notice}</p>}
      {loading ? <p>Cargando usuarios…</p> : <><p className="muted">{visibles.length} usuarios encontrados</p><table><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>{visibles.map(user => <tr key={user.id}><td>{user.nombre}{user.id === usuario.id && <small className="muted"> (tu cuenta)</small>}</td><td>{user.email}</td><td>{user.rol}</td>
          <td><span className={"badge " + (user.activo ? "b-ok" : "b-crit")}>{user.activo ? "Activo" : "Inactivo"}</span></td><td><div className="row">
            <button className="btn g sm" disabled={busy} onClick={() => abrir("editar", user)}>Editar</button>
            {user.id !== usuario.id && <><button className="btn g sm" disabled={busy} onClick={() => abrir("password", user)}>Restablecer contraseña</button><button className="btn g sm" disabled={busy} onClick={() => alternar(user)}>{user.activo ? "Desactivar" : "Activar"}</button></>}
          </div></td></tr>)}</tbody></table>{!visibles.length && <p className="empty">No hay usuarios que coincidan con tu búsqueda.</p>}</>}
    </div>
    {mode && <Dialog titulo={mode === "crear" ? "Nuevo usuario" : mode === "editar" ? "Editar usuario" : "Restablecer contraseña"} onClose={cerrar} busy={busy}>
      <form onSubmit={guardar}>
        {mode !== "password" && <>{[["nombre", "Nombre completo", "text", 100], ["email", "Correo", "email", 120], ["telefono", "Teléfono", "tel", 24]].map(([key, label, type, max]) => <div className="field" key={key}>
          <label htmlFor={"usuario-" + key}>{label}</label><input id={"usuario-" + key} type={type} maxLength={max} required={key !== "telefono"} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></div>)}
          <div className="field"><label htmlFor="usuario-rol">Rol</label><select id="usuario-rol" disabled={selected?.id === usuario.id} value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}>{ROLES.map(r => <option key={r}>{r}</option>)}</select></div></>}
        {mode !== "editar" && <><p className="muted">Mínimo 10 caracteres, con mayúscula, minúscula, número y símbolo.</p><div className="field"><label htmlFor="usuario-password">{mode === "crear" ? "Contraseña inicial" : "Nueva contraseña"}</label><input id="usuario-password" type="password" autoComplete="new-password" required minLength={10} maxLength={72} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
          {mode === "password" && <div className="field"><label htmlFor="usuario-repetir">Repite la nueva contraseña</label><input id="usuario-repetir" type="password" autoComplete="new-password" required value={form.repetir} onChange={e => setForm({ ...form, repetir: e.target.value })} /></div>}</>}
        {mode === "editar" && <p className="muted">Se cerrarán las sesiones de esta cuenta al guardar los cambios.</p>}
        {err && <p className="err" role="alert">{err}</p>}<div className="row"><button className="btn" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button><button type="button" className="btn g" disabled={busy} onClick={cerrar}>Cancelar</button></div>
      </form>
    </Dialog>}
  </>;
}

export function Auditoria() {
  const [l, setL] = useState([]), [err, setErr] = useState("");
  useEffect(() => { api.auditoria().then(setL).catch((e) => setErr(e.message)); }, []);
  return (<div className="panel"><p className="muted">Bitácora de solo-anexar: ningún usuario puede modificar ni borrar estos registros.</p>{err && <p className="err">{err}</p>}
    <table><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>IP</th><th>Resultado</th></tr></thead>
      <tbody>{l.map((r) => <tr key={r.id}><td>{new Date(r.fecha).toLocaleString("es-PE")}</td><td>{r.email || "—"}</td><td>{r.accion}</td><td>{r.entidad || "—"}</td><td>{r.ip || "—"}</td>
        <td><span className={"badge " + (r.exito ? "b-ok" : "b-crit")}>{r.exito ? "OK" : "Fallido"}</span></td></tr>)}</tbody></table></div>);
}
