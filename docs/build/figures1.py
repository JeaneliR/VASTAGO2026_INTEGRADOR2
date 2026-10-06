import subprocess, textwrap
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
from PIL import Image
import numpy as np

A = "assets/"
C900, C700, CAR, CREMA, GRIS = "#2E1B12", "#4A2C1F", "#C89B3C", "#FAF3E7", "#E4DED2"

def trim(path, pad=12):
    im = Image.open(path).convert("RGB"); a = np.array(im)
    rows = np.where(np.any(a != 255, axis=(1, 2)))[0]; cols = np.where(np.any(a != 255, axis=(0, 2)))[0]
    im.crop((max(cols.min()-pad,0), max(rows.min()-pad,0), min(cols.max()+pad,a.shape[1]), min(rows.max()+pad,a.shape[0]))).save(path)

def dot(name, src, dpi=170):
    open(f"{A}{name}.dot", "w").write(src)
    subprocess.run(["dot", "-Tpng", f"-Gdpi={dpi}", f"{A}{name}.dot", "-o", f"{A}{name}.png"], check=True)
    trim(f"{A}{name}.png")

FONT = 'fontname="Inter" fontsize=11'
NODE = f'node [shape=box style="rounded,filled" fillcolor="#FFFDF9" color="{C700}" {FONT} margin="0.14,0.08"];'
EDGE = f'edge [color="{C700}" {FONT} fontsize=9 arrowsize=0.8];'

# ------------------------------------------------------------ Lean Canvas
fig, ax = plt.subplots(figsize=(13, 8.4)); ax.set_xlim(0, 10); ax.set_ylim(0, 6.6); ax.axis("off")
blocks = [
 ("Problema", 0, 2, 2, 4, ["Quiebres de stock de insumos clave", "Producción planificada 'por experiencia'", "Mermas y vencimientos sin trazabilidad", "Registros manuales en cuaderno/Excel"]),
 ("Segmentos de clientes", 8, 2, 2, 4, ["Chocolaterías artesanales peruanas", "Pequeñas fábricas de transformación", "Primer cliente: Vástago & Co", "Usuarios: jefe de producción, almacén y gerencia"]),
 ("Propuesta de valor única", 4, 2, 2, 4, ["Un solo sistema web para inventario y producción con alertas y pronóstico de demanda por IA", "Concepto: 'Sabe cuánto producir antes de quedarte sin cacao'"]),
 ("Solución", 2, 2, 2, 4, ["Inventario con movimientos y alertas", "Órdenes de producción con receta (BOM)", "Pronóstico de demanda (ML)", "Dashboard de KPIs por rol"]),
 ("Canales", 6, 2, 2, 4, ["Aplicación web en la nube", "Alertas por WhatsApp y correo", "Capacitación presencial en planta"]),
 ("Estructura de costos", 0, 0, 5, 2, ["Desarrollo (540 h de equipo)", "Hosting cloud + base de datos", "Capacitación del personal", "Soporte y mantenimiento"]),
 ("Fuentes de ingreso", 5, 0, 5, 2, ["Ahorro por menos mermas y quiebres", "Suscripción mensual si se ofrece a otras empresas", "Servicio de implementación"]),
]
# Lean canvas clásico
blocks = [
 ("1. Problema", 0, 2.0, 2, 4.6, ["Quiebres de stock de insumos clave", "Producción planificada 'por experiencia'", "Mermas y vencimientos sin trazabilidad", "Registros manuales (cuaderno/Excel)"]),
 ("4. Solución", 2, 4.0, 2, 2.6, ["Inventario con movimientos y alertas", "Órdenes de producción con receta (BOM)", "Pronóstico de demanda (ML)"]),
 ("8. Métricas clave", 2, 2.0, 2, 2.0, ["Quiebres de stock/mes", "Merma de producción %", "Precisión del pronóstico (MAPE)"]),
 ("3. Propuesta de valor única", 4, 2.0, 2, 4.6, ["Un solo sistema web que une inventario, producción y pronóstico de demanda con IA.", "", "\"Sabe cuánto producir antes de quedarte sin cacao\""]),
 ("9. Ventaja competitiva", 6, 4.0, 2, 2.6, ["Conocimiento del proceso real de la empresa", "Modelo entrenado con su propio histórico"]),
 ("5. Canales", 6, 2.0, 2, 2.0, ["Aplicación web en la nube", "Alertas WhatsApp / correo", "Capacitación en planta"]),
 ("2. Segmentos de clientes", 8, 2.0, 2, 4.6, ["Chocolaterías artesanales", "Pequeñas fábricas de transformación", "Cliente piloto: Vástago & Co", "Usuarios: producción, almacén y gerencia"]),
 ("7. Estructura de costos", 0, 0, 5, 2.0, ["Desarrollo del sistema (540 h de equipo)", "Hosting cloud y base de datos administrada", "Capacitación del personal", "Soporte y mantenimiento"]),
 ("6. Fuentes de ingreso", 5, 0, 5, 2.0, ["Ahorro por menos mermas y quiebres de stock", "Suscripción mensual a otras empresas del rubro", "Servicio de implementación y capacitación"]),
]
for t, x, y, w, h, items in blocks:
    ax.add_patch(FancyBboxPatch((x+.04, y+.04), w-.08, h-.08, boxstyle="round,pad=0,rounding_size=0.06", fc=CREMA, ec=C700, lw=1.4))
    ax.text(x+.14, y+h-.14, t, fontsize=10.5, fontweight="bold", color=C900, va="top")
    yy = y+h-.5
    for it in items:
        wrapped = textwrap.fill(("• " if it and not it.startswith('"') else "") + it, 31 if w == 2 else 62)
        ax.text(x+.14, yy, wrapped, fontsize=8.6, color=C900, va="top", linespacing=1.25)
        yy -= .24 * (wrapped.count("\n") + 1) + .08
