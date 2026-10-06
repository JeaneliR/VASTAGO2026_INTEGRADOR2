#!/usr/bin/env python3
"""Verifica la consistencia modelo (diagrama ER) <-> BD real <-> script db/schema.sql.

1) Lee las tablas y columnas dibujadas en docs/build/assets/er_fisico.dot (fuente de la figura ER)
   y las compara con information_schema / pg_constraint de la BD en ejecución.
2) Crea una BD temporal desde db/schema.sql y compara columnas, restricciones, índices, vista y
   triggers con la BD real; la elimina al terminar.
Uso: PGPASSWORD=... python3 db/admin/verificar_modelo_er.py   (PGHOST/PGPORT/PGUSER/PGDATABASE opcionales)
"""
import os, re, subprocess, sys
H, P, U, DB = (os.environ.get(k, d) for k, d in (("PGHOST", "127.0.0.1"), ("PGPORT", "5433"), ("PGUSER", "postgres"), ("PGDATABASE", "vastago")))
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
TMP = DB + "_chk"

def sql(db, consulta=None, archivo=None):
    cmd = ["psql", "-h", H, "-p", P, "-U", U, "-d", db, "-At", "-F", "|", "-q"]
    cmd += ["-f", archivo] if archivo else ["-c", consulta]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stderr)
    return [l.split("|") for l in r.stdout.strip().split("\n") if l]

COLS = ("select c.table_name, c.column_name, format_type(a.atttypid, a.atttypmod), c.is_nullable "
        "from information_schema.columns c join information_schema.tables t using (table_schema, table_name) "
        "join pg_attribute a on a.attrelid = ('public.' || c.table_name)::regclass and a.attname = c.column_name "
        "where c.table_schema = 'public' and t.table_type = 'BASE TABLE' order by c.table_name, c.ordinal_position")
CONS = ("select conrelid::regclass::text, contype::text, pg_get_constraintdef(oid) from pg_constraint "
        "where connamespace = 'public'::regnamespace order by 1, 2, 3")
IDX = "select indexdef from pg_indexes where schemaname = 'public' order by 1"
VISTA = "select pg_get_viewdef('v_inventario'::regclass)"
TRG = "select pg_get_triggerdef(oid) from pg_trigger where not tgisinternal order by 1"

# ---- 1. diagrama ER (.dot) -> {tabla: [(columna, tipo_dibujado, es_pk, es_fk)]}
dot = open(os.path.join(RAIZ, "docs", "build", "assets", "er_fisico.dot"), encoding="utf-8").read()
er = {}
for m in re.finditer(r"^(\w+) \[shape=plain label=<(.*?)>\];$", dot, re.M | re.S):
    filas = []
    for tr in re.findall(r"<TR>(.*?)</TR>", m.group(2)):
        tds = re.findall(r"<TD[^>]*>(.*?)</TD>", tr)
        if len(tds) == 2:
            izq = re.sub(r"<[^>]+>", " ", tds[0]).split()
            filas.append((izq[-1], re.sub(r"<[^>]+>", "", tds[1]).split(" ")[0], izq[0] == "PK", izq[0] == "FK"))
    er[m.group(1)] = filas
bd = {}
for t, c, ty, nul in sql(DB, COLS):
    bd.setdefault(t, []).append((c, ty))
pk, fk = {}, {}
for t, c, tipo in sql(DB, "select conrelid::regclass::text, a.attname, contype::text from pg_constraint k join pg_attribute a "
                         "on a.attrelid = k.conrelid and a.attnum = any(k.conkey) "
                         "where contype in ('p','f') and connamespace = 'public'::regnamespace"):
    (pk if tipo == "p" else fk).setdefault(t, set()).add(c)
MAPA = {"serial": "integer", "bigserial": "bigint", "int": "integer", "smallint": "smallint", "bigint": "bigint",
        "boolean": "boolean", "date": "date", "jsonb": "jsonb", "bytea": "bytea", "timestamptz": "timestamp with time zone"}
def tipo_ok(dib, real):
    d = dib.lower()
    if d in MAPA: return MAPA[d] == real
    if d.startswith("varchar"): return real == "character varying" + d[7:]
    if d.startswith("char("): return real == "character" + d[4:]
    if d.startswith("numeric"): return real == d
    return None   # enumeración dibujada como lista de valores del CHECK

print("### Verificación modelo ER <-> BD '%s' (PostgreSQL %s:%s)" % (DB, H, P))
print("%-24s %5s %5s %6s %8s %8s" % ("tabla", "c.ER", "c.BD", "tipos", "PK", "FK(ER/BD)"))
tot_er = tot_bd = tot_tipos = tot_enum = tot_fkdib = 0
for t in sorted(er):
    nombres = [c[0] for c in er[t]]; reales = [c[0] for c in bd.get(t, [])]
    ok_tipos = [tipo_ok(c[1], dict(bd[t])[c[0]]) for c in er[t] if c[0] in dict(bd.get(t, []))]
    tot_er += len(nombres); tot_bd += len(reales)
    tot_tipos += sum(1 for x in ok_tipos if x); tot_enum += sum(1 for x in ok_tipos if x is None)
    fk_er = {c[0] for c in er[t] if c[3]}; fk_bd = fk.get(t, set()); tot_fkdib += len(fk_er)
    pk_ok = {c[0] for c in er[t] if c[2]} == pk.get(t, set())
    print("%-24s %5d %5d %6s %8s %8s" % (t, len(nombres), len(reales), "OK" if nombres == reales and False not in ok_tipos else "DIF",
                                         "OK" if pk_ok else "DIF", "%d/%d" % (len(fk_er), len(fk_bd))))
print("TOTAL columnas ER=%d BD=%d; tipos iguales=%d; enumeraciones=%d; tablas ER=%d BD=%d" % (tot_er, tot_bd, tot_tipos, tot_enum, len(er), len(bd)))
print("FK reales=%d (clave foránea total en pg_constraint); relaciones dibujadas=%s" % (sum(len(v) for v in fk.values()),
      len(re.findall(r"->", dot.split("roles -> usuarios")[1])) + 1))

# ---- 2. BD temporal construida con db/schema.sql
sql("postgres", "DROP DATABASE IF EXISTS %s" % TMP); sql("postgres", "CREATE DATABASE %s" % TMP)
try:
    sql(TMP, archivo=os.path.join(RAIZ, "db", "schema.sql"))
    print("\n### Verificación BD real <-> script db/schema.sql (BD temporal '%s')" % TMP)
    for nombre, q in (("columnas", COLS), ("restricciones", CONS), ("índices", IDX), ("vista (líneas de DDL)", VISTA), ("triggers", TRG)):
        a, b = sql(DB, q), sql(TMP, q)
        print("%-20s real=%3d script=%3d  %s" % (nombre, len(a), len(b), "IDENTICO" if a == b else "DIFERENTE"))
finally:
    sql("postgres", "DROP DATABASE IF EXISTS %s" % TMP)
