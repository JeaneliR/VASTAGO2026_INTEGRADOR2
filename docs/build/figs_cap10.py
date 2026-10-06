"""Figuras del capítulo 10 a partir de evidencias reales (cobertura, pentest) y composiciones de capturas por rol."""
import re
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image, ImageDraw, ImageFont
import numpy as np

EV = "../../evidencias/"
INK, MUTED, GRID = "#2E1B12", "#6B5B4B", "#E4DED2"
OK, WARN, BAD, GREY = "#2E7D4F", "#C89B3C", "#B3261E", "#8A7A6A"
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 9, "text.color": INK, "axes.edgecolor": GRID})

def trim(path):
    im = Image.open(path).convert("RGB"); a = np.array(im)
    rows = np.where(np.any(a != 255, axis=(1, 2)))[0]; cols = np.where(np.any(a != 255, axis=(0, 2)))[0]
    im.crop((max(cols.min() - 12, 0), max(rows.min() - 12, 0), min(cols.max() + 12, a.shape[1]), min(rows.max() + 12, a.shape[0]))).save(path)

# ---- 1) Cobertura por módulo (evidencias/05_cobertura.txt)
rows = []
for ln in open(EV + "05_cobertura.txt", encoding="utf-8"):
    m = re.match(r"^(app/\S+\.py)\s+(\d+)\s+(\d+)\s+(\d+)%", ln)
    if m and int(m.group(2)) > 0: rows.append((m.group(1).replace("app/", ""), int(m.group(2)), int(m.group(3)), int(m.group(4))))
rows.sort(key=lambda r: r[3])
fig, ax = plt.subplots(figsize=(8.6, 4.3))
cols = [OK if r[3] >= 90 else WARN if r[3] >= 80 else BAD for r in rows]
b = ax.barh([r[0] for r in rows], [r[3] for r in rows], color=cols, height=0.62)
for r, bar in zip(rows, b): ax.text(bar.get_width() + 1, bar.get_y() + bar.get_height() / 2, f"{r[3]} %  ({r[1] - r[2]}/{r[1]} líneas)", va="center", fontsize=8, color=INK)
ax.axvline(80, color=MUTED, ls="--", lw=1); ax.set_title("Línea discontinua: criterio de salida (≥ 80 %)", loc="right", fontsize=8.5, color=MUTED)
ax.set_xlim(0, 125); ax.set_xlabel("% de líneas ejecutadas por las 24 pruebas pytest (total: 90 %, 536/596 líneas)", color=MUTED)
ax.spines[["top", "right"]].set_visible(False); ax.xaxis.grid(True, color=GRID, lw=0.8); ax.set_axisbelow(True); ax.tick_params(colors=MUTED, length=0)
plt.tight_layout(); plt.savefig("assets/cap10_cobertura.png", dpi=170, facecolor="white"); trim("assets/cap10_cobertura.png")

# ---- 2) Pentest antes / después por categoría OWASP (evidencias/seguridad/pentest_*.txt)
def parse(fn):
    out = {}
    for ln in open(EV + "seguridad/" + fn, encoding="utf-8"):
        m = re.match(r"^\[(PASA |FALLA)\]\s+(A\d\d)", ln)
        if m: out.setdefault(m.group(2), [0, 0])[0 if m.group(1).startswith("PASA") else 1] += 1
    return out
A, D = parse("pentest_antes.txt"), parse("pentest_despues.txt")
cats = sorted(A); nm = {"A01": "A01 Control de acceso", "A02": "A02 Fallas criptográficas", "A03": "A03 Inyección", "A05": "A05 Configuración insegura", "A07": "A07 Identificación y autenticación"}
fig, ax = plt.subplots(figsize=(8.6, 3.4)); y = np.arange(len(cats)); h = 0.34
for off, data, lab in ((-h / 2 - 0.01, A, "Antes de las correcciones"), (h / 2 + 0.01, D, "Después de las correcciones")):
    ok = [data[c][0] for c in cats]; ko = [data[c][1] for c in cats]
    ax.barh(y + off, ok, h, color=GREY if "Antes" in lab else OK, label=lab)
    ax.barh(y + off, ko, h, left=ok, color=BAD, label="Verificación fallida" if "Antes" in lab else None)
    for yi, o, k in zip(y + off, ok, ko): ax.text(o + k + 0.12, yi, f"{o}/{o + k}", va="center", fontsize=8)
ax.set_yticks(y); ax.set_yticklabels([nm.get(c, c) for c in cats]); ax.invert_yaxis(); ax.set_xlabel("verificaciones superadas (total 18/20 → 20/20)", color=MUTED)
ax.set_xlim(0, 9); ax.legend(frameon=False, fontsize=8, loc="lower right")
ax.spines[["top", "right"]].set_visible(False); ax.xaxis.grid(True, color=GRID, lw=0.8); ax.set_axisbelow(True); ax.tick_params(colors=MUTED, length=0)
plt.tight_layout(); plt.savefig("assets/cap10_pentest.png", dpi=170, facecolor="white"); trim("assets/cap10_pentest.png")

# ---- 3) Composiciones de capturas recortadas (dos paneles con marcas a/b); recortes solo de zonas relevantes
C = EV + "capturas/"
def compose(panels, out, layout="h", gap=14):
    ims = []
    for f, box in panels:
        im = Image.open(C + f).convert("RGB"); ims.append(im.crop(box) if box else im)
    if layout == "h":                                   # misma altura, lado a lado
        H = min(i.height for i in ims); ims = [i.resize((round(i.width * H / i.height), H), Image.LANCZOS) for i in ims]
        W = sum(i.width for i in ims) + gap * (len(ims) - 1); canvas = Image.new("RGB", (W, H), "#D9D0C0"); x = 0; pos = []
        for im in ims: canvas.paste(im, (x, 0)); pos.append((x, 0, im.width)); x += im.width + gap
    else:                                               # mismo ancho, apilados
        Wd = min(i.width for i in ims); ims = [i.resize((Wd, round(i.height * Wd / i.width)), Image.LANCZOS) for i in ims]
        Ht = sum(i.height for i in ims) + gap * (len(ims) - 1); canvas = Image.new("RGB", (Wd, Ht), "#D9D0C0"); y = 0; pos = []
        for im in ims: canvas.paste(im, (0, y)); pos.append((0, y, im.width)); y += im.height + gap
    d = ImageDraw.Draw(canvas); f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
    for k, (x, y, w) in enumerate(pos):
        d.ellipse((x + w - 46, y + 8, x + w - 10, y + 44), fill="#C89B3C"); d.text((x + w - 28, y + 26), "ab"[k], font=f, fill="#2E1B12", anchor="mm")
    canvas.save("assets/" + out, optimize=True)
compose([("01_login.png", (400, 170, 880, 590)), ("02_login_error.png", (400, 160, 880, 590))], "cap10_ui_login.png")
compose([("uat_jefe_Dashboard.png", (0, 0, 760, 420)), ("uat_jefe_Nueva_orden_BOM.png", (400, 170, 880, 590))], "cap10_ui_jefe.png")
compose([("uat_almacenero_Movimiento.png", (400, 160, 880, 600)), ("uat_almacenero_Error_stock.png", (400, 150, 880, 610))], "cap10_ui_almacenero.png")
compose([("admin_Inventario.png", (0, 0, 1280, 510)), ("uat_admin_Usuarios_inactivo.png", (0, 0, 1280, 460))], "cap10_ui_admin.png", layout="v")
print("ok")