ax.text(5, 6.02, "", fontsize=1)
plt.tight_layout(); plt.savefig(A+"lean_canvas.png", dpi=170); plt.close(); trim(A+"lean_canvas.png")

# ------------------------------------------------------------ AS-IS / TO-BE
asis = f'''digraph G {{ rankdir=TB; splines=true; nodesep=0.35; ranksep=0.5; compound=true; bgcolor="white";
{NODE} {EDGE}
subgraph cluster_a {{ label="Compras / Almacén"; style="rounded,filled"; fillcolor="#F6EFE3"; color="{C700}"; {FONT}
  a1 [label="Compra de cacao,\\nmanteca y empaques\\n(por llamada / WhatsApp)"];
  a2 [label="Recepción: se anota\\nen cuaderno o Excel"];
  a3 [label="Conteo físico\\nsemanal manual"]; }}
subgraph cluster_p {{ label="Producción (Jefe de producción)"; style="rounded,filled"; fillcolor="#F6EFE3"; color="{C700}"; {FONT}
  p1 [label="Planifica lotes\\n\\"por experiencia\\""];
  p2 [label="Receta en papel:\\ncalcula insumos a mano"];
  p3 [label="Elabora el lote\\ny anota la merma\\nal final del día"]; }}
subgraph cluster_g {{ label="Gerencia / Ventas"; style="rounded,filled"; fillcolor="#F6EFE3"; color="{C700}"; {FONT}
  g1 [label="Ventas por pedido\\n(sin proyección)"];
  g2 [label="Reunión mensual:\\nrevisa hojas de cálculo"]; }}
d1 [shape=diamond style=filled fillcolor="#FBE3E1" color="#B3261E" label="¿Falta\\ninsumo?"];
d2 [label="Compra urgente\\n(sobrecosto)" fillcolor="#FBE3E1" color="#B3261E"];
a1 -> a2 -> a3 -> p1 -> p2 -> d1; d1 -> p3 [label="No"]; d1 -> d2 [label="Sí"]; d2 -> a1 [constraint=false, style=dashed];
p3 -> g1 -> g2;
n1 [shape=note style=filled fillcolor="#FFF4CC" color="{CAR}" label="Problemas detectados\\n① Stock desactualizado\\n② Sin alertas de mínimos\\n③ Demanda no proyectada\\n④ Merma sin trazabilidad\\n⑤ Sin registro de quién hizo qué"];
}}'''
dot("asis", asis)
tobe = f'''digraph G {{ rankdir=TB; splines=true; nodesep=0.35; ranksep=0.5; compound=true; bgcolor="white";
{NODE} {EDGE}
subgraph cluster_a {{ label="Almacenero"; style="rounded,filled"; fillcolor="#E8F3EC"; color="#2E7D4F"; {FONT}
  a1 [label="Inicia sesión\\n(rol Almacenero)"];
  a2 [label="Registra ingreso/salida\\nen el sistema"]; }}
subgraph cluster_s {{ label="Sistema Web Inteligente (automático)"; style="rounded,filled"; fillcolor="#FFF8E6"; color="{CAR}"; {FONT}
  s1 [label="Trigger BD actualiza\\nstock en tiempo real"];
  s2 [label="Evalúa stock mínimo\\ny genera alertas\\n(WhatsApp / correo)"];
  s3 [label="Modelo ML pronostica\\ndemanda de 3 meses"];
  s5 [label="Descuenta insumos\\nsegún receta (BOM)"];
  s6 [label="Auditoría de cada\\nacción (usuario, fecha, IP)"]; }}
subgraph cluster_p {{ label="Jefe de producción"; style="rounded,filled"; fillcolor="#E8F3EC"; color="#2E7D4F"; {FONT}
  p1 [label="Consulta alertas y\\npronóstico"];
  p2 [label="Crea orden de producción\\ncon vista previa de insumos"];
  p3 [label="Completa la orden\\n(consumo automático)"]; }}
subgraph cluster_g {{ label="Gerencia"; style="rounded,filled"; fillcolor="#E8F3EC"; color="#2E7D4F"; {FONT}
  g1 [label="Dashboard de KPIs\\n(quiebres, merma,\\nprecisión IA)"]; }}
a1 -> a2 -> s1 -> s2 -> p1 -> p2 -> p3 -> s5; s5 -> s1 [style=dashed constraint=false];
s3 -> p1 [constraint=false];  s2 -> g1 [constraint=false]; s5 -> g1; s1 -> s6 [style=dotted]; 
n1 [shape=note style=filled fillcolor="#E4F3E9" color="#2E7D4F" label="Mejoras logradas\\n✔ Stock en tiempo real\\n✔ Alertas automáticas\\n✔ Producción guiada por pronóstico\\n✔ Trazabilidad completa\\n✔ Acceso por roles"];
}}'''
dot("tobe", tobe)

