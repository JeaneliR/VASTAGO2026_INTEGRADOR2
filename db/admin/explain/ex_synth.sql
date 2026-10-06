\set QUIET on
\pset pager off
SET max_parallel_workers_per_gather = 0;
-- Tabla TEMPORAL (solo existe en esta sesion; no toca datos reales ni genera WAL)
CREATE TEMP TABLE mov_t (LIKE movimientos_inventario);
INSERT INTO mov_t (id, insumo_id, tipo, cantidad, motivo, usuario_id, fecha)
SELECT g, 1 + (g % 7), (ARRAY['INGRESO','SALIDA','SALIDA'])[1 + g % 3], 1 + (g % 50), 'carga sintetica', 1,
       now() - (g || ' minutes')::interval
FROM generate_series(1, 300000) g;
ANALYZE mov_t;
SELECT count(*) AS filas_mov_t FROM mov_t;
\echo '### A1 SIN indice (300 000 filas)'
EXPLAIN (ANALYZE, BUFFERS) SELECT id, tipo, cantidad, motivo, fecha FROM mov_t WHERE insumo_id = 3 ORDER BY fecha DESC LIMIT 20;
CREATE INDEX ix_mov_t ON mov_t(insumo_id, fecha DESC);
ANALYZE mov_t;
\echo '### A2 CON indice compuesto (insumo_id, fecha DESC)'
EXPLAIN (ANALYZE, BUFFERS) SELECT id, tipo, cantidad, motivo, fecha FROM mov_t WHERE insumo_id = 3 ORDER BY fecha DESC LIMIT 20;

CREATE TEMP TABLE aud_t (LIKE auditoria);
INSERT INTO aud_t (id, usuario_id, email, accion, entidad, detalle, ip, exito, fecha)
SELECT g, 1, 'x@y.pe', 'LOGIN_OK', 'usuarios', '{}', '127.0.0.1', true, now() - (g || ' seconds')::interval
FROM generate_series(1, 500000) g;
ALTER TABLE aud_t ADD PRIMARY KEY (id);
ANALYZE aud_t;
\echo '### B1 auditoria: rango de fechas (ultimas 2 horas) SIN indice por fecha'
EXPLAIN (ANALYZE, BUFFERS) SELECT id, fecha, accion FROM aud_t WHERE fecha >= now() - interval '2 hours' ORDER BY fecha DESC;
CREATE INDEX ix_aud_t_fecha ON aud_t(fecha DESC);
ANALYZE aud_t;
\echo '### B2 auditoria: mismo rango CON indice por fecha'
EXPLAIN (ANALYZE, BUFFERS) SELECT id, fecha, accion FROM aud_t WHERE fecha >= now() - interval '2 hours' ORDER BY fecha DESC;
\echo '### B3 auditoria: ultimos 200 por PK (consulta real del sistema)'
EXPLAIN (ANALYZE, BUFFERS) SELECT id, fecha, email, accion FROM aud_t ORDER BY id DESC LIMIT 200;

CREATE TEMP TABLE ses_t (LIKE sesiones INCLUDING DEFAULTS);
INSERT INTO ses_t (id, usuario_id, token_hash, expira_en, revocada, ip, user_agent)
SELECT g, 1 + g % 5, md5(g::text) || md5((g+1)::text), now() + interval '7 days', (g % 10 <> 0), '127.0.0.1', 'x'
FROM generate_series(1, 200000) g;
ANALYZE ses_t;
\echo '### C1 sesiones: buscar_valida SIN indice unico (200 000 filas)'
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM ses_t WHERE token_hash = md5('777'::text)||md5('778'::text) AND NOT revocada AND expira_en > now();
CREATE UNIQUE INDEX ses_t_tok ON ses_t(token_hash);
ANALYZE ses_t;
\echo '### C2 sesiones: CON indice unico (equivalente a sesiones_token_hash_key)'
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM ses_t WHERE token_hash = md5('777'::text)||md5('778'::text) AND NOT revocada AND expira_en > now();
