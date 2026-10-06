"""Pruebas de humo (smoke tests) del despliegue. Sirve igual contra gunicorn local y contra Render.

Uso:   python evidencias/smoke_test.py <URL_BASE> <CLAVE_DEMO> [--escritura]
Ej.:   python evidencias/smoke_test.py http://127.0.0.1:8100 'MiClaveDemo#2026'
       python evidencias/smoke_test.py https://vastago-sistema.onrender.com 'MiClaveDemo#2026' --escritura

--escritura  ejecuta además un ingreso+salida de insumo y una orden de producción (modifica datos de demostración).
Las verificaciones de limitación de tasa se ejecutan al final porque bloquean temporalmente el login desde la misma IP.
"""
import gzip, json, statistics, sys, time
import requests

B = sys.argv[1].rstrip("/")
PWD = sys.argv[2]
ESCRIBE = "--escritura" in sys.argv
HTTPS = B.startswith("https://")
res = []


def chk(cod, nombre, ok, detalle):
    res.append(ok)
    print(f"[{'PASA ' if ok else 'FALLA'}] {cod}  {nombre}\n           {detalle}")


def login(email, pwd=PWD):
    return requests.post(B + "/api/auth/login", json={"email": email, "password": pwd}, timeout=60)


H = lambda t: {"Authorization": "Bearer " + t}

# ---- SM01 salud
t0 = time.time(); r = requests.get(B + "/api/health", timeout=90); dt = (time.time() - t0) * 1000
chk("SM01", "GET /api/health responde 200 {status: ok}", r.status_code == 200 and r.json() == {"status": "ok"}, f"HTTP {r.status_code}, {dt:.0f} ms (primera petición)")

# ---- SM02 SPA
r = requests.get(B + "/", timeout=30)
chk("SM02", "GET / sirve la SPA (HTML con id root)", r.status_code == 200 and "text/html" in r.headers["Content-Type"] and 'id="root"' in r.text, f"HTTP {r.status_code}, {r.headers['Content-Type']}, {len(r.content)} B")
js = requests.get(B + "/bundle.js", headers={"Accept-Encoding": "identity"}, timeout=30)
chk("SM03", "El bundle JS se sirve (200, JavaScript)", js.status_code == 200 and "javascript" in js.headers["Content-Type"], f"HTTP {js.status_code}, {len(js.content)} B sin comprimir")

# ---- SM04 compresión
rg = requests.get(B + "/bundle.js", headers={"Accept-Encoding": "gzip"}, timeout=30, stream=True)
enc = rg.headers.get("Content-Encoding", "(ninguna)"); raw = rg.raw.read(decode_content=False)
chk("SM04", "Compresión activa (gzip) y reduce el tamaño", enc == "gzip" and len(raw) < len(js.content) * 0.5,
    f"Content-Encoding: {enc}; {len(js.content)} B → {len(raw)} B ({100 - 100 * len(raw) / len(js.content):.1f} % menos)")
rb = requests.get(B + "/bundle.js", headers={"Accept-Encoding": "br"}, timeout=30, stream=True)
chk("SM05", "Compresión Brotli disponible (br)", rb.headers.get("Content-Encoding") == "br", f"Content-Encoding: {rb.headers.get('Content-Encoding', '(ninguna)')}; {len(rb.raw.read(decode_content=False))} B")

