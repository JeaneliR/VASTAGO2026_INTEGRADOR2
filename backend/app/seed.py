"""Crea el esquema y carga datos de demostración.   Uso:  python -m app.seed"""
import json, os, sys
from datetime import date, datetime, timedelta, timezone
import psycopg2
from psycopg2.extras import RealDictCursor
from app import create_app
from app.config import Config
from app.security import hash_password, cifrar
from app.services import planta_service as svc

LIMA = timezone(timedelta(hours=-5))


def ts(texto):
    return datetime.strptime(texto, "%Y-%m-%d %H:%M").replace(tzinfo=LIMA)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEMO_PASSWORD = os.environ.get("DEMO_PASSWORD", "Vastago#2026!")


HIST = [
    # Órdenes históricas: pasan por el MISMO servicio que la API (reglas, consumos por lote, lote de PT), con fechas pasadas.
    dict(lote="L-2026-012", producto="Tableta 70% Cacao 100g", cantidad=380, fecha="2026-08-26", producidas=372,
         lotes={"Cacao en grano (San Martín)": "CAC-2026-07A", "Manteca de cacao": "MAN-2026-08A", "Azúcar orgánica": "AZU-2026-07A",
                "Empaque tableta 100g": "EMT-2026-08A"},
         etapas=[(1, "operario1", "R-01", "2026-08-26 07:00", "2026-08-26 15:20", 1.2, "Finura dentro de especificación"),
                 (2, "operario2", "M-01", "2026-08-27 07:10", "2026-08-27 10:05", 0.4, None),
                 (3, "operario1", "E-01", "2026-08-27 10:30", "2026-08-27 11:55", 0.0, None)],
         despachos=[(150, "Tienda Miraflores", "2026-09-02 10:00"), (100, "Distribuidora Andina SAC", "2026-09-05 15:30")]),
    dict(lote="L-2026-013", producto="Tableta de Regalo 150g", cantidad=220, fecha="2026-08-28", producidas=216,
         lotes={"Cacao en grano (San Martín)": "CAC-2026-07A", "Manteca de cacao": "MAN-2026-08A", "Azúcar orgánica": "AZU-2026-07A"},
         etapas=[(1, "operario1", "R-02", "2026-08-28 07:00", "2026-08-28 15:45", 0.9, None),
                 (2, "operario2", "M-01", "2026-08-29 07:00", "2026-08-29 10:20", 0.3, "Cambio de molde a las 08:30"),
                 (3, "operario1", "E-01", "2026-08-29 11:00", "2026-08-29 13:10", 0.0, None)],
         despachos=[(80, "Bodega Surco", "2026-09-08 09:00")]),
    dict(lote="L-2026-014", producto="Tableta 70% Cacao 100g", cantidad=400, fecha="2026-09-01", producidas=None,
         lotes={"Cacao en grano (San Martín)": "CAC-2026-09A", "Manteca de cacao": "MAN-2026-09A", "Azúcar orgánica": "AZU-2026-09A"},
         etapas=[(1, "operario1", "R-01", "2026-09-01 07:00", "2026-09-01 15:10", 1.5, None),
                 (2, "operario2", "M-01", "2026-09-02 07:15", None, None, None)]),     # etapa 2 en curso
    dict(lote="L-2026-015", producto="Bombones Caja x6", cantidad=150, fecha="2026-09-02", producidas=None, lotes={}, etapas=[]),
    dict(lote="L-2026-016", producto="Bombones Caja x6", cantidad=180, fecha="2026-09-03", producidas=None, lotes={}, etapas=[]),
    dict(lote="L-2026-017", producto="Gragea de chocolate 200g", centro="Maní tostado", cantidad=300, fecha="2026-09-14", producidas=294,
         lotes={"Cacao en grano (San Martín)": "CAC-2026-09A", "Manteca de cacao": "MAN-2026-08A", "Azúcar orgánica": "AZU-2026-09A",
                "Leche en polvo": "LEC-2026-08A", "Lecitina de soya": "LSO-2026-06A", "Maní tostado": "MNI-2026-08A",
                "Goma arábiga (glaseante)": "GOM-2026-08A", "Bolsa gragea 200g": "BGR-2026-09A"},
         etapas=[(1, "operario1", "R-01", "2026-09-14 07:00", "2026-09-14 15:20", 1.1, "Refinado 8 h 20 min; sin observaciones de calidad"),
                 (2, "operario2", "B-01", "2026-09-15 07:30", "2026-09-15 14:00", 2.4, "Centro de maní: se descartaron granos quebrados"),
                 (3, "operario2", "B-02", "2026-09-15 14:30", "2026-09-15 17:40", 0.2, None),
                 (4, "operario1", "E-01", "2026-09-16 08:00", "2026-09-16 10:00", 0.0, None)],
         despachos=[(120, "Tienda Miraflores", "2026-09-20 11:00"), (60, "Distribuidora Andina SAC", "2026-09-24 16:00")]),
    dict(lote="L-2026-018", producto="Gragea de chocolate 200g", centro="Pasas morenas", cantidad=200, fecha="2026-09-21", producidas=196,
         lotes={"Cacao en grano (San Martín)": "CAC-2026-09A", "Manteca de cacao": "MAN-2026-09A", "Azúcar orgánica": "AZU-2026-09A",
                "Leche en polvo": "LEC-2026-09A", "Lecitina de soya": "LSO-2026-06A", "Pasas morenas": "PAS-2026-08A",
                "Goma arábiga (glaseante)": "GOM-2026-08A", "Bolsa gragea 200g": "BGR-2026-09A"},
         etapas=[(1, "operario1", "R-02", "2026-09-21 07:00", "2026-09-21 15:00", 0.8, None),
                 (2, "operario2", "B-01", "2026-09-22 07:30", "2026-09-22 13:20", 1.6, None),
                 (3, "operario2", "B-02", "2026-09-22 14:00", "2026-09-22 16:50", 0.1, None),
                 (4, "operario1", "E-01", "2026-09-23 08:00", "2026-09-23 09:45", 0.0, None)],
         despachos=[(50, "Bodega Surco", "2026-09-30 10:30")]),
    dict(lote="L-2026-019", producto="Gragea de chocolate 200g", centro="Almendra entera", cantidad=250, fecha="2026-10-05", producidas=None,
         lotes={"Cacao en grano (San Martín)": "CAC-2026-09A", "Manteca de cacao": "MAN-2026-09A", "Azúcar orgánica": "AZU-2026-09A",
                "Leche en polvo": "LEC-2026-09A", "Lecitina de soya": "LSO-2026-06A", "Almendra entera": "ALM-2026-09A"},
         etapas=[(1, "operario1", "R-01", "2026-10-05 07:00", "2026-10-05 15:05", 1.0, None),
                 (2, "operario2", "B-01", "2026-10-06 07:30", None, None, None)]),
]


