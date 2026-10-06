// Capítulo 8 — Implementación y Administración de Base de Datos (APF2)
// Todo lo afirmado sale de /home/claude/vastago-sistema (db/, backend/app/repositories, evidencias/01–03, 06–08) y de consultas
// ejecutadas contra el PostgreSQL 16.15 local (puerto 5433). Ver BIBLIA.md.
const fs = require("fs");
const path = require("path");

module.exports = (g) => {
  const { H1, H2, H3, P, bullets, numbered, fig, table, code, note, AlignmentType } = g;
  const REPO = path.join(__dirname, "..", "..");
  const LEFT = AlignmentType.LEFT, CENTER = AlignmentType.CENTER;

  // Tablas en texto plano (el código en línea dentro de celdas pequeñas se renderiza más grande que el texto).
  const T = (h, rows, o) => table(h.map((x) => String(x).replace(/`/g, "")), rows.map((r) => r.map((c) => String(c).replace(/`/g, ""))), o);

  // Ajusta una línea larga en el último espacio antes de `w` columnas (solo presentación).
  const wrap = (ln, w) => {
    if (ln.length <= w) return [ln];
    const ind = ln.match(/^\s*/)[0];
    let cut = ln.lastIndexOf(" ", w);
    if (cut <= ind.length) cut = w;
    return [ln.slice(0, cut), ...wrap(ind + "    " + ln.slice(cut).trimStart(), w)];
  };
  // Extrae líneas REALES de un archivo del repositorio, con su número original en el margen.
  const src = (rel, ranges, o = {}) => {
    const lines = fs.readFileSync(path.join(REPO, rel), "utf8").split("\n");
    const gut = o.gutter !== false, w = gut ? 88 : 93, out = [];
    ranges.forEach(([a, b], i) => {
      if (i > 0) out.push(gut ? "     ..." : "...");
      for (let n = a; n <= b; n++) wrap(lines[n - 1].replace(/\s+$/, ""), w).forEach((l, k) => out.push((gut ? (k === 0 ? String(n).padStart(3) + "  " : "     ") : "") + l));
    });
    return out.join("\n");
  };
  // Bloque de código numerado con descripción en el texto, ruta/líneas como fuente (Código N. Título).
  const cod = (text, title, id, source) => {
    text.split("\n").forEach((l, i) => { if (l.length > 95) throw new Error(`cap8: línea de código >95 (${l.length}) en "${title}", línea ${i + 1}: ${l}`); });
    return [...code(text, { title, id, size: 15 }), P("Fuente: " + source, { size: 18, color: "6B5B4B", align: CENTER, after: 160 })];
  };

  return [
    H1("8. Implementación y Administración de Base de Datos"),
    P("Este capítulo describe la base de datos del sistema desde tres ángulos: cómo está diseñada físicamente y por qué (sección 8.1), cómo se respalda, se replica y se vigila (sección 8.2) y cómo la aplicación accede a ella mediante el patrón Repository (sección 8.3). Las verificaciones de este capítulo se ejecutaron el 06-oct-2026 contra el PostgreSQL 16.15 de desarrollo (puerto 5433, base `vastago`); los resultados completos están en `evidencias/` y los guiones en `db/`. Lo que ya se explicó en el capítulo 7 (la transacción de completar una orden, el texto del trigger de stock, los planes `EXPLAIN ANALYZE` y la tabla de índices) no se repite aquí: se remite a esas secciones."),
    note("**Alcance y honestidad técnica.** La replicación y la conmutación (failover) se demostraron en el entorno local del equipo con dos y tres instancias de PostgreSQL. En Render, con el plan gratuito, **no existe réplica** ni respaldos automáticos (ver {tab:render_ha}); el despliegue real queda pendiente (capítulo 11). El respaldo `pg_dump` está implementado como script ejecutable y verificado, pero su **programación diaria** y el **archivado de WAL** (recuperación a un punto en el tiempo) son propuestas aún no activadas: en la instancia local `archive_mode` está en `off`. Además, al verificar el entorno la réplica estaba detenida (su slot figuraba inactivo), de modo que las cifras de replicación provienen de la sesión registrada en `evidencias/01` y `07`."),

    // ===================================================================== 8.1
    H2("8.1 Diseño físico de base de datos"),
    P("El modelo físico del sistema está definido en un único script, `db/schema.sql` (172 líneas), que crea **12 tablas**, **1 vista** (`v_inventario`), **2 funciones con sus triggers** (`fn_aplicar_movimiento` y `fn_bloquear_auditoria`), **41 restricciones** (12 claves primarias, 12 foráneas, 6 únicas y 11 CHECK) y **24 índices** (12 de clave primaria, 6 de restricciones únicas y 6 explícitos). La {fig:er} muestra el diagrama entidad-relación físico, con los tipos de dato y las claves tal como se declaran en el script."),
    ...fig("assets/er_fisico_compacto.png", "Diagrama entidad-relación físico de la base de datos vastago (PostgreSQL 16)", { id: "er", width: 610,
      desc: "Doce tablas agrupadas por función: seguridad (roles, usuarios, sesiones, auditoria), inventario (insumos, movimientos_inventario), producción (productos, bom, ordenes_produccion) y analítica (alertas, demanda_historica, pronosticos). Cada línea es una clave foránea (1 a N).",
      source: "Elaboración propia a partir de db/schema.sql (fuente del diagrama: docs/build/assets/er_fisico.dot; la imagen usa el mismo archivo con menor separación entre tablas)." }),
    H3("Tablas, claves, restricciones e índices"),
    P("La {tab:tablas_fisico} resume cada tabla con su propósito y con las claves, restricciones e índices que declara el script. Las tablas están normalizadas hasta tercera forma normal; la única desnormalización deliberada es `insumos.stock_actual`, un saldo materializado que mantiene el trigger a partir de los movimientos (se justifica más adelante). `bom` es la tabla asociativa de la relación muchos a muchos entre productos e insumos, y su clave primaria compuesta impide duplicar un insumo dentro de la misma receta."),
    ...T(["Tabla", "Propósito", "PK", "FK (al borrar)", "UNIQUE / CHECK", "Índices explícitos"], [
      ["roles", "Catálogo de los 4 roles del RBAC.", "id", "—", "UQ nombre", "—"],
      ["usuarios", "Cuentas: hash bcrypt, teléfono cifrado, bloqueo por intentos.", "id", "rol_id → roles", "UQ email; CHECK formato de correo", "ix_usuarios_rol"],
      ["sesiones", "Refresh tokens (solo el hash SHA-256).", "id", "usuario_id → usuarios (CASCADE)", "UQ token_hash", "ix_sesiones_usuario (parcial: NOT revocada)"],
      ["insumos", "Materias primas y su saldo de stock.", "id", "—", "UQ nombre; CHECK stock_actual, stock_minimo, costo_unitario >= 0", "—"],
      ["movimientos_inventario", "Kárdex: INGRESO, SALIDA y AJUSTE.", "id", "insumo_id, usuario_id, orden_id (sin acción: RESTRICT)", "CHECK tipo en (INGRESO, SALIDA, AJUSTE); CHECK cantidad > 0", "ix_mov_insumo_fecha (insumo_id, fecha DESC)"],
      ["productos", "Catálogo de productos terminados.", "id", "—", "UQ nombre; CHECK precio >= 0", "—"],
      ["bom", "Receta: cantidad de insumo por unidad de producto.", "(producto_id, insumo_id)", "producto_id (CASCADE), insumo_id", "CHECK cantidad por unidad > 0", "—"],
      ["ordenes_produccion", "Órdenes y su estado (Planificada, En proceso, Completada).", "id", "producto_id, creado_por (RESTRICT)", "UQ lote; CHECK cantidad > 0; CHECK estado", "ix_ordenes_estado"],
      ["alertas", "Alertas mostradas en el dashboard.", "id", "—", "CHECK nivel en (crit, warn)", "—"],
      ["demanda_historica", "Serie mensual de demanda (kg) por producto.", "(producto_id, mes)", "producto_id (CASCADE)", "—", "—"],
      ["pronosticos", "Pronóstico a 3 meses, MAPE y modelo.", "(producto_id, mes)", "producto_id (CASCADE)", "—", "—"],
      ["auditoria", "Bitácora de solo anexar (trigger de inmutabilidad).", "id", "usuario_id → usuarios (SET NULL)", "Trigger BEFORE UPDATE OR DELETE", "ix_auditoria_fecha, ix_auditoria_usuario"],
    ], { id: "tablas_fisico", title: "Tablas del modelo físico: propósito, claves, restricciones e índices", widths: [2.5, 1.8, 1.6, 1.7, 1.9, 2.1], size: 15, hsize: 17,
      source: "db/schema.sql; conteos verificados con pg_constraint y pg_indexes (evidencias/08_consistencia_modelo_bd.txt)." }),
    P("Además, la vista `v_inventario` expone el semáforo de cada insumo (`crit` si el stock está por debajo del mínimo, `warn` si está a menos de 1.2 veces el mínimo y `ok` en otro caso), de modo que la regla de alerta vive en un solo lugar de la base y la consumen tanto el listado de inventario como los KPIs."),
    H3("Decisiones de diseño y su justificación"),
    P("La {tab:decisiones_fisico} recoge las decisiones físicas más relevantes. Los fragmentos del script que las implementan se muestran en el {cod:ddl}; el trigger `fn_aplicar_movimiento` ya se detalló en el {cod:trigger} del capítulo 7."),
    ...T(["Decisión", "Dónde se aplica", "Justificación y límite"], [
      ["NUMERIC en lugar de FLOAT", "stock_actual NUMERIC(12,3); costo_unitario y precio NUMERIC(10,2); bom NUMERIC(10,4).", "Aritmética decimal exacta para saldos y costos; 3 decimales equivalen a gramos cuando la unidad es kg. Límite: los repositorios convierten con ::float solo para el JSON y el consumo de una orden se calcula en Python con float redondeado a 3 decimales; usar Decimal es una mejora pendiente."],
      ["TIMESTAMPTZ en todas las marcas de tiempo", "fecha, creado_en, expira_en, bloqueado_hasta, etc.", "Guarda un instante absoluto (UTC) y evita ambigüedades si el servidor, la réplica o el cliente están en zonas horarias distintas."],
      ["CHECK en la base, no solo en la aplicación", "11 restricciones CHECK (stock no negativo, cantidad > 0, estados válidos).", "La regla protege el dato aunque otro cliente escriba directamente. Evidenciado el 06-oct con una salida de 99,999 kg rechazada (evidencias/06_integridad_trigger.txt)."],
      ["Trigger fn_aplicar_movimiento", "AFTER INSERT en movimientos_inventario.", "El saldo cambia en la misma transacción que el movimiento, sin depender de que la aplicación recuerde actualizarlo. Costo: cada insumo es una fila caliente, por eso las rutas la bloquean con SELECT ... FOR UPDATE."],
      ["Vista v_inventario", "InsumoRepository.listar y obtener; KPI de quiebres.", "Una sola definición del semáforo; cambiar el umbral 1.2 es una modificación de la vista y no del código."],
      ["Teléfono cifrado en BYTEA", "usuarios.telefono_cifrado (nonce || texto cifrado || etiqueta AES-256-GCM).", "El cifrado ocurre en la aplicación y la clave vive en una variable de entorno, no en la base: un respaldo o una réplica contienen solo texto cifrado. Límite: no se puede buscar por teléfono."],
      ["Auditoría inmutable", "Trigger BEFORE UPDATE OR DELETE en auditoria que lanza una excepción.", "Impide que la aplicación o una inyección SQL borre o altere evidencia (integridad y no repudio). Límites verificados el 06-oct: el trigger de fila no intercepta TRUNCATE y el rol de la aplicación es propietario de la tabla (ver advertencia siguiente)."],
      ["Política de borrado en cascada y restringida", "CASCADE en sesiones, bom, demanda_historica y pronosticos; RESTRICT en movimientos y órdenes; SET NULL en auditoria.", "Lo derivado desaparece con su padre; la historia contable y de producción no se pierde. Consecuencia verificada: borrar un usuario con eventos de auditoría falla (SET NULL intenta un UPDATE bloqueado por el trigger), por lo que los usuarios se desactivan (columna activo) y no se eliminan."],
      ["Claves SERIAL / BIGSERIAL", "SERIAL en catálogos; BIGSERIAL en movimientos, sesiones y auditoria.", "Enteros de 32 bits bastan para catálogos y de 64 bits para tablas que crecen sin límite. Migrar a columnas de identidad (GENERATED ... AS IDENTITY, recomendadas por el estándar SQL) es una mejora menor."],
    ], { id: "decisiones_fisico", title: "Decisiones de diseño físico, ubicación en el esquema y límites", widths: [2.0, 2.6, 5.0], size: 16, hsize: 17,
      source: "db/schema.sql y pruebas del 06-oct-2026 (evidencias/06 y 08)." }),
    ...cod(src("db/schema.sql", [[48, 56], [125, 134], [140, 145], [167, 172]]), "Fragmentos del script: tabla insumos, tabla auditoria, trigger de inmutabilidad y vista", "ddl",
      "db/schema.sql, líneas 48–56, 125–134, 140–145 y 167–172 (el número de línea está en el margen; \"...\" marca líneas omitidas)."),
    note("**Advertencia de seguridad detectada en esta verificación.** El rol de la aplicación (`vastago_app`) es el propietario de las tablas y, por tanto, puede ejecutar `TRUNCATE` sobre `auditoria` (probado con `ROLLBACK`: la tabla quedó vacía dentro de la transacción y se restauró al revertir) o eliminar el trigger. La inmutabilidad vigente protege contra el código de la aplicación y contra inyecciones SQL de tipo `UPDATE/DELETE`, pero no contra un atacante que controle ese rol. **Mejora propuesta para el Sprint 6:** separar un rol propietario (solo migraciones) de un rol de ejecución con `GRANT SELECT, INSERT, UPDATE` por tabla, revocar `TRUNCATE` y agregar un trigger de sentencia que lo bloquee. Se registra como deuda técnica del riesgo R3.", { fill: "FDEAE7", bar: "B3261E" }),

    H3("Consistencia entre el modelo, la base de datos y el script SQL"),
    P("Para demostrar que el diagrama de la {fig:er} corresponde a lo que realmente existe, se realizaron dos comprobaciones automáticas con el guion `db/admin/verificar_modelo_er.py`. **Primera:** se leyeron las tablas, columnas, tipos y claves dibujadas en el archivo fuente del diagrama (`er_fisico.dot`) y se compararon con `information_schema.columns` y `pg_constraint` de la base en ejecución. **Segunda:** se creó una base temporal ejecutando `db/schema.sql` desde cero y se comparó con la base real en columnas, restricciones, índices, vista y triggers; la base temporal se eliminó al terminar. El {cod:info_schema} muestra la consulta base y su resultado, y la {tab:verif} el detalle por tabla."),
    ...cod(String.raw`vastago=# SELECT table_name, count(*) AS columnas FROM information_schema.columns
vastago-#  WHERE table_schema = 'public' GROUP BY 1 ORDER BY 1;
       table_name       | columnas
------------------------+----------
 alertas                |        5
 auditoria              |        9
 bom                    |        3
 demanda_historica      |        3
 insumos                |        7
 movimientos_inventario |        8
 ordenes_produccion     |        8
 productos              |        3
 pronosticos            |        5
 roles                  |        3
 sesiones               |        8
 usuarios               |       11
 v_inventario           |        6      <- la vista (no es una tabla del diagrama)
(13 rows)                                  tablas: 73 columnas en total`, "Consulta a information_schema: columnas por tabla en la base real (PostgreSQL 16.15)", "info_schema",
      "Ejecución propia, 06-oct-2026, rol postgres sobre 127.0.0.1:5433; el resultado completo del guion está en evidencias/08_consistencia_modelo_bd.txt."),
    ...T(["Tabla", "Columnas diagrama", "Columnas BD", "Tipos de dato", "PK", "FK (BD)"], [
      ["alertas", "5", "5", "Coinciden", "Coincide", "0"],
      ["auditoria", "9", "9", "Coinciden", "Coincide", "1"],
      ["bom", "3", "3", "Coinciden", "Coincide", "2 (dibujadas como PK)"],
      ["demanda_historica", "3", "3", "Coinciden", "Coincide", "1 (dibujada como PK)"],
      ["insumos", "7", "7", "Coinciden", "Coincide", "0"],
      ["movimientos_inventario", "8", "8", "Coinciden", "Coincide", "3"],
      ["ordenes_produccion", "8", "8", "Coinciden", "Coincide", "2"],
      ["productos", "3", "3", "Coinciden", "Coincide", "0"],
      ["pronosticos", "5", "5", "Coinciden", "Coincide", "1 (dibujada como PK)"],
      ["roles", "3", "3", "Coinciden", "Coincide", "0"],
      ["sesiones", "8", "8", "Coinciden", "Coincide", "1"],
      ["usuarios", "11", "11", "Coinciden", "Coincide", "1"],
      ["**Total**", "**73**", "**73**", "**70 iguales + 3 enumeraciones**", "**12 de 12**", "**12 (12 relaciones dibujadas)**"],
    ], { id: "verif", title: "Verificación del diagrama ER contra la base de datos real", widths: [2.3, 1.3, 1.1, 2.0, 1.1, 2.2], size: 16, hsize: 17,
      align: [LEFT, CENTER, CENTER, LEFT, CENTER, LEFT],
      source: "Ejecución propia (06-oct-2026) de db/admin/verificar_modelo_er.py; salida en evidencias/08_consistencia_modelo_bd.txt." }),
    P("**Resultado de la primera comprobación.** Las 12 tablas, las 73 columnas (mismo nombre y mismo orden) y las 12 claves primarias del diagrama coinciden con la base. De los 73 tipos, 70 son idénticos (por ejemplo, `NUMERIC(12,3)`, `TIMESTAMPTZ`, `BYTEA`, `CHAR(64)`); los 3 restantes son columnas que el diagrama rotula con el conjunto de valores permitido (`tipo`, `estado` y `nivel`), que en la base son `VARCHAR` con el CHECK correspondiente, como confirma `pg_constraint`. Las 12 relaciones dibujadas equivalen exactamente a las 12 claves foráneas. En `bom`, `demanda_historica` y `pronosticos` la clave foránea forma parte de la clave primaria compuesta y el diagrama la marca solo como PK: es una diferencia de notación, no de estructura."),
    P("**Resultado de la segunda comprobación.** La base real y la creada desde `db/schema.sql` son **idénticas** en columnas (73 y 73), restricciones (41 y 41), índices (24 y 24), definición de la vista y triggers (2 y 2). Por tanto, el script SQL, la base en ejecución y el diagrama no presentan discrepancias estructurales. Lo que el diagrama no dibuja, por su naturaleza, son los objetos que no son columnas: la vista `v_inventario`, los dos triggers, las acciones `ON DELETE`, el CHECK del formato del correo y varias de las siete restricciones CHECK de valor (el diagrama rotula solo tres de ellas con `>0` y `≥0`: `stock_actual`, `movimientos_inventario.cantidad` y `ordenes_produccion.cantidad`). Se documentan en la {tab:tablas_fisico} y en la {tab:decisiones_fisico}."),

    // ===================================================================== 8.2
    H2("8.2 Informe de Administración y Replicación"),
    P("El sistema usa **PostgreSQL 16** (instancia local 16.15; el Blueprint de Render declara `postgresMajorVersion: \"16\"`). La elección se fundamenta en el capítulo 3 y se resume por sus consecuencias de administración: es un motor relacional con transacciones ACID y control de concurrencia multiversión (MVCC), de modo que las lecturas no bloquean a las escrituras; admite restricciones CHECK, triggers, vistas y bloqueo de filas, que el diseño de la sección 8.1 aprovecha; incluye de serie la replicación por transmisión de WAL, los roles con privilegios finos y la autenticación SCRAM-SHA-256; y su licencia libre no añade costo de licenciamiento para una empresa pequeña. Para el mismo tamaño de empresa, un motor sin replicación nativa o con licencia de pago habría encarecido el requisito RNF03 (disponibilidad y respaldo)."),
    H3("Replicación elegida frente a las alternativas"),
    P("PostgreSQL ofrece dos familias de replicación: la **física** (copia el flujo de registro WAL, es decir, el clúster completo) y la **lógica** (publica cambios de filas de tablas concretas). La física, a su vez, puede ser asíncrona o síncrona. La {tab:repl_comp} las compara con los criterios que importan a Vástago & Co."),
    ...T(["Criterio", "Física asíncrona (elegida)", "Física síncrona", "Lógica (publicación / suscripción)"], [
      ["Qué se copia", "Todo el clúster, byte a byte, vía WAL.", "Igual que la asíncrona.", "Filas de las tablas publicadas (INSERT, UPDATE, DELETE)."],
      ["Confirmación del COMMIT", "No espera a la réplica.", "Espera la confirmación de al menos una réplica (synchronous_standby_names).", "No espera (asíncrona por defecto)."],
      ["Pérdida posible si cae el primario", "Los últimos WAL aún no enviados (segundos); 0 bytes de retraso medido en reposo.", "Ninguna para las transacciones confirmadas.", "Igual que la asíncrona."],
      ["Efecto si cae la réplica", "Ninguno en el primario; el slot retiene el WAL pendiente.", "Las escrituras se bloquean hasta recuperar la réplica o quitarla de la lista.", "Ninguno en el primario; el slot lógico retiene WAL."],
      ["DDL, secuencias, triggers", "Se replican (copia física).", "Se replican.", "No se replican DDL ni valores de secuencias; requiere clave o REPLICA IDENTITY."],
      ["Uso de la réplica", "Lectura (hot standby) y candidata a promoción.", "Igual.", "Lectura y escritura en tablas no replicadas; puede ser otra versión mayor."],
      ["Costo en la escritura", "Ninguno.", "Un viaje de red y un fsync remoto por COMMIT.", "Ninguno en el COMMIT; decodificación lógica en el primario."],
      ["Complejidad operativa", "Baja: pg_basebackup y un slot.", "Media: política de quórum y riesgo de bloqueo.", "Alta: publicaciones, conflictos y DDL manual."],
      ["Encaje con el proyecto", "**Alto**: copia completa, sin riesgo para la disponibilidad de escritura.", "Bajo: con una sola réplica, su caída detendría los registros de la planta.", "Bajo: no sirve como standby completo ni replica el esquema."],
    ], { id: "repl_comp", title: "Comparación de las estrategias de replicación de PostgreSQL", widths: [1.7, 2.6, 2.6, 2.7], size: 16, hsize: 17,
      source: "Elaboración propia a partir de la documentación oficial de PostgreSQL 16 (capítulos de replicación y de alta disponibilidad) y de la configuración de db/replication/." }),
    P("**Justificación.** Se eligió la replicación física asíncrona con slot por cuatro razones. (1) __Objetivo de recuperación:__ el sistema se propone un RPO de 24 horas con el respaldo diario (capítulo 6); la réplica lo mejora a segundos sin pagar latencia en cada COMMIT. (2) __Disponibilidad de escritura:__ con una sola réplica, la modalidad síncrona convertiría la caída de la réplica en una caída del registro de movimientos y de órdenes, que es peor que el problema que se quiere resolver. (3) __Alcance de la copia:__ se necesita copiar también el esquema, los triggers y la vista; la replicación lógica no transporta DDL y obligaría a mantener dos esquemas a mano. (4) __Esfuerzo:__ la física se monta con `pg_basebackup` y un slot, algo viable para un equipo de tres personas en seis sprints. El **slot de replicación** (`replica1_slot`) hace que el primario no descarte WAL que la réplica todavía no ha leído; su costo es que un slot **inactivo** retiene WAL sin límite, por lo que debe vigilarse (ver 8.2.3) y acotarse con `max_slot_wal_keep_size`. La {fig:repl} muestra la topología."),
    ...fig("assets/replicacion.png", "Topología de replicación streaming asíncrona primario–réplica con respaldo lógico", { id: "repl", width: 610,
      desc: "El primario (puerto 5433) escribe el WAL y lo transmite por streaming asíncrono, con slot y rol replicator (SCRAM), a la réplica en hot standby (puerto 5434). El pg_dump diario es independiente de la réplica; la promoción es manual (línea punteada).",
      source: "Elaboración propia a partir de db/replication/ y de las evidencias 01 y 07." }),

    // ---------------------------------------------------------------- 8.2.1
    H3("8.2.1 Estrategia de respaldo y replicación"),
    P("La estrategia se organiza en capas que cubren fallas distintas. Un solo mecanismo no basta: la réplica protege contra la caída del servidor pero **replica también un borrado accidental**; el `pg_dump` protege contra el error lógico pero tiene un RPO de horas. La {tab:capas} resume cada capa y declara con precisión qué está implementado y qué es una propuesta."),
    ...T(["Capa", "Mecanismo", "Frecuencia y retención", "Cubre", "Estado"], [
      ["1. Respaldo lógico", "pg_dump -Fc -Z 6 (formato custom comprimido) y restauración de prueba en una base temporal.", "Diario (propuesto); retención de 7 días (en el script).", "Error lógico, corrupción, pérdida del servidor.", "Script implementado y verificado; programación diaria propuesta."],
      ["2. Réplica streaming", "pg_basebackup -R con slot replica1_slot; hot standby.", "Continua.", "Falla del servidor primario.", "Implementada y probada en local."],
      ["3. Archivado de WAL", "archive_mode = on con archive_command y copia base semanal.", "Continuo; semanal la copia base (propuesto).", "Recuperación a un punto en el tiempo (PITR).", "Propuesta; archive_mode = off hoy."],
      ["4. Copia externa", "Enviar los dumps a un almacenamiento ajeno al servidor de la base (regla 3-2-1).", "Tras cada respaldo; 4 semanales (propuesto).", "Pérdida del proveedor o de la cuenta.", "Propuesta."],
    ], { id: "capas", title: "Capas de la estrategia de respaldo y replicación y su estado", widths: [1.5, 3.0, 2.2, 2.1, 2.0], size: 16, hsize: 17,
      source: "Elaboración propia; db/admin/backup_restore.sh, db/replication/ y consulta pg_settings del 06-oct-2026." }),
    H3("Respaldo lógico con pg_dump y restauración verificada"),
    P("El script `db/admin/backup_restore.sh` ({cod:backup}) genera el respaldo con `pg_dump -Fc -Z 6`, lo restaura en una base temporal (`vastago_restore_test`) con `pg_restore --no-owner`, compara el número de filas de cinco tablas entre el original y la copia, elimina la base temporal y aplica la retención de 7 días. Que **cada ejecución incluya su propia prueba de restauración** es deliberado: un respaldo que nunca se restauró no es una garantía."),
    ...cod(src("db/admin/backup_restore.sh", [[5, 6], [8, 14], [15, 17]]), "Núcleo del script de respaldo, restauración de prueba, verificación y retención", "backup",
      "db/admin/backup_restore.sh, líneas 5–6, 8–14 y 15–17 (líneas largas ajustadas; el número de línea está en el margen)."),
    P("La ejecución del 06-oct-2026 ({cod:backup_ev}) produjo un respaldo de 44 KB y la restauración reprodujo exactamente el contenido de las cinco tablas verificadas."),
    ...cod(src("evidencias/02_respaldo_restauracion.txt", [[1, 8]], { gutter: false }), "Evidencia: respaldo y restauración con verificación de conteos", "backup_ev",
      "evidencias/02_respaldo_restauracion.txt (salida real de db/admin/backup_restore.sh)."),
    P("Una segunda corrida, con medición de tiempos y con verificación ampliada a ocho tablas y a los objetos de la base, se registró en `evidencias/02b_tiempos_restauracion.txt` ({tab:resp_ev}). Los conteos de la segunda corrida son algo mayores (por ejemplo, 87 contra 85 eventos de auditoría) porque la base siguió recibiendo eventos entre ambas ejecuciones; en cada corrida, original y restauración coinciden."),
    ...T(["Tabla", "Filas en el original", "Filas restauradas", "Resultado"], [
      ["usuarios", "5", "5", "OK"], ["insumos", "7", "7", "OK"], ["ordenes_produccion", "6", "6", "OK"], ["movimientos_inventario", "5", "5", "OK"],
      ["auditoria", "87", "87", "OK"], ["sesiones", "68", "68", "OK"], ["pronosticos", "9", "9", "OK"], ["demanda_historica", "72", "72", "OK"],
      ["**Tiempos y objetos**", "**pg_dump -Fc -Z 6: 0.12 s (42,458 B)**", "**pg_restore: 0.13 s**", "**12 tablas, 2 triggers y la vista v_inventario restaurados**"],
    ], { id: "resp_ev", title: "Restauración verificada: conteos por tabla, tiempos y objetos restaurados", widths: [2.6, 2.5, 2.2, 3.0], size: 17,
      align: [LEFT, CENTER, CENTER, LEFT],
      source: "Ejecución propia (06-oct-2026), evidencias/02b_tiempos_restauracion.txt. Base de 9 MB con datos de demostración." }),
    H3("Retención, programación y procedimiento de restauración"),
    P("El script conserva 7 días de respaldos (`find ... -mtime +7 -delete`). Se propone agregar cuatro copias semanales y enviar cada archivo a un almacenamiento externo, porque en el plan gratuito de Render la base no incluye respaldos y expira a los 30 días de su creación (Render, s. f.-a), de modo que el respaldo propio es la única copia bajo control del equipo. La programación diaria (una tarea `cron` en un servidor del equipo o un trabajo programado de la plataforma) **no está activada** en el repositorio: hoy se ejecuta a demanda. El procedimiento de recuperación ante un error lógico es el siguiente."),
    ...numbered([
      "Detener las escrituras de la aplicación (o poner el servicio en mantenimiento) para no perder transacciones nuevas durante la recuperación.",
      "Elegir el respaldo más reciente anterior al incidente y comprobar su integridad con `pg_restore -l archivo.dump`.",
      "Restaurar en una base nueva (`createdb` y `pg_restore --no-owner -d vastago_nueva archivo.dump`) y comparar conteos con el script de verificación.",
      "Apuntar `DATABASE_URL` a la base restaurada y reiniciar la aplicación; el arranque con `seed --if-empty` no sobrescribe datos existentes.",
      "Registrar el incidente y la hora de corte en la bitácora del equipo, y revisar la causa.",
    ]),
    H3("RPO y RTO por escenario"),
    P("La {tab:rpo_rto} relaciona cada escenario de falla con su mecanismo, su RPO y su RTO. Los objetivos globales (RPO ≤ 24 h y RTO ≤ 2 h con respaldo diario) provienen del capítulo 6; las mediciones son solo las **operaciones técnicas** de restauración y promoción, no el tiempo humano de detección, decisión y reconexión, que no se midió."),
    ...T(["Escenario", "Mecanismo", "RPO", "RTO", "Evidencia"], [
      ["Borrado o corrupción lógica detectada en menos de 24 h", "Restaurar el último pg_dump.", "≤ 24 h (objetivo)", "Objetivo ≤ 2 h; la restauración técnica midió 0.13 s con 9 MB.", "Medida (02b)"],
      ["Falla del primario con la réplica al día", "pg_promote y cambio de DATABASE_URL.", "Segundos; 0 bytes de retraso medido en reposo.", "Promoción medida en 0.11 s; la reconexión no se midió.", "Medida en local (07)"],
      ["Pérdida total del servidor sin réplica", "Restaurar el dump en una instancia nueva.", "≤ 24 h (objetivo)", "Objetivo ≤ 2 h; el aprovisionamiento no se midió.", "Parcial (02b)"],
      ["Recuperación a un punto en el tiempo", "Copia base más WAL archivado.", "Minutos (propuesto)", "Por definir", "Propuesta (sin evidencia)"],
    ], { id: "rpo_rto", title: "RPO y RTO por escenario de falla", widths: [2.6, 2.3, 1.9, 2.8, 1.5], size: 16, hsize: 17,
      source: "Elaboración propia; objetivos del capítulo 6; mediciones de evidencias/02b y 07." }),
    H3("Configuración de la replicación"),
    P("La configuración del primario y la creación de la réplica están en `db/replication/`. El script `01_primary_config.sql` crea el rol `replicator` (atributo `REPLICATION`, sin privilegios de superusuario), documenta los parámetros del primario y crea el slot físico; `setup_replica.sh` toma la copia base con `pg_basebackup -R -X stream -S replica1_slot` (la opción `-R` genera `standby.signal` y `primary_conninfo`) y arranca la réplica en otro puerto en modo de solo lectura. El {cod:repl_cfg} y el {cod:repl_cfg2} reúnen los fragmentos esenciales."),
    ...cod(src("db/replication/01_primary_config.sql", [[1, 9]]), "Servidor primario: rol de replicación, parámetros y slot", "repl_cfg",
      "db/replication/01_primary_config.sql, líneas 1–9."),
    ...cod(src("db/replication/setup_replica.sh", [[9, 10], [12, 14], [17, 19]]), "Creación de la réplica: slot, copia base con pg_basebackup -R y arranque en otro puerto", "repl_cfg2",
      "db/replication/setup_replica.sh, líneas 9–10, 12–14 y 17–19 (líneas largas ajustadas; \"...\" marca líneas omitidas)."),
    P("En la instancia local, `pg_settings` confirma `wal_level = replica`, `max_wal_senders = 5`, `hot_standby = on`, `max_replication_slots = 10` y `password_encryption = scram-sha-256`; `wal_keep_size` está en 0 porque el slot cumple esa función (el script de ejemplo propone 256 MB como margen adicional). El `pg_hba.conf` del clúster autoriza la replicación solo para el rol `replicator` desde `127.0.0.1` con SCRAM. En producción debe usarse `hostssl` y la dirección fija de la réplica con máscara `/32`, y cambiar la contraseña provisional del script."),

    // ---------------------------------------------------------------- 8.2.2
    H3("8.2.2 Configuración de alta disponibilidad"),
    P("La alta disponibilidad se plantea como **réplica en espera con promoción manual**: si el primario falla, un operador promueve la réplica, que pasa a aceptar escrituras, y la aplicación se reapunta a ella. No hay conmutación automática (eso exigiría un orquestador como Patroni o repmgr, fuera del alcance del proyecto) y la aplicación v1 aún no dirige lecturas a la réplica."),
    H3("Evidencia de la replicación"),
    P("La sesión del 06-oct-2026 ({cod:repl_ev}) comprobó el estado de la replicación desde el primario y la réplica. La {tab:ha_ev} interpreta cada una de las seis verificaciones de `evidencias/01_replicacion.txt`."),
    ...cod(src("evidencias/01_replicacion.txt", [[1, 8], [23, 29]], { gutter: false }), "Evidencia: réplica en streaming asíncrono, escritura rechazada y retraso de 0 bytes (extracto)", "repl_ev",
      "evidencias/01_replicacion.txt, líneas 1–8 y 23–29 (extracto; el archivo completo contiene seis comprobaciones)."),
    ...T(["N.º", "Verificación", "Resultado observado", "Qué demuestra"], [
      ["1", "pg_stat_replication en el primario.", "state = streaming; sync_state = async; sent_lsn = replay_lsn = 0/3000060; slot_name = replica1_slot.", "La réplica está conectada y al día, en modo asíncrono y con slot."],
      ["2", "pg_is_in_recovery() en la réplica.", "t (verdadero).", "La réplica es un standby (solo lectura)."],
      ["3", "Escribir en el primario y leer en la réplica.", "Lecitina de soya = 41.000 en ambos.", "El cambio se propagó."],
      ["4", "UPDATE directo en la réplica.", "ERROR: cannot execute UPDATE in a read-only transaction.", "La réplica no admite escrituras: no puede divergir."],
      ["5", "Retraso en bytes desde el primario.", "lag_bytes = 0.", "Sin WAL pendiente (medición en reposo, sin carga)."],
      ["6", "Último WAL recibido y aplicado en la réplica.", "recibido = aplicado = 0/3000518.", "La réplica aplica todo lo recibido."],
    ], { id: "ha_ev", title: "Verificaciones de la replicación y su interpretación", widths: [0.8, 2.5, 3.5, 3.2], size: 16, hsize: 17,
      align: [CENTER, LEFT, LEFT, LEFT],
      source: "Ejecución propia (06-oct-2026), evidencias/01_replicacion.txt." }),
    H3("Promoción y prueba de conmutación"),
    P("La promoción convierte a la réplica en un servidor independiente que acepta escrituras. Se puede hacer desde el sistema operativo (`pg_ctl promote -D <directorio>`) o desde SQL en la propia réplica (`SELECT pg_promote(wait => true, wait_seconds => 60);`). Para no alterar la réplica de demostración se probó la conmutación con una **réplica descartable** (puerto 5435) creada con `pg_basebackup -R` y eliminada al final; los datos del primario no se modificaron. La {tab:failover} resume los resultados de `evidencias/07_failover.txt`."),
    ...T(["Paso", "Qué se hizo", "Resultado"], [
      ["1", "Comprobar la réplica descartable desde el primario.", "state = streaming; sync_state = async; sent_lsn = replay_lsn = 0/6000060."],
      ["2", "Estado antes de promover.", "es_replica = t; 5 movimientos y 86 eventos de auditoría, iguales al primario."],
      ["3", "UPDATE en la réplica antes de promover.", "Rechazado: read-only transaction."],
      ["4", "Promover con pg_ctl promote (se supone caído el primario).", "server promoted; tiempo de promoción 0.11 s."],
      ["5", "Estado después de promover.", "es_replica = f; acepta UPDATE (con ROLLBACK) e INSERT en alertas."],
      ["6", "Comprobar el primario original.", "0 alertas nuevas en el primario y 1 en la promovida: los dos clústeres ya son independientes."],
    ], { id: "failover", title: "Prueba de conmutación por promoción de la réplica", widths: [0.9, 4.0, 5.0], size: 17,
      align: [CENTER, LEFT, LEFT],
      source: "Ejecución propia (06-oct-2026), evidencias/07_failover.txt." }),
    P("El paso 6 evidencia el principal riesgo operativo de una promoción manual: el **split-brain**. Si el primario original reaparece y la aplicación sigue escribiendo en él, existirán dos versiones de los datos. Por eso el procedimiento debe incluir, antes de promover, confirmar que el primario está realmente fuera de servicio y apagarlo (o aislarlo) si hay duda."),
    H3("Procedimiento de recuperación ante la caída del primario"),
    ...numbered([
      "Confirmar la caída (la aplicación responde 5xx en `/api/health` y el servidor no acepta conexiones) y **aislar el primario** para impedir escrituras.",
      "En la réplica, medir lo recibido y lo aplicado (`pg_last_wal_receive_lsn()` y `pg_last_wal_replay_lsn()`) y anotar la posible pérdida por la naturaleza asíncrona.",
      "Promover la réplica con `pg_ctl promote` o `pg_promote()` y verificar `pg_is_in_recovery() = f`.",
      "Cambiar `DATABASE_URL` hacia la nueva primaria y reiniciar la aplicación (el pool de conexiones se crea al arrancar).",
      "Reconstruir el servidor caído como nueva réplica (`pg_basebackup` desde la nueva primaria, o `pg_rewind` si es posible) y crear un nuevo slot.",
      "Correr las comprobaciones de integridad (conteos y `evidencias/06`) y registrar el incidente.",
    ]),
    H3("Límites en Render y alcance real de la demostración"),
    P("La réplica se demostró **localmente**. El plan gratuito de Render no ofrece réplica ni respaldos automáticos y la base gratuita expira a los 30 días (Render, s. f.-a); las capacidades de alta disponibilidad dependen del plan de pago contratado y deben verificarse en la documentación vigente de la plataforma al momento de contratar. La {tab:render_ha} contrasta lo demostrado con lo disponible y lo recomendado."),
    ...T(["Capacidad", "Demostrado en local", "Render, plan gratuito", "Recomendado para producción"], [
      ["Réplica en espera", "Sí: puertos 5434 y 5435 (hot standby con slot).", "No disponible.", "Plan con alta disponibilidad, o una réplica en un servidor propio."],
      ["Promoción", "Sí: pg_ctl promote en 0.11 s.", "No aplica.", "Promoción manual documentada o conmutación automática del proveedor."],
      ["Respaldo automático", "Script bajo demanda (pg_dump).", "No incluido.", "Respaldos del proveedor más pg_dump externo programado."],
      ["Vigencia de la base", "Sin límite.", "Expira a los 30 días (más 14 de gracia).", "Plan de pago continuo."],
      ["Acceso a la configuración del servidor", "Total (postgresql.conf y pg_hba.conf).", "Limitado a lo que expone la plataforma.", "Definir parámetros de WAL y conexiones según el plan."],
    ], { id: "render_ha", title: "Alta disponibilidad: lo demostrado en local frente a Render", widths: [2.0, 2.8, 2.4, 3.0], size: 16, hsize: 17,
      source: "Elaboración propia; evidencias/01 y 07; Render (s. f.-a). Las capacidades del plan de pago deben confirmarse en la documentación vigente." }),

    // ---------------------------------------------------------------- 8.2.3
    H3("8.2.3 Evidencias de monitoreo y administración"),
    P("El guion `db/admin/monitoreo.sql` agrupa siete consultas de diagnóstico sobre las vistas estadísticas de PostgreSQL (`pg_stat_activity`, `pg_stat_database`, `pg_stat_user_tables`, `pg_stat_user_indexes`, `pg_roles` y el parámetro `password_encryption`). Su salida completa del 06-oct-2026 está en `evidencias/03_monitoreo_bd.txt`; las tablas siguientes la presentan con una lectura de cada valor y un umbral de alerta propuesto. Las mediciones son de una base de demostración muy pequeña: sirven para verificar el procedimiento y fijar la línea base, no para dimensionar la producción."),
    ...T(["Métrica", "Fuente", "Valor medido", "Umbral propuesto", "Lectura"], [
      ["Conexiones por estado", "pg_stat_activity", "1 activa", "Menos del 80 % de max_connections (100)", "El pool abre hasta 10 conexiones por proceso (2 workers: 20 como máximo), muy por debajo del límite."],
      ["Tamaño de la base", "pg_database_size", "9,071 kB", "Alerta al 70 % del límite del plan (1 GB en Render gratuito)", "Ocupa cerca del 0.9 % de 1 GB."],
      ["Aciertos de caché", "pg_stat_database", "99.92 %", "Menos de 99 %", "Cumple; era esperable porque la base cabe en shared_buffers (128 MB)."],
      ["Commits y rollbacks", "pg_stat_database", "472 commits; 11 rollbacks (2.3 %)", "Rollbacks superiores al 5 %", "Son transacciones revertidas (excepciones dentro de transaction() o pruebas con ROLLBACK); no se atribuyó a una causa única."],
      ["Bloqueos mutuos (deadlocks)", "pg_stat_database", "0", "Cualquier valor mayor que 0", "Cumple. Las órdenes bloquean los insumos en el orden de la receta (ORDER BY nombre), un orden determinista."],
      ["Tuplas muertas", "pg_stat_user_tables", "Máximo 10 (usuarios)", "Más del 20 % de filas vivas y más de 1,000 filas", "Las tablas son pequeñas: autovacuum aún no tuvo que actuar (ver nota)."],
      ["Roles y privilegios", "pg_roles", "postgres (superusuario); replicator (REPLICATION); vastago_app (solo LOGIN)", "Ningún rol de aplicación con superusuario", "Mínimo privilegio cumplido para la aplicación (con la salvedad de propiedad de tablas en 8.1)."],
      ["Cifrado de contraseñas", "SHOW password_encryption", "scram-sha-256", "Distinto de scram-sha-256", "Cumple."],
    ], { id: "mon", title: "Indicadores de monitoreo de la base de datos, valores medidos y umbrales propuestos", widths: [1.6, 2.0, 2.0, 2.0, 3.0], size: 15, hsize: 17,
      source: "Ejecución propia (06-oct-2026) de db/admin/monitoreo.sql; evidencias/03_monitoreo_bd.txt y pg_settings. Los umbrales son propuestas del equipo." }),
    P("**Nota sobre las tuplas muertas.** En `usuarios` hay 10 tuplas muertas frente a 5 filas vivas porque cada inicio de sesión actualiza `ultimo_acceso` e `intentos_fallidos`. La proporción es alta pero el volumen es mínimo: autovacuum dispara con un umbral de 50 tuplas más el 20 % de las filas, de modo que todavía no se ejecutó en las tablas pequeñas (en la salida, `last_autovacuum` está vacío salvo el análisis automático de `usuarios` y `sesiones`). `autovacuum` está activo. Si `sesiones` crece (cada renovación de sesión inserta una fila), conviene un procedimiento de purga de sesiones vencidas."),
    ...T(["Tabla", "Tamaño total", "Filas"], [
      ["auditoria", "96 kB", "85"], ["sesiones", "88 kB", "66"], ["usuarios", "64 kB", "5"], ["ordenes_produccion", "56 kB", "6"],
      ["insumos", "40 kB", "7"], ["productos", "40 kB", "3"], ["movimientos_inventario", "40 kB", "5"], ["roles", "40 kB", "4"],
    ], { id: "tam", title: "Tamaño y número de filas de las tablas más grandes (base de 9,071 kB)", widths: [4.0, 2.5, 2.0], size: 17, align: [LEFT, CENTER, CENTER],
      source: "Ejecución propia (06-oct-2026), evidencias/03_monitoreo_bd.txt, consulta 2 (limitada a 8 de las 12 tablas con LIMIT 8)." }),
    P("La {tab:tam} muestra que `auditoria` y `sesiones` son las tablas con mayor crecimiento esperado; por eso `ix_auditoria_fecha` y `sesiones_token_hash_key` se justificaron a escala en la sección 7.3. La consulta de uso de índices ({tab:idx_uso}) confirma que las claves primarias de las tablas de consulta frecuente (`usuarios`, `productos`, `roles`) son las más utilizadas; `sesiones_token_hash_key` registra 3 usos, correspondientes a renovaciones de sesión."),
    ...T(["Tabla", "Índice", "Usos (idx_scan)"], [
      ["usuarios", "usuarios_pkey", "235"], ["productos", "productos_pkey", "99"], ["roles", "roles_pkey", "79"], ["insumos", "insumos_pkey", "28"],
      ["productos", "productos_nombre_key", "8"], ["ordenes_produccion", "ordenes_produccion_pkey", "5"], ["roles", "roles_nombre_key", "5"], ["sesiones", "sesiones_token_hash_key", "3"],
    ], { id: "idx_uso", title: "Índices más utilizados desde el último reinicio de estadísticas", widths: [3.0, 3.8, 1.9], size: 17, align: [LEFT, LEFT, CENTER],
      source: "Ejecución propia (06-oct-2026), evidencias/03_monitoreo_bd.txt, consulta 4 (primeros 8 índices por uso)." }),
    note("**Monitoreo del slot de replicación.** Al verificar el entorno, `pg_replication_slots` mostraba `replica1_slot` con `active = f`, porque la réplica local estaba detenida. Un slot inactivo impide que el primario recicle WAL y, sin límite, puede llenar el disco. Se propone añadir al guion `monitoreo.sql` la consulta `SELECT slot_name, active, pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) FROM pg_replication_slots;`, alertar si un slot lleva inactivo más de una hora y fijar `max_slot_wal_keep_size`."),
    H3("Buenas prácticas de administración aplicadas"),
    P("La {tab:practicas} reúne las prácticas de administración del capítulo, con el estado real de cada una. Las de seguridad de aplicación (cifrado, autenticación y control de acceso) se desarrollan en el capítulo 9."),
    ...T(["Práctica", "Aplicación en el proyecto", "Estado"], [
      ["Mínimo privilegio", "vastago_app es NOSUPERUSER, NOCREATEDB y NOCREATEROLE; replicator solo tiene REPLICATION. Hallazgo: vastago_app es propietaria de las tablas (ver 8.1).", "Implementado; mejora propuesta (separar propietario y ejecución)"],
      ["Autenticación SCRAM-SHA-256 y pg_hba.conf", "password_encryption = scram-sha-256; todas las líneas activas de pg_hba.conf (locales, 127.0.0.1, ::1 y replicación) usan scram-sha-256; ninguna usa trust.", "Implementado"],
      ["Conexión cifrada", "En producción, sslmode obligatorio en DATABASE_URL y entradas hostssl en pg_hba.conf para la réplica.", "Propuesto"],
      ["VACUUM y ANALYZE", "autovacuum activo; VACUUM (ANALYZE) manual tras cargas masivas; vigilar n_dead_tup y last_autovacuum.", "Implementado (automático); procedimiento manual propuesto"],
      ["Parches y versiones", "PostgreSQL 16.15, rama mayor 16 con parches menores; aplicar las versiones menores de seguridad al menos una vez por trimestre. En Render las aplica la plataforma.", "Propuesto"],
      ["Gestión de secretos", "La cadena de conexión llega por variable de entorno; la contraseña de replicator del script es provisional y debe rotarse.", "Implementado (entorno); rotación propuesta"],
      ["Respaldo probado y externo", "Cada respaldo se restaura en una base temporal; la copia externa está pendiente.", "Prueba implementada; copia externa propuesta"],
      ["Trazabilidad", "log_connections = on en el servidor y bitácora de aplicación en la tabla auditoria (solo anexar).", "Implementado"],
    ], { id: "practicas", title: "Buenas prácticas de administración de PostgreSQL y su estado en el proyecto", widths: [2.0, 5.6, 2.4], size: 16, hsize: 17,
      source: "Elaboración propia; pg_hba.conf y pg_settings del clúster local (06-oct-2026); evidencias/03." }),

    // ===================================================================== 8.3
    H2("8.3 Implementación del Patrón de Acceso a Datos"),
    H3("8.3.1 Patrón elegido"),
    P("El sistema accede a PostgreSQL exclusivamente mediante el patrón **Repository**, combinado con una **unidad de trabajo** (`transaction()`). Un repositorio ofrece a las capas superiores una interfaz con operaciones de negocio (`bloquear_para_actualizar`, `contar_quiebres`, `siguiente_lote`, `registrar`) y oculta cómo se obtienen los datos: Fowler (2002) lo describe como una colección en memoria que media entre el dominio y la asignación de datos. Frente al **DAO**, que se organiza alrededor de una tabla y de operaciones CRUD, el repositorio se organiza alrededor de lo que el negocio necesita; frente a un **ORM**, evita generar el SQL de manera implícita. La {tab:repo_comp} compara las tres opciones con los criterios del proyecto."),
    ...T(["Criterio", "DAO clásico", "ORM completo (p. ej. SQLAlchemy)", "Repository del proyecto"], [
      ["Unidad de abstracción", "Una tabla y operaciones CRUD.", "Entidades mapeadas a clases.", "Operaciones de negocio (bloquear_para_actualizar, contar_quiebres)."],
      ["Control del SQL", "Total.", "Generado; se puede recurrir a SQL textual.", "Total, explícito y revisable (cada consulta se analizó con EXPLAIN en 7.3)."],
      ["Funciones propias de PostgreSQL", "Sí.", "Parcial; con construcciones propias del ORM o SQL textual.", "Sí: FOR UPDATE, vista, FILTER, RETURNING, JSONB."],
      ["Transacciones", "Las controla el llamador.", "Sesión con unidad de trabajo implícita.", "Unidad de trabajo explícita: transaction() y cursor inyectado."],
      ["Curva de aprendizaje (3 personas, 18 semanas)", "Baja.", "Media-alta (sesión, mapa de identidad, carga perezosa).", "Baja."],
      ["Riesgos de rendimiento", "Bajos.", "Consultas N+1 y SQL no controlado.", "Bajos: sin generación implícita de SQL."],
      ["Acoplamiento de las rutas", "Medio: conocen tablas.", "Alto: dependen del modelo del ORM.", "Bajo: las rutas reciben diccionarios y no contienen SQL."],
      ["Pruebas", "Con DAO simulado.", "Requieren sesión y base.", "24 pruebas pytest de integración contra PostgreSQL real."],
    ], { id: "repo_comp", title: "Comparación de DAO, ORM y Repository para el acceso a datos", widths: [2.0, 2.0, 2.7, 3.2], size: 16, hsize: 17,
      source: "Elaboración propia a partir de Fowler (2002) y del código de backend/app/repositories/; evidencias/04_pytest.txt." }),
    P("**Justificación.** Tres hechos del sistema inclinaron la decisión. Primero, la integridad del inventario depende de funciones que un ORM complica: bloqueo de fila con `SELECT ... FOR UPDATE`, un trigger que actualiza el stock y una vista de semáforo; con SQL explícito el equipo ve exactamente qué ejecuta la base. Segundo, para un equipo de tres personas, el repositorio añade orden sin añadir una capa conceptual extra que aprender. Tercero, la seguridad: todas las consultas están parametrizadas en un solo lugar, de modo que fuera de los repositorios no hay SQL; una búsqueda en `routes/`, `services/` y `security.py` no encontró ninguna instrucción `SELECT`, `INSERT`, `UPDATE`, `DELETE` ni llamada a `execute()` (la única excepción es `seed.py`, que carga el esquema y los datos iniciales). Esto sostiene el requisito RNF05 (mantenibilidad) y el riesgo R11."),
    note("**Límites de esta implementación.** No es un Repository \"puro\" de diseño orientado al dominio: no existen objetos de dominio y los métodos devuelven diccionarios (`RealDictCursor`). Los parámetros `many` y `write` de `_run` no se usan (deuda menor). Cuando el repositorio no recibe un cursor, cada llamada abre su propia transacción y la confirma, incluso las lecturas; la consistencia entre varias operaciones solo se garantiza si se inyecta el mismo cursor, como se muestra a continuación."),

    H3("8.3.2 Diagrama de clases de muestra de uso del patrón"),
    P("La {fig:clases} muestra la jerarquía: `BaseRepository` implementa la ejecución parametrizada y las operaciones comunes, y cada repositorio concreto hereda de ella y aporta las consultas de su tabla. Las rutas de Flask y el servicio de autenticación usan los repositorios; estos usan `transaction()` para llegar a PostgreSQL."),
    ...fig("assets/clases_repository.png", "Diagrama de clases del patrón Repository en el sistema Vástago & Co", { id: "clases", width: 610,
      desc: "BaseRepository (amarillo) con _run, find_all y find_by_id; nueve repositorios concretos que la heredan; las rutas Flask y auth_service (verde) como clientes; PostgreSQL como destino del SQL parametrizado. El diagrama muestra un subconjunto representativo de los métodos de cada clase.",
      source: "Elaboración propia a partir de backend/app/repositories/*.py, routes/ y services/auth_service.py (fuente: docs/build/assets/clases_repository.dot)." }),
    P("La {tab:colab} describe las colaboraciones del diagrama y señala dónde se implementan en el código. El diagrama coincide con el código: las 10 clases (la base y 9 repositorios) existen con los nombres y métodos mostrados."),
    ...T(["Colaboración", "Tipo", "Qué ocurre y dónde"], [
      ["Rutas → repositorios concretos", "Dependencia (usa)", "routes/negocio.py importa InsumoRepository, MovimientoRepository, ProductoRepository, OrdenRepository, AlertaRepository, PronosticoRepository y AuditoriaRepository (líneas 5–7); routes/auth.py usa UsuarioRepository y AuditoriaRepository."],
      ["auth_service → UsuarioRepository, SesionRepository, AuditoriaRepository", "Dependencia (usa)", "services/auth_service.py crea los tres repositorios con el mismo cursor dentro de una transacción (líneas 24–25 en login y 52–53 en refresh), de modo que el inicio de sesión y su auditoría son atómicos."],
      ["Repositorio concreto → BaseRepository", "Herencia", "Cada clase hereda _run, find_all y find_by_id y define la constante tabla (por ejemplo, tabla = \"insumos\")."],
      ["BaseRepository → transaction()", "Dependencia", "Sin cursor inyectado, _run abre una transacción propia (base.py, líneas 26–29); con cursor inyectado participa en la del llamador."],
      ["transaction() → pool → PostgreSQL", "Dependencia", "db.py toma una conexión de ThreadedConnectionPool (1 a 10 conexiones, RealDictCursor), confirma o revierte y la devuelve al pool (ver {cod:transaction})."],
    ], { id: "colab", title: "Colaboraciones del patrón Repository y su ubicación en el código", widths: [3.0, 1.5, 6.0], size: 16, hsize: 17,
      source: "backend/app/ (números de línea del código del repositorio a la fecha del informe)." }),
    P("Un repositorio puede usarse de dos maneras. En **modo autónomo** (`InsumoRepository().listar()`) cada llamada es una transacción corta; es adecuado para consultas de lectura aisladas. En **modo de transacción compartida** (`InsumoRepository(cur)`) varios repositorios reciben el cursor de un mismo `with transaction() as cur:` y sus operaciones se confirman o revierten juntas. Este segundo modo es el que garantiza que, por ejemplo, crear una orden, calcular su lote y registrar la auditoría formen una sola unidad, como se muestra en la sección siguiente."),

    H3("8.3.3 Ejemplo de código implementado"),
    P("Los fragmentos siguientes son líneas reales del repositorio, con su número original en el margen. El {cod:repo_base} es la clase base completa: su docstring declara el contrato (todo el SQL vive en los repositorios y se parametriza con `%s`), `__init__` recibe el cursor opcional y `_run` decide si participa en la transacción del llamador o abre la suya. `find_all` solo acepta columnas de una lista blanca porque el nombre de columna no puede parametrizarse."),
    ...cod(src("backend/app/repositories/base.py", [[1, 39]]), "BaseRepository: ejecución parametrizada y modo de transacción compartida", "repo_base",
      "backend/app/repositories/base.py, líneas 1–39 (las líneas 34 y 37 se ajustaron en dos renglones para el informe)."),
    P("El {cod:repo_inv} muestra un repositorio concreto. `InsumoRepository` hereda de la base, fija `tabla = \"insumos\"` y aporta las consultas de inventario; `bloquear_para_actualizar` emite el `SELECT ... FOR UPDATE` que las rutas usan antes de registrar una salida. `MovimientoRepository.registrar` solo inserta el movimiento: el trigger de la base (sección 8.1) actualiza el stock, por lo que el repositorio no repite esa regla."),
    ...cod(src("backend/app/repositories/inventario.py", [[1, 5], [15, 19], [22, 30]]), "InsumoRepository y MovimientoRepository: consultas parametrizadas y bloqueo de fila", "repo_inv",
      "backend/app/repositories/inventario.py, líneas 1–5, 15–19 y 22–30 (líneas largas ajustadas; \"...\" marca líneas omitidas)."),
    P("El {cod:ruta_orden} presenta el uso desde una ruta. `crear_orden` valida la entrada, abre `transaction()` y entrega el mismo cursor a tres repositorios: `ProductoRepository.find_by_id` (método heredado de la base), `OrdenRepository` (que calcula el siguiente lote y crea la orden) y `AuditoriaRepository`. Si cualquiera falla, la orden no queda creada ni auditada. La ruta no contiene SQL: recibe diccionarios y responde JSON. La ruta de lectura de inventario (líneas 26–29) es el modo autónomo, con una sola llamada y sin cursor compartido. La transacción completa de `estado_orden` (descuento de insumos por receta) ya se analizó en el {cod:completar}."),
    ...cod(src("backend/app/routes/negocio.py", [[26, 29], [77, 95]]), "Uso de los repositorios desde las rutas: lectura autónoma y escritura transaccional", "ruta_orden",
      "backend/app/routes/negocio.py, líneas 26–29 y 77–95 (líneas largas ajustadas)."),
    P("Por último, la unidad de trabajo que utilizan todos los ejemplos está en `backend/app/db.py`. El {cod:pool} muestra la creación del pool de conexiones (líneas 9–13); la función `transaction()` (líneas 16–28) ya se explicó y listó en el {cod:transaction}: toma una conexión del pool, entrega el cursor, ejecuta `COMMIT` si el bloque termina bien, `ROLLBACK` ante cualquier excepción y siempre devuelve la conexión al pool."),
    ...cod(src("backend/app/db.py", [[1, 14]]), "Pool de conexiones que respalda a transaction()", "pool",
      "backend/app/db.py, líneas 1–14 (el cuerpo de transaction(), líneas 16–28, está en el Código del capítulo 7)."),
    P("La prueba automática que ejercita todo este recorrido es el conjunto `tests/test_negocio.py`: `test_ingreso_actualiza_stock_via_trigger`, `test_salida_mayor_al_stock_rechazada` y `test_crear_orden_y_completar_descuenta_bom` recorren ruta, repositorio, trigger y restricciones contra PostgreSQL real. Las 24 pruebas del proyecto pasan en 1.32 s (`evidencias/04_pytest.txt`)."),
  ];
};
