"""Mide carga de la SPA en frío (sin caché) con red limitada: 4 Mbps y 100 ms de latencia. Mediana de 12 corridas."""
import json, statistics as st, glob
from playwright.sync_api import sync_playwright
chromium = (glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome") or ["/opt/pw-browsers/chromium"])[0]
def medir(url, runs=12):
    out = []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=chromium)
        for _ in range(runs):
            ctx = b.new_context(); pg = ctx.new_page(); cdp = ctx.new_cdp_session(pg)
            cdp.send("Network.enable")
            cdp.send("Network.emulateNetworkConditions", {"offline": False, "latency": 100, "downloadThroughput": 4*1024*1024/8, "uploadThroughput": 1024*1024/8})
            tot = {"b": 0, "n": 0}
            def fin(e): tot["b"] += e["encodedDataLength"]; tot["n"] += 1
            cdp.on("Network.loadingFinished", fin)
            pg.goto(url, wait_until="load"); pg.wait_for_selector("#email")
            m = pg.evaluate("""() => { const n = performance.getEntriesByType('navigation')[0]; const f = performance.getEntriesByName('first-contentful-paint')[0];
                return {dcl: n.domContentLoadedEventEnd, load: n.loadEventEnd, fcp: f ? f.startTime : null}; }""")
            m.update(bytes=tot["b"], reqs=tot["n"]); out.append(m); ctx.close()
        b.close()
    return {k: round(st.median([o[k] for o in out]), 1) for k in ("fcp", "dcl", "load", "bytes", "reqs")}
res = {"antes": medir("http://127.0.0.1:8100"), "despues": medir("http://127.0.0.1:8000")}
print(json.dumps(res, indent=1)); json.dump(res, open("wpo_metricas.json", "w"), indent=1)