def _historial_planta(conn, jefe_id):
    """Carga las órdenes de demostración usando las reglas reales de negocio (consumo por lote, cierre de etapas, lote de PT)."""
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT u.id, u.email, r.nombre AS rol FROM usuarios u JOIN roles r ON r.id = u.rol_id")
    por_email = {u["email"]: {"id": u["id"], "rol": u["rol"]} for u in cur.fetchall()}
    actores = {"jefe": por_email["jefe.produccion@vastagoyco.pe"], "operario1": por_email["operario1@vastagoyco.pe"],
               "operario2": por_email["operario2@vastagoyco.pe"], "almacen": por_email["almacen@vastagoyco.pe"]}
    cur.execute("SELECT id, codigo FROM equipos"); equipos = {e["codigo"]: e["id"] for e in cur.fetchall()}
    cur.execute("SELECT id, nombre FROM productos"); productos = {p["nombre"]: p["id"] for p in cur.fetchall()}
    cur.execute("SELECT id, nombre FROM insumos"); insumos = {i["nombre"]: i["id"] for i in cur.fetchall()}
    cur.execute("SELECT l.id, i.nombre, l.codigo FROM lotes_insumo l JOIN insumos i ON i.id = l.insumo_id")
    lotes = {(l["nombre"], l["codigo"]): l["id"] for l in cur.fetchall()}
    from app.repositories.planta import EtapaRepository

    for h in HIST:
        o = svc.crear_orden(cur, productos[h["producto"]], h["cantidad"], insumos[h["centro"]] if h.get("centro") else None,
                            actores["jefe"], hoy=date.fromisoformat(h["fecha"]), lote=h["lote"])
        plan = EtapaRepository(cur).insumos_planificados(o["id"])
        for seq, quien, eq, ini, fin, merma, obs in h["etapas"]:
            actor = actores[quien]
            svc.iniciar_etapa(cur, o["id"], seq, actor, actor["id"], equipos[eq], ahora=ts(ini))
            for p in (x for x in plan if x["secuencia"] == seq and fin):      # etapa en curso: aún sin consumos registrados
                lote_id = lotes[(p["insumo"], h["lotes"][p["insumo"]])]
                # Reposición previa: el stock de partida del catálogo ya refleja este consumo histórico
                cur.execute("UPDATE lotes_insumo SET cantidad_disponible = cantidad_disponible + %s WHERE id = %s", (p["planificado"], lote_id))
                cur.execute("UPDATE insumos SET stock_actual = stock_actual + %s WHERE id = %s", (p["planificado"], p["insumo_id"]))
                svc.registrar_consumo(cur, o["id"], seq, lote_id, p["planificado"], actor, ahora=ts(ini) + timedelta(minutes=20))
            if fin:
                ultima = seq == len(EtapaRepository(cur).detalle(o["id"]))
                svc.finalizar_etapa(cur, o["id"], seq, actor, merma, obs, h["producidas"] if ultima else None, ahora=ts(fin))
        for cant, destino, cuando in h.get("despachos", []):
            cur.execute("SELECT id FROM lotes_pt WHERE codigo = %s", (h["lote"],))
            svc.despachar_pt(cur, cur.fetchone()["id"], cant, destino, "Despacho a cliente", actores["almacen"], ahora=ts(cuando))
    cur.close()


