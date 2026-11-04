"""Actualizaciones aditivas del esquema. Nunca recrea ni borra tablas."""
from pathlib import Path
import psycopg2
from app.config import Config


def upgrade(cur):
    cur.execute("SELECT pg_advisory_xact_lock(730202603)")
    path = Path(__file__).resolve().parents[2] / "db" / "upgrade_apf3.sql"
    cur.execute(path.read_text(encoding="utf-8"))
    from app.datos_reales import aplicar
    aplicar(cur)                      # histórico real de grageado, pronóstico y kardex de insumos (una sola vez)


def main():
    with psycopg2.connect(Config.DATABASE_URL) as conn:
        with conn.cursor() as cur:
            upgrade(cur)
    print("Esquema actualizado (APF3 y datos reales de planta) sin reemplazar los datos.")


if __name__ == "__main__":
    main()
