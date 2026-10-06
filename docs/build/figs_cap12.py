"""Variantes legibles (tamaño de página A4 vertical) del Lean Canvas y del Gantt para los capítulos 1 y 2.
Salida: assets/lean_v.png y assets/gantt_v.png.   Uso: cd docs/build && python3 figs_cap12.py"""
import datetime as dt, textwrap
import numpy as np
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.patches import FancyBboxPatch
from PIL import Image

plt.rcParams["font.family"] = "Inter"
A = "assets/"
C900, C700, CAR, CREMA = "#2E1B12", "#4A2C1F", "#C89B3C", "#FAF3E7"


def trim(path, pad=8):
    im = Image.open(path).convert("RGB"); a = np.array(im)
    r = np.where(np.any(a != 255, axis=(1, 2)))[0]; c = np.where(np.any(a != 255, axis=(0, 2)))[0]
    im.crop((max(c.min() - pad, 0), max(r.min() - pad, 0), min(c.max() + pad, a.shape[1]), min(r.max() + pad, a.shape[0]))).save(path)


# ------------------------------------------------------------------ Lean Canvas (10 x 7.6 unidades → 7.4 x 5.6 in)
W, H = 7.4, 5.9
fig, ax = plt.subplots(figsize=(W, H)); ax.set_xlim(0, 10); ax.set_ylim(0, 8); ax.axis("off")
blocks = [
    ("1. Problema", 0, 3.0, 2, 5.0, ["Quiebres de stock de insumos clave", "Producción planificada 'por experiencia'", "Mermas y vencimientos sin trazabilidad", "Registros manuales (cuaderno / Excel)"]),
    ("4. Solución", 2, 5.4, 2, 2.6, ["Inventario con movimientos y alertas", "Órdenes de producción con receta (BOM)", "Pronóstico de demanda (ML)"]),
    ("8. Métricas clave", 2, 3.0, 2, 2.4, ["Quiebres de stock / mes", "Merma de producción %", "Precisión del pronóstico (MAPE)"]),
    ("3. Propuesta de valor única", 4, 3.0, 2, 5.0, ["Un solo sistema web que une inventario, producción y pronóstico de demanda con IA.", "\"Sabe cuánto producir antes de quedarte sin cacao\""]),
    ("9. Ventaja competitiva", 6, 5.4, 2, 2.6, ["Conocimiento del proceso real de la empresa", "Modelo entrenado con su propio histórico"]),
    ("5. Canales", 6, 3.0, 2, 2.4, ["Aplicación web en la nube", "Alertas WhatsApp / correo", "Capacitación en planta"]),
    ("2. Segmentos de clientes", 8, 3.0, 2, 5.0, ["Chocolaterías artesanales", "Pequeñas fábricas de transformación", "Cliente piloto: Vástago & Co", "Usuarios: producción, almacén y gerencia"]),
    ("7. Estructura de costos", 0, 0, 5, 3.0, ["Desarrollo del sistema (540 h de equipo)", "Hosting cloud y base de datos administrada", "Capacitación del personal", "Soporte y mantenimiento"]),
    ("6. Fuentes de ingreso", 5, 0, 5, 3.0, ["Ahorro por menos mermas y quiebres de stock", "Suscripción mensual a otras empresas del rubro", "Servicio de implementación y capacitación"]),
]
for t, x, y, w, h, items in blocks:
    ax.add_patch(FancyBboxPatch((x + .04, y + .04), w - .08, h - .08, boxstyle="round,pad=0,rounding_size=0.07", fc=CREMA, ec=C700, lw=1.3))
    ax.text(x + .12, y + h - .15, textwrap.fill(t, 20), fontsize=7.8, fontweight="bold", color=C900, va="top")
    yy = y + h - (.78 if len(t) > 20 and w == 2 else .55)
    for it in items:
        wrapped = textwrap.fill(("• " if not it.startswith('"') else "") + it, 26 if w == 2 else 54)
        ax.text(x + .12, yy, wrapped, fontsize=7, color=C900, va="top", linespacing=1.22)
        yy -= .245 * (wrapped.count("\n") + 1) + .17
plt.subplots_adjust(0.005, 0.005, 0.995, 0.995); plt.savefig(A + "lean_v.png", dpi=200); plt.close(); trim(A + "lean_v.png")

