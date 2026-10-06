# Calcula la página de cada encabezado (N1/N2) a partir del PDF renderizado → .toc.json
import json, subprocess, re, sys
pdf = sys.argv[1]
heads = json.load(open('.headings.json'))
n = int(re.search(r'Pages:\s+(\d+)', subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout).group(1))
norm = lambda s: re.sub(r'\s+', ' ', s).strip().lower()
txt = [norm(subprocess.run(['pdftotext', '-f', str(p), '-l', str(p), pdf, '-'], capture_output=True, text=True).stdout) for p in range(1, n + 1)]
# páginas del índice: las que contienen muchos puntos líder o "índice" al inicio
start = 2
while start <= n and ('índice' in txt[start-1][:40] or txt[start-1].count('....') > 5): start += 1
cur, out = start - 1, []
for h in heads:
    t = norm(h['text']); found = None
    for p in range(cur, n + 1):
        if t in txt[p - 1]: found = p; break
    if found: cur = found
    out.append(found or cur)
json.dump(out, open('.toc.json', 'w')); print('páginas totales', n, 'índice termina en', start - 1, 'encabezados', len(out))
