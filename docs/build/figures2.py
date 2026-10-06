import datetime as dt
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import numpy as np
from PIL import Image
A = "assets/"; C900, C700 = "#2E1B12", "#4A2C1F"
def trim(path, pad=14):
    im = Image.open(path).convert("RGB"); a = np.array(im)
    r = np.where(np.any(a != 255, axis=(1, 2)))[0]; c = np.where(np.any(a != 255, axis=(0, 2)))[0]
    im.crop((max(c.min()-pad,0), max(r.min()-pad,0), min(c.max()+pad,a.shape[1]), min(r.max()+pad,a.shape[0]))).save(path)

START = dt.date(2026, 8, 17)                                   # lunes de la semana 1
SC = {1: "#B3261E", 2: "#B8860B", 3: "#2E7D4F", 4: "#4A2C1F", 5: "#6B3F2A", 6: "#8A5636"}
tasks = [  # (actividad, sprint, responsables)
 ("Análisis empresarial (AS-IS / TO-BE)", 1, "J. Caso, A. Lujan"), ("Levantamiento de requisitos", 1, "J. Caso"), ("Product Backlog, épicas e HU", 1, "J. Caso, A. Lujan"),
 ("Wireframes de baja fidelidad", 2, "J. Caso"), ("Mockups de alta fidelidad", 2, "J. Caso, L. Matamoros"), ("Arquitectura y diseño de BD", 2, "A. Lujan"),
 ("Módulo de Inventario", 3, "L. Matamoros"), ("Módulo de Producción (BOM y lotes)", 3, "L. Matamoros, J. Caso"),
 ("BD PostgreSQL, seguridad y roles", 3, "A. Lujan"), ("Despliegue cloud v1 (Render)", 3, "A. Lujan, L. Matamoros"),
 ("Dashboard gerencial y KPIs", 4, "J. Caso, L. Matamoros"), ("Reportes y exportaciones", 4, "L. Matamoros"), ("Alertas WhatsApp / correo", 4, "A. Lujan, L. Matamoros"),
 ("Módulo IA (pronóstico de demanda)", 5, "L. Matamoros"), ("Integración de módulos", 5, "A. Lujan"), ("Pruebas funcionales y correcciones", 5, "Todo el equipo"),
 ("Optimización y seguridad final", 6, "A. Lujan"), ("Documentación técnica", 6, "J. Caso"), ("Presentación final y demo", 6, "Todo el equipo"),
]
n = len(tasks)
MES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
fm = lambda x: '%02d-%s' % (x.day, MES[x.month-1])
fig, ax = plt.subplots(figsize=(13.5, 8.2))
d = lambda wk: START + dt.timedelta(weeks=wk)
for i, (name, sp, resp) in enumerate(tasks):
    y = n - 1 - i; w0 = (sp - 1) * 3
    ax.barh(y, 21, left=mdates.date2num(d(w0)), height=.62, color=SC[sp], edgecolor="white")
    ax.text(mdates.date2num(d(w0)) + 10.5, y, "Sprint %d" % sp, ha="center", va="center", color="white", fontsize=8, fontweight="bold")
ax.set_ylim(-0.6, n + 1.7)
end = d(18)
ax.set_xlim(mdates.date2num(START), mdates.date2num(end))
ax.set_yticks(range(n)); ax.set_yticklabels([t[0] for t in tasks][::-1], fontsize=8.8)
# columna de responsables a la derecha
ax2 = ax.twinx(); ax2.set_ylim(ax.get_ylim()); ax2.set_yticks(range(n)); ax2.set_yticklabels([t[2] for t in tasks][::-1], fontsize=8.2, color=C700); ax2.tick_params(length=0)
ax2.set_ylabel("Responsables", fontsize=9, color=C900, rotation=270, labelpad=18)
for s in ("top", "right", "left"): ax.spines[s].set_visible(False); ax2.spines[s].set_visible(False)
# meses (cabecera superior) y semanas
months = [(dt.date(2026, m, 1), n_) for m, n_ in ((8, "Agosto"), (9, "Septiembre"), (10, "Octubre"), (11, "Noviembre"), (12, "Diciembre"))]
ytop = n + 0.55
for k, (m0, nm) in enumerate(months):
    a = max(m0, START); b = months[k + 1][0] if k + 1 < len(months) else end
    ax.add_patch(plt.Rectangle((mdates.date2num(a), ytop), mdates.date2num(b) - mdates.date2num(a), 0.8, fc=C700 if k % 2 == 0 else "#6B3F2A", ec="white"))
    ax.text((mdates.date2num(a) + mdates.date2num(b)) / 2, ytop + .4, nm, ha="center", va="center", color="white", fontsize=9.5, fontweight="bold")