def main(if_empty=False):
    app = create_app({"RATELIMIT_ENABLED": False})
    with app.app_context():
        conn = psycopg2.connect(Config.DATABASE_URL)
        conn.autocommit = False
        cur = conn.cursor()
        if if_empty:                       # despliegues: nunca borrar datos existentes
            cur.execute("SELECT to_regclass('public.usuarios') IS NOT NULL")
            if cur.fetchone()[0]:
                cur.execute("SELECT count(*) FROM usuarios")
                if cur.fetchone()[0] > 0:
                    print("La base de datos ya contiene datos: no se modifica."); conn.close(); return
        for f in ("schema.sql", "seed_catalogo.sql"):
            cur.execute(open(os.path.join(ROOT, "db", f), encoding="utf-8").read())
        usuarios = [("Jeaneli Caso Valenzuela", "jefe.produccion@vastagoyco.pe", "Jefe de Producción", "987654321"),
                    ("Arnold Lujan Aderiano", "admin@vastagoyco.pe", "Administrador", "987654322"),
                    ("Luis Matamoros Ylizarbe", "almacen@vastagoyco.pe", "Almacenero", "987654323"),
                    ("Gerencia Vástago & Co", "gerente@vastagoyco.pe", "Gerente", None),
                    ("Operario de Refinado y Envasado", "operario1@vastagoyco.pe", "Operario", "987654324"),
                    ("Operario de Grageado y Abrillantado", "operario2@vastagoyco.pe", "Operario", "987654325")]
        for nombre, email, rol, tel in usuarios:
            cur.execute("INSERT INTO usuarios (nombre,email,password_hash,rol_id,telefono_cifrado) "
                        "SELECT %s,%s,%s,id,%s FROM roles WHERE nombre=%s",
                        (nombre, email, hash_password(DEMO_PASSWORD), cifrar(tel) if tel else None, rol))
        cur.execute("SELECT id FROM usuarios WHERE email='jefe.produccion@vastagoyco.pe'")
        jefe = cur.fetchone()[0]
        _historial_planta(conn, jefe)
        fc = json.load(open(os.path.join(ROOT, "ml-service", "forecast_output.json"), encoding="utf-8"))
        for prod, s in fc["series"].items():
            cur.execute("SELECT id FROM productos WHERE nombre=%s", (prod,)); pid = cur.fetchone()[0]
            for mes, kg in zip(fc["meses_hist"], s["historico"]):
                cur.execute("INSERT INTO demanda_historica VALUES (%s,%s,%s)", (pid, mes + "-01", kg))
            for mes, kg in zip(s["meses_forecast"], s["forecast"]):
                cur.execute("INSERT INTO pronosticos (producto_id,mes,kg,mape) VALUES (%s,%s,%s,%s)", (pid, mes + "-01", kg, s["mape"]))
        conn.commit(); conn.close()
    print("Base de datos inicializada. Usuarios demo (la contraseña es la de la variable DEMO_PASSWORD):")
    for _, e, r, _ in usuarios:
        print(f"  {e:34s} {r}")


if __name__ == "__main__":
    main(if_empty="--if-empty" in sys.argv)
