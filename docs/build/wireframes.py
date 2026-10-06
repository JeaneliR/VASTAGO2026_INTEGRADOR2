import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyBboxPatch
A = "assets/wire/"; G, D, L = "#4d4d4d", "#9e9e9e", "#ececec"
FONT = "DejaVu Sans"

def canvas():
    fig, ax = plt.subplots(figsize=(12.8, 7.6)); ax.set_xlim(0, 128); ax.set_ylim(0, 76); ax.invert_yaxis(); ax.axis("off")
    ax.add_patch(Rectangle((0.3, 0.3), 127.4, 75.4, fc="white", ec=G, lw=2)); return fig, ax
Z = 1
def box(ax, x, y, w, h, t="", fs=9, fc="white", ec=G, bold=False, ls="-", ha="center", dash=False):
    ax.add_patch(Rectangle((x, y), w, h, fc=fc, ec=ec, lw=1.3, ls="--" if dash else "-", zorder=Z))
    if t: ax.text(x + (w/2 if ha == "center" else 1.2), y + h/2, t, fontsize=fs, ha=ha, va="center", color=G, fontweight="bold" if bold else "normal", family=FONT, zorder=Z+2)
def lines(ax, x, y, w, n=2, gap=1.6):
    for i in range(n): ax.add_patch(Rectangle((x, y + i*gap), w * (1 if i < n-1 else .6), .7, fc=D, ec="none"))
def sidebar(ax, active, items):
    box(ax, 0.3, 0.3, 24, 75.4, fc=L)
    box(ax, 3, 4, 18, 6, "LOGO · Vástago & Co", 8, bold=True)
    for i, it in enumerate(items):
        box(ax, 3, 16 + i * 7.5, 18, 5.5, it, 8.5, fc="#c9c9c9" if it == active else "white", bold=(it == active))
    box(ax, 3, 66, 18, 6, "Usuario · Rol  [Cerrar sesión]", 7)
def header(ax, t):
    ax.text(28, 6, t, fontsize=16, fontweight="bold", color=G, va="center", family=FONT)
def table(ax, x, y, cols, rows, w, rh=5.2, colw=None):
    colw = colw or [w / len(cols)] * len(cols)
    cx = x
    for c, cw in zip(cols, colw):
        box(ax, cx, y, cw, rh, c, 8, fc="#d6d6d6", bold=True); cx += cw
    for r in range(rows):
        cx = x
        for k, cw in enumerate(colw):
            box(ax, cx, y + rh * (r + 1), cw, rh, fc="white"); lines(ax, cx + 1.2, y + rh * (r + 1) + 1.6, cw - 3, 1); cx += cw
def save(fig, name, title):
    fig.tight_layout(pad=.2); fig.savefig(A + name, dpi=130); plt.close(fig)
NAV = ["Dashboard", "Inventario", "Producción", "Analítica IA", "Usuarios", "Auditoría"]

# Login
fig, ax = canvas(); box(ax, 40, 14, 48, 50, fc=L)
box(ax, 44, 18, 40, 6, "LOGO  Vástago & Co", 10, bold=True); ax.text(64, 29, "Inicia sesión para continuar", fontsize=8.5, ha="center", color=G)
ax.text(44, 34, "Correo corporativo", fontsize=8, color=G); box(ax, 44, 36, 40, 5.5, "usuario@vastagoyco.pe", 8, ha="left")
ax.text(44, 46, "Contraseña", fontsize=8, color=G); box(ax, 44, 48, 40, 5.5, "••••••••", 8, ha="left")
box(ax, 44, 56, 40, 5.5, "INGRESAR", 9, fc="#9e9e9e", bold=True); ax.text(64, 62.8, "Acceso restringido. Toda actividad queda registrada.", fontsize=6.5, ha="center", color=G)
save(fig, "00_login.png", "")
# Dashboard
fig, ax = canvas(); sidebar(ax, "Dashboard", NAV); header(ax, "Dashboard")
for i, t in enumerate(["Quiebres de stock", "Merma de producción", "Órdenes activas", "Precisión modelo IA"]):
    box(ax, 28 + i * 24.5, 12, 23, 16, fc="white"); ax.text(29.5 + i * 24.5, 15.5, t, fontsize=7.5, color=G); ax.text(29.5 + i * 24.5, 21.5, "##", fontsize=15, fontweight="bold", color=G); lines(ax, 29.5 + i * 24.5, 25, 18, 1)
