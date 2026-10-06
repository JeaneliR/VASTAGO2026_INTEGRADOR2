"""Marcadores visibles de capturas pendientes del despliegue en Render (capítulo 11.2)."""
from PIL import Image, ImageDraw, ImageFont
F = "/usr/share/fonts/truetype/dejavu/DejaVuSans"
def placeholder(out, titulo, detalle):
    W, H = 1200, 340
    im = Image.new("RGB", (W, H), "#FFF4CC"); d = ImageDraw.Draw(im)
    for x in range(8, W - 8, 24): d.line((x, 8, x + 12, 8), fill="#B8860B", width=3); d.line((x, H - 9, x + 12, H - 9), fill="#B8860B", width=3)
    for y in range(8, H - 8, 24): d.line((8, y, 8, y + 12), fill="#B8860B", width=3); d.line((W - 9, y, W - 9, y + 12), fill="#B8860B", width=3)
    f1 = ImageFont.truetype(F + "-Bold.ttf", 44); f2 = ImageFont.truetype(F + ".ttf", 26)
    d.text((W / 2, 120), "[PENDIENTE: captura en Render]", font=f1, fill="#7A5A00", anchor="mm")
    d.text((W / 2, 190), titulo, font=f2, fill="#2E1B12", anchor="mm")
    d.text((W / 2, 235), detalle, font=f2, fill="#6B5B4B", anchor="mm")
    im.save("assets/" + out, optimize=True)
placeholder("pend_render_live.png", "Panel de Render: servicio vastago-sistema en estado Live y base vastago-db", "Pegar aquí la captura (sin mostrar valores de variables secretas)")
placeholder("pend_render_health.png", "Navegador con https://<servicio>.onrender.com/api/health → {\"status\":\"ok\"}", "Pegar aquí la captura mostrando el candado HTTPS y la URL")
placeholder("pend_render_app.png", "Aplicación en la nube: login y dashboard con una cuenta de cada rol", "Pegar aquí las capturas por rol sobre la URL pública de Render")
