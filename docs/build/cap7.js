// Capítulo 7 — Desarrollo e Implementación Técnica (APF2)
// Todo lo afirmado sale del código de /home/claude/vastago-sistema y de evidencias/ (ver BIBLIA.md).
module.exports = (g) => {
  const { H1, H2, H3, P, bullets, numbered, fig, table, code, note, spacer, AlignmentType } = g;

  // Bloque de código con título numerado, descripción previa (en el texto) y fuente. Líneas <= 95 caracteres.
  // Las tablas usan texto plano: el código en línea dentro de celdas pequeñas se renderiza más grande que el texto.
  const T = (h, rows, o) => table(h.map((x) => String(x).replace(/`/g, "")), rows.map((r) => r.map((c) => String(c).replace(/`/g, ""))), o);
  const cod = (text, title, id, source) => {
    text.split("\n").forEach((l, i) => { if (l.length > 95) throw new Error(`cap7: línea de código >95 (${l.length}) en "${title}", línea ${i + 1}: ${l}`); });
    return [...code(text, { title, id, size: 15 }), P("Fuente: " + source, { size: 18, color: "6B5B4B", align: AlignmentType.CENTER, after: 160 })];
  };

  return [
    H1("7. Desarrollo e Implementación Técnica"),
    P("Este capítulo documenta cómo está construido el sistema que se entrega en el Sprint 3 (versión v1 de la solución para Vástago & Co): su arquitectura, la organización del código, los fragmentos que concentran la lógica crítica y las evidencias técnicas que respaldan las decisiones de optimización. Todo lo que se afirma se verificó contra el código del repositorio (`backend/`, `frontend/`, `db/`, `ml-service/`) y contra los archivos de `evidencias/`; cuando una cifra proviene de una medición nueva realizada para este informe, se indica la fuente y cómo reproducirla."),
    note("**Alcance y honestidad técnica.** El sistema v1 cubre RF01–RF10 y RNF01–RNF06. La exportación de reportes (RF11) y las alertas por WhatsApp/correo (RF12) están planificadas para el Sprint 4 y no existen aún en el código. El despliegue real en Render queda pendiente de ejecutar con la cuenta del equipo (ver capítulo 11) y la imagen Docker no pudo construirse en el entorno de desarrollo por restricciones de red; la lógica de arranque de producción se validó ejecutando gunicorn directamente."),

    // ===================================================================== 7.1
    H2("7.1 Arquitectura general del sistema"),
    P("El sistema se organiza como una **aplicación web monolítica modular** de tres capas lógicas —presentación, lógica de negocio y datos— empaquetada en un único servicio. Un navegador carga una aplicación de página única (SPA) escrita en React 19; esa SPA consume una API REST escrita en Flask 3, y la API accede a PostgreSQL 16 exclusivamente a través de repositorios. Un script de analítica independiente (`ml-service/forecast.py`) entrena el modelo de pronóstico por lotes y deja sus resultados en un archivo JSON que el arranque del sistema carga en las tablas `demanda_historica` y `pronosticos`. La {fig:arq} resume los componentes y sus relaciones."),
    ...fig("assets/arquitectura.png", "Arquitectura general del sistema y despliegue previsto en Render", { id: "arq", width: 480,
      desc: "Capas del servicio web (React, rutas, servicios, repositorios), seguridad transversal, PostgreSQL primario y la réplica de la demostración (línea punteada: corre en local; en Render la alta disponibilidad la define el plan contratado).",
      source: "Elaboración propia a partir de Dockerfile, render.yaml, backend/app/ y db/replication/." }),
    P("La separación de responsabilidades se refleja directamente en las carpetas del repositorio (sección 7.2): la **presentación** (`frontend/src/`) solo conoce la API REST; las **rutas** (`app/routes/`) validan, autorizan y orquestan; el **servicio** `auth_service` encapsula el caso de uso de autenticación; los **repositorios** (`app/repositories/`) contienen todo el SQL; y la **base de datos** garantiza la integridad con restricciones, un trigger y una vista. Las transacciones de negocio de inventario y producción se orquestan en las propias rutas con `transaction()`, sin una capa de servicios adicional, decisión coherente con el tamaño del sistema (866 líneas de Python en `app/`)."),
    H3("Flujo de una petición"),
    P("Para ilustrar cómo cooperan las capas se sigue la operación más delicada del sistema: completar una orden de producción desde la pantalla de Producción (`PATCH /api/produccion/{id}/estado`), que descuenta los insumos de la receta. El recorrido es el siguiente."),
    ...numbered([
      "**Navegador.** `api.js` envía `Authorization: Bearer <JWT>` y `X-Requested-With: vastago-web`; ante un 401 intenta renovar la sesión con la cookie de refresh y reintenta una vez.",
      "**Plataforma y Flask.** El balanceador de Render termina TLS y reenvía a un worker de gunicorn (2 por defecto, 30 s de tiempo máximo). Flask aplica el límite global de 300 solicitudes por minuto y el tope de cuerpo de 64 KB.",
      "**Autorización.** `login_required(\"produccion:escribir\")` decodifica el JWT (HS256 fijo), toma el rol y lo contrasta con `PERMISOS`; si no corresponde, audita `ACCESO_DENEGADO` y responde 403. Luego la ruta valida el estado solicitado contra una lista cerrada.",
      "**Transacción y base de datos.** `transaction()` toma una conexión del pool y entrega un cursor que comparten los repositorios. Por cada línea de la receta se bloquea la fila del insumo (`FOR UPDATE`) y se inserta un movimiento `SALIDA`; el trigger `fn_aplicar_movimiento` actualiza el stock y el `CHECK (stock_actual >= 0)` impide dejarlo negativo.",
      "**Cierre.** `COMMIT` si todo salió bien; ante cualquier excepción, `ROLLBACK` y un error genérico sin trazas. Antes de salir, `aplicar_cabeceras` agrega CSP, HSTS (en producción), `nosniff` y `Cache-Control: no-store` para `/api/*`, y Flask-Compress comprime la respuesta si el cliente lo acepta.",
    ]),
    H3("Decisiones de diseño y su justificación"),
    P("Cada decisión de la {tab:decisiones} se tomó para resolver una necesidad concreta del proyecto (equipo de tres personas, plan gratuito de nube, datos sensibles de acceso y exigencia de integridad del inventario) y descarta explícitamente una alternativa razonable."),
    ...T(["Decisión", "Alternativa descartada", "Justificación"], [
      ["**Mismo origen**: Flask sirve la SPA y la API desde un solo servicio.", "Frontend y API en dominios distintos (CORS).", "Elimina CORS; permite la cookie de refresh con `SameSite=Strict` y una CSP restrictiva (`connect-src 'self'`); un solo servicio gratuito en Render en lugar de dos."],
      ["**Sin Create React App**; compilación con **esbuild** (`build.mjs`, 10 líneas).", "CRA o una configuración de webpack.", "El equipo de React declaró obsoleto Create React App en febrero de 2025 (React Team, 2025). esbuild no requiere archivos de configuración, compila en milisegundos y produce el bundle minificado de 243,725 B usado en producción."],
      ["**Pool de conexiones** de 1 a 10 conexiones.", "Abrir una conexión por petición.", "Evita el costo de conexión/autenticación SCRAM por solicitud. Con 2 workers el máximo teórico es 20 conexiones, muy por debajo de `max_connections = 100` de PostgreSQL. Los workers de gunicorn son síncronos (un request a la vez), por lo que el límite de 10 es un margen, no una necesidad."],
      ["**Patrón Repository** más la unidad de trabajo `transaction()`.", "SQL disperso en las rutas o un ORM completo.", "Concentra el SQL (auditable, parametrizado), permite que varios repositorios participen en una misma transacción y mantiene el código pequeño (sección 8.3)."],
      ["**Reglas de integridad en la base de datos** (CHECK, trigger de stock, FK).", "Validar solo en Python.", "Garantizan consistencia aunque otra aplicación o un script escriba directamente en la BD; mitigan el riesgo R10 (inventario inconsistente)."],
      ["**Modelo de pronóstico fuera de línea** (`forecast.py` → JSON → seed).", "Servicio de inferencia en línea con scikit-learn dentro del contenedor.", "`requirements.txt` del backend no incluye numpy, pandas ni scikit-learn: la imagen es más liviana y el arranque más rápido. El costo es que el pronóstico no se recalcula solo; el reentrenamiento queda para el Sprint 5."],
    ], { id: "decisiones", title: "Decisiones de arquitectura, alternativas descartadas y justificación", widths: [2.3, 1.8, 4.3], size: 18,
      source: "Elaboración propia; React Team (2025), Sunsetting Create React App, https://react.dev/blog/2025/02/14/sunsetting-create-react-app" }),
    H3("Despliegue"),
    P("El `Dockerfile` es multi-etapa (node:22-alpine compila el frontend; python:3.13-slim ejecuta el backend con un usuario no root, UID 10001) y arranca con `python -m app.seed --if-empty && gunicorn`, que crea esquema y datos solo si la base está vacía y nunca borra datos existentes. El Blueprint `render.yaml` declara una base PostgreSQL 16 (`vastago-db`, plan `free`) y el servicio web `vastago-sistema` (`runtime: docker`, `healthCheckPath: /api/health`), con `JWT_SECRET` y `FIELD_ENCRYPTION_KEY` generados por Render (`generateValue: true`, nunca en el repositorio) y `DEMO_PASSWORD` definida en el panel (`sync: false`); en producción `Config.validate()` se niega a arrancar con los secretos de desarrollo."),
    P("Según la documentación oficial de Render, las bases PostgreSQL gratuitas **expiran 30 días después de su creación** (14 días de gracia), tienen 1 GB y no ofrecen respaldos, y los servicios web gratuitos se **suspenden tras 15 minutos sin tráfico** y tardan cerca de un minuto en reactivarse (Render, s. f.-a). Es el riesgo R8, y por eso la política de respaldo del capítulo 8 no depende de Render sino de `pg_dump` propio."),

    // ===================================================================== 7.2
    H2("7.2 Estructura del código fuente"),
    P("El repositorio separa con claridad backend, frontend, base de datos, analítica y evidencias. El árbol de la {cod:arbol} corresponde al contenido real del proyecto (se omiten `node_modules`, cachés y las capturas)."),
    ...cod(`vastago-sistema/
├── backend/
│   ├── app/
│   │   ├── __init__.py        # create_app(): config, pool, compresión, blueprints, SPA
│   │   ├── config.py          # variables de entorno; valida secretos en producción
│   │   ├── db.py              # ThreadedConnectionPool + transaction() (unit of work)
│   │   ├── extensions.py      # Flask-Limiter (300 por minuto por defecto)
│   │   ├── security.py        # bcrypt, JWT, AES-256-GCM, PERMISOS (RBAC), cabeceras
│   │   ├── seed.py            # crea esquema y datos demo (--if-empty)
│   │   ├── repositories/      # base.py, inventario.py, produccion.py,
│   │   │                      # usuarios.py, analitica.py
│   │   ├── routes/            # auth.py (/api/auth/*), negocio.py (/api/*)
│   │   └── services/          # auth_service.py
│   ├── tests/                 # test_negocio.py, test_seguridad.py, conftest.py
│   ├── static/                # SPA compilada (bundle.js, bundle.css, index.html)
│   ├── gunicorn.conf.py  wsgi.py  requirements.txt
├── frontend/
│   ├── src/                   # App.jsx, api.js, main.jsx, styles.css, components/*.jsx
│   ├── public/index.html  build.mjs  package.json
├── db/
│   ├── schema.sql  seed_catalogo.sql
│   ├── admin/                 # backup_restore.sh, monitoreo.sql, explain/*.sql
│   └── replication/           # 01_primary_config.sql, setup_replica.sh
├── ml-service/                # forecast.py, historico_demanda.csv, forecast_output.json
├── evidencias/                # 01..06 (BD, pytest, EXPLAIN), wpo/, seguridad/, capturas/
├── Dockerfile  render.yaml  .env.example  .github/workflows/ci.yml
└── docs/                      # fuentes del informe`, "Árbol del código fuente del proyecto", "arbol",
      "Estructura real del repositorio /home/claude/vastago-sistema (elaboración propia)."),
    P("La {tab:modulos} detalla la responsabilidad de cada módulo del backend y el tamaño de cada archivo en líneas físicas (el total de `backend/app/` es de 866 líneas de Python, lo que evidencia un diseño deliberadamente compacto y fácil de revisar). El frontend suma 311 líneas entre JSX y JavaScript más 34 de CSS; esas líneas son densas porque cada componente concentra estado, llamadas a la API y presentación."),
    ...T(["Módulo", "Líneas", "Responsabilidad"], [
      ["`app/__init__.py`", "66", "Fábrica `create_app()`: carga configuración, inicializa el pool, el limitador y la compresión, registra los blueprints, define los manejadores de error genéricos y la ruta que sirve la SPA (`_plano()`, sección 7.4)."],
      ["`app/config.py`", "34", "Lectura centralizada de variables de entorno (`DATABASE_URL`, `JWT_SECRET`, `FIELD_ENCRYPTION_KEY`, tiempos de token, intentos de login). Prohíbe los secretos de desarrollo en producción."],
      ["`app/db.py`", "28", "Pool `ThreadedConnectionPool` (1 a 10 conexiones, cursores tipo diccionario) y gestor de contexto `transaction()`."],
      ["`app/security.py`", "128", "Hash bcrypt (cost 12), política de contraseñas, creación y validación de JWT, refresh token opaco (SHA-256), cifrado AES-256-GCM, tabla `PERMISOS`, decorador `login_required` y cabeceras de seguridad (detalle en el capítulo 9)."],
      ["`app/routes/auth.py`", "116", "Login, refresh, logout, gestión de usuarios y consulta de la bitácora."],
      ["`app/routes/negocio.py`", "142", "Inventario, movimientos, productos, BOM, órdenes de producción, alertas, KPIs y pronóstico; orquesta las transacciones de negocio."],
      ["`app/services/auth_service.py`", "72", "Casos de uso `login`, `refresh` y `logout`; igualación de tiempos con un hash ficticio para evitar enumerar usuarios."],
      ["`app/repositories/*.py`", "217", "`BaseRepository` (39), `InsumoRepository`/`MovimientoRepository` (35), `ProductoRepository`/`OrdenRepository` (39), `UsuarioRepository`/`SesionRepository` (58) y `AlertaRepository`/`PronosticoRepository`/`AuditoriaRepository` (46)."],
      ["`app/seed.py`", "59", "Aplica `schema.sql` y `seed_catalogo.sql`, crea los 4 usuarios demo y las órdenes de ejemplo, y carga `forecast_output.json`."],
      ["`frontend/src/`", "311", "`App.jsx` (shell, navegación filtrada por permisos), `api.js` (cliente con renovación de sesión) y los componentes Login, Dashboard, Inventario, Producción, Analítica y Admin."],
      ["`ml-service/forecast.py`", "47", "Genera la serie histórica de demostración, entrena el modelo por producto y calcula el MAPE."],
    ], { id: "modulos", title: "Responsabilidad y tamaño de cada módulo", widths: [2.2, 0.9, 5.3], size: 17, align: [AlignmentType.LEFT, AlignmentType.CENTER, AlignmentType.LEFT],
      source: "Elaboración propia; conteo de líneas físicas con wc -l sobre el repositorio (06-oct-2026)." }),
    H3("API REST: endpoints, roles y requerimientos"),
    P("La API expone 19 endpoints bajo `/api` más la ruta de captura que entrega la SPA. La {tab:endpoints} los lista con su método, el permiso exigido (definido en `security.PERMISOS`) y el requerimiento funcional que satisfacen; la {tab:rbac} traduce cada permiso a los roles autorizados. Cualquier otra ruta que empiece por `api/` devuelve 404 en JSON y nunca la SPA."),
    ...T(["Método", "Ruta", "Acceso", "RF", "Función"], [
      ["GET", "`/api/health`", "Público", "RNF03", "Verificación de salud usada por Render (`healthCheckPath`)."],
      ["POST", "`/api/auth/login`", "Público (10/min)", "RF05", "Autentica; entrega JWT y cookie de refresh HttpOnly."],
      ["POST", "`/api/auth/refresh`", "Cookie + `X-Requested-With` (30/min)", "RF05", "Rota el refresh token y emite un nuevo JWT."],
      ["POST", "`/api/auth/logout`", "Autenticado (cualquier rol)", "RF05", "Revoca la sesión y borra la cookie."],
      ["GET", "`/api/auth/usuarios`", "`usuarios:gestionar`", "RF07", "Lista usuarios."],
      ["POST", "`/api/auth/usuarios`", "`usuarios:gestionar`", "RF07", "Crea usuario (política de contraseña, teléfono cifrado)."],
      ["PATCH", "`/api/auth/usuarios/<uid>`", "`usuarios:gestionar`", "RF07", "Activa o desactiva un usuario."],
      ["GET", "`/api/auth/auditoria`", "`auditoria:ver`", "RF08", "Últimos 200 eventos de la bitácora."],
      ["GET", "`/api/inventario`", "`inventario:ver`", "RF02", "Stock con semáforo (vista `v_inventario`)."],
      ["GET", "`/api/inventario/<id>/movimientos`", "`inventario:ver`", "RF02", "Historial de movimientos de un insumo."],
      ["POST", "`/api/inventario/<id>/movimientos`", "`inventario:escribir`", "RF01", "Registra ingreso o salida (transacción con bloqueo)."],
      ["GET", "`/api/productos`", "`produccion:ver`", "RF04", "Catálogo de productos."],
      ["GET", "`/api/productos/<pid>/bom`", "`produccion:ver`", "RF04", "Receta (BOM) del producto."],
      ["GET", "`/api/produccion`", "`produccion:ver`", "RF04", "Órdenes de producción."],
      ["POST", "`/api/produccion`", "`produccion:escribir`", "RF04", "Crea orden con lote correlativo."],
      ["PATCH", "`/api/produccion/<oid>/estado`", "`produccion:escribir`", "RF04", "Inicia o completa; al completar descuenta insumos."],
      ["GET", "`/api/alertas`", "`dashboard:ver`", "RF03", "Alertas visibles en el sistema."],
      ["GET", "`/api/kpis`", "`dashboard:ver`", "RF10", "Indicadores del dashboard."],
      ["GET", "`/api/forecast`", "`analitica:ver`", "RF09", "Serie histórica, pronóstico a 3 meses y MAPE por producto."],
    ], { id: "endpoints", title: "Endpoints REST, permiso requerido y requerimiento funcional", widths: [0.95, 2.7, 2.1, 0.8, 2.6], size: 16,
      align: [AlignmentType.CENTER, AlignmentType.LEFT, AlignmentType.LEFT, AlignmentType.CENTER, AlignmentType.LEFT],
      source: "Elaboración propia a partir de backend/app/routes/auth.py, backend/app/routes/negocio.py y backend/app/security.py." }),
    P("Los permisos se resuelven una sola vez, en `PERMISOS`; el frontend recibe en el login la lista de permisos del rol y construye el menú con ella (`App.jsx` filtra las vistas), pero la decisión de seguridad nunca descansa en el navegador: cada endpoint vuelve a verificarla en el servidor."),
    ...T(["Permiso", "Administrador", "Jefe de Producción", "Almacenero", "Gerente"], [
      ["`dashboard:ver`", "Sí", "Sí", "Sí", "Sí"],
      ["`inventario:ver`", "Sí", "Sí", "Sí", "—"],
      ["`inventario:escribir`", "Sí", "—", "Sí", "—"],
      ["`produccion:ver`", "Sí", "Sí", "Sí", "Sí"],
      ["`produccion:escribir`", "Sí", "Sí", "—", "—"],
      ["`analitica:ver`", "Sí", "Sí", "—", "Sí"],
      ["`usuarios:gestionar`", "Sí", "—", "—", "—"],
      ["`auditoria:ver`", "Sí", "—", "—", "—"],
    ], { id: "rbac", title: "Matriz de permisos por rol (RBAC)", widths: [2.6, 1.6, 1.8, 1.4, 1.2], size: 17,
      align: [AlignmentType.LEFT, AlignmentType.CENTER, AlignmentType.CENTER, AlignmentType.CENTER, AlignmentType.CENTER],
      source: "backend/app/security.py, diccionario PERMISOS." }),
    P("El proyecto incluye 24 pruebas automáticas con pytest (8 funcionales de negocio y 16 de seguridad) que se ejecutan en cada `push` mediante GitHub Actions contra un PostgreSQL 16 efímero; el último resultado local registrado en `evidencias/04_pytest.txt` es `24 passed in 1.32s`. El análisis detallado de las pruebas corresponde al capítulo 10."),

    // ===================================================================== 7.3
    H2("7.3 Código optimizado y evidencia técnica"),
    P("Esta sección reúne los fragmentos que concentran las decisiones técnicas más importantes y los acompaña de evidencia ejecutada. Los bloques son copias del código real con saltos de línea ajustados. Las ejecuciones nuevas sobre la base de demostración fueron de solo lectura o quedaron confinadas a una transacción con `ROLLBACK`, de modo que los datos reales no se modificaron."),
    H3("Transacciones atómicas (unidad de trabajo)"),
    P("Cada operación de negocio que escribe en más de una tabla se ejecuta dentro de `transaction()` ({cod:transaction}): el gestor de contexto toma una conexión del pool, entrega el cursor, confirma si el bloque termina bien y revierte ante cualquier excepción, devolviendo siempre la conexión al pool. Los repositorios reciben ese cursor, de manera que participan en la misma transacción."),
    ...cod(`# init_pool(): _pool = ThreadedConnectionPool(1, 10, dsn, cursor_factory=RealDictCursor)

@contextmanager
def transaction():
    """Entrega un cursor dentro de una transacción: commit si todo sale bien,
    rollback si falla."""
    conn = _pool.getconn()
    try:
        with conn.cursor() as cur:
            yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _pool.putconn(conn)`, "Pool de conexiones y unidad de trabajo transaction()", "transaction", "backend/app/db.py."),
    P("El uso más representativo es completar una orden ({cod:completar}). Cambiar el estado de la orden, generar una salida por cada insumo de la receta y registrar la auditoría forman **una sola transacción**: si cualquier salida falla (por ejemplo, por stock insuficiente), nada se confirma, la orden permanece en su estado anterior y no quedan descuentos parciales. Esta propiedad es la que mitiga el riesgo R10 (inventario inconsistente)."),
    ...cod(`@bp.patch("/produccion/<int:oid>/estado")
@login_required("produccion:escribir")
def estado_orden(oid):
    """Al completar una orden se descuentan los insumos según la receta (BOM),
    en una sola transacción."""
    nuevo = (request.get_json(silent=True) or {}).get("estado")
    if nuevo not in ("En proceso", "Completada"):
        return jsonify(error="Estado inválido"), 400
    with transaction() as cur:
        o = OrdenRepository(cur).cambiar_estado(oid, nuevo)
        if not o:
            return jsonify(error="Orden no encontrada"), 404
        if nuevo == "Completada":
            for linea in ProductoRepository(cur).bom(o["producto_id"]):
                InsumoRepository(cur).bloquear_para_actualizar(linea["insumo_id"])
                MovimientoRepository(cur).registrar(
                    linea["insumo_id"], "SALIDA",
                    round(linea["cantidadPorUnidad"] * o["cantidad"], 3),
                    "Consumo " + o["lote"], g.usuario["id"], o["id"])
        AuditoriaRepository(cur).registrar(
            "ORDEN_ESTADO", g.usuario["id"], entidad="ordenes_produccion",
            detalle={"lote": o["lote"], "estado": nuevo}, ip=request.remote_addr)
    return jsonify(id=o["id"], lote=o["lote"], estado=o["estado"])`, "Completar una orden: descuento de insumos por receta en una sola transacción", "completar", "backend/app/routes/negocio.py, función estado_orden."),
    H3("Trigger de stock, restricciones y control de concurrencia"),
    P("El stock no se actualiza desde Python: lo hace el trigger `trg_movimiento_stock` de PostgreSQL cada vez que se inserta una fila en `movimientos_inventario` ({cod:trigger}). La aplicación solo registra el movimiento; la base garantiza que el saldo cambie de forma atómica y que `CHECK (stock_actual >= 0)` impida cantidades negativas aunque otra aplicación escriba directamente en la tabla. El tipo `AJUSTE` fija el stock al valor indicado; existe en el modelo y el trigger, pero la API v1 solo expone INGRESO y SALIDA."),
    ...cod(`CREATE FUNCTION fn_aplicar_movimiento() RETURNS trigger AS $$
BEGIN
    IF NEW.tipo = 'INGRESO' THEN
        UPDATE insumos SET stock_actual = stock_actual + NEW.cantidad,
               actualizado_en = now() WHERE id = NEW.insumo_id;
    ELSIF NEW.tipo = 'SALIDA' THEN
        UPDATE insumos SET stock_actual = stock_actual - NEW.cantidad,
               actualizado_en = now() WHERE id = NEW.insumo_id;
        -- el CHECK (stock_actual >= 0) evita stock negativo
    ELSE
        UPDATE insumos SET stock_actual = NEW.cantidad,
               actualizado_en = now() WHERE id = NEW.insumo_id;
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_movimiento_stock AFTER INSERT ON movimientos_inventario
    FOR EACH ROW EXECUTE FUNCTION fn_aplicar_movimiento();`, "Trigger que aplica cada movimiento al stock del insumo", "trigger", "db/schema.sql (líneas 147–164; saltos de línea ajustados)."),
    P("Para dejar constancia de que estas defensas funcionan se ejecutó, el 06-oct-2026, un guion dentro de una transacción con `ROLLBACK` final ({cod:trigger_ev}). Un ingreso de 10 kg eleva el stock de la lecitina de soya de 40 a 50 kg (el trigger actuó); una salida de 99,999 kg es rechazada por el CHECK del stock; un tipo de movimiento inválido es rechazado por el CHECK de la tabla de movimientos; y los intentos de `UPDATE` y `DELETE` sobre `auditoria` son bloqueados por su trigger de inmutabilidad. Tras el `ROLLBACK` el stock vuelve a 40 kg y la tabla conserva sus 5 movimientos."),
    ...cod(`BEGIN;
SELECT id, nombre, stock_actual FROM insumos WHERE id = 5;       -- 40.000
INSERT INTO movimientos_inventario (insumo_id,tipo,cantidad,motivo,usuario_id)
       VALUES (5,'INGRESO',10,'prueba trigger',1);
SELECT id, nombre, stock_actual FROM insumos WHERE id = 5;       -- 50.000 (trigger)
INSERT ... VALUES (5,'SALIDA',99999,'prueba CHECK',1);
ERROR: new row for relation "insumos" violates check constraint
       "insumos_stock_actual_check"  (fn_aplicar_movimiento() line 7)
INSERT ... VALUES (5,'XX',1,'prueba CHECK tipo',1);
ERROR: new row for relation "movimientos_inventario" violates check constraint
       "movimientos_inventario_tipo_check"
UPDATE auditoria SET accion = 'X' WHERE id = 1;
ERROR: La tabla auditoria es de solo lectura/anexado
DELETE FROM auditoria WHERE id = 1;
ERROR: La tabla auditoria es de solo lectura/anexado
ROLLBACK;
SELECT ... WHERE id = 5;  -- 40.000     SELECT count(*) ... ;  -- 5 movimientos`,
      "Evidencia: trigger de stock, CHECK y bitácora inmutable (con ROLLBACK)", "trigger_ev", "Ejecución propia (06-oct-2026), salida completa en evidencias/06_integridad_trigger.txt; guion en db/admin/explain/trg.sql."),
    P("La concurrencia se controla con bloqueo pesimista de fila. Antes de aceptar una salida, la ruta de movimientos bloquea el insumo con `SELECT ... FOR UPDATE` (método `bloquear_para_actualizar`) y lee su stock ya bloqueado; así dos operarios que retiran el mismo insumo al mismo tiempo se serializan y el segundo ve el saldo real. Además, `_num()` rechaza cantidades no numéricas, cero, negativas, infinitas y `NaN` (porque `0 < n <= maximo` es falso para ellas) y fija topes (1,000,000 para movimientos y 100,000 para órdenes); el motivo se recorta a 120 caracteres, igual que la columna."),
    ...cod(`def _num(valor, maximo):
    try:
        n = float(valor)
    except (TypeError, ValueError):
        return None
    return n if 0 < n <= maximo else None

# en movimiento(insumo_id), dentro de "with transaction() as cur:"
ins = insumos.bloquear_para_actualizar(insumo_id)   # SELECT ... FOR UPDATE
if tipo == "SALIDA" and float(ins["stock_actual"]) < cantidad:
    return jsonify(error="Stock insuficiente"), 409`, "Validación numérica y bloqueo de fila al registrar un movimiento", "movimiento", "backend/app/routes/negocio.py, funciones _num y movimiento (fragmentos)."),
    H3("Consultas parametrizadas"),
    P("Ninguna ruta arma SQL: toda consulta vive en un repositorio y envía los valores como parámetros (`%s`) a `cursor.execute(sql, params)`, por lo que el controlador los trata siempre como datos. Las dos únicas interpolaciones de texto del sistema están en `BaseRepository` ({cod:base_sql}): el nombre de la tabla (constante de clase) y la columna de orden de `find_all`, validada contra una lista blanca; ambas llevan `# nosec` con su justificación para Bandit. La prueba `test_inyeccion_sql_no_funciona` y la sesión de sqlmap (evidencias/seguridad/sqlmap.txt) respaldan la defensa; se analizan en el capítulo 9."),
    ...cod(`def _run(self, sql, params=(), many=False, one=False, write=False):
    def exec_(cur):
        cur.execute(sql, params)             # valores siempre como parámetros
        ...
    if self._cur is not None:                # participa en la transacción del llamador
        return exec_(self._cur)
    with transaction() as cur:               # o abre una propia
        return exec_(cur)

def find_all(self, order_by="id"):
    if order_by not in self.COLUMNAS_ORDENABLES:
        raise ValueError("columna de orden no permitida")
    return self._run(f"SELECT * FROM {self.tabla} ORDER BY {order_by}")  # nosec B608`,
      "Ejecución parametrizada y lista blanca de columnas en BaseRepository", "base_sql", "backend/app/repositories/base.py (cuerpo de exec_ abreviado; versión completa en la sección 8.3)."),
    H3("Receta (BOM) con vista previa de consumo"),
    P("Al crear una orden, el Jefe de Producción ve de inmediato cuántos kilogramos o unidades de cada insumo se consumirán. La pantalla pide la receta del producto una sola vez (`GET /api/productos/{id}/bom`, cuya consulta une `bom` e `insumos`) y calcula el consumo **en el navegador** multiplicando `cantidadPorUnidad` por la cantidad digitada ({cod:bom}); así, cambiar la cantidad actualiza la vista previa sin nuevas llamadas al servidor. La cifra definitiva la calcula el servidor al completar la orden, con redondeo a tres decimales (columna `NUMERIC(12,3)`). Con los datos de demostración, completar 100 unidades de la tableta 70 % descuenta 6.5 kg de cacao (0.065 kg por unidad) y 100 empaques, resultado comprobado por la prueba `test_crear_orden_y_completar_descuenta_bom`."),
    ...cod(`# backend/app/repositories/produccion.py
def bom(self, producto_id):
    return self._run(
        "SELECT i.id AS insumo_id, i.nombre AS insumo, "
        "b.cantidad_por_unidad::float AS \\"cantidadPorUnidad\\", i.unidad "
        "FROM bom b JOIN insumos i ON i.id = b.insumo_id "
        "WHERE b.producto_id = %s ORDER BY i.nombre", (producto_id,))

// frontend/src/components/Produccion.jsx
useEffect(() => { if (pid) api.bom(pid).then(setBom).catch(() => setBom([])); }, [pid]);
...
<ul>{bom.map((r) => <li key={r.insumo_id}>{r.insumo}:
  <strong>{(r.cantidadPorUnidad * (Number(cant) || 0)).toFixed(1)} {r.unidad}</strong>
</li>)}</ul>`, "Receta (BOM): consulta del repositorio y vista previa de consumo en la interfaz", "bom", "backend/app/repositories/produccion.py y frontend/src/components/Produccion.jsx (formato ajustado)."),
    H3("Pronóstico de demanda"),
    P("El módulo de analítica (`ml-service/forecast.py`) ajusta, para cada producto, una **regresión lineal** con una variable de tendencia (`t`) y doce variables indicadoras de mes ({cod:forecast}), lo que captura el crecimiento y la estacionalidad (Día de la Madre, fiestas patrias, Navidad). Para medir el error se entrena con los primeros 20 meses y se evalúa en los últimos 4 (retención de validación), calculando el MAPE; luego se reentrena con los 24 meses y se proyectan 3 meses. Los resultados quedan en `forecast_output.json`, que `seed.py` carga en `demanda_historica` y `pronosticos`, y `GET /api/forecast` entrega a la pantalla de Analítica IA."),
    ...cod(`def feats(idx, tt):
    X = pd.DataFrame({"t": tt})
    for m in range(1, 13): X[f"m{m}"] = (idx.month == m).astype(int)
    return X

def fit_forecast(y, periods=3):
    X = feats(months, t)
    m = LinearRegression().fit(X.iloc[:-4], y[:-4])
    mape = mean_absolute_percentage_error(
        y[-4:], np.clip(m.predict(X.iloc[-4:]), 1, None)) * 100
    full = LinearRegression().fit(X, y)
    fidx = pd.date_range(months[-1] + pd.offsets.MonthBegin(1),
                         periods=periods, freq="MS")
    return mape, fidx, np.clip(full.predict(
        feats(fidx, np.arange(24, 24 + periods))), 0, None)`,
      "Modelo de pronóstico: tendencia lineal más estacionalidad mensual", "forecast", "ml-service/forecast.py (formato ajustado)."),
    P("La {tab:forecast} presenta lo que el modelo produjo con la serie incluida en el repositorio. Es importante declarar una limitación: **la serie histórica de 24 meses (ene-2024 a dic-2025) es sintética**; la genera el propio script con una semilla aleatoria fija (42), tendencia, picos estacionales y ruido, porque la empresa aún no entrega un histórico formal (riesgo R2). Por ello el MAPE obtenido (2.1 % a 7.0 %) demuestra que el flujo técnico funciona, pero **no** es una medida de precisión sobre la demanda real de Vástago & Co; se recalculará en el Sprint 5 con los datos reales disponibles. Por la misma razón, el horizonte proyectado (ene–mar 2026) sigue a la última fecha de la serie y se desplazará al actualizar los datos."),
    ...T(["Producto", "MAPE (validación)", "Ene-2026", "Feb-2026", "Mar-2026"], [
      ["Tableta 70% Cacao 100g", "2.1 %", "1,016 kg", "1,016 kg", "1,045 kg"],
      ["Bombones Caja x6", "4.5 %", "501 kg", "495 kg", "512 kg"],
      ["Tableta de Regalo 150g", "7.0 %", "352 kg", "364 kg", "376 kg"],
    ], { id: "forecast", title: "Pronóstico a 3 meses y error de validación (serie sintética de demostración)", widths: [2.6, 1.5, 1.2, 1.2, 1.2], size: 18,
      align: [AlignmentType.LEFT, AlignmentType.CENTER, AlignmentType.CENTER, AlignmentType.CENTER, AlignmentType.CENTER],
      source: "ml-service/forecast_output.json (generado con forecast.py, semilla 42)." }),
    H3("Índices y planes de ejecución (EXPLAIN ANALYZE)"),
    P("Para justificar los índices se ejecutó `EXPLAIN (ANALYZE, BUFFERS)` sobre el PostgreSQL 16.15 primario (puerto 5433, base `vastago`) en dos partes. **Parte 1:** las ocho consultas reales del sistema sobre los datos de demostración. **Parte 2:** como esas tablas tienen entre 3 y 86 filas y el planificador correctamente prefiere el recorrido secuencial, se repitieron tres consultas representativas sobre **tablas temporales con carga sintética** (300,000, 500,000 y 200,000 filas; `CREATE TEMP TABLE` más `generate_series`, que no generan WAL ni tocan los datos reales), comparando el plan sin índice y con índice. Resultados completos en `evidencias/05_explain_analyze.txt`; guiones en `db/admin/explain/`."),
    P("La {tab:explain_real} resume la parte 1. La consulta de historial (Q1) ya usa el índice compuesto `ix_mov_insumo_fecha`; la reserva de fila por clave primaria (Q3) y la receta (Q4) usan `insumos_pkey` y `bom_pkey`. Las demás consultas recorren secuencialmente tablas de entre 3 y 86 filas, que es el plan óptimo a ese tamaño (una lectura de página); todas se ejecutan en menos de 0.12 ms."),
    ...T(["Consulta (repositorio)", "Plan elegido", "Tiempo", "Observación"], [
      ["Q1 historial de movimientos", "Index Scan `ix_mov_insumo_fecha` + Nested Loop", "0.089 ms", "Usa el índice compuesto; evita ordenar."],
      ["Q2 inventario (`v_inventario`)", "Seq Scan `insumos` + Sort", "0.068 ms", "7 filas: recorrido secuencial es óptimo."],
      ["Q3 bloqueo `FOR UPDATE` por id", "Index Scan `insumos_pkey` + LockRows", "0.036 ms", "Bloquea solo una fila."],
      ["Q4 receta (BOM)", "Bitmap Index Scan `bom_pkey` + Hash Join", "0.099 ms", "Usa la PK compuesta (producto, insumo)."],
      ["Q5 login `lower(email)`", "Seq Scan `usuarios` (filtro)", "0.041 ms", "Hallazgo: `usuarios_email_key` indexa `email`, no `lower(email)`."],
      ["Q6 refresh (`token_hash`)", "Seq Scan `sesiones` (68 filas)", "0.061 ms", "A 68 filas el planificador no necesita el índice único."],
      ["Q7 últimos 200 de auditoría", "Seq Scan + Sort", "0.114 ms", "A escala usa la PK hacia atrás (caso B3)."],
      ["Q8 KPIs de órdenes activas", "Aggregate + Seq Scan", "0.088 ms", "Agregación sin filtro: recorre toda la tabla (6 filas)."],
    ], { id: "explain_real", title: "Planes de ejecución de las consultas reales del sistema (datos de demostración)", widths: [2.2, 2.6, 1.0, 2.9], size: 17,
      align: [AlignmentType.LEFT, AlignmentType.LEFT, AlignmentType.CENTER, AlignmentType.LEFT],
      source: "Ejecución propia (06-oct-2026) en PostgreSQL 16.15; evidencias/05_explain_analyze.txt, parte 1." }),
    P("La parte 2 sí muestra el efecto de cada índice ({cod:explain_a}). El historial por insumo con 300,000 movimientos pasa de recorrer toda la tabla y ordenar en memoria (`Seq Scan` + `top-N heapsort`, 34.934 ms) a leer solo las 20 entradas necesarias del índice `(insumo_id, fecha DESC)` (`Index Scan`, 0.045 ms). Como el índice ya almacena las filas de cada insumo ordenadas por fecha descendente, el `LIMIT 20` termina al leer 20 entradas: el costo deja de crecer con el tamaño de la tabla."),
    ...cod(`-- A1: SIN índice (300 000 filas, insumo_id = 3)
Limit (actual time=34.911..34.916 rows=20)
  -> Sort (Sort Key: fecha DESC; top-N heapsort, Memory: 26kB)
       -> Seq Scan on mov_t (actual time=0.009..26.587 rows=42857)
            Filter: (insumo_id = 3)    Rows Removed by Filter: 257143
Execution Time: 34.934 ms

-- A2: CON índice (insumo_id, fecha DESC)
Limit (actual time=0.023..0.031 rows=20)
  -> Index Scan using ix_mov_t on mov_t (actual time=0.023..0.029 rows=20)
       Index Cond: (insumo_id = 3)
Execution Time: 0.045 ms`, "Evidencia: efecto del índice compuesto en el historial de movimientos (extracto)", "explain_a",
      "evidencias/05_explain_analyze.txt (parte 2, casos A1 y A2; extracto con formato ajustado)."),
    P("Los otros dos casos se resumen en la {tab:indice_bench}. En el caso B, un filtro por rango de fechas sobre 500,000 eventos de auditoría (las últimas 2 horas, 7,199 filas) pasa de recorrer toda la tabla y ordenar a un `Index Scan` sobre `ix_auditoria_fecha`; la consulta que hoy usa la pantalla (`ORDER BY id DESC LIMIT 200`) ya es eficiente por la clave primaria (0.069 ms, `Index Scan Backward`). En el caso C, la búsqueda de un refresh token entre 200,000 sesiones pasa de 24.406 ms a 0.032 ms gracias al índice único de `token_hash`. Un detalle técnico verificado: con el tipo `CHAR(64)` la comparación debe hacerse con un literal sin tipo (como lo envía psycopg2); si se compara con una expresión de tipo `text` el planificador castea la columna y descarta el índice."),
    ...T(["Caso", "Tabla temporal", "Sin índice", "Con índice", "Reducción"], [
      ["A: historial por insumo (LIMIT 20)", "300,000 movimientos", "34.934 ms (Seq Scan + Sort)", "0.045 ms (Index Scan)", "99.87 % (≈776 veces)"],
      ["B: auditoría por rango de fechas", "500,000 eventos", "53.727 ms (Seq Scan + Sort)", "1.441 ms (Index Scan)", "97.32 % (≈37 veces)"],
      ["C: refresh token por `token_hash`", "200,000 sesiones", "24.406 ms (Seq Scan)", "0.032 ms (Index Scan)", "99.87 % (≈763 veces)"],
    ], { id: "indice_bench", title: "Efecto de los índices a escala (carga sintética en tablas temporales)", widths: [2.4, 1.5, 1.9, 1.6, 1.4], size: 17,
      source: "Ejecución propia (06-oct-2026), evidencias/05_explain_analyze.txt, parte 2. Reducción = (sin − con) / sin; tiempos de un solo EXPLAIN ANALYZE, orden de magnitud y no un benchmark estadístico." }),
    P("La {tab:indices} resume los índices del esquema (24 en total: 12 claves primarias, 6 restricciones únicas y 6 índices explícitos) y declara con franqueza cuáles tienen evidencia de uso. Las estadísticas `pg_stat_user_indexes` del 06-oct muestran que, con el volumen de demostración, solo `ix_mov_insumo_fecha` y los índices únicos de `email` y `token_hash` han sido consultados; los demás son decisiones de diseño para el crecimiento de la tabla o para sostener claves foráneas, no optimizaciones comprobadas hoy."),
    ...T(["Índice", "Definición", "Consulta o motivo", "Evidencia"], [
      ["`ix_mov_insumo_fecha`", "`movimientos_inventario(insumo_id, fecha DESC)`", "Historial por insumo (HU03).", "Q1 y caso A; usado en la BD real."],
      ["`ix_auditoria_fecha`", "`auditoria(fecha DESC)`", "Consultas por rango de fechas de la bitácora (HU11).", "Caso B; sin uso aún en la pantalla actual."],
      ["`ix_auditoria_usuario`", "`auditoria(usuario_id)`", "Filtrar por usuario; apoya `ON DELETE SET NULL` de la FK.", "Diseño; sin medición propia."],
      ["`ix_ordenes_estado`", "`ordenes_produccion(estado)`", "Filtrar órdenes por estado.", "Baja cardinalidad (3 valores): beneficio limitado hoy."],
      ["`ix_sesiones_usuario`", "`sesiones(usuario_id) WHERE NOT revocada`", "Índice parcial para `revocar_todas` (definido, aún no invocado por ninguna ruta).", "Diseño; sin medición propia."],
      ["`ix_usuarios_rol`", "`usuarios(rol_id)`", "Sostiene la FK hacia `roles`.", "Diseño; 5 usuarios no lo justifican aún."],
      ["`sesiones_token_hash_key`", "UNIQUE `token_hash`", "Búsqueda del refresh token (cada renovación).", "Caso C; usado en la BD real."],
      ["`usuarios_email_key`", "UNIQUE `email`", "Unicidad de correo y login.", "Usado; ver hallazgo Q5."],
    ], { id: "indices", title: "Índices del esquema, motivo y evidencia de uso", widths: [2.3, 2.6, 2.5, 2.0], size: 16,
      source: "db/schema.sql; \\di y pg_stat_user_indexes consultados el 06-oct-2026." }),
    note("**Deuda técnica identificada (se gestiona bajo el riesgo R11).** (1) El login busca por `lower(email)`, expresión que no puede usar el índice único de `email`; con decenas de usuarios es irrelevante, pero si crecieran se debería crear un índice sobre `lower(email)`. (2) `PATCH /api/produccion/{id}/estado` no verifica el estado actual de la orden: la interfaz oculta el botón en órdenes completadas, pero una llamada directa a la API con `Completada` sobre una orden ya completada descontaría los insumos por segunda vez (el CHECK de stock impide solo el saldo negativo). Se corregirá agregando la transición válida de estados en el Sprint 4. (3) `mermaMes` del endpoint `/api/kpis` es un valor fijo de demostración y las alertas de `alertas` se cargan desde el seed; su cálculo automático forma parte de HU04 y de los Sprints 4–5."),

    H3("Evidencia funcional: la aplicación en ejecución por rol"),
    P("Las capturas siguientes provienen del sistema ejecutándose en el entorno local de desarrollo (gunicorn en modo producción contra el PostgreSQL 16 de demostración, 06-oct-2026), con sesiones iniciadas con cuentas de cada rol. Su propósito es doble: demostrar que las funciones descritas en el capítulo existen y funcionan, y evidenciar visualmente que el control de acceso por rol (RBAC, {tab:rbac}) recorta el menú de cada usuario. La captura del despliegue en Render se presenta en el capítulo 11 cuando el equipo publique el servicio."),
    ...fig("../../evidencias/capturas/admin_Dashboard.png", "Dashboard del Administrador: KPIs y alertas dentro del sistema", { id: "cap_admin_dash", width: 430,
      desc: "Cuatro indicadores (quiebres de stock, merma, órdenes activas y precisión del modelo) y el panel de alertas. El menú lateral muestra las seis vistas del Administrador. La merma (2.3 %) y el texto de las alertas son datos de demostración (sección 7.3, deuda técnica).",
      source: "evidencias/capturas/admin_Dashboard.png (captura propia, 06-oct-2026; usuario Administrador)." }),
    ...fig("../../evidencias/capturas/almacenero_Inventario.png", "Inventario con semáforo visto por el Almacenero", { id: "cap_alm_inv", width: 430,
      desc: "Stock actual frente al mínimo con estado OK o Crítico (vista `v_inventario`) y el botón Registrar movimiento (permiso `inventario:escribir`). El menú del Almacenero solo contiene Dashboard, Inventario y Producción.",
      source: "evidencias/capturas/almacenero_Inventario.png (captura propia, 06-oct-2026; usuario Almacenero)." }),
    ...fig("../../evidencias/capturas/admin_Produccion.png", "Órdenes de producción con estado y acciones (Administrador)", { id: "cap_prod", width: 430,
      desc: "Lista de lotes con su estado (Planificada, En proceso, Completada) y las acciones Iniciar y Completar; esta última dispara la transacción de la {cod:completar}. El botón Nueva orden de producción abre la vista previa de insumos por receta.",
      source: "evidencias/capturas/admin_Produccion.png (captura propia, 06-oct-2026; usuario Administrador)." }),
    ...fig("../../evidencias/capturas/admin_Analitica_IA.png", "Analítica IA: serie histórica, pronóstico a 3 meses y MAPE", { id: "cap_ia", width: 430,
      desc: "Línea continua con los 24 meses de demanda (sintética) y línea punteada con el pronóstico de enero a marzo de 2026 para Bombones Caja x6, con MAPE de 4.5 % ({tab:forecast}).",
      source: "evidencias/capturas/admin_Analitica_IA.png (captura propia, 06-oct-2026; usuario Administrador)." }),
    ...fig("../../evidencias/capturas/gerente_Dashboard.png", "Dashboard del Gerente: menú reducido por permisos", { id: "cap_ger_dash", width: 430,
      desc: "El mismo dashboard, pero el menú del Gerente solo ofrece Dashboard, Producción y Analítica IA; no ve Inventario, Usuarios ni Auditoría, coherente con la matriz de permisos.",
      source: "evidencias/capturas/gerente_Dashboard.png (captura propia, 06-oct-2026; usuario Gerente)." }),
    ...fig("../../evidencias/capturas/admin_Auditoria.png", "Bitácora de auditoría de solo anexar (Administrador)", { id: "cap_aud", width: 430,
      desc: "Eventos LOGIN_FALLIDO y LOGIN_OK con fecha, usuario, IP y resultado; la bitácora no se puede modificar ni borrar por el trigger de inmutabilidad ({cod:trigger_ev}).",
      source: "evidencias/capturas/admin_Auditoria.png (captura propia, 06-oct-2026; usuario Administrador)." }),

    // ===================================================================== 7.4
    H2("7.4 Estrategias WPO (Web Performance Optimization)"),
    P("El requisito RNF02 exige una carga inicial inferior a 1 s en una red lenta simulada. Para verificarlo y optimizar se definió un escenario de medición reproducible y se comparó una versión base **sin optimizar** contra la versión **optimizada** que se entrega. La optimización se centró en lo que más pesa en el primer acceso de una SPA: el tamaño del JavaScript y su compresión."),
    H3("7.4.1 Métricas antes y después de la optimización"),
    P("La {tab:wpo} presenta los valores del archivo `evidencias/wpo/wpo_metricas.json` (mediana de 12 corridas por versión) y el porcentaje de mejora calculado como (antes − después) / antes. El primer pintado con contenido (FCP) baja de 2,812 ms a 480 ms (−82.9 %), el evento de carga completa de 2,779.6 ms a 449.4 ms (−83.8 %) y los bytes transferidos de 1,269,679 B a 82,266 B (−93.5 %, es decir 15.4 veces menos). El número de solicitudes no cambia (4) porque ambas versiones usan el mismo documento, hoja de estilos, bundle y la verificación de sesión inicial (`POST /api/auth/refresh`); la mejora proviene del peso de cada una, no de su cantidad. La versión optimizada cumple la meta de RNF02 (449 ms de carga y 480 ms de FCP, menos de 1 s) en las condiciones de la medición."),
    ...T(["Métrica", "Antes", "Después", "Diferencia", "Mejora"], [
      ["First Contentful Paint (FCP)", "2,812.0 ms", "480.0 ms", "−2,332.0 ms", "82.9 %"],
      ["DOMContentLoaded (DCL)", "2,777.4 ms", "449.2 ms", "−2,328.2 ms", "83.8 %"],
      ["Evento load", "2,779.6 ms", "449.4 ms", "−2,330.2 ms", "83.8 %"],
      ["Bytes transferidos", "1,269,679 B (1.21 MiB)", "82,266 B (80.3 KiB)", "−1,187,413 B", "93.5 %"],
      ["Solicitudes HTTP", "4", "4", "0", "0 %"],
    ], { id: "wpo", title: "Métricas de carga inicial antes y después de la optimización", widths: [2.5, 1.9, 1.7, 1.5, 1.0], size: 18,
      align: [AlignmentType.LEFT, AlignmentType.CENTER, AlignmentType.CENTER, AlignmentType.CENTER, AlignmentType.CENTER],
      source: "evidencias/wpo/wpo_metricas.json (medir_wpo.py). Porcentajes calculados por el equipo." }),
    ...fig("assets/wpo_antes_despues.png", "Comparación gráfica de la carga inicial antes y después de la optimización", { id: "wpo", width: 520,
      desc: "A la izquierda los tiempos de carga en milisegundos; a la derecha los bytes transferidos en KiB. Las escalas son independientes porque las magnitudes son distintas.",
      source: "Elaboración propia con los datos de evidencias/wpo/wpo_metricas.json (script docs/build/fig_wpo.py)." }),
    P("¿De dónde sale la diferencia de bytes? La {tab:wpo_pesos} descompone el peso del archivo principal en cada etapa. La versión base se reconstruyó con una compilación de esbuild sin minificar y con React en modo desarrollo (bundle de 1,261,217 B) servida sin compresión; el servidor de referencia de la medición (`STATIC_DIR=/tmp/antes`, `ENABLE_COMPRESSION=false`) usa exactamente ese bundle. Al minificar y definir `NODE_ENV=production`, el bundle baja a 243,725 B (−80.7 %); al comprimirlo en tránsito baja a 74,627 B con gzip (−69.4 % adicional respecto al minificado). Chromium negocia `zstd` con Flask-Compress 1.25 (el algoritmo preferido cuando el cliente lo acepta), por lo que el total medido (82,266 B) es coherente con la variante de 77,383 B del bundle más el CSS, el HTML, la llamada de sesión y las cabeceras de las cuatro respuestas."),
    ...T(["Etapa del archivo principal (bundle.js)", "Tamaño", "Reducción vs. etapa anterior"], [
      ["Sin minificar, React en modo desarrollo, sin compresión (base)", "1,261,217 B", "—"],
      ["Minificado con esbuild (NODE_ENV=production)", "243,725 B", "80.7 %"],
      ["Comprimido con gzip (Flask-Compress)", "74,627 B", "69.4 %"],
      ["Comprimido con Brotli (calidad por defecto de Flask-Compress)", "75,016 B", "69.2 %"],
      ["Comprimido con zstd (negociado por Chromium)", "77,383 B", "68.3 %"],
    ], { id: "wpo_pesos", title: "Peso del bundle de JavaScript en cada etapa de la optimización", widths: [4.6, 1.5, 2.2], size: 18,
      align: [AlignmentType.LEFT, AlignmentType.CENTER, AlignmentType.CENTER],
      source: "Elaboración propia: build de esbuild sin minificar en directorio temporal y pruebas de Flask 3.1.3 + Flask-Compress 1.25 con distintas cabeceras Accept-Encoding (06-oct-2026)." }),
    H3("7.4.2 Estrategias implementadas"),
    P("La {tab:wpo_estrategias} lista las estrategias verificadas en el código, el archivo donde se implementan y su efecto. Se incluyen también las que **no** están implementadas, para no atribuir al sistema mejoras que no tiene."),
    ...T(["Estrategia", "Implementación", "Efecto verificado", "Estado"], [
      ["Minificación y modo producción de React", "`frontend/build.mjs`: `minify: true`, `define NODE_ENV=\"production\"`, sin sourcemap.", "Bundle 1,261,217 B → 243,725 B (−80.7 %).", "Implementada"],
      ["Compresión gzip/Brotli/zstd", "`Compress(app)` con `COMPRESS_MIMETYPES` (HTML, CSS, JS, JSON) y `COMPRESS_MIN_SIZE = 500` en `app/__init__.py`.", "243,725 B → 74,627 B (gzip). También comprime las respuestas JSON mayores a 500 B.", "Implementada"],
      ["Respuestas estáticas \"planas\" (`_plano()`)", "`direct_passthrough = False` y `make_sequence()` sobre la respuesta de `send_from_directory`.", "Sin esta función el JS se entrega sin comprimir (243,725 B); con ella, 74,627 B.", "Implementada"],
      ["Caché del navegador", "Estáticos con `Cache-Control: public, max-age=3600` y `Last-Modified` (respuesta 304 a solicitudes condicionales); `index.html` con `no-cache`; `/api/*` con `no-store`.", "Visita repetida: revalidación con 304 sin retransmitir el bundle (verificado con cliente de prueba).", "Implementada (sin ETag)"],
      ["Sin recursos de terceros", "Fuentes del sistema (`-apple-system, Segoe UI, Roboto...`), sin CDN, analítica ni librería de gráficos; el gráfico de pronóstico usa canvas.", "Solo 4 solicitudes, todas al mismo origen; sin bloqueo por DNS/TLS externos.", "Implementada"],
      ["Pool de conexiones e índices", "`ThreadedConnectionPool`; `ix_mov_insumo_fecha` y otros (sección 7.3).", "Reduce latencia de API; no interviene en la carga inicial medida.", "Implementada"],
      ["Nombres de archivo con hash e `immutable`", "—", "Hoy el bundle se llama `bundle.js`; por eso el `max-age` es de 1 h, para no servir versiones viejas tras un despliegue.", "Pendiente"],
      ["Carga diferida por vista (code splitting)", "—", "El bundle único incluye todas las vistas; esbuild admite `splitting` en formato ESM.", "Pendiente"],
    ], { id: "wpo_estrategias", title: "Estrategias WPO: implementación, efecto y estado", widths: [1.8, 2.9, 2.5, 1.3], size: 17,
      source: "Elaboración propia; verificado contra frontend/build.mjs, backend/app/__init__.py y backend/static/." }),
    P("**Hallazgo sobre la compresión de archivos estáticos.** Al habilitar Flask-Compress la primera vez, el bundle seguía llegando sin comprimir. La causa es que `send_from_directory` devuelve una respuesta en modo de flujo (`direct_passthrough = True`) y Flask-Compress omite las respuestas de ese tipo. La función `_plano()` ({cod:plano}) desactiva ese modo y materializa el cuerpo (`make_sequence()`), con lo que la compresión se aplica. Se comprobó con una aplicación mínima: la ruta que devuelve el archivo tal cual entrega 243,725 B sin `Content-Encoding`, y la ruta con `_plano()` entrega 74,627 B con `Content-Encoding: gzip`. Como los archivos son pequeños (el mayor pesa 243,725 B), leerlos completos en memoria es un costo aceptable a cambio de tres veces menos bytes en la red."),
    ...cod(`def _plano(resp):
    resp.direct_passthrough = False        # permite que Flask-Compress comprima
    resp.make_sequence()
    return resp

# dentro de spa(path):
    full = os.path.realpath(os.path.join(static_dir, path))
    if path and full.startswith(static_dir + os.sep) and os.path.isfile(full):
        return _plano(send_from_directory(static_dir, path, etag=False, max_age=3600))
    ...
    resp = _plano(send_from_directory(static_dir, "index.html", etag=False, max_age=0))`, "Entrega de la SPA con respuestas planas para permitir la compresión", "plano", "backend/app/__init__.py (líneas 47–62; fragmento abreviado)."),
    P("La misma ruta incluye dos controles de seguridad: `os.path.realpath` más `startswith(static_dir + os.sep)` impiden el recorrido de directorios (`../`), y el 404 para rutas con extensión evita que un archivo inexistente reciba el `index.html`. Se usa `Last-Modified` en lugar de `ETag` (`etag=False`): el sistema de archivos ya aporta la fecha y el `304` se produce igualmente."),
    H3("Cómo se midió y limitaciones"),
    P("La medición la realiza `evidencias/wpo/medir_wpo.py`, que automatiza Chromium con Playwright y el protocolo de depuración (CDP). En cada una de las 12 corridas por versión se crea un contexto de navegador nuevo (sin caché ni cookies), se activa `Network.emulateNetworkConditions` con latencia de 100 ms, 4 Mbps de bajada y 1 Mbps de subida, se carga la página hasta el evento `load` y se espera a que aparezca el campo `#email` del login. De la API de rendimiento del navegador se leen `domContentLoadedEventEnd`, `loadEventEnd` y el tiempo del `first-contentful-paint`; los bytes se suman a partir de `encodedDataLength` de cada respuesta (bytes realmente transferidos, comprimidos y con cabeceras). Se informa la **mediana** de las 12 corridas."),
    P("Como verificación independiente, el 06-oct-2026 se volvió a ejecutar el mismo script contra los mismos servidores locales. Los bytes coincidieron exactamente (1,269,679 B y 82,266 B) y los tiempos variaron menos de 2 % (antes: FCP 2,794 ms y load 2,768.5 ms; después: FCP 484 ms y load 456.4 ms; archivo `evidencias/wpo/wpo_reproduccion_06oct.json`). Los valores oficiales del informe siguen siendo los de `wpo_metricas.json`."),
    note("**Limitaciones de la medición.** (1) Es una medición **local** (red simulada sobre la interfaz de loopback), no sobre Render: no incluye TLS real, el trayecto hasta el centro de datos ni el arranque en frío del servicio gratuito, que Render suspende tras 15 minutos de inactividad y tarda cerca de un minuto en reactivar (Render, s. f.-a). (2) No se limitó la CPU, por lo que un teléfono de gama baja tardaría más en ejecutar el JavaScript. (3) Se midió un solo equipo y un solo navegador (Chromium headless). (4) El tiempo de respuesta de la API (p95 < 500 ms) no se midió en este capítulo; su plan de medición está en el capítulo 6. Los resultados deben leerse como una comparación relativa entre dos versiones, y la validación final contra la URL de Render se registrará en el capítulo 11.", { fill: "FFF4CC" }),
  ];
};