# ---- SM06 cabeceras
r = requests.get(B + "/api/health", timeout=30)
need = ["Content-Security-Policy", "X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "Cross-Origin-Opener-Policy"]
falta = [n for n in need if n not in r.headers]
chk("SM06", "Cabeceras de seguridad presentes", not falta, "todas presentes" if not falta else "faltan: " + ", ".join(falta))
srv = r.headers.get("Server", "(ausente)")
chk("SM07", "La cabecera Server no revela tecnología ni versión", "gunicorn" not in srv.lower() and "werkzeug" not in srv.lower(), "Server: " + srv)
hsts = r.headers.get("Strict-Transport-Security", "(ausente)")
chk("SM08", "HSTS presente (APP_ENV=production)", hsts.startswith("max-age=31536000"), "Strict-Transport-Security: " + hsts)
chk("SM09", "API sin caché (Cache-Control: no-store)", r.headers.get("Cache-Control") == "no-store", "Cache-Control: " + r.headers.get("Cache-Control", "(ausente)"))

# ---- Autenticación
r = login("admin@vastagoyco.pe")
ok = r.status_code == 200
adm = r.json().get("access_token", "") if ok else ""
sc = r.headers.get("Set-Cookie", "")
chk("SM10", "Login del administrador devuelve token y rol", ok and r.json()["usuario"]["rol"] == "Administrador", f"HTTP {r.status_code}, rol: {r.json().get('usuario', {}).get('rol') if ok else r.text[:80]}")
flags = [f for f in ("HttpOnly", "Secure", "SameSite=Strict", "Path=/api/auth") if f in sc]
chk("SM11", "Cookie de refresh con HttpOnly, Secure, SameSite=Strict y Path acotado", len(flags) == 4, "atributos: " + ", ".join(flags))
a = login("noexiste@vastagoyco.pe", "x"); b = login("admin@vastagoyco.pe", "x")
chk("SM12", "Credenciales inválidas: 401 con mensaje idéntico (sin enumeración)", a.status_code == b.status_code == 401 and a.json() == b.json(), f"HTTP {a.status_code}/{b.status_code}: {a.json().get('error')}")
chk("SM13", "Sin token: 401", requests.get(B + "/api/inventario", timeout=30).status_code == 401, "GET /api/inventario sin Authorization")
alm = login("almacen@vastagoyco.pe").json().get("access_token", "")
chk("SM14", "RBAC: el almacenero no accede a /api/auth/usuarios (403)", requests.get(B + "/api/auth/usuarios", headers=H(alm), timeout=30).status_code == 403, "esperado 403")
chk("SM15", "Refresh sin cabecera anti-CSRF: 403", requests.post(B + "/api/auth/refresh", timeout=30).status_code == 403, "POST /api/auth/refresh sin X-Requested-With")

# ---- Datos (BD conectada y sembrada)
inv = requests.get(B + "/api/inventario", headers=H(adm), timeout=30).json()
chk("SM16", "Inventario leído desde PostgreSQL (7 insumos sembrados)", isinstance(inv, list) and len(inv) == 7, f"{len(inv)} insumos; estados: " + ", ".join(sorted({i['estado'] for i in inv})))
k = requests.get(B + "/api/kpis", headers=H(adm), timeout=30)
chk("SM17", "KPIs del dashboard (200, 4 indicadores)", k.status_code == 200 and len(k.json()) == 4, f"HTTP {k.status_code}; claves: " + ", ".join(k.json().keys()))
f = requests.get(B + "/api/forecast", headers=H(adm), timeout=30).json()
chk("SM18", "Pronóstico: 3 productos × 3 meses con MAPE", len(f.get("series", {})) == 3 and all(len(s["forecast"]) == 3 for s in f["series"].values()), f"{len(f.get('series', {}))} series; MAPE: " + ", ".join(f"{s['mape']}" for s in f["series"].values()))
usr = requests.get(B + "/api/auth/usuarios", headers=H(adm), timeout=30).json()
chk("SM19", "Usuarios demo creados por el seed (4)", len(usr) == 4, ", ".join(u["rol"] for u in usr))

# ---- Rutas y errores
r1 = requests.get(B + "/crossdomain.xml", timeout=30); r2 = requests.get(B + "/api/no-existe", timeout=30)
chk("SM20", "Archivo inexistente y ruta API inexistente devuelven 404 JSON", r1.status_code == 404 and r2.status_code == 404 and "error" in r2.json(), f"{r1.status_code} / {r2.status_code}")
r = requests.post(B + "/api/auth/login", data="no-json", headers={"Content-Type": "text/plain"}, timeout=30)
chk("SM21", "Error sin traza de pila", "Traceback" not in r.text and "File \"" not in r.text, f"HTTP {r.status_code}: {r.text.strip()[:60]}")

# ---- Latencia
tms = []
for _ in range(100):
    t0 = time.perf_counter(); requests.get(B + "/api/health", timeout=30); tms.append((time.perf_counter() - t0) * 1000)
tms.sort(); p95 = tms[int(len(tms) * 0.95) - 1]
chk("SM22", "Latencia de /api/health: p95 < 500 ms (RNF02)", p95 < 500, f"n=100, p50={statistics.median(tms):.1f} ms, p95={p95:.1f} ms, máx={tms[-1]:.1f} ms")
tk = []
for _ in range(60):
    t0 = time.perf_counter(); requests.get(B + "/api/kpis", headers=H(adm), timeout=30); tk.append((time.perf_counter() - t0) * 1000)
tk.sort(); p95k = tk[int(len(tk) * 0.95) - 1]
chk("SM23", "Latencia de /api/kpis (consulta a BD): p95 < 500 ms", p95k < 500, f"n=60, p50={statistics.median(tk):.1f} ms, p95={p95k:.1f} ms")

# ---- Escritura transaccional (opcional)
if ESCRIBE:
    ins = next(i for i in inv if i["insumo"] == "Lecitina de soya")
    s0 = ins["stock"]
    a1 = requests.post(f"{B}/api/inventario/{ins['id']}/movimientos", json={"tipo": "INGRESO", "cantidad": 10, "motivo": "smoke"}, headers=H(adm), timeout=30).json()
    a2 = requests.post(f"{B}/api/inventario/{ins['id']}/movimientos", json={"tipo": "SALIDA", "cantidad": 10, "motivo": "smoke"}, headers=H(adm), timeout=30).json()
    chk("SM24", "Ingreso + salida de 10 kg actualizan el stock vía trigger y lo dejan igual", a1["stock"] == s0 + 10 and a2["stock"] == s0, f"{s0} → {a1['stock']} → {a2['stock']}")
    r = requests.post(f"{B}/api/inventario/{ins['id']}/movimientos", json={"tipo": "SALIDA", "cantidad": 999999}, headers=H(adm), timeout=30)
    chk("SM25", "Salida mayor al stock rechazada (409)", r.status_code == 409, f"HTTP {r.status_code}: {r.json().get('error')}")
    prods = requests.get(B + "/api/productos", headers=H(adm), timeout=30).json()
    o = requests.post(B + "/api/produccion", json={"producto_id": prods[0]["id"], "cantidad": 1}, headers=H(adm), timeout=30)
    chk("SM26", "Crear orden de producción (201, lote autogenerado)", o.status_code == 201 and o.json()["lote"].startswith("L-2026-"), f"HTTP {o.status_code}, lote {o.json().get('lote')}")
    aud = requests.get(B + "/api/auth/auditoria", headers=H(adm), timeout=30).json()
    chk("SM27", "La bitácora registró los movimientos y la orden", {"MOVIMIENTO_INGRESO", "MOVIMIENTO_SALIDA", "ORDEN_CREADA"} <= {x["accion"] for x in aud}, "acciones recientes: " + ", ".join(sorted({x["accion"] for x in aud})[:6]))

# ---- Limitación de tasa (al final)
codes = [requests.post(B + "/api/auth/login", json={"email": "victima@vastagoyco.pe", "password": "x%d" % i}, timeout=30).status_code for i in range(14)]
chk("SM28", "Limitación de tasa en login (aparece HTTP 429)", 429 in codes, "códigos: " + " ".join(map(str, codes)))
print(f"\nResumen: {sum(res)}/{len(res)} verificaciones superadas  (URL: {B})")
sys.exit(0 if all(res) else 1)
