import React, { useEffect, useState } from "react";
import { refreshSession, logout, setSessionLostHandler } from "./api.js";
import Login from "./components/Login.jsx";
import { Dashboard } from "./components/Dashboard.jsx";
import Inventario from "./components/Inventario.jsx";
import Produccion from "./components/Produccion.jsx";
import Analitica from "./components/Analitica.jsx";
import ProductoTerminado from "./components/ProductoTerminado.jsx";
import Trazabilidad from "./components/Trazabilidad.jsx";
import Asistente from "./components/Asistente.jsx";
import { Usuarios, Auditoria } from "./components/Admin.jsx";
import Reportes from "./components/Reportes.jsx";
import Correo from "./components/Correo.jsx";
import CambiarPassword from "./components/CambiarPassword.jsx";

const VISTAS = [
  { id: "dashboard", t: "Dashboard", p: "dashboard:ver", C: Dashboard },
  { id: "inventario", t: "Inventario", p: "inventario:ver", C: Inventario },
  { id: "produccion", t: "Producción", p: "produccion:ver", C: Produccion },
  { id: "pt", t: "Producto terminado", p: "pt:ver", C: ProductoTerminado },
  { id: "trazabilidad", t: "Trazabilidad", p: "trazabilidad:ver", C: Trazabilidad },
  { id: "analitica", t: "Analítica IA", p: "analitica:ver", C: Analitica },
  { id: "asistente", t: "Asistente", p: "asistente:usar", C: Asistente },
  { id: "usuarios", t: "Usuarios", p: "usuarios:gestionar", C: Usuarios },
  { id: "auditoria", t: "Auditoría", p: "auditoria:ver", C: Auditoria },
  { id: "reportes", t: "Reportes", p: "reportes:ver", C: Reportes },
  { id: "correo", t: "Correo y alertas", p: "correo:ver", C: Correo },
];

export default function App() {
  const [sesion, setSesion] = useState(null);   // { usuario, permisos }
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState("dashboard"), [param, setParam] = useState(null);
  const [passwordOpen, setPasswordOpen] = useState(false), [menuOpen, setMenuOpen] = useState(false), [notice, setNotice] = useState("");
  const irA = (v, p) => { setParam(p || null); setVista(v); setMenuOpen(false); };
  const cerrarSesion = (message = "") => { setPasswordOpen(false); setNotice(message); setSesion(null); };

  useEffect(() => {
    setSessionLostHandler(() => setSesion(null));
    refreshSession().then((s) => { if (s) setSesion({ usuario: s.usuario, permisos: s.permisos }); }).finally(() => setCargando(false));
  }, []);

  if (cargando) return <div className="login"><p style={{ color: "#fff" }}>Cargando…</p></div>;
  if (!sesion) return <Login notice={notice} onLogin={(s) => { setNotice(""); setSesion({ usuario: s.usuario, permisos: s.permisos }); setVista("dashboard"); }} />;

  const visibles = VISTAS.filter((v) => sesion.permisos.includes(v.p));
  const actual = visibles.find((v) => v.id === vista) || visibles[0];
  const C = actual.C;

  return (
    <div className="shell">
      <button className="mobile-menu btn" aria-expanded={menuOpen} aria-controls="menu-principal" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? "Cerrar menú" : "Menú"}</button>
      <aside id="menu-principal" className={"sidebar" + (menuOpen ? " open" : "")}>
        <div className="brand"><svg width="30" height="30" viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#6b3f2a"/><path d="M20 9c-4 3-7 7-7 11.5A7 7 0 0020 27.5 7 7 0 0027 20.5C27 16 24 12 20 9z" fill="#c89b3c"/></svg>
          <div><strong>Vástago &amp; Co</strong><span>Producción · Inventarios · IA</span></div></div>
        <ul className="nav">{visibles.map((v) => (<li key={v.id}><button className={v.id === actual.id ? "on" : ""} onClick={() => irA(v.id)}>{v.t}</button></li>))}</ul>
        <div className="foot"><strong>{sesion.usuario.nombre}</strong><small>{sesion.usuario.rol}</small>
          <button className="btn g sm account-button" onClick={() => setPasswordOpen(true)}>Cambiar mi contraseña</button>
          <button className="btn g sm" style={{ color: "#faf3e7", borderColor: "rgba(255,255,255,.3)", width: "100%" }}
            onClick={async () => { await logout(); cerrarSesion(); }}>Cerrar sesión</button></div>
      </aside>
      <main className="content"><h1>{actual.t}</h1><C permisos={sesion.permisos} usuario={sesion.usuario} irA={irA} param={param} onSesionCerrada={cerrarSesion} /></main>
      {passwordOpen && <CambiarPassword onClose={() => setPasswordOpen(false)} onChanged={() => cerrarSesion("Contraseña actualizada. Inicia sesión con tu nueva contraseña.")} />}
    </div>
  );
}
