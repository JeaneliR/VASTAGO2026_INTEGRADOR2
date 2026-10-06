"""Pool de conexiones PostgreSQL y manejo transaccional (Unit of Work)."""
from contextlib import contextmanager
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool

_pool = None


def init_pool(dsn, minconn=1, maxconn=10):
    global _pool
    if _pool is None:
        _pool = ThreadedConnectionPool(minconn, maxconn, dsn, cursor_factory=RealDictCursor)
    return _pool


@contextmanager
def transaction():
    """Entrega un cursor dentro de una transacción: commit si todo sale bien, rollback si falla."""
    conn = _pool.getconn()
    try:
        with conn.cursor() as cur:
            yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _pool.putconn(conn)
