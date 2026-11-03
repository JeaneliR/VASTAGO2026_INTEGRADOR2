import React, { useCallback, useState } from "react";
import { api } from "../api.js";
import Dialog from "./Dialog.jsx";

export default function CambiarPassword({ onClose, onChanged }) {
  const [f, setF] = useState({ actual: "", nueva: "", repetir: "" }), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const cerrar = useCallback(() => onClose(), [onClose]);
  async function guardar(e) {
    e.preventDefault(); setErr("");
    if (f.nueva !== f.repetir) { setErr("Las contraseñas no coinciden"); return; }
    setBusy(true);
    try { await api.cambiarPassword(f.actual, f.nueva); onChanged(); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  return <Dialog titulo="Cambiar mi contraseña" onClose={cerrar} busy={busy}>
    <p className="muted">Usa al menos 10 caracteres con mayúscula, minúscula, número y símbolo. Después deberás iniciar sesión nuevamente.</p>
    <form onSubmit={guardar}>
      {[["actual", "Contraseña actual"], ["nueva", "Nueva contraseña"], ["repetir", "Repite la nueva contraseña"]].map(([key, label]) => <div className="field" key={key}>
        <label htmlFor={"pwd-" + key}>{label}</label><input id={"pwd-" + key} type="password" autoComplete={key === "actual" ? "current-password" : "new-password"}
          required maxLength={72} minLength={key === "actual" ? 1 : 10} value={f[key]} onChange={e => setF({ ...f, [key]: e.target.value })} />
      </div>)}
      {err && <p className="err" role="alert">{err}</p>}
      <div className="row"><button className="btn" disabled={busy}>{busy ? "Guardando…" : "Guardar contraseña"}</button><button type="button" className="btn g" disabled={busy} onClick={cerrar}>Cancelar</button></div>
    </form>
  </Dialog>;
}