# ------------------------------------------------------------ Arquitectura
arq = f'''digraph G {{ rankdir=TB; nodesep=0.35; ranksep=0.5; bgcolor="white"; {NODE} {EDGE}
user [label="Usuario\\n(navegador)" shape=ellipse fillcolor="{CREMA}"];
subgraph cluster_r {{ label="Plataforma cloud: Render (HTTPS / TLS 1.2-1.3)"; style="rounded,filled"; fillcolor="#F6EFE3"; color="{C700}"; {FONT}
  subgraph cluster_w {{ label="Servicio web (contenedor Docker, gunicorn)"; style="rounded,filled"; fillcolor="white"; color="{CAR}";
    react [label="Frontend React\\n(archivos estáticos)"];
    rutas [label="Capa de rutas (Flask)\\nRBAC · validación · límites de tasa"];
    serv [label="Capa de servicios\\n(auth_service) · transacciones\\nde negocio en las rutas"];
    repo [label="Capa de acceso a datos\\nPatrón Repository"];
    sec [label="Seguridad transversal\\nbcrypt · JWT · AES-256-GCM\\ncabeceras · auditoría" fillcolor="#FFF4CC"];
  }}
  pg [label="PostgreSQL 16\\n(primario)" shape=cylinder fillcolor="#E4EEF9"];
}}
rep [label="PostgreSQL 16 (réplica, demostración local\\npuerto 5434; en Render la HA la define el plan)" shape=cylinder fillcolor="#E4EEF9" style="dashed,filled"];
ml [label="ml-service/forecast.py (scikit-learn)\\nentrenamiento por lote → JSON → seed" fillcolor="#E4F3E9"];
gh [label="GitHub\\n(repositorio + CI)" shape=component fillcolor="{CREMA}"];
user -> react [label="HTTPS"]; react -> rutas [label="REST /api (JWT)"]; rutas -> serv -> repo; repo -> pg [label="SQL parametrizado\\n(pool de conexiones)"];
pg -> rep [label="streaming asíncrono\\n(WAL), probado en local" style=bold]; ml -> pg [label="carga pronósticos" style=dashed];
sec -> rutas [style=dotted arrowhead=none]; sec -> serv [style=dotted arrowhead=none];
gh -> rutas [label="deploy automático\\n(render.yaml)" style=dashed constraint=false];
}}'''
dot("arquitectura", arq)

