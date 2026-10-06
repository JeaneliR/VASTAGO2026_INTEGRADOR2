"""Mide latencia de la API (p50/p95/p99) con una conexión persistente. Uso: DEMO_PASSWORD=... python medir_latencia.py [puerto]"""
import http.client, json, os, sys, time
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
c = http.client.HTTPConnection("127.0.0.1", PORT)
c.request("POST", "/api/auth/login", json.dumps({"email": "gerente@vastagoyco.pe", "password": os.environ["DEMO_PASSWORD"]}),
          {"Content-Type": "application/json"})
r = c.getresponse(); tok = json.loads(r.read())["access_token"]
print(f"Latencia API local (loopback, gunicorn 2 workers, 300 solicitudes por endpoint), puerto {PORT}")
def run(path, auth, n=300):
    ts = []
    for _ in range(n):
        t = time.perf_counter()
        c.request("GET", path, headers={"Authorization": "Bearer " + tok} if auth else {})
        rr = c.getresponse(); rr.read(); ts.append((time.perf_counter() - t) * 1000)
        assert rr.status == 200, (path, rr.status)
    ts.sort()
    print(f"{path:16s} n={n} p50={ts[int(n*.5)]:.1f} p95={ts[int(n*.95)-1]:.1f} p99={ts[int(n*.99)-1]:.1f} max={ts[-1]:.1f} ms")
run("/api/health", False)
for p in ("/api/kpis", "/api/alertas", "/api/produccion", "/api/forecast"): run(p, True)
