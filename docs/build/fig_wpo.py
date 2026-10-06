# Gráfico antes/después (WPO) a partir de evidencias/wpo/wpo_metricas.json — datos reales, sin retoques.
import json
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image
import numpy as np
m = json.load(open("../../evidencias/wpo/wpo_metricas.json"))
A, D = m["antes"], m["despues"]
INK, MUTED, GRID = "#2E1B12", "#6B5B4B", "#E4DED2"
C_ANTES, C_DESP = "#8A7A6A", "#C0392B".replace("#C0392B", "#2E7D4F")   # gris pardo (antes) / verde (después)
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 9, "text.color": INK, "axes.edgecolor": GRID})
fig, (a1, a2) = plt.subplots(1, 2, figsize=(9.2, 3.5), gridspec_kw={"width_ratios": [1.6, 1]})
labs = ["FCP", "DOMContentLoaded", "Load"]; keys = ["fcp", "dcl", "load"]; x = np.arange(3); w = 0.34
b1 = a1.bar(x - w/2 - 0.01, [A[k] for k in keys], w, color=C_ANTES, label="Antes (sin optimizar)")
b2 = a1.bar(x + w/2 + 0.01, [D[k] for k in keys], w, color=C_DESP, label="Después (optimizado)")
for bars in (b1, b2):
    for r in bars: a1.text(r.get_x() + r.get_width()/2, r.get_height() + 50, f"{r.get_height():,.0f}", ha="center", fontsize=8.5, color=INK)
a1.set_xticks(x); a1.set_xticklabels(labs); a1.set_ylabel("milisegundos (menor es mejor)", color=MUTED); a1.set_ylim(0, 3300)
a1.set_title("Tiempos de carga", loc="left", fontsize=10, fontweight="bold")
b3 = a2.bar([0, 1], [A["bytes"]/1024, D["bytes"]/1024], 0.5, color=[C_ANTES, C_DESP])
for r, v in zip(b3, [A["bytes"], D["bytes"]]): a2.text(r.get_x() + r.get_width()/2, r.get_height() + 25, f"{v/1024:,.1f} KiB", ha="center", fontsize=8.5)
a2.set_xticks([0, 1]); a2.set_xticklabels(["Antes", "Después"]); a2.set_ylabel("KiB transferidos (menor es mejor)", color=MUTED); a2.set_ylim(0, 1450)
a2.set_title("Bytes transferidos", loc="left", fontsize=10, fontweight="bold")
for a in (a1, a2):
    a.spines[["top", "right"]].set_visible(False); a.yaxis.grid(True, color=GRID, lw=0.8); a.set_axisbelow(True); a.tick_params(colors=MUTED, length=0)
a1.legend(frameon=False, loc="lower center", bbox_to_anchor=(0.5, 1.0), ncol=2, fontsize=8.5); a1.set_title("Tiempos de carga", loc="left", fontsize=10, fontweight="bold", pad=22); a2.set_title("Bytes transferidos", loc="left", fontsize=10, fontweight="bold", pad=22)
plt.tight_layout(); plt.savefig("assets/wpo_antes_despues.png", dpi=170, facecolor="white")
im = Image.open("assets/wpo_antes_despues.png").convert("RGB"); a = np.array(im)
rows = np.where(np.any(a != 255, axis=(1, 2)))[0]; cols = np.where(np.any(a != 255, axis=(0, 2)))[0]
im.crop((max(cols.min()-12, 0), max(rows.min()-12, 0), min(cols.max()+12, a.shape[1]), min(rows.max()+12, a.shape[0]))).save("assets/wpo_antes_despues.png")
