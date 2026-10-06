import textwrap
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Polygon
from PIL import Image
import numpy as np
C900, C700, CAR = "#2E1B12", "#4A2C1F", "#C89B3C"

def swim(path, title, lanes, steps, edges, ncols, notes, lane_colors, note_title, note_color):
    LH, CW = 1.45, 2.05
    W = ncols * CW + 1.6; H = len(lanes) * LH + 1.6
    fig, ax = plt.subplots(figsize=(W * 0.95, H * 0.95)); ax.set_xlim(0, W); ax.set_ylim(0, H); ax.axis("off")
    ax.text(W / 2, H - 0.35, title, ha="center", fontsize=13, fontweight="bold", color=C900)
    top = H - 0.8
    pos = {}
    for i, ln in enumerate(lanes):
        y0 = top - (i + 1) * LH
        ax.add_patch(plt.Rectangle((0.0, y0), W, LH, fc=lane_colors[i], ec=C700, lw=1.2))
        ax.add_patch(plt.Rectangle((0.0, y0), 1.0, LH, fc=C700, ec=C700))
        ax.text(0.5, y0 + LH / 2, textwrap.fill(ln, 12), ha="center", va="center", color="white", fontsize=8.5, fontweight="bold")
    for k, (lane, col, text, kind) in steps.items():
        cx, cy = 1.1 + CW * (col + 0.5), top - (lane + 0.5) * LH
        pos[k] = (cx, cy, kind)
        w, h = CW - 0.3, 0.95
        fc = {"n": "#FFFDF9", "bad": "#FBE3E1", "ok": "#E4F3E9", "d": "#FFF4CC", "sys": "#FFF8E6"}[kind]
        ec = {"bad": "#B3261E", "ok": "#2E7D4F"}.get(kind, C700)
        if kind == "d":
            ax.add_patch(Polygon([(cx, cy + h/2 + .05), (cx + w/2, cy), (cx, cy - h/2 - .05), (cx - w/2, cy)], fc=fc, ec=ec, lw=1.4))
        else:
            ax.add_patch(FancyBboxPatch((cx - w/2, cy - h/2), w, h, boxstyle="round,pad=0,rounding_size=0.12", fc=fc, ec=ec, lw=1.4))
        ax.text(cx, cy, textwrap.fill(text, 17 if kind != "d" else 12), ha="center", va="center", fontsize=7.6, color=C900, linespacing=1.15)
    for a, b, lab, style in edges:
        (x1, y1, _), (x2, y2, _) = pos[a], pos[b]
        w = CW - 0.3
        if abs(y1 - y2) < 0.01:                     # misma carril: horizontal
            p1, p2 = (x1 + w/2, y1), (x2 - w/2, y2)
            ax.annotate("", xy=p2, xytext=p1, arrowprops=dict(arrowstyle="-|>", color=C700, lw=1.3, ls=style))
        else:                                        # cambio de carril: codo (horizontal → vertical)
            ys = 0.5 if y2 < y1 else -0.5
            p1 = (x1, y1 - 0.5 if y2 < y1 else y1 + 0.5)
            p2 = (x2, y2 + 0.5 if y2 < y1 else y2 - 0.5)
            if abs(x1 - x2) < 0.01:
                ax.annotate("", xy=p2, xytext=p1, arrowprops=dict(arrowstyle="-|>", color=C700, lw=1.3, ls=style))
            else:
                mid = (p1[0], (p1[1] + p2[1]) / 2)
                ax.plot([p1[0], p1[0], p2[0]], [p1[1], mid[1], mid[1]], color=C700, lw=1.3, ls=style)
                ax.annotate("", xy=p2, xytext=(p2[0], mid[1]), arrowprops=dict(arrowstyle="-|>", color=C700, lw=1.3, ls=style))
        if lab:
            ax.text((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2 + .12, lab, fontsize=7, color=C900, ha="center", fontweight="bold",
                    bbox=dict(fc="white", ec="none", pad=0.6))
    ax.add_patch(FancyBboxPatch((0.1, 0.1), W - 0.2, 0.62, boxstyle="round,pad=0,rounding_size=0.08", fc=note_color, ec=C700, lw=1))
    ax.text(0.25, 0.41, note_title + "  " + "   ".join(notes), fontsize=8, va="center", color=C900)
    plt.tight_layout(pad=0.4); plt.savefig(path, dpi=170); plt.close()
    im = Image.open(path).convert("RGB"); a = np.array(im)
    r = np.where(np.any(a != 255, axis=(1, 2)))[0]; c = np.where(np.any(a != 255, axis=(0, 2)))[0]
    im.crop((c.min(), r.min(), c.max() + 1, r.max() + 1)).save(path)

lanes = ["Compras / Almacén", "Producción", "Gerencia / Ventas"]
LC = ["#F6EFE3", "#FBF7EE", "#F6EFE3"]
steps = {
 "a1": (0, 0, "Compra insumos (llamada / WhatsApp)", "n"), "a2": (0, 1, "Anota la recepción en cuaderno o Excel", "bad"),
 "a3": (0, 2, "Conteo físico semanal manual", "bad"),
 "p1": (1, 2, "Planifica lotes 'por experiencia'", "bad"), "p2": (1, 3, "Calcula insumos con la receta en papel", "bad"),
 "d": (1, 4, "¿Falta insumo?", "d"), "p3": (1, 5, "Elabora el lote y anota la merma al final del día", "bad"),
 "c": (0, 4, "Compra urgente (sobrecosto)", "bad"),
 "g1": (2, 5, "Vende por pedido, sin proyección", "n"), "g2": (2, 6, "Reunión mensual: revisa hojas de cálculo", "bad"),
}
edges = [("a1", "a2", "", "-"), ("a2", "a3", "", "-"), ("a3", "p1", "", "-"), ("p1", "p2", "", "-"), ("p2", "d", "", "-"),
         ("d", "p3", "No", "-"), ("d", "c", "Sí", "-"), ("p3", "g1", "", "-"), ("g1", "g2", "", "-")]
swim("assets/asis.png", "Proceso AS-IS: gestión actual de insumos y producción (sin sistema)", lanes, steps, edges, 7,
     ["① Stock desactualizado", "② Sin alertas de mínimos", "③ Demanda no proyectada", "④ Merma sin trazabilidad", "⑤ Sin registro de responsables"],
     LC, "Problemas (rojo):", "#FFF4CC")

lanes2 = ["Almacenero", "Sistema Web Inteligente", "Jefe de producción", "Gerencia"]
LC2 = ["#E8F3EC", "#FFF8E6", "#E8F3EC", "#F6EFE3"]
steps2 = {
 "a1": (0, 0, "Inicia sesión (rol Almacenero)", "ok"), "a2": (0, 1, "Registra ingreso o salida de insumo", "ok"),
 "s1": (1, 1, "Trigger de BD actualiza el stock en tiempo real", "sys"), "s2": (1, 2, "Evalúa el stock mínimo y genera alertas (WhatsApp / correo)", "sys"),
 "s3": (1, 3, "Modelo ML pronostica la demanda de 3 meses", "sys"),
 "p1": (2, 3, "Consulta alertas y pronóstico", "ok"), "p2": (2, 4, "Crea la orden con vista previa de insumos (BOM)", "ok"),
 "p3": (2, 5, "Completa la orden", "ok"), "s4": (1, 5, "Descuenta insumos según receta y audita la acción", "sys"),
 "g1": (3, 5, "Consulta el dashboard de KPIs actualizado", "ok"),
}
edges2 = [("a1", "a2", "", "-"), ("a2", "s1", "", "-"), ("s1", "s2", "", "-"), ("s2", "s3", "", "-"), ("s3", "p1", "", "-"),
          ("p1", "p2", "", "-"), ("p2", "p3", "", "-"), ("p3", "s4", "", "-"), ("p3", "g1", "", "-")]
swim("assets/tobe.png", "Proceso TO-BE: gestión con el Sistema Web Inteligente", lanes2, steps2, edges2, 6,
     ["✔ Stock en tiempo real", "✔ Alertas automáticas", "✔ Producción guiada por pronóstico", "✔ Trazabilidad completa", "✔ Acceso por roles"],
     LC2, "Mejoras (verde):", "#E4F3E9")
