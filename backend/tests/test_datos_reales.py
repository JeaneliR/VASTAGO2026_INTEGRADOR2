"""La carga de datos reales es aditiva e idempotente: segura de repetir en cada arranque del contenedor (Render)."""
import psycopg2

from app.config import Config


def _conteos():
    with psycopg2.connect(Config.DATABASE_URL) as conn, conn.cursor() as cur:
        cur.execute("SELECT (SELECT count(*) FROM produccion_historica), (SELECT count(*) FROM kardex_insumos), "
                    "(SELECT count(*) FROM kardex_movimientos), (SELECT count(*) FROM series_demanda), (SELECT count(*) FROM usuarios), "
                    "(SELECT count(*) FROM app_migraciones WHERE version = 'datos_reales_v1')")
        return cur.fetchone()


def test_migrar_dos_veces_no_duplica_ni_toca_usuarios(app):
    from app.migrate import main
    antes = _conteos()
    assert antes[:4] == (507, 44, 412, 3) and antes[5] == 1
    main(); main()
    assert _conteos() == antes


def test_pronostico_antiguo_se_reemplaza_sin_perder_otras_tablas(app):
    """Simula una base existente (p. ej. Render) que aún tiene el pronóstico simulado por producto."""
    from app.migrate import main
    with psycopg2.connect(Config.DATABASE_URL) as conn, conn.cursor() as cur:
        cur.execute("DROP TABLE pronosticos, demanda_historica, series_demanda, produccion_historica, kardex_movimientos, kardex_insumos CASCADE")
        cur.execute("CREATE TABLE demanda_historica (producto_id INT, mes DATE, kg NUMERIC)")
        cur.execute("CREATE TABLE pronosticos (producto_id INT, mes DATE, kg NUMERIC, mape NUMERIC, modelo TEXT)")
        cur.execute("DELETE FROM app_migraciones WHERE version = 'datos_reales_v1'")
    main()
    with psycopg2.connect(Config.DATABASE_URL) as conn, conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM information_schema.columns WHERE table_name = 'pronosticos' AND column_name = 'serie_id'")
        assert cur.fetchone()[0] == 1
    c = _conteos()
    assert c[:4] == (507, 44, 412, 3) and c[4] == 6 and c[5] == 1
