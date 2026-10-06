import React, { useState } from "react";
import { login } from "../api.js";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function enviar(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try { onLogin(await login(email.trim(), password)); }
    catch (err) { setError(err.message); setPassword(""); }
    finally { setBusy(false); }
  }
  return (
    <div className="login"><form className="card" onSubmit={enviar} autoComplete="on">
      <div className="brand" style={{ marginBottom: 6 }}><svg width="34" height="34" viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#6b3f2a"/><path d="M20 9c-4 3-7 7-7 11.5A7 7 0 0020 27.5 7 7 0 0027 20.5C27 16 24 12 20 9z" fill="#c89b3c"/></svg>
        <div><strong>Vástago &amp; Co</strong><span>Producción · Inventarios · IA</span></div></div>
      <p className="muted" style={{ marginTop: 0 }}>Inicia sesión para continuar</p>
      <div className="field"><label htmlFor="email">Correo corporativo</label>
        <input id="email" type="email" autoComplete="username" required maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@vastagoyco.pe" /></div>
      <div className="field"><label htmlFor="pwd">Contraseña</label>
        <input id="pwd" type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      {error && <p className="err" role="alert">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? "Verificando…" : "Ingresar"}</button>
      <p className="muted" style={{ textAlign: "center", marginTop: 14 }}>Acceso restringido. Toda actividad queda registrada.</p>
    </form></div>
  );
}
