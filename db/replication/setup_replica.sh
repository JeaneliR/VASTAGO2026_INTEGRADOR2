#!/usr/bin/env bash
# Configura una réplica de lectura (streaming replication asíncrona) y la verifica.
# Uso (demo local):  PRIMARY_PORT=5433 REPLICA_PORT=5434 ./setup_replica.sh
set -euo pipefail
PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
BASE=${BASE:-/tmp/pg}; PP=${PRIMARY_PORT:-5433}; RP=${REPLICA_PORT:-5434}
export PGPASSWORD=postgres

# 1) Slot de replicación en el primario (evita que se descarte WAL que la réplica aún necesita)
psql -h 127.0.0.1 -p $PP -U postgres -tc "SELECT pg_create_physical_replication_slot('replica1_slot')" || true

# 2) Copia base física del primario (-R genera standby.signal y primary_conninfo)
rm -rf $BASE/replica
PGPASSWORD=repl-secret $PGBIN/pg_basebackup -h 127.0.0.1 -p $PP -U replicator -D $BASE/replica -R -X stream -S replica1_slot -P
chown -R postgres:postgres $BASE/replica && chmod 700 $BASE/replica

# 3) La réplica corre en otro puerto y en modo solo-lectura (hot_standby)
echo "port = $RP" >> $BASE/replica/postgresql.conf
su postgres -c "$PGBIN/pg_ctl -D $BASE/replica -l $BASE/replica.log -w start"
