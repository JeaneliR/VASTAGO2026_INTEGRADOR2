\set ON_ERROR_STOP off
BEGIN;
SELECT id, nombre, stock_actual FROM insumos WHERE id = 5;
INSERT INTO movimientos_inventario (insumo_id, tipo, cantidad, motivo, usuario_id) VALUES (5, 'INGRESO', 10, 'prueba trigger', 1);
SELECT id, nombre, stock_actual FROM insumos WHERE id = 5;
SAVEPOINT s1;
INSERT INTO movimientos_inventario (insumo_id, tipo, cantidad, motivo, usuario_id) VALUES (5, 'SALIDA', 99999, 'prueba CHECK', 1);
ROLLBACK TO s1;
INSERT INTO movimientos_inventario (insumo_id, tipo, cantidad, motivo, usuario_id) VALUES (5, 'XX', 1, 'prueba CHECK tipo', 1);
ROLLBACK TO s1;
UPDATE auditoria SET accion = 'X' WHERE id = 1;
ROLLBACK TO s1;
DELETE FROM auditoria WHERE id = 1;
ROLLBACK;
SELECT id, nombre, stock_actual FROM insumos WHERE id = 5;
SELECT count(*) AS movimientos FROM movimientos_inventario;