box(ax, 28, 33, 97, 38, fc="white"); ax.text(30, 36.5, "Alertas", fontsize=11, fontweight="bold", color=G)
for i in range(4): box(ax, 30, 41 + i * 7.3, 93, 6, fc=L, dash=True); ax.text(32, 44 + i * 7.3, ["● Crítica", "● Advertencia", "● Advertencia", "● Crítica"][i] + "  — título y detalle de la alerta", fontsize=8, va="center", color=G)
save(fig, "01_dashboard.png", "")
# Inventario
fig, ax = canvas(); sidebar(ax, "Inventario", NAV); header(ax, "Inventario")
table(ax, 28, 12, ["Insumo", "Stock actual", "Stock mínimo", "Estado", "Acción"], 8, 97, 6.4, [32, 18, 18, 12, 17])
for r in range(8): box(ax, 28 + 80, 12 + 6.4 * (r + 1) + 1, 15, 4.4, "Movimiento", 6.5, fc="#c9c9c9")
save(fig, "02_inventario.png", "")
# Producción
fig, ax = canvas(); sidebar(ax, "Producción", NAV); header(ax, "Producción"); box(ax, 28, 11, 38, 6, "+ Nueva orden de producción", 8.5, fc="#c9c9c9", bold=True)
table(ax, 28, 21, ["Lote", "Producto", "Cantidad", "Inicio", "Estado", "Acción"], 7, 97, 6.4, [14, 30, 14, 16, 12, 11])
save(fig, "03_produccion.png", "")
# Nueva orden (modal)
fig, ax = canvas(); sidebar(ax, "Producción", NAV); header(ax, "Producción"); box(ax, 28, 11, 38, 6, "+ Nueva orden de producción", 8.5, fc="#c9c9c9"); table(ax, 28, 21, ["Lote", "Producto", "Cantidad", "Inicio", "Estado", "Acción"], 5, 97, 6.4, [14, 30, 14, 16, 12, 11])
ax.add_patch(Rectangle((0.3, 0.3), 127.4, 75.4, fc="#000", alpha=.25, zorder=8)); Z = 10; box(ax, 40, 10, 48, 58, fc="white")
ax.text(43, 15, "Nueva orden de producción", fontsize=11, fontweight="bold", color=G, zorder=12); ax.text(43, 21, "Producto", fontsize=8, color=G, zorder=12); box(ax, 43, 23, 42, 5.5, "Bombones Caja x6   ▾", 8, ha="left")
ax.text(43, 33, "Cantidad (unidades)", fontsize=8, color=G, zorder=12); box(ax, 43, 35, 42, 5.5, "100", 8, ha="left")
ax.text(43, 45, "Consumo estimado de insumos (receta / BOM):", fontsize=7.5, color=G, zorder=12)
for i in range(4): ax.text(45, 49 + i * 3.4, "• insumo ........ 0.0 kg", fontsize=7.5, color=G, zorder=12)
box(ax, 43, 61, 20, 5, "Crear orden", 8, fc="#c9c9c9", bold=True); box(ax, 65, 61, 20, 5, "Cancelar", 8)
Z = 1
save(fig, "04_nueva_orden.png", "")
# Analítica
fig, ax = canvas(); sidebar(ax, "Analítica IA", NAV); header(ax, "Analítica IA")
box(ax, 28, 11, 97, 62, fc="white"); ax.text(30, 15, "Producto", fontsize=8, color=G); box(ax, 30, 17, 38, 5, "Bombones Caja x6   ▾", 8, ha="left")
box(ax, 30, 25, 93, 28, fc=L, dash=True); ax.plot([34, 50, 62, 76, 90, 100], [48, 38, 44, 33, 40, 31], color=G, lw=2); ax.plot([100, 108, 116, 121], [31, 38, 40, 39], color=G, lw=2, ls="--")
ax.text(76, 51, "Gráfico: demanda histórica (línea) y proyección (punteada)", fontsize=7.5, ha="center", color=G)
ax.text(30, 57, "Error de validación del modelo (MAPE): ##%", fontsize=8.5, color=G); table(ax, 30, 60, ["Mes proyectado", "Demanda estimada", "Margen de error"], 1, 93, 5, [31, 31, 31])
save(fig, "05_analitica.png", "")
# Usuarios
fig, ax = canvas(); sidebar(ax, "Usuarios", NAV); header(ax, "Usuarios (solo Administrador)"); box(ax, 28, 11, 28, 6, "+ Nuevo usuario", 8.5, fc="#c9c9c9", bold=True)
table(ax, 28, 21, ["Nombre", "Correo", "Rol", "Estado", "Acción"], 6, 97, 6.4, [24, 30, 20, 11, 12])
save(fig, "06_usuarios.png", "")
# Auditoría
fig, ax = canvas(); sidebar(ax, "Auditoría", NAV); header(ax, "Auditoría (solo Administrador)"); ax.text(28, 12, "Bitácora de solo-anexar: nadie puede modificar ni borrar estos registros.", fontsize=8, color=G)
table(ax, 28, 16, ["Fecha", "Usuario", "Acción", "Entidad", "IP", "Resultado"], 8, 97, 6, [20, 24, 20, 14, 10, 9])
save(fig, "07_auditoria.png", "")
print("ok")
