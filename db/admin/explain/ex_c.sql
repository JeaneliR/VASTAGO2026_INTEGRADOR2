\set QUIET on
\pset pager off
SET max_parallel_workers_per_gather = 0;
CREATE TEMP TABLE ses_t (LIKE sesiones INCLUDING DEFAULTS);
INSERT INTO ses_t (id, usuario_id, token_hash, expira_en, revocada, ip, user_agent)
SELECT g, 1 + g % 5, md5(g::text) || md5((g+1)::text), now() + interval '7 days', false, '127.0.0.1', 'x'
FROM generate_series(1, 200000) g;
ANALYZE ses_t;
SELECT md5('777') || md5('778') AS tok \gset
\echo '### C1 SIN indice (200 000 filas)'
EXPLAIN (ANALYZE) SELECT * FROM ses_t WHERE token_hash = :'tok' AND NOT revocada AND expira_en > now();
CREATE UNIQUE INDEX ses_t_tok ON ses_t(token_hash);
ANALYZE ses_t;
\echo '### C2 CON indice unico (literal sin tipo, como lo envia psycopg2)'
EXPLAIN (ANALYZE) SELECT * FROM ses_t WHERE token_hash = :'tok' AND NOT revocada AND expira_en > now();
