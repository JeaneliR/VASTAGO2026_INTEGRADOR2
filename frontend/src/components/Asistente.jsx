import React, { useEffect, useRef, useState } from "react";
import { api } from "../api.js";

function Tabla({ t }) {
  return (
    <table className="asis-tabla">
      <thead><tr>{t.columnas.map((c) => <th key={c}>{c}</th>)}</tr></thead>
      <tbody>{t.filas.map((f, i) => <tr key={i}>{f.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody>
    </table>
  );
}

function Respuesta({ m, onPreguntar }) {
  return (
    <div className="msg bot">
      <p>{m.respuesta}</p>
      {m.tarjetas?.length > 0 && (
        <div className="asis-cards">{m.tarjetas.map((c) => <div key={c.etiqueta} className="asis-card"><span>{c.etiqueta}</span><strong>{c.valor}</strong></div>)}</div>
      )}
      {m.tabla && <Tabla t={m.tabla} />}
      {m.nota && <small className="asis-nota">{m.nota}</small>}
      {m.sugerencias?.length > 0 && (
        <div className="asis-sug">{m.sugerencias.map((s) => <button key={s} className="btn g sm" onClick={() => onPreguntar(s)}>{s}</button>)}</div>
      )}
    </div>
  );
}

export default function Asistente() {
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sugerencias, setSugerencias] = useState([]);
  const fin = useRef(null);

  useEffect(() => { api.sugerenciasAsistente().then((r) => setSugerencias(r.sugerencias)).catch(() => {}); }, []);
  useEffect(() => { fin.current?.scrollIntoView({ block: "end" }); }, [mensajes, enviando]);

  async function preguntar(q) {
    const pregunta = (q ?? texto).trim();
    if (!pregunta || enviando) return;
    setTexto("");
    setMensajes((ms) => [...ms, { rol: "yo", texto: pregunta }]);
    setEnviando(true);
    try {
      const r = await api.preguntar(pregunta);
      setMensajes((ms) => [...ms, { rol: "bot", ...r }]);
    } catch (e) {
      setMensajes((ms) => [...ms, { rol: "bot", respuesta: "No pude responder: " + e.message, sugerencias: [] }]);
    } finally { setEnviando(false); }
  }

  return (
    <>
      <div className="panel asis">
        <div className="asis-hilo" aria-live="polite">
          {mensajes.length === 0 && (
            <div className="asis-vacio">
              <p>Pregúntame con tus palabras. Respondo con el kardex real de insumos y el control de producción de grageado, y cada cifra se calcula en el sistema.</p>
              <div className="asis-sug">{sugerencias.map((s) => <button key={s} className="btn g sm" onClick={() => preguntar(s)}>{s}</button>)}</div>
            </div>
          )}
          {mensajes.map((m, i) => m.rol === "yo"
            ? <div key={i} className="msg yo"><p>{m.texto}</p></div>
            : <Respuesta key={i} m={m} onPreguntar={preguntar} />)}
          {enviando && <div className="msg bot"><p>Calculando…</p></div>}
          <div ref={fin} />
        </div>
        <form className="asis-form" onSubmit={(e) => { e.preventDefault(); preguntar(); }}>
          <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={300} placeholder="Ej.: ¿Para cuánto alcanza el suero de leche?" aria-label="Escribe tu pregunta" />
          <button className="btn" disabled={enviando || !texto.trim()}>Preguntar</button>
        </form>
      </div>
    </>
  );
}