# ------------------------------------------------------------------ Gantt compacto
START = dt.date(2026, 8, 17)
SC = {1: "#B3261E", 2: "#B8860B", 3: "#2E7D4F", 4: "#4A2C1F", 5: "#6B3F2A", 6: "#8A5636"}
tasks = [
    ("Análisis empresarial (AS-IS / TO-BE)", 1, "J. Caso, A. Lujan"), ("Levantamiento de requisitos", 1, "J. Caso"), ("Product Backlog, épicas e HU", 1, "J. Caso, A. Lujan"),
    ("Wireframes de baja fidelidad", 2, "J. Caso"), ("Mockups de alta fidelidad", 2, "J. Caso, L. Matamoros"), ("Arquitectura y diseño de BD", 2, "A. Lujan"),
    ("Módulo de Inventario", 3, "L. Matamoros"), ("Módulo de Producción (BOM, lotes)", 3, "L. Matamoros, J. Caso"),
    ("BD PostgreSQL, seguridad y roles", 3, "A. Lujan"), ("Despliegue cloud v1 (Render)", 3, "A. Lujan, L. Matamoros"),
    ("Dashboard gerencial y KPIs", 4, "J. Caso, L. Matamoros"), ("Reportes y exportaciones", 4, "L. Matamoros"), ("Alertas WhatsApp / correo", 4, "A. Lujan, L. Matamoros"),
    ("Módulo IA (pronóstico)", 5, "L. Matamoros"), ("Integración de módulos", 5, "A. Lujan"), ("Pruebas funcionales y correcciones", 5, "Todo el equipo"),
    ("Optimización y seguridad final", 6, "A. Lujan"), ("Documentación técnica", 6, "J. Caso"), ("Presentación final y demo", 6, "Todo el equipo"),
]
n = len(tasks)
MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
fm = lambda x: '%02d-%s' % (x.day, MES[x.month - 1])
d = lambda wk: START + dt.timedelta(weeks=wk)
fig, ax = plt.subplots(figsize=(7.6, 6.9))
for i, (name, sp, resp) in enumerate(tasks):
    y = n - 1 - i; w0 = (sp - 1) * 3
    ax.barh(y, 21, left=mdates.date2num(d(w0)), height=.64, color=SC[sp], edgecolor="white")
    ax.text(mdates.date2num(d(w0)) + 10.5, y, "S%d" % sp, ha="center", va="center", color="white", fontsize=6.6, fontweight="bold")
ax.set_ylim(-1.3, n + 1.9)
end = d(18)
ax.set_xlim(mdates.date2num(START), mdates.date2num(end))
ax.set_yticks(range(n)); ax.set_yticklabels([t[0] for t in tasks][::-1], fontsize=7)
ax.tick_params(length=0, pad=3)
ax2 = ax.twinx(); ax2.set_ylim(ax.get_ylim()); ax2.set_yticks(range(n)); ax2.set_yticklabels([t[2] for t in tasks][::-1], fontsize=6.6, color=C700); ax2.tick_params(length=0, pad=3)
for s in ("top", "right", "left"): ax.spines[s].set_visible(False); ax2.spines[s].set_visible(False)
months = [(dt.date(2026, m, 1), nm) for m, nm in ((8, "Agosto"), (9, "Septiembre"), (10, "Octubre"), (11, "Noviembre"), (12, "Diciembre"))]
ytop = n + 0.45
for k, (m0, nm) in enumerate(months):
    a = max(m0, START); b = months[k + 1][0] if k + 1 < len(months) else end
    ax.add_patch(plt.Rectangle((mdates.date2num(a), ytop), mdates.date2num(b) - mdates.date2num(a), 0.9, fc=C700 if k % 2 == 0 else "#6B3F2A", ec="white"))
    ax.text((mdates.date2num(a) + mdates.date2num(b)) / 2, ytop + .45, nm if k not in (0, 4) else nm[:3] + ".", ha="center", va="center", color="white", fontsize=6.8, fontweight="bold")
for w in range(18):
    ax.text(mdates.date2num(d(w)) + 3.5, ytop - .38, str(w + 1), ha="center", fontsize=6, color=C700)
    ax.axvline(mdates.date2num(d(w)), color="#D8CBB8", lw=0.5, zorder=0)
ax.text(mdates.date2num(START) - 1, ytop - .38, "Sem.", ha="right", fontsize=6, color=C700)
for sp in range(1, 7): ax.axvline(mdates.date2num(d((sp - 1) * 3)), color="#999", ls="--", lw=.8, zorder=0)
ax.set_xticks([])
today = dt.date(2026, 10, 6); apf1 = dt.date(2026, 9, 12)
ax.axvline(mdates.date2num(today), color="#B3261E", lw=1.6, zorder=5); ax.text(mdates.date2num(today) + 1, -1.0, "Hoy 06-oct (APF2)", color="#B3261E", fontsize=6.6, fontweight="bold", va="center")
ax.axvline(mdates.date2num(apf1), color="#1F5FA8", lw=1.3, ls=":", zorder=5); ax.text(mdates.date2num(apf1) + 1, -1.0, "APF1 12-sep", color="#1F5FA8", fontsize=6.6, fontweight="bold", va="center")
ax.text(1.0, 1.0, "Responsables", transform=ax.transAxes, fontsize=6.8, fontweight="bold", color=C900, ha="left", va="bottom")
h = [plt.Rectangle((0, 0), 1, 1, color=c) for c in SC.values()]
fig.legend(h, ["S%d: %s a %s" % (s, fm(d((s - 1) * 3)), fm(d(s * 3) - dt.timedelta(days=1))) for s in SC], loc="lower center", ncol=3, fontsize=6.6, frameon=False, columnspacing=1.2)
plt.tight_layout(rect=(0, .07, 1, 1)); plt.savefig(A + "gantt_v.png", dpi=200); plt.close(); trim(A + "gantt_v.png")
print("ok")
