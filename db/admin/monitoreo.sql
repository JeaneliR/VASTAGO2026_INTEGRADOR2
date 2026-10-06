\echo '=== 1. Conexiones activas por estado'
SELECT state, count(*) FROM pg_stat_activity WHERE datname='vastago' GROUP BY state;
\echo '=== 2. Tamaño de la base y de cada tabla'
SELECT pg_size_pretty(pg_database_size('vastago')) AS tamano_bd;
SELECT relname AS tabla, pg_size_pretty(pg_total_relation_size(relid)) AS tamano_total, n_live_tup AS filas
  FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 8;
\echo '=== 3. Ratio de aciertos de caché (objetivo > 99%)'
SELECT round(100.0 * blks_hit / NULLIF(blks_hit + blks_read, 0), 2) AS cache_hit_pct,
       xact_commit AS commits, xact_rollback AS rollbacks, deadlocks
  FROM pg_stat_database WHERE datname='vastago';
\echo '=== 4. Uso de índices'
SELECT relname AS tabla, indexrelname AS indice, idx_scan AS usos FROM pg_stat_user_indexes ORDER BY idx_scan DESC LIMIT 8;
\echo '=== 5. Dead tuples / último autovacuum'
SELECT relname, n_dead_tup, last_autovacuum, last_autoanalyze FROM pg_stat_user_tables ORDER BY n_dead_tup DESC LIMIT 5;
\echo '=== 6. Roles y privilegios (principio de mínimo privilegio)'
SELECT rolname, rolsuper, rolcreatedb, rolreplication, rolcanlogin FROM pg_roles WHERE rolname !~ '^pg_' ORDER BY 1;
\echo '=== 7. Cifrado de contraseñas del servidor'
SHOW password_encryption;