# ------------------------------------------------------------ ER físico
import html
def tabla(n, cols):
    cols = [(c[0], html.escape(c[1]), c[2]) for c in cols]
    rows = "".join(f'<TR><TD ALIGN="LEFT" PORT="{c[0]}"><FONT POINT-SIZE="9">{"<B>PK </B>" if "PK" in c[2] else ("<I>FK </I>" if "FK" in c[2] else "")}{c[0]}</FONT></TD><TD ALIGN="LEFT"><FONT POINT-SIZE="8" COLOR="#6B3F2A">{c[1]}</FONT></TD></TR>' for c in cols)
    return f'{n} [shape=plain label=<<TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="3" COLOR="{C700}"><TR><TD COLSPAN="2" BGCOLOR="{C700}"><FONT COLOR="white" POINT-SIZE="10"><B>{n}</B></FONT></TD></TR>{rows}</TABLE>>];'
T = {
 "roles": [("id","SMALLINT","PK"),("nombre","VARCHAR(40) UQ",""),("descripcion","VARCHAR(200)","")],
 "usuarios": [("id","SERIAL","PK"),("nombre","VARCHAR(100)",""),("email","VARCHAR(120) UQ",""),("password_hash","VARCHAR(100) bcrypt",""),("rol_id","SMALLINT","FK"),("telefono_cifrado","BYTEA AES-GCM",""),("activo","BOOLEAN",""),("intentos_fallidos","SMALLINT",""),("bloqueado_hasta","TIMESTAMPTZ",""),("ultimo_acceso","TIMESTAMPTZ",""),("creado_en","TIMESTAMPTZ","")],
 "sesiones": [("id","BIGSERIAL","PK"),("usuario_id","INT","FK"),("token_hash","CHAR(64) UQ",""),("expira_en","TIMESTAMPTZ",""),("revocada","BOOLEAN",""),("ip","VARCHAR(45)",""),("user_agent","VARCHAR(200)",""),("creada_en","TIMESTAMPTZ","")],
 "auditoria": [("id","BIGSERIAL","PK"),("usuario_id","INT","FK"),("email","VARCHAR(120)",""),("accion","VARCHAR(40)",""),("entidad","VARCHAR(40)",""),("detalle","JSONB",""),("ip","VARCHAR(45)",""),("exito","BOOLEAN",""),("fecha","TIMESTAMPTZ","")],
 "insumos": [("id","SERIAL","PK"),("nombre","VARCHAR(100) UQ",""),("unidad","VARCHAR(10)",""),("stock_actual","NUMERIC(12,3) ≥0",""),("stock_minimo","NUMERIC(12,3)",""),("costo_unitario","NUMERIC(10,2)",""),("actualizado_en","TIMESTAMPTZ","")],
 "movimientos_inventario": [("id","BIGSERIAL","PK"),("insumo_id","INT","FK"),("tipo","INGRESO|SALIDA|AJUSTE",""),("cantidad","NUMERIC(12,3) >0",""),("motivo","VARCHAR(120)",""),("orden_id","INT","FK"),("usuario_id","INT","FK"),("fecha","TIMESTAMPTZ","")],
 "productos": [("id","SERIAL","PK"),("nombre","VARCHAR(100) UQ",""),("precio","NUMERIC(10,2)","")],
 "bom": [("producto_id","INT","PK FK"),("insumo_id","INT","PK FK"),("cantidad_por_unidad","NUMERIC(10,4)","")],
 "ordenes_produccion": [("id","SERIAL","PK"),("lote","VARCHAR(20) UQ",""),("producto_id","INT","FK"),("cantidad","INT >0",""),("fecha_inicio","DATE",""),("estado","Planificada|En proceso|Completada",""),("creado_por","INT","FK"),("creado_en","TIMESTAMPTZ","")],
 "demanda_historica": [("producto_id","INT","PK FK"),("mes","DATE","PK"),("kg","NUMERIC(10,2)","")],
 "pronosticos": [("producto_id","INT","PK FK"),("mes","DATE","PK"),("kg","NUMERIC(10,2)",""),("mape","NUMERIC(5,2)",""),("modelo","VARCHAR(60)","")],
 "alertas": [("id","SERIAL","PK"),("nivel","crit|warn",""),("titulo","VARCHAR(150)",""),("detalle","VARCHAR(400)",""),("creada_en","TIMESTAMPTZ","")],
}
er = f'digraph G {{ rankdir=LR; nodesep=0.35; ranksep=0.9; bgcolor="white"; edge [color="{C700}" arrowhead=crow arrowtail=tee dir=both fontname="Inter" fontsize=8];\n' + "\n".join(tabla(n, c) for n, c in T.items()) + '''
roles -> usuarios [taillabel="1" headlabel="N"]; usuarios -> sesiones; usuarios -> auditoria; usuarios -> ordenes_produccion; usuarios -> movimientos_inventario;
insumos -> movimientos_inventario; insumos -> bom; productos -> bom; productos -> ordenes_produccion; productos -> demanda_historica; productos -> pronosticos;
ordenes_produccion -> movimientos_inventario; }'''
dot("er_fisico", er, dpi=150)

