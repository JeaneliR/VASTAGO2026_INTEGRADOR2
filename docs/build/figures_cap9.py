"""Figura del capítulo 9: secuencia de autenticación (login, uso del JWT, refresh rotatorio y reutilización)."""
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
for f in fm.findSystemFonts():
    if "/inter/Inter-" in f.lower() or "/Inter-" in f: fm.fontManager.addfont(f)
plt.rcParams["font.family"] = "Inter"
C900, C700, CAR = "#2E1B12", "#4A2C1F", "#C89B3C"
X = {"nav": 1.4, "api": 5.6, "bd": 9.8}
names = {"nav": "Navegador (React SPA)", "api": "API Flask (gunicorn)", "bd": "PostgreSQL"}
msgs = [  # (n, desde, hasta, texto, estilo)
 (1, "nav", "api", "POST /api/auth/login  {email, password}", "-"),
 (2, "api", "api", "valida formato · bcrypt.checkpw (cost 12) · rate limit 10/min", "self"),
 (3, "api", "bd", "UPDATE contador · INSERT sesiones(hash SHA-256) · INSERT auditoria", "-"),
 (4, "api", "nav", "200 {access_token JWT 15 min, usuario, permisos} + Set-Cookie vastago_rt", "--"),
 (5, "nav", "api", "GET /api/...  Authorization: Bearer <JWT>", "-"),
 (6, "api", "api", "HS256 fijo · exp/sub/rol · rol incluido en PERMISOS[permiso]", "self"),
 (7, "api", "nav", "200 datos  |  401 token inválido/expirado  |  403 sin permiso", "--"),
 (8, "nav", "api", "POST /api/auth/refresh  (cookie + X-Requested-With: vastago-web)", "-"),
 (9, "api", "bd", "SELECT sesión válida · UPDATE revocada · INSERT nueva sesión · auditoría", "-"),
 (10, "api", "nav", "200 nuevo JWT + nueva cookie rotada (el refresh anterior queda revocado)", "--"),
 (11, "nav", "api", "POST /api/auth/refresh con el refresh ANTERIOR (reutilización)", "-"),
 (12, "api", "nav", "401 «Sesión inválida o expirada» + borrado de cookie", "--"),
]
fig, ax = plt.subplots(figsize=(11.2, 8.3)); ax.set_xlim(0, 11.2); ax.set_ylim(0, 8.3); ax.axis("off")
top, bot = 7.65, 0.25
for k, x in X.items():
    ax.add_patch(plt.Rectangle((x - 1.25, top), 2.5, 0.5, fc=C700, ec=C900, lw=1, zorder=3))
    ax.text(x, top + 0.25, names[k], ha="center", va="center", color="white", fontsize=9.5, fontweight="bold", zorder=4)
    ax.plot([x, x], [top, bot], color="#9C8B78", lw=1, ls=(0, (4, 3)), zorder=1)
y = top - 0.45; dy = 0.6
for n, a, b, t, st in msgs:
    if st == "self":
        xs = X[a]
        ax.add_patch(plt.Rectangle((xs, y - 0.16), 0.22, 0.32, fc="#FFF4CC", ec=CAR, lw=1, zorder=2))
        ax.text(xs + 0.35, y, f"{n}. {t}", va="center", ha="left", fontsize=8.6, color=C900)
    else:
        x0, x1 = X[a], X[b]
        ax.annotate("", xy=(x1, y), xytext=(x0, y), arrowprops=dict(arrowstyle="-|>", color=C900, lw=1.3, ls="-" if st == "-" else (0, (4, 2)), shrinkA=0, shrinkB=0), zorder=2)
        xm = (x0 + x1) / 2
        ax.text(xm, y + 0.09, f"{n}. {t}", ha="center", va="bottom", fontsize=8.2, color=C900,
                bbox=dict(fc="white", ec="none", pad=0.6), zorder=5)
    y -= dy
