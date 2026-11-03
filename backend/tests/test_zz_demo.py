from app.db import transaction
from app.demo_data import cargar


def test_datos_ampliados_preservan_usuarios_e_invariantes(app):
    with app.app_context(), transaction() as cur:
        cur.execute('SELECT id,email,password_hash,activo FROM usuarios ORDER BY id');before=cur.fetchall()
        assert cargar(cur) is True
        cur.execute('SELECT id,email,password_hash,activo FROM usuarios ORDER BY id');assert cur.fetchall()==before
        cur.execute('SELECT count(*) AS n FROM insumos');assert cur.fetchone()['n']==20
        cur.execute('SELECT count(*) AS n FROM productos');assert cur.fetchone()['n']==10
        cur.execute("SELECT count(*) AS n FROM ordenes_produccion WHERE lote LIKE 'DEMO-%%'");assert cur.fetchone()['n']==46
        cur.execute("SELECT i.id FROM insumos i JOIN lotes_insumo l ON l.insumo_id=i.id GROUP BY i.id HAVING i.stock_actual<>sum(l.cantidad_disponible)")
        assert cur.fetchall()==[]
        assert cargar(cur) is False
