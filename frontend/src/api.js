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
  movimiento: (id, datos) => request(`/inventario/${id}/movimientos`, { method: "POST", body: j(datos) }),
  historial: (id) => request(`/inventario/${id}/movimientos`),
  lotesInsumo: (id) => request(`/inventario/${id}/lotes`),
  productos: () => request("/productos"), bom: (id) => request(`/productos/${id}/bom`), ruta: (id) => request(`/productos/${id}/ruta`),
  centros: () => request("/centros"), equipos: () => request("/equipos"), responsables: () => request("/responsables"),
  ordenes: () => request("/produccion"), orden: (id) => request(`/produccion/${id}`),
  crearOrden: (producto_id, cantidad, centro_id) => request("/produccion", { method: "POST", body: j({ producto_id, cantidad, centro_id }) }),
  iniciarEtapa: (oid, seq, datos) => request(`/produccion/${oid}/etapas/${seq}/iniciar`, { method: "POST", body: j(datos) }),
  consumir: (oid, seq, datos) => request(`/produccion/${oid}/etapas/${seq}/consumos`, { method: "POST", body: j(datos) }),
  finalizarEtapa: (oid, seq, datos) => request(`/produccion/${oid}/etapas/${seq}/finalizar`, { method: "POST", body: j(datos) }),
  productoTerminado: () => request("/producto-terminado"),
  movimientosPT: (id) => request(`/lotes-pt/${id}/movimientos`),
  despachar: (id, datos) => request(`/lotes-pt/${id}/despachos`, { method: "POST", body: j(datos) }),
  buscarLote: (q) => request("/trazabilidad/buscar?q=" + encodeURIComponent(q)),
  trazaPT: (codigo) => request("/trazabilidad/lote-pt/" + encodeURIComponent(codigo)),
  trazaInsumo: (codigo) => request("/trazabilidad/lote-insumo/" + encodeURIComponent(codigo)),
  forecast: () => request("/forecast"),
  usuarios: () => request("/auth/usuarios"),
  crearUsuario: (u) => request("/auth/usuarios", { method: "POST", body: j(u) }),
  estadoUsuario: (id, activo) => request(`/auth/usuarios/${id}`, { method: "PATCH", body: j({ activo }) }),
  auditoria: () => request("/auth/auditoria"),
};