for k, lab in ((4, "Uso del token de acceso"), (7, "Renovación (rotación del refresh)"), (10, "Reutilización de un refresh ya rotado")):
    yy = top - 0.45 - (k - 1) * dy - 0.2
    ax.plot([0.05, 11.15], [yy, yy], color=CAR, lw=0.8, ls=":")
    ax.text(11.1, yy + 0.04, lab, fontsize=7.8, color="#8A5636", va="bottom", ha="right", style="italic")
fig.savefig("assets/cap9_secuencia_auth.png", dpi=150, bbox_inches="tight", facecolor="white")


# ---- Figura 9.4.1: ciclo de pruebas (cuadrícula 2 x 4)
def fig_metodologia():
    from matplotlib.patches import FancyBboxPatch
    steps = [("1. Alcance", "Entorno local propio\n(autorizado por el equipo)", "#E4EEF9"),
             ("2. Reconocimiento", "nmap -sV con scripts\nhttp-headers / http-methods", "#E8F3EC"),
             ("3. Configuración", "nikto (servidor web)\nnmap ssl-enum-ciphers (TLS)", "#E8F3EC"),
             ("4. Explotación", "sqlmap (3 objetivos) y\nscript propio (20 pruebas)", "#FFF4CC"),
             ("5. Código y dependencias", "bandit, pip-audit,\nnpm audit, pytest (16)", "#FBF0D6"),
             ("6. Triaje", "clasificar severidad y\npriorizar la corrección", "#F3E4C4"),
             ("7. Corrección", "cambio de código o\nde configuración", "#FBE3E1"),
             ("8. Re-prueba", "mismas herramientas:\ncomparar antes / después", "#E8F3EC")]
    fg, ax = plt.subplots(figsize=(11, 4.5)); ax.set_xlim(0, 11); ax.set_ylim(-0.3, 4.2); ax.axis("off")
    w, h = 2.4, 1.35; xs = [0.15 + i * 2.82 for i in range(4)]; ys = [2.7, 0.55]
    pos = []
    for i, (t, d, c) in enumerate(steps):
        x = xs[i % 4]; y = ys[i // 4]; pos.append((x, y))
        ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.12", fc=c, ec=C700, lw=1.2))
        ax.text(x + w / 2, y + h - 0.32, t, ha="center", va="center", fontsize=10.5, fontweight="bold", color=C900)
        ax.text(x + w / 2, y + 0.45, d, ha="center", va="center", fontsize=8.6, color=C900, linespacing=1.4)
    ar = dict(arrowstyle="-|>", color=C900, lw=1.4)
    for i in (0, 1, 2, 4, 5, 6):
        x, y = pos[i]; ax.annotate("", xy=(pos[i + 1][0], y + h / 2), xytext=(x + w, y + h / 2), arrowprops=ar)
    # 4 -> 5 (baja y regresa a la izquierda)
    xa = pos[3][0] + w / 2; xb = pos[4][0] + w / 2; ym = (pos[3][1] + pos[4][1] + h) / 2
    ax.plot([xa, xa, xb], [pos[3][1], ym, ym], color=C900, lw=1.4)
    ax.annotate("", xy=(xb, pos[4][1] + h), xytext=(xb, ym), arrowprops=ar)
    # 8 -> 6 (bucle de re-prueba, punteado, por debajo)
    x8 = pos[7][0] + w / 2; x6 = pos[5][0] + w / 2; yb = pos[5][1] - 0.3
    ax.plot([x8, x8, x6], [pos[7][1], yb, yb], color=CAR, lw=1.5, ls=(0, (4, 2)))
    ax.annotate("", xy=(x6, pos[5][1]), xytext=(x6, yb), arrowprops=dict(arrowstyle="-|>", color=CAR, lw=1.5))
    ax.text((x8 + x6) / 2, yb - 0.2, "si la falla persiste: volver al triaje", fontsize=8.4, color="#8A5636", style="italic", ha="center")
    fg.savefig("assets/cap9_metodologia.png", dpi=150, bbox_inches="tight", facecolor="white")

fig_metodologia()
