"""Crea el esquema y carga datos de demostración.   Uso:  python -m app.seed"""
import json, os, sys
from datetime import date
import psycopg2
from app import create_app
from app.config import Config
from app.security import hash_password, cifrar

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEMO_PASSWORD = os.environ.get("DEMO_PASSWORD", "Vastago#2026!")


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
                    ("Gerencia Vástago & Co", "gerente@vastagoyco.pe", "Gerente", None)]
        for nombre, email, rol, tel in usuarios:
            cur.execute("INSERT INTO usuarios (nombre,email,password_hash,rol_id,telefono_cifrado) "
                        "SELECT %s,%s,%s,id,%s FROM roles WHERE nombre=%s",
                        (nombre, email, hash_password(DEMO_PASSWORD), cifrar(tel) if tel else None, rol))
        cur.execute("SELECT id FROM usuarios WHERE email='jefe.produccion@vastagoyco.pe'")
        jefe = cur.fetchone()[0]
        ordenes = [("L-2026-012", "Tableta 70% Cacao 100g", 380, "2026-08-26", "Completada"),
                   ("L-2026-013", "Tableta de Regalo 150g", 220, "2026-08-28", "Completada"),
                   ("L-2026-014", "Tableta 70% Cacao 100g", 400, "2026-09-01", "En proceso"),
                   ("L-2026-015", "Bombones Caja x6", 150, "2026-09-02", "Planificada"),
                   ("L-2026-016", "Bombones Caja x6", 180, "2026-09-03", "Planificada")]
        for lote, prod, cant, fecha, estado in ordenes:
            cur.execute("INSERT INTO ordenes_produccion (lote,producto_id,cantidad,fecha_inicio,estado,creado_por) "
                        "SELECT %s,id,%s,%s,%s,%s FROM productos WHERE nombre=%s", (lote, cant, fecha, estado, jefe, prod))
        fc = json.load(open(os.path.join(ROOT, "ml-service", "forecast_output.json"), encoding="utf-8"))
        for prod, s in fc["series"].items():
            cur.execute("SELECT id FROM productos WHERE nombre=%s", (prod,)); pid = cur.fetchone()[0]
            for mes, kg in zip(fc["meses_hist"], s["historico"]):
                cur.execute("INSERT INTO demanda_historica VALUES (%s,%s,%s)", (pid, mes + "-01", kg))
            for mes, kg in zip(s["meses_forecast"], s["forecast"]):
                cur.execute("INSERT INTO pronosticos (producto_id,mes,kg,mape) VALUES (%s,%s,%s,%s)", (pid, mes + "-01", kg, s["mape"]))
        conn.commit(); conn.close()
    print("Base de datos inicializada. Usuarios demo (contraseña:", DEMO_PASSWORD + ")")
    for _, e, r, _ in usuarios:
        print(f"  {e:34s} {r}")


if __name__ == "__main__":
    main(if_empty="--if-empty" in sys.argv)
