"""Actualizaciones aditivas del esquema. Nunca recrea ni borra tablas."""
from pathlib import Path
import psycopg2
from app.config import Config


def upgrade(cur):
    cur.execute("SELECT pg_advisory_xact_lock(730202603)")
    path = Path(__file__).resolve().parents[2] / "db" / "upgrade_apf3.sql"
    cur.execute(path.read_text(encoding="utf-8"))


def main():
    with psycopg2.connect(Config.DATABASE_URL) as conn:
        with conn.cursor() as cur:
            upgrade(cur)
    print("Esquema APF3 actualizado sin reemplazar los datos.")


if __name__ == "__main__":
    main()
