// Cliente de la API. El access token vive SOLO en memoria (no en localStorage → no robable por XSS persistente);
// el refresh token viaja en una cookie HttpOnly que JavaScript no puede leer.
let accessToken = null;
let onSessionLost = () => {};
export const setSessionLostHandler = (fn) => { onSessionLost = fn; };

async function raw(path, opts = {}) {
  const res = await fetch("/api" + path, {
    credentials: "same-origin",
    ...opts,
    headers: { "Content-Type": "application/json", "X-Requested-With": "vastago-web",
      ...(accessToken ? { Authorization: "Bearer " + accessToken } : {}), ...(opts.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

async function request(path, opts) {
  let { res, body } = await raw(path, opts);
  if (res.status === 401 && path !== "/auth/login" && path !== "/auth/refresh") {
    const ok = await refreshSession();
    if (ok) ({ res, body } = await raw(path, opts));
    else onSessionLost();
  }
  if (!res.ok) throw new Error(body.error || "Error " + res.status);
  return body;
}

export async function refreshSession() {
  const { res, body } = await raw("/auth/refresh", { method: "POST" });
  if (!res.ok) { accessToken = null; return null; }
  accessToken = body.access_token;
  return body;
}

export async function login(email, password) {
  const body = await request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  accessToken = body.access_token;
  return body;
}
export async function logout() { try { await request("/auth/logout", { method: "POST" }); } finally { accessToken = null; } }

const j = (o) => JSON.stringify(o);
export const api = {
  kpis: () => request("/kpis"), alertas: () => request("/alertas"),
  inventario: () => request("/inventario"),
  movimiento: (id, tipo, cantidad, motivo) => request(`/inventario/${id}/movimientos`, { method: "POST", body: j({ tipo, cantidad, motivo }) }),
  historial: (id) => request(`/inventario/${id}/movimientos`),
  productos: () => request("/productos"), bom: (id) => request(`/productos/${id}/bom`),
  ordenes: () => request("/produccion"),
  crearOrden: (producto_id, cantidad) => request("/produccion", { method: "POST", body: j({ producto_id, cantidad }) }),
  estadoOrden: (id, estado) => request(`/produccion/${id}/estado`, { method: "PATCH", body: j({ estado }) }),
  forecast: () => request("/forecast"),
  usuarios: () => request("/auth/usuarios"),
  crearUsuario: (u) => request("/auth/usuarios", { method: "POST", body: j(u) }),
  estadoUsuario: (id, activo) => request(`/auth/usuarios/${id}`, { method: "PATCH", body: j({ activo }) }),
  auditoria: () => request("/auth/auditoria"),
};
