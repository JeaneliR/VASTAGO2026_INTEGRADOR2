"""Diagramas de carriles en orientación vertical (carriles = columnas) para que el texto sea legible a 16 cm de ancho.
Salida: assets/asis_v.png y assets/tobe_v.png.   Uso: cd docs/build && python3 swimlane_v.py"""
import textwrap
import numpy as np
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Polygon, Circle
from PIL import Image

plt.rcParams["font.family"] = "Inter"
C900, C700, CAR = "#2E1B12", "#4A2C1F", "#C89B3C"
FILL = {"n": "#FFFDF9", "bad": "#FBE3E1", "ok": "#E4F3E9", "d": "#FFF4CC", "sys": "#FFF8E6"}
EDGE = {"bad": "#B3261E", "ok": "#2E7D4F"}


def swim(path, title, lanes, lane_colors, steps, edges, legend_title, legend_items, legend_fill, foot="", W=6.9, pitch=0.78, wrap=24, fs=8.6):
    n = len(lanes)
    cw = W / n
    bw, bh = cw - 0.28, 0.54
    nrows = max(s[1] for s in steps.values()) + 1.0
    top = 0.95                        # alto de título + cabecera de carriles
    H = top + nrows * pitch + 0.25 + (1.15 if foot else 0.95)
    fig, ax = plt.subplots(figsize=(W, H)); ax.set_xlim(0, W); ax.set_ylim(H, 0); ax.axis("off")
    ax.text(W / 2, 0.22, title, ha="center", va="center", fontsize=11.5, fontweight="bold", color=C900)
    body_h = nrows * pitch + 0.25
    for i, ln in enumerate(lanes):
        x0 = i * cw
        ax.add_patch(plt.Rectangle((x0, 0.62), cw, body_h + 0.33, fc=lane_colors[i], ec=C700, lw=1.1))
        ax.add_patch(plt.Rectangle((x0, 0.45), cw, 0.37, fc=C700, ec=C700))
        ax.text(x0 + cw / 2, 0.635, textwrap.fill(ln, 22), ha="center", va="center", color="white", fontsize=9, fontweight="bold")
    pos = {}
    for k, st in steps.items():
        lane, row, text, kind = st[:4]
        marks = st[4] if len(st) > 4 else ""
        planned = st[5] if len(st) > 5 else False
        cx, cy = lane * cw + cw / 2, top + 0.2 + row * pitch + pitch / 2 - 0.05
        pos[k] = (cx, cy, bw, bh if kind != "d" else 0.74)
        ec = EDGE.get(kind, C700)
        ls = (0, (4, 2)) if planned else "-"
        if kind == "d":
            h = 0.74
            ax.add_patch(Polygon([(cx, cy - h / 2 - .06), (cx + bw / 2, cy), (cx, cy + h / 2 + .06), (cx - bw / 2, cy)], fc=FILL[kind], ec=ec, lw=1.4))
            ax.text(cx, cy, textwrap.fill(text, 14), ha="center", va="center", fontsize=fs, color=C900)
        else:
            ax.add_patch(FancyBboxPatch((cx - bw / 2, cy - bh / 2), bw, bh, boxstyle="round,pad=0,rounding_size=0.1", fc=FILL[kind], ec=ec, lw=1.5, ls=ls))
            ax.text(cx, cy, textwrap.fill(text, wrap if n == 3 else 20), ha="center", va="center", fontsize=fs, color=C900, linespacing=1.12)
        for j, m in enumerate(marks):
            bx, by = cx - bw / 2 + 0.02 + j * 0.26, cy - bh / 2 - 0.03
            ax.add_patch(Circle((bx, by), 0.11, fc="#B3261E", ec="white", lw=1, zorder=5))
            ax.text(bx, by + 0.005, m, ha="center", va="center", fontsize=7.5, color="white", fontweight="bold", zorder=6)
    ap = dict(arrowstyle="-|>", color=C700, lw=1.4, shrinkA=0, shrinkB=0)
    for a, b, lab in edges:
        (x1, y1, w1, h1), (x2, y2, w2, h2) = pos[a], pos[b]
        if abs(y1 - y2) < 0.01:                                  # mismo nivel: horizontal
            sgn = 1 if x2 > x1 else -1
            p1, p2 = (x1 + sgn * (w1 / 2 + .06), y1), (x2 - sgn * (w2 / 2 + .04), y2)
            ax.annotate("", xy=p2, xytext=p1, arrowprops=ap)
            lx, ly = (p1[0] + p2[0]) / 2, y1 - 0.13
        else:
            p1, p2 = (x1, y1 + h1 / 2 + (.06 if h1 > .6 else 0)), (x2, y2 - h2 / 2 - (.06 if h2 > .6 else 0))
            if abs(x1 - x2) < 0.01:
                ax.annotate("", xy=p2, xytext=p1, arrowprops=ap); lx, ly = x1 + .16, (p1[1] + p2[1]) / 2
            else:
                my = p1[1] + (p2[1] - p1[1]) * 0.5
                ax.plot([p1[0], p1[0], p2[0]], [p1[1], my, my], color=C700, lw=1.4, solid_capstyle="butt")
                ax.annotate("", xy=p2, xytext=(p2[0], my), arrowprops=ap); lx, ly = x1 + .12, (p1[1] + my) / 2
        if lab:
            ax.text(lx, ly, lab, fontsize=8, color=C900, ha="center", va="center", fontweight="bold", bbox=dict(fc="white", ec="none", pad=0.8), zorder=7)
    ly0 = top + nrows * pitch + 0.35
    lh = 1.02 if foot else 0.88
    ax.add_patch(FancyBboxPatch((0.04, ly0), W - 0.08, lh, boxstyle="round,pad=0,rounding_size=0.08", fc=legend_fill, ec=C700, lw=1))
    ax.text(0.15, ly0 + 0.14, legend_title, fontsize=8.6, va="center", fontweight="bold", color=C900)
    for i, t in enumerate(legend_items):
        ax.text(0.15 + (i % 2) * (W / 2 - 0.05), ly0 + 0.34 + (i // 2) * 0.19, t, fontsize=8, va="center", color=C900)
    if foot: ax.text(0.15, ly0 + 0.9, foot, fontsize=7.6, va="center", color=C900, style="italic")
    plt.subplots_adjust(0, 0, 1, 1); plt.savefig(path, dpi=200); plt.close()
    im = Image.open(path).convert("RGB"); a = np.array(im)
    r = np.where(np.any(a != 255, axis=(1, 2)))[0]; c = np.where(np.any(a != 255, axis=(0, 2)))[0]
    im.crop((max(c.min() - 4, 0), max(r.min() - 4, 0), c.max() + 5, r.max() + 5)).save(path)


# ---------------------------------------------------------------- AS-IS
lanes = ["Compras / Almacén", "Producción", "Gerencia / Ventas"]
lc = ["#F6EFE3", "#FBF7EE", "#F6EFE3"]
steps = {
    "a1": (0, 0, "Compra insumos (llamada / WhatsApp)", "n"),
    "a2": (0, 1, "Anota la recepción en cuaderno o Excel", "bad", "15"),
    "a3": (0, 2, "Conteo físico semanal manual", "bad", "1"),
    "p1": (1, 3, "Planifica lotes 'por experiencia'", "bad", "3"),
    "p2": (1, 4, "Calcula insumos con la receta en papel", "bad", "2"),
    "d": (1, 5, "¿Falta insumo?", "d", "2"),
    "c": (0, 5, "Compra urgente (sobrecosto)", "bad", "2"),
    "p3": (1, 6.35, "Elabora el lote y anota la merma al final del día", "bad", "4"),
    "g1": (2, 7.35, "Vende por pedido, sin proyección", "n", "3"),
    "g2": (2, 8.35, "Reunión mensual: revisa hojas de cálculo", "bad", "1"),
}
edges = [("a1", "a2", ""), ("a2", "a3", ""), ("a3", "p1", ""), ("p1", "p2", ""), ("p2", "d", ""), ("d", "c", "Sí"), ("d", "p3", "No"), ("p3", "g1", ""), ("g1", "g2", "")]
swim("assets/asis_v.png", "Proceso AS-IS: gestión actual de insumos y producción (sin sistema)", lanes, lc, steps, edges,
     "Problemas detectados (círculos rojos):",
     ["1  Stock desactualizado", "2  Sin alertas de mínimos", "3  Demanda no proyectada", "4  Merma sin trazabilidad", "5  Sin registro de responsables"], "#FFF4CC")

# ---------------------------------------------------------------- TO-BE
lanes2 = ["Almacenero", "Sistema Web Inteligente", "Jefe de producción", "Gerencia"]
lc2 = ["#E8F3EC", "#FFF8E6", "#E8F3EC", "#F6EFE3"]
steps2 = {
    "a1": (0, 0, "Inicia sesión (rol Almacenero)", "ok"),
    "a2": (0, 1, "Registra ingreso o salida de insumo", "ok"),
    "s1": (1, 2, "Trigger de BD actualiza el stock en tiempo real", "sys"),
    "s2": (1, 3, "Evalúa el stock mínimo y genera alertas (*)", "sys", "", True),
    "s3": (1, 4, "Modelo ML pronostica la demanda de 3 meses", "sys"),
    "p1": (2, 5, "Consulta alertas y pronóstico", "ok"),
    "p2": (2, 6, "Crea la orden con vista previa de insumos (BOM)", "ok"),
    "p3": (2, 7, "Completa la orden", "ok"),
    "s5": (1, 8, "Descuenta insumos según receta y audita la acción", "sys"),
    "g1": (3, 8, "Consulta el dashboard de KPIs actualizado", "ok"),
}
edges2 = [("a1", "a2", ""), ("a2", "s1", ""), ("s1", "s2", ""), ("s2", "s3", ""), ("s3", "p1", ""), ("p1", "p2", ""), ("p2", "p3", ""), ("p3", "s5", ""), ("p3", "g1", "")]
swim("assets/tobe_v.png", "Proceso TO-BE: gestión con el Sistema Web Inteligente", lanes2, lc2, steps2, edges2,
     "Mejoras (verde):",
     ["Stock en tiempo real", "Alertas automáticas", "Producción guiada por pronóstico", "Trazabilidad completa", "Acceso por roles"], "#E4F3E9", foot="(*) Borde discontinuo: el envío por WhatsApp / correo se planifica para el Sprint 4; en la v1 la alerta se muestra en el sistema.", pitch=0.8, fs=8)
print("ok")
