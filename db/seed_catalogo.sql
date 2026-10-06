-- Datos maestros de demostración (catálogo). Usuarios y órdenes los carga app/seed.py
INSERT INTO roles (id, nombre, descripcion) VALUES
 (1,'Administrador','Gestión de usuarios, auditoría y configuración'),
 (2,'Jefe de Producción','Órdenes de producción, inventario y analítica'),
 (3,'Almacenero','Registro de ingresos y salidas de insumos'),
 (4,'Gerente','Consulta de dashboard, alertas y analítica (solo lectura)');

INSERT INTO insumos (nombre, unidad, stock_actual, stock_minimo, costo_unitario) VALUES
 ('Cacao en grano (San Martín)','kg',1240,900,18.50),
 ('Manteca de cacao','kg',180,220,32.00),
 ('Azúcar orgánica','kg',640,300,6.80),
 ('Leche en polvo','kg',95,150,21.00),
 ('Lecitina de soya','kg',40,25,14.00),
 ('Empaque tableta 100g','unid.',3200,2000,0.45),
 ('Empaque bombón caja x6','unid.',410,500,1.20);

INSERT INTO productos (nombre, precio) VALUES
 ('Tableta 70% Cacao 100g',12.90),('Bombones Caja x6',28.00),('Tableta de Regalo 150g',19.50);

INSERT INTO bom (producto_id, insumo_id, cantidad_por_unidad)
SELECT p.id, i.id, v.c FROM (VALUES
 ('Tableta 70% Cacao 100g','Cacao en grano (San Martín)',0.065),
 ('Tableta 70% Cacao 100g','Manteca de cacao',0.018),
 ('Tableta 70% Cacao 100g','Azúcar orgánica',0.030),
 ('Tableta 70% Cacao 100g','Empaque tableta 100g',1),
 ('Bombones Caja x6','Cacao en grano (San Martín)',0.040),
 ('Bombones Caja x6','Manteca de cacao',0.020),
 ('Bombones Caja x6','Leche en polvo',0.015),
 ('Bombones Caja x6','Empaque bombón caja x6',1),
 ('Tableta de Regalo 150g','Cacao en grano (San Martín)',0.090),
 ('Tableta de Regalo 150g','Manteca de cacao',0.025),
 ('Tableta de Regalo 150g','Azúcar orgánica',0.040)
) AS v(prod, ins, c)
JOIN productos p ON p.nombre = v.prod JOIN insumos i ON i.nombre = v.ins;

INSERT INTO alertas (nivel, titulo, detalle) VALUES
 ('crit','Leche en polvo bajo stock mínimo','95 kg disponibles (mínimo 150 kg). Reponer antes del 10/09 para el lote L-2026-015.'),
 ('warn','Manteca de cacao cerca del mínimo','180 kg disponibles (mínimo 220 kg).'),
 ('warn','Empaque bombón caja x6 bajo stock','410 unidades disponibles (mínimo 500).'),
 ('crit','Pico de demanda proyectado — Bombones Caja x6','El modelo predictivo estima +26% de demanda para diciembre. Planificar compra anticipada de insumos.');
