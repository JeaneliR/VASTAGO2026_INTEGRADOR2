#!/usr/bin/env bash
# Respaldo lógico diario (pg_dump formato custom, comprimido) + prueba de restauración + verificación.
set -euo pipefail
H=${PGHOST:-127.0.0.1}; P=${PGPORT:-5433}; U=${PGUSER:-postgres}; DB=${PGDATABASE:-vastago}
OUT=${OUT:-./backups}; mkdir -p "$OUT"; F="$OUT/vastago_$(date +%Y%m%d_%H%M%S).dump"
pg_dump -h $H -p $P -U $U -Fc -Z 6 -f "$F" $DB && echo "Respaldo creado: $F ($(du -h "$F" | cut -f1))"
# Restauración en una BD temporal para verificar que el respaldo es utilizable
psql -h $H -p $P -U $U -d postgres -qc "DROP DATABASE IF EXISTS vastago_restore_test" -c "CREATE DATABASE vastago_restore_test"
pg_restore -h $H -p $P -U $U -d vastago_restore_test --no-owner "$F"
for T in usuarios insumos ordenes_produccion movimientos_inventario auditoria; do
  A=$(psql -h $H -p $P -U $U -d $DB -Atc "SELECT count(*) FROM $T")
  B=$(psql -h $H -p $P -U $U -d vastago_restore_test -Atc "SELECT count(*) FROM $T")
  printf "%-26s original=%s restaurada=%s %s\n" $T $A $B "$([ "$A" = "$B" ] && echo OK || echo DIFERENCIA)"
done
psql -h $H -p $P -U $U -d postgres -qc "DROP DATABASE vastago_restore_test"
# Retención: conservar 7 días
find "$OUT" -name 'vastago_*.dump' -mtime +7 -delete
