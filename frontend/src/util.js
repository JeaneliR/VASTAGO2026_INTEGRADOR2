// Utilidades de formato compartidas por las pantallas
export const num = (n, d = 3) => (n == null ? "—" : Number(n).toLocaleString("es-PE", { maximumFractionDigits: d }));
export const fecha = (f) => (f ? new Date(f).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }) : "—");
export const fechaHora = (f) => (f ? new Date(f).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
export const SEMAFORO = { ok: ["b-ok", "OK"], warn: ["b-warn", "Bajo"], crit: ["b-crit", "Crítico"] };