# ------------------------------------------------------------ Diagrama de clases (Repository)
def cls(n, attrs, methods, color="#FFFDF9"):
    a = "\\l".join(attrs) + ("\\l" if attrs else ""); m = "\\l".join(methods) + "\\l"
    return f'"{n}" [shape=record fillcolor="{color}" style=filled color="{C700}" fontname="Inter" fontsize=9 label="{{{n}|{a}|{m}}}"];'
cl = f'digraph G {{ rankdir=BT; nodesep=0.3; ranksep=0.55; bgcolor="white"; edge [color="{C700}" fontname="Inter" fontsize=8];\n' + "\n".join([
 cls("BaseRepository", ["tabla : str", "_cur : cursor (opcional)"], ["_run(sql, params, one) : rows", "find_all(order_by) : list", "find_by_id(id) : dict"], "#FFF4CC"),
 cls("UsuarioRepository", [], ["find_by_email(email)", "crear(nombre, email, hash, rol)", "registrar_fallo(id, max, min)", "registrar_acceso(id)"]),
 cls("SesionRepository", [], ["crear(usuario_id, token_hash, ...)", "buscar_valida(token_hash)", "revocar(token_hash)"]),
 cls("InsumoRepository", [], ["listar()", "bloquear_para_actualizar(id)", "contar_quiebres()"]),
 cls("MovimientoRepository", [], ["registrar(insumo, tipo, cantidad, ...)", "ultimos(insumo_id)"]),
 cls("OrdenRepository", [], ["listar()", "crear(lote, producto, ...)", "cambiar_estado(id, estado)"]),
 cls("ProductoRepository", [], ["listar()", "bom(producto_id)"]),
 cls("AlertaRepository", [], ["listar()"]),
 cls("PronosticoRepository", [], ["serie() : dict", "mape_promedio() : float"]),
 cls("AuditoriaRepository", [], ["registrar(accion, usuario, ...)", "ultimos(limite)"]),
 cls("auth_service", [], ["login(email, password, ip)", "refresh(token)", "logout(token)"], "#E4F3E9"),
 cls("Rutas (Flask)", [], ["/api/inventario", "/api/produccion", "/api/productos", "/api/forecast", "/api/auth/*"], "#E4EEF9"),
 'db [shape=cylinder label="PostgreSQL" fillcolor="#E4EEF9" style=filled fontname="Inter" fontsize=9];',
 "UsuarioRepository -> BaseRepository [arrowhead=empty]; SesionRepository -> BaseRepository [arrowhead=empty]; InsumoRepository -> BaseRepository [arrowhead=empty]; MovimientoRepository -> BaseRepository [arrowhead=empty]; OrdenRepository -> BaseRepository [arrowhead=empty]; PronosticoRepository -> BaseRepository [arrowhead=empty]; AuditoriaRepository -> BaseRepository [arrowhead=empty]; ProductoRepository -> BaseRepository [arrowhead=empty]; AlertaRepository -> BaseRepository [arrowhead=empty];",
 'auth_service -> UsuarioRepository [style=dashed label="usa"]; auth_service -> SesionRepository [style=dashed]; auth_service -> AuditoriaRepository [style=dashed];',
 '"Rutas (Flask)" -> auth_service [style=dashed label="usa"]; "Rutas (Flask)" -> InsumoRepository [style=dashed]; "Rutas (Flask)" -> OrdenRepository [style=dashed]; "Rutas (Flask)" -> MovimientoRepository [style=dashed]; "Rutas (Flask)" -> PronosticoRepository [style=dashed]; "Rutas (Flask)" -> ProductoRepository [style=dashed]; "Rutas (Flask)" -> AlertaRepository [style=dashed];',
 'BaseRepository -> db [label="SQL parametrizado\\n(transaction())" arrowhead=normal];']) + "}"
dot("clases_repository", cl, dpi=150)

