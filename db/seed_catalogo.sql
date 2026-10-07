-- Datos maestros de demostración (catálogo). Usuarios y órdenes los carga app/seed.py
INSERT INTO roles (id, nombre, descripcion) VALUES
 (1,'Administrador','Gestión de usuarios, auditoría y configuración'),
 (2,'Jefe de Producción','Órdenes de producción, inventario y analítica'),
 (3,'Almacenero','Registro de ingresos y salidas de insumos'),
 (4,'Gerente','Consulta de dashboard, alertas y analítica (solo lectura)'),
 (5,'Operario','Ejecuta etapas de producción: inicia, registra consumos por lote y cierra la etapa');

INSERT INTO insumos (nombre, categoria, unidad, stock_actual, stock_minimo, costo_unitario) VALUES
 ('Cacao en grano (San Martín)','Materia prima','kg',1240,900,18.50),
 ('Manteca de cacao','Materia prima','kg',180,220,32.00),
 ('Azúcar orgánica','Materia prima','kg',640,300,6.80),
 ('Leche en polvo','Materia prima','kg',95,150,21.00),
 ('Lecitina de soya','Materia prima','kg',40,25,14.00),
 ('Empaque tableta 100g','Empaque','unid.',3200,2000,0.45),
 ('Empaque bombón caja x6','Empaque','unid.',410,500,1.20),
 ('Maní tostado','Centro','kg',260,120,9.50),
 ('Pasas morenas','Centro','kg',180,100,14.00),
 ('Almendra entera','Centro','kg',90,60,38.00),
 ('Goma arábiga (glaseante)','Insumo auxiliar','kg',12,8,45.00),
 ('Bolsa gragea 200g','Empaque','unid.',1800,800,0.60);

-- Lotes de insumo: cada insumo se recibe en dos lotes (el saldo de los lotes suma el stock del insumo)
INSERT INTO lotes_insumo (insumo_id, codigo, proveedor, fecha_ingreso, fecha_vencimiento, cantidad_disponible)
SELECT i.id, v.codigo, v.prov, v.ingreso::date, v.vence::date, round(i.stock_actual * v.pct, 3)
  FROM (VALUES
   ('Cacao en grano (San Martín)','CAC-2026-07A','Cooperativa Cacaotera San Martín','2026-07-14','2027-07-14',0.55),
   ('Cacao en grano (San Martín)','CAC-2026-09A','Cooperativa Cacaotera San Martín','2026-09-02','2027-09-02',0.45),
   ('Manteca de cacao','MAN-2026-08A','Agroindustrias Amazónicas','2026-08-10','2027-08-10',0.60),
   ('Manteca de cacao','MAN-2026-09A','Agroindustrias Amazónicas','2026-09-05','2027-09-05',0.40),
   ('Azúcar orgánica','AZU-2026-07A','Azúcares del Norte','2026-07-20','2027-07-20',0.50),
   ('Azúcar orgánica','AZU-2026-09A','Azúcares del Norte','2026-09-01','2027-09-01',0.50),
   ('Leche en polvo','LEC-2026-08A','Lácteos Andinos','2026-08-18','2027-02-18',0.55),
   ('Leche en polvo','LEC-2026-09A','Lácteos Andinos','2026-09-04','2027-03-04',0.45),
   ('Lecitina de soya','LSO-2026-06A','Insumos Industriales SAC','2026-06-25','2027-06-25',1.00),
   ('Empaque tableta 100g','EMT-2026-08A','Empaques del Perú','2026-08-12',NULL,0.60),
   ('Empaque tableta 100g','EMT-2026-09A','Empaques del Perú','2026-09-03',NULL,0.40),
   ('Empaque bombón caja x6','EMB-2026-08A','Empaques del Perú','2026-08-12',NULL,1.00),
   ('Maní tostado','MNI-2026-08A','Frutos Secos del Sur','2026-08-25','2027-02-25',0.50),
   ('Maní tostado','MNI-2026-09A','Frutos Secos del Sur','2026-09-10','2027-03-10',0.50),
   ('Pasas morenas','PAS-2026-08A','Frutos Secos del Sur','2026-08-25','2027-08-25',0.60),
   ('Pasas morenas','PAS-2026-09A','Frutos Secos del Sur','2026-09-10','2027-09-10',0.40),
   ('Almendra entera','ALM-2026-09A','Frutos Secos del Sur','2026-09-10','2027-03-10',1.00),
   ('Goma arábiga (glaseante)','GOM-2026-08A','Insumos Industriales SAC','2026-08-30','2027-08-30',1.00),
   ('Bolsa gragea 200g','BGR-2026-09A','Empaques del Perú','2026-09-06',NULL,1.00)
  ) AS v(insumo, codigo, prov, ingreso, vence, pct)
  JOIN insumos i ON i.nombre = v.insumo;

INSERT INTO equipos (codigo, nombre, tipo) VALUES
 ('R-01','Refinadora de bolas R-01','Refinadora'),
 ('R-02','Refinadora de bolas R-02','Refinadora'),
 ('B-01','Bombo de grageado B-01','Bombo de grageado'),
 ('B-02','Bombo de abrillantado B-02','Bombo de abrillantado'),
 ('B-03','Bombo de grageado B-03','Bombo de grageado'),
 ('M-01','Línea de moldeo M-01','Moldeo'),
 ('E-01','Envasadora E-01','Envasadora');