for w in range(18):
    ax.text(mdates.date2num(d(w)) + 3.5, ytop - .35, str(w + 1), ha="center", fontsize=7.5, color=C700)
    ax.axvline(mdates.date2num(d(w)), color="#D8CBB8", lw=0.5, zorder=0)
ax.text(mdates.date2num(START) - 1, ytop - .35, "Semana", ha="right", fontsize=7.5, color=C700)
for sp in range(1, 7): ax.axvline(mdates.date2num(d((sp - 1) * 3)), color="#999", ls="--", lw=.9, zorder=0)
ax.set_xticks([]); 
today = dt.date(2026, 10, 6); apf1 = dt.date(2026, 9, 12)
ax.axvline(mdates.date2num(today), color="#B3261E", lw=2, zorder=5); ax.text(mdates.date2num(today) + 1, -0.45, "Hoy: 06-oct (APF2)", color="#B3261E", fontsize=8.5, fontweight="bold")
ax.axvline(mdates.date2num(apf1), color="#1F5FA8", lw=1.6, ls=":", zorder=5); ax.text(mdates.date2num(apf1) + 1, -0.45, "APF1 (12-sep)", color="#1F5FA8", fontsize=8.5, fontweight="bold")
ax.set_title("Cronograma del proyecto (Diagrama de Gantt) — 18 semanas · 6 sprints · del 17-ago al 20-dic de 2026", fontsize=12, fontweight="bold", color=C900, pad=14)
h = [plt.Rectangle((0, 0), 1, 1, color=c) for c in SC.values()]
fig.legend(h, ["Sprint %d (%s – %s)" % (s, fm(d((s-1)*3)), fm(d(s*3) - dt.timedelta(days=1))) for s in SC], loc="lower center", ncol=6, fontsize=8, frameon=False)
plt.tight_layout(rect=(0, .04, 1, 1)); plt.savefig(A + "gantt.png", dpi=170); plt.close(); trim(A + "gantt.png")

# ------------------------------------------------------------ Matriz de riesgos
risks = [("R1", 4, 3), ("R2", 3, 4), ("R3", 2, 5), ("R4", 3, 3), ("R5", 2, 5), ("R6", 3, 3), ("R7", 3, 2), ("R8", 2, 4), ("R9", 3, 3), ("R10", 2, 5), ("R11", 3, 3)]
fig, ax = plt.subplots(figsize=(7.2, 6.2))
for p in range(1, 6):
    for i in range(1, 6):
        s = p * i; col = "#BFE3C9" if s <= 5 else ("#FBE9A6" if s <= 12 else ("#F8C291" if s <= 16 else "#F1948A"))
        ax.add_patch(plt.Rectangle((i - .5, p - .5), 1, 1, fc=col, ec="white", lw=2)); ax.text(i + .38, p - .38, str(s), fontsize=7, ha="right", va="bottom", color="#555")
cells = {}
for r, p, i in risks: cells.setdefault((p, i), []).append(r)
for (p, i), rs in cells.items():
    txt = "\n".join(", ".join(rs[k:k+2]) for k in range(0, len(rs), 2)); ax.text(i, p, txt, ha="center", va="center", fontsize=9, fontweight="bold", color=C900)
ax.set_xlim(.5, 5.5); ax.set_ylim(.5, 5.5); ax.set_xticks(range(1, 6)); ax.set_yticks(range(1, 6))
ax.set_xticklabels(["1\nMuy bajo", "2\nBajo", "3\nModerado", "4\nAlto", "5\nCrítico"], fontsize=8.5); ax.set_yticklabels(["1 Muy rara", "2 Rara", "3 Posible", "4 Probable", "5 Casi segura"], fontsize=8.5)
ax.set_xlabel("Impacto", fontsize=10, fontweight="bold"); ax.set_ylabel("Probabilidad", fontsize=10, fontweight="bold")
ax.set_title("Matriz de riesgos (Probabilidad × Impacto) y mapa de calor", fontsize=11, fontweight="bold", color=C900)
for s in ax.spines.values(): s.set_visible(False)
plt.tight_layout(); plt.savefig(A + "risk_matrix.png", dpi=170); plt.close(); trim(A + "risk_matrix.png")
print("figuras 2 OK")