# ------------------------------------------------------------ Replicación
rp = f'''digraph G {{ rankdir=LR; nodesep=0.4; ranksep=0.9; bgcolor="white"; {NODE} {EDGE}
app [label="Aplicación Flask\\n(escrituras y lecturas críticas)" shape=box];
rd [label="Consultas de solo lectura\\n(psql / reportes; la app v1 no las usa aún)" shape=box];
subgraph cluster_p {{ label="Servidor primario (puerto 5433)"; style="rounded,filled"; fillcolor="#E4EEF9"; color="{C700}"; {FONT}
  pg [label="PostgreSQL 16\\nPRIMARIO" shape=cylinder fillcolor="white"];
  wal [label="WAL\\n(registro de cambios)" shape=note fillcolor="#FFF4CC"]; }}
subgraph cluster_r {{ label="Servidor réplica (puerto 5434)"; style="rounded,filled"; fillcolor="#E4F3E9"; color="{C700}"; {FONT}
  rp [label="PostgreSQL 16\\nRÉPLICA (hot standby)" shape=cylinder fillcolor="white"]; }}
bk [label="pg_dump diario\\n(formato custom, 7 días)" shape=folder fillcolor="{CREMA}"];
app -> pg [label="INSERT / UPDATE"]; pg -> wal [label="escribe"]; wal -> rp [label="streaming asíncrono\\nslot replica1_slot\\nrole replicator (SCRAM)" style=bold]; rd -> rp [label="SELECT"]; pg -> bk [style=dashed label="respaldo"]; rp -> pg [label="promoción manual\\n(pg_promote / pg_ctl promote)" style=dotted constraint=false];
}}'''
dot("replicacion", rp)

# ------------------------------------------------------------ Flujo de navegación
fl = f'''digraph G {{ rankdir=LR; nodesep=0.3; ranksep=0.5; bgcolor="white"; {NODE} {EDGE}
login [label="Login\\n(correo + contraseña)" fillcolor="#FFF4CC"]; err [label="Mensaje genérico /\\nbloqueo tras 5 intentos" fillcolor="#FBE3E1" color="#B3261E"];
dash [label="Dashboard\\n(KPIs + alertas)"]; inv [label="Inventario\\n(Admin, Jefe, Almacenero)"]; mov [label="Modal: registrar\\ningreso / salida"];
prod [label="Producción\\n(todos los roles ven)"]; ord [label="Modal: nueva orden\\n+ vista previa BOM"]; ana [label="Analítica IA\\n(Admin, Jefe, Gerente)"];
usr [label="Usuarios\\n(solo Administrador)"]; aud [label="Auditoría\\n(solo Administrador)"]; out [label="Cerrar sesión" fillcolor="{CREMA}"];
login -> dash [label="éxito"]; login -> err [label="falla"]; err -> login;
dash -> inv; dash -> prod; dash -> ana; dash -> usr; dash -> aud; inv -> mov; prod -> ord; dash -> out;
}}'''
dot("flujo_navegacion", fl)

# ------------------------------------------------------------ Seguridad en capas
sg = f'''digraph G {{ rankdir=TB; nodesep=0.25; ranksep=0.35; bgcolor="white"; node [shape=box style="rounded,filled" fontname="Inter" fontsize=10 margin="0.2,0.08" width=6.4];
l1 [label="1. Transporte — HTTPS (TLS 1.2/1.3) · HSTS · cookies Secure" fillcolor="#E4EEF9"];
l2 [label="2. Perímetro — límite de tasa · CORS cerrado · cabeceras (CSP, X-Frame-Options, nosniff) · tamaño máx. de cuerpo" fillcolor="#E8F3EC"];
l3 [label="3. Identidad — bcrypt (cost 12) · JWT 15 min + refresh rotatorio HttpOnly · bloqueo por intentos" fillcolor="#FFF4CC"];
l4 [label="4. Autorización — RBAC por permiso (4 roles) · validación de entrada · consultas parametrizadas" fillcolor="#FBF0D6"];
l5 [label="5. Datos — AES-256-GCM en campos sensibles · SCRAM-SHA-256 · mínimo privilegio en BD" fillcolor="#F3E4C4"];
l6 [label="6. Trazabilidad — auditoría de solo-anexar (trigger) · respaldo y réplica" fillcolor="#FBE3E1"];
l1->l2->l3->l4->l5->l6 [arrowhead=none];
}}'''
dot("seguridad_capas", sg)
print("figuras 1 OK")