INSERT INTO productos (codigo, nombre, tipo, precio, stock_minimo_pt, dias_vida_util, lleva_centro, centro_por_unidad, centro_etapa) VALUES
 ('TAB-070-100','Tableta 70% Cacao 100g','Tableta',12.90,100,365,FALSE,NULL,NULL),
 ('BOM-CJ6','Bombones Caja x6','Bombón',28.00,100,180,FALSE,NULL,NULL),
 ('TAB-REG-150','Tableta de Regalo 150g','Tableta',19.50,80,365,FALSE,NULL,NULL),
 ('GRG-CHO-200','Gragea de chocolate 200g','Gragea',15.90,120,270,TRUE,0.1000,2);

-- Rutas de proceso (etapas, horas estándar y tipo de equipo requerido)
INSERT INTO ruta_etapas (producto_id, secuencia, nombre, descripcion, horas_estandar, tipo_equipo)
SELECT p.id, v.sec, v.nombre, v.descr, v.horas, v.equipo FROM (VALUES
 ('Gragea de chocolate 200g',1,'Refinado','Refinado de la masa de chocolate (cacao, manteca, azúcar, leche) hasta la finura objetivo',8.0,'Refinadora'),
 ('Gragea de chocolate 200g',2,'Grageado','Aplicación de capas de chocolate sobre el centro seco en el bombo',6.0,'Bombo de grageado'),
 ('Gragea de chocolate 200g',3,'Abrillantado','Pulido y glaseado con goma arábiga para dar brillo y proteger la gragea',3.0,'Bombo de abrillantado'),
 ('Gragea de chocolate 200g',4,'Envasado','Pesado, envasado en bolsa de 200 g y codificación de lote',2.0,'Envasadora'),
 ('Tableta 70% Cacao 100g',1,'Refinado','Refinado de la masa de chocolate 70 %',8.0,'Refinadora'),
 ('Tableta 70% Cacao 100g',2,'Templado y moldeo','Templado, moldeo y enfriado',3.0,'Moldeo'),
 ('Tableta 70% Cacao 100g',3,'Envasado','Envoltura y empaque de tabletas',1.5,'Envasadora'),
 ('Tableta de Regalo 150g',1,'Refinado','Refinado de la masa de chocolate',8.0,'Refinadora'),
 ('Tableta de Regalo 150g',2,'Templado y moldeo','Templado, moldeo y enfriado',3.0,'Moldeo'),
 ('Tableta de Regalo 150g',3,'Envasado','Envoltura y empaque en estuche de regalo',2.0,'Envasadora'),
 ('Bombones Caja x6',1,'Refinado','Refinado de la masa de chocolate con leche',8.0,'Refinadora'),
 ('Bombones Caja x6',2,'Moldeo y relleno','Moldeo de cascarones y relleno',4.0,'Moldeo'),
 ('Bombones Caja x6',3,'Envasado','Armado y sellado de caja x6',2.0,'Envasadora')
) AS v(prod, sec, nombre, descr, horas, equipo) JOIN productos p ON p.nombre = v.prod;

INSERT INTO bom (producto_id, insumo_id, cantidad_por_unidad, etapa_secuencia)
SELECT p.id, i.id, v.c, v.etapa FROM (VALUES
 ('Tableta 70% Cacao 100g','Cacao en grano (San Martín)',0.065,1),
 ('Tableta 70% Cacao 100g','Manteca de cacao',0.018,1),
 ('Tableta 70% Cacao 100g','Azúcar orgánica',0.030,1),
 ('Tableta 70% Cacao 100g','Empaque tableta 100g',1,3),
 ('Bombones Caja x6','Cacao en grano (San Martín)',0.040,1),
 ('Bombones Caja x6','Manteca de cacao',0.020,1),
 ('Bombones Caja x6','Leche en polvo',0.015,1),
 ('Bombones Caja x6','Empaque bombón caja x6',1,3),
 ('Tableta de Regalo 150g','Cacao en grano (San Martín)',0.090,1),
 ('Tableta de Regalo 150g','Manteca de cacao',0.025,1),
 ('Tableta de Regalo 150g','Azúcar orgánica',0.040,1),
 ('Gragea de chocolate 200g','Cacao en grano (San Martín)',0.035,1),
 ('Gragea de chocolate 200g','Manteca de cacao',0.015,1),
 ('Gragea de chocolate 200g','Azúcar orgánica',0.025,1),
 ('Gragea de chocolate 200g','Leche en polvo',0.010,1),
 ('Gragea de chocolate 200g','Lecitina de soya',0.0005,1),
 ('Gragea de chocolate 200g','Goma arábiga (glaseante)',0.0040,3),
 ('Gragea de chocolate 200g','Bolsa gragea 200g',1,4)
) AS v(prod, ins, c, etapa)
JOIN productos p ON p.nombre = v.prod JOIN insumos i ON i.nombre = v.ins;

INSERT INTO alertas (nivel, titulo, detalle) VALUES
 ('crit','Leche en polvo bajo stock mínimo','95 kg disponibles (mínimo 150 kg). Reponer antes del 10/09 para el lote L-2026-015.'),
 ('warn','Manteca de cacao cerca del mínimo','180 kg disponibles (mínimo 220 kg).'),
 ('warn','Empaque bombón caja x6 bajo stock','410 unidades disponibles (mínimo 500).'),
 ('crit','Pico de demanda proyectado — Bombones Caja x6','El modelo predictivo estima +26% de demanda para diciembre. Planificar compra anticipada de insumos.');
