-- Ejecutar en el servidor PRIMARIO (como superusuario)
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'CAMBIAR-EN-PRODUCCION';
-- postgresql.conf (primario):
--   wal_level = replica          max_wal_senders = 5
--   wal_keep_size = 256MB        hot_standby = on
--   archive_mode = on            archive_command = 'cp %p /var/lib/postgresql/wal_archive/%f'
-- pg_hba.conf (primario):
--   hostssl replication replicator <IP_REPLICA>/32 scram-sha-256
SELECT pg_create_physical_replication_slot('replica1_slot');
