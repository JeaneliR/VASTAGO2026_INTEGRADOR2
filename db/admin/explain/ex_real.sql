\set QUIET on
\pset pager off
\echo '### Q1 historial de movimientos (MovimientoRepository.ultimos)'
EXPLAIN (ANALYZE, BUFFERS) SELECT m.id, m.tipo, m.cantidad::float AS cantidad, m.motivo, m.fecha, u.nombre AS usuario FROM movimientos_inventario m JOIN usuarios u ON u.id = m.usuario_id WHERE m.insumo_id = 1 ORDER BY m.fecha DESC LIMIT 20;
\echo '### Q2 listado de inventario con semaforo (v_inventario)'
EXPLAIN (ANALYZE, BUFFERS) SELECT id, nombre AS insumo, unidad, stock_actual::float AS stock, stock_minimo::float AS minimo, estado FROM v_inventario ORDER BY nombre;
\echo '### Q3 bloqueo de fila (FOR UPDATE por PK)'
BEGIN;
EXPLAIN (ANALYZE, BUFFERS) SELECT id, nombre, stock_actual FROM insumos WHERE id = 1 FOR UPDATE;
ROLLBACK;
\echo '### Q4 BOM de un producto'
EXPLAIN (ANALYZE, BUFFERS) SELECT i.id AS insumo_id, i.nombre AS insumo, b.cantidad_por_unidad::float, i.unidad FROM bom b JOIN insumos i ON i.id = b.insumo_id WHERE b.producto_id = 1 ORDER BY i.nombre;
\echo '### Q5 login: find_by_email (lower(email))'
EXPLAIN (ANALYZE, BUFFERS) SELECT u.*, r.nombre AS rol FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE lower(u.email) = lower('admin@vastagoyco.pe');
\echo '### Q6 refresh: buscar_valida(token_hash)'
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM sesiones WHERE token_hash = repeat('a',64) AND NOT revocada AND expira_en > now();
\echo '### Q7 ultimos 200 de auditoria'
EXPLAIN (ANALYZE, BUFFERS) SELECT id, fecha, email, accion, entidad, detalle, ip, exito FROM auditoria ORDER BY id DESC LIMIT 200;
\echo '### Q8 kpis: ordenes activas'
EXPLAIN (ANALYZE, BUFFERS) SELECT count(*) FILTER (WHERE estado='En proceso') AS en_proceso, count(*) FILTER (WHERE estado='Planificada') AS planificadas FROM ordenes_produccion;
