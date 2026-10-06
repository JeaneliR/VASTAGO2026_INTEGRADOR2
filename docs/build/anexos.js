// Anexos A–D del informe APF2. Todo el contenido se lee directamente del repositorio (/home/claude/vastago-sistema),
// de modo que lo mostrado es siempre el código y los reportes reales. Las líneas > 100 caracteres se dividen
// únicamente al presentarlas (el archivo original no se modifica).
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..", "..");
const MAXW = 100;

module.exports = (g) => {
  const { H1, H2, H3, P, table, note, spacer, bullets, C, FONT, state } = g;
  const { Paragraph, TextRun, ShadingType, BorderStyle, AlignmentType } = g.D;

  // Variante de g.code(): igual aspecto y numeración, pero mantiene unidas las primeras y últimas líneas del bloque
  // (evita que la leyenda quede sola al final de una página o que una línea quede huérfana).
  function code(text, o = {}) {
    const lines = String(text).replace(/\t/g, "    ").split("\n");
    const n = lines.length;
    const out = lines.map((ln, i) => new Paragraph({ children: [new TextRun({ text: ln === "" ? " " : ln, font: "Consolas", size: o.size || 16 })],
      keepLines: true, keepNext: n <= 24 ? i < n - 1 : (i < 3 || i >= n - 3 ? i < n - 1 : false),
      shading: { type: ShadingType.CLEAR, fill: "F5F1E8" }, spacing: { after: 0, line: 232 }, indent: { left: 120, right: 120 },
      border: { left: { style: BorderStyle.SINGLE, size: 18, color: C.car, space: 6 } }, alignment: AlignmentType.LEFT }));
    if (o.title) {
      const k = ++state.cod;
      if (o.id) state.ids["cod:" + o.id] = k;
      out.unshift(new Paragraph({ children: [new TextRun({ text: `Código ${k}. `, bold: true, font: FONT, size: 20, color: C.cacao2 }),
        new TextRun({ text: o.title, font: FONT, size: 20, color: C.cacao2 })], spacing: { before: 160, after: 60 }, keepNext: true }));
    }
    out.push(spacer(160));
    return out;
  }

  // ---------- utilidades -------------------------------------------------------------------------------------------
  const readLines = (rel) => fs.readFileSync(path.join(REPO, rel), "utf8").replace(/\r/g, "").replace(/\n$/, "").split("\n");

  // Divide una línea larga en espacios, conservando la sangría (y el marcador de comentario si lo hay).
  function wrapLine(ln, max = MAXW) {
    if (ln.length <= max) return [ln];
    const indent = ln.match(/^\s*/)[0];
    const trimmed = ln.slice(indent.length);
    const cm = trimmed.match(/^(--|#|\/\/|\|)\s?/);
    const cont = indent + "    " + (cm && cm[1] !== "|" ? cm[1] + " " : "");
    const out = [];
    let rest = ln;
    let first = true;
    while (rest.length > max) {
      const pre = first ? "" : cont;
      let cut = rest.lastIndexOf(" ", max);
      const minCut = (first ? indent.length : cont.length) + 12;
      if (cut < minCut) cut = max;               // sin espacios: corte duro
      out.push(rest.slice(0, cut).replace(/\s+$/, ""));
      rest = cont + rest.slice(cut).replace(/^\s+/, "");
      first = false;
    }
    out.push(rest);
    return out;
  }
  const wrapAll = (lines) => lines.flatMap((l) => wrapLine(l));

  // Extrae un rango (1-indexado, inclusivo) de un archivo del repositorio.
  const slice = (rel, a, b) => readLines(rel).slice(a - 1, b);
  const total = (rel) => readLines(rel).length;

  // Bloque: párrafo de descripción + código con leyenda numerada.
  function bloque(title, rel, a, b, desc, o = {}) {
    const lines = a ? slice(rel, a, b) : readLines(rel);
    const rango = a ? `líneas ${a}–${b} de ${total(rel)}` : `archivo completo, ${lines.length} líneas`;
    const text = (o.transform ? lines.map(o.transform) : lines).flatMap((l) => wrapLine(l)).join("\n");
    return [
      P(`**Ruta:** \`${rel}\` (${rango}). ${desc}`, { size: 21, after: 60, keepNext: true, align: g.AlignmentType.LEFT }),
      ...code(text, { title: o.codeTitle || title, id: o.id, size: o.size || 14 }),
    ];
  }
  // Bloque con líneas elegidas arbitrariamente (con marcadores "[...]" donde se omite contenido).
  function bloqueTexto(title, text, o = {}) {
    return [...code(wrapAll(text.split("\n")).join("\n"), { title, id: o.id, size: o.size || 14 })];
  }

  const out = [];

  out.push(H1("Anexos"));
  out.push(P("Los anexos reúnen la evidencia técnica completa que sustenta los capítulos 7 a 11. Todo el contenido proviene "
    + "del repositorio del proyecto (carpetas `db/`, `backend/`, `frontend/`, `ml-service/`, `evidencias/` y `.github/`) y se "
    + "reproduce sin alteraciones, salvo dos ajustes de presentación: (a) las líneas de más de 100 caracteres se dividen con "
    + "sangría adicional para que quepan en la página, y (b) en `.env.example` se enmascaran los valores de contraseña de "
    + "ejemplo. Cada bloque indica su ruta y el rango de líneas, de modo que pueda contrastarse con el archivo original."));
  out.push(note("**Nota de reproducibilidad.** Los reportes de seguridad y de pruebas se generaron el 06-oct-2026 sobre la "
    + "instancia local del sistema (gunicorn sobre PostgreSQL 16 en el puerto 5433; las comprobaciones de HSTS y de cookie Secure se hicieron aparte, en modo producción con certificado autofirmado). Los archivos completos "
    + "están en `evidencias/` y `evidencias/seguridad/` del repositorio."));

  // =====================================================================================================================
  // ANEXO A
  // =====================================================================================================================
  out.push(H2("Anexo A. Script SQL y archivos de configuración de base de datos"));
  out.push(P("Se presentan el modelo físico completo de la base de datos PostgreSQL 16, los datos maestros, los scripts de "
    + "replicación, respaldo y monitoreo, y los archivos de empaquetado y despliegue (Docker, Render, variables de entorno e "
    + "integración continua)."));

  out.push(H3("A.1 Modelo físico: db/schema.sql"));
  out.push(...bloque("db/schema.sql — parte 1 de 3: seguridad, inventario (líneas 1–68)", "db/schema.sql", 1, 68,
    "Crea las tablas `roles`, `usuarios`, `sesiones`, `insumos` y `movimientos_inventario` con sus restricciones CHECK e índices.", { id: "schema1" }));
  out.push(...bloque("db/schema.sql — parte 2 de 3: producción, alertas, analítica (líneas 70–122)", "db/schema.sql", 70, 122,
    "Define `productos`, `bom`, `ordenes_produccion`, `alertas`, `demanda_historica` y `pronosticos`.", { id: "schema2" }));
  out.push(...bloque("db/schema.sql — parte 3 de 3: auditoría, triggers y vista (líneas 124–172)", "db/schema.sql", 124, 172,
    "Define `auditoria` (inmutable por trigger), el trigger que aplica cada movimiento al stock y la vista `v_inventario`.", { id: "schema3" }));

  out.push(H3("A.2 Datos maestros: db/seed_catalogo.sql"));
  out.push(...bloque("db/seed_catalogo.sql — datos maestros de demostración", "db/seed_catalogo.sql", 0, 0,
    "Carga roles, insumos, productos, recetas (BOM) y alertas iniciales; los usuarios y las órdenes los crea `app/seed.py`.", { id: "seed" }));

  out.push(H3("A.3 Replicación streaming"));
  out.push(...bloque("db/replication/01_primary_config.sql — configuración del primario", "db/replication/01_primary_config.sql", 0, 0,
    "Crea el rol de replicación, documenta los parámetros del primario y crea el slot físico `replica1_slot`.", { id: "repl_cfg", size: 15 }));
  out.push(...bloque("db/replication/setup_replica.sh — creación de la réplica", "db/replication/setup_replica.sh", 0, 0,
    "Ejecuta `pg_basebackup` con `-R`, ajusta el puerto y levanta la réplica en modo hot standby (solo lectura).", { id: "repl_sh", size: 15 }));

  out.push(H3("A.4 Administración: respaldo y monitoreo"));
  out.push(...bloque("db/admin/backup_restore.sh — respaldo, restauración de prueba y verificación", "db/admin/backup_restore.sh", 0, 0,
    "Genera `pg_dump -Fc`, restaura en una base temporal, compara conteos de cinco tablas y aplica retención de 7 días.", { id: "backup", size: 15 }));
  out.push(...bloque("db/admin/monitoreo.sql — consultas de monitoreo", "db/admin/monitoreo.sql", 0, 0,
    "Siete consultas: conexiones, tamaños, cache hit, uso de índices, dead tuples, roles y cifrado de contraseñas.", { id: "monit", size: 15 }));

  out.push(H3("A.5 Empaquetado y despliegue"));
  out.push(...bloque("Dockerfile — imagen multi-stage", "Dockerfile", 0, 0,
    "Etapa 1 compila el frontend con Node 22; etapa 2 empaqueta Flask y los estáticos, ejecuta como usuario no root y arranca gunicorn.", { id: "dockerfile", size: 15 }));
  out.push(...bloque("render.yaml — Blueprint de Render", "render.yaml", 0, 0,
    "Declara la base PostgreSQL gestionada y el servicio web Docker; los secretos se generan en Render y no se guardan en Git.", { id: "render", size: 15 }));
  out.push(...bloque(".env.example — variables de entorno de ejemplo", ".env.example", 0, 0,
    "Plantilla de configuración local. Las contraseñas de ejemplo se enmascaran en este anexo; en producción las define Render.",
    { id: "envex", size: 15, transform: (l) => l.replace(/^(DEMO_PASSWORD=).*/, "$1<definir-contraseña-demo>").replace(/(vastago_app:)[^@]*@/, "$1<contraseña-local>@") }));
  out.push(...bloque(".github/workflows/ci.yml — integración continua", ".github/workflows/ci.yml", 0, 0,
    "Ante cada `push` o `pull request` levanta PostgreSQL 16, ejecuta las pruebas y los análisis `bandit` y `pip-audit`.", { id: "ci", size: 15 }));

  // =====================================================================================================================
  // ANEXO B
  // =====================================================================================================================
  out.push(H2("Anexo B. Fragmentos de código fuente relevantes"));
  out.push(P("Se seleccionaron los fragmentos que ilustran las decisiones de diseño más importantes: seguridad transversal, "
    + "caso de uso de autenticación, patrón Repository con unidad de trabajo, rutas de negocio transaccionales, manejo del token "
    + "en el cliente, el núcleo del pronóstico y la configuración de cabeceras y compresión. Cada bloque cita ruta y rango de líneas."));

  out.push(H3("B.1 Seguridad transversal: backend/app/security.py"));
  out.push(...bloque("security.py — hash de contraseñas, JWT y cifrado AES-256-GCM", "backend/app/security.py", 10, 73,
    "bcrypt con costo configurable, política de contraseñas OWASP ASVS, JWT HS256 con algoritmo fijo (rechaza `alg: none`), refresh opaco con hash SHA-256 y cifrado autenticado de campos con nonce aleatorio de 12 bytes.", { id: "sec1" }));
  out.push(...bloque("security.py — matriz de permisos RBAC y decorador login_required", "backend/app/security.py", 76, 110,
    "La matriz `PERMISOS` mapea cada permiso a los roles autorizados; el decorador valida el Bearer token, responde 401/403 y registra el acceso denegado en la bitácora.", { id: "sec2" }));
  out.push(...bloque("security.py — cabeceras de seguridad HTTP", "backend/app/security.py", 113, 128,
    "Se aplican en `after_request`: CSP restrictiva, X-Frame-Options, nosniff, Referrer-Policy, HSTS (solo en producción), `no-store` en `/api/` y eliminación de la cabecera `Server`.", { id: "sec3" }));

  out.push(H3("B.2 Caso de uso de autenticación: auth_service.login"));
  out.push(...bloque("auth_service.py — login con bloqueo, anti-enumeración y auditoría", "backend/app/services/auth_service.py", 9, 46,
    "Un hash ficticio iguala el tiempo de respuesta si el usuario no existe; los fallos se auditan y se confirman antes de lanzar el error; tras 5 intentos la cuenta se bloquea (HTTP 423).", { id: "auth1" }));

  out.push(H3("B.3 Patrón Repository y unidad de trabajo"));
  out.push(...bloque("repositories/base.py — BaseRepository", "backend/app/repositories/base.py", 1, 39,
    "Clase base abstracta: toda consulta es parametrizada y puede participar en la transacción del llamador si recibe un cursor; `order_by` se valida contra una lista blanca.", { id: "base" }));
  out.push(...bloque("db.py — transaction() (Unit of Work)", "backend/app/db.py", 16, 28,
    "Context manager que toma una conexión del pool, confirma si todo sale bien y revierte ante cualquier excepción.", { id: "uow", size: 15 }));
  out.push(...bloque("repositories/inventario.py — InsumoRepository y MovimientoRepository", "backend/app/repositories/inventario.py", 1, 41,
    "Repositorio concreto: incluye `bloquear_para_actualizar` (`SELECT ... FOR UPDATE`) y el registro de movimientos, cuyo efecto sobre el stock lo aplica un trigger de la base de datos.", { id: "repo_inv" }));

  out.push(H3("B.4 Rutas de negocio con transacción: backend/app/routes/negocio.py"));
  out.push(...bloque("negocio.py — registrar movimiento de inventario", "backend/app/routes/negocio.py", 32, 49,
    "Valida entrada, bloquea la fila del insumo, verifica stock suficiente, registra movimiento y auditoría dentro de una sola transacción.", { id: "ruta_mov", size: 15 }));
  out.push(...bloque("negocio.py — completar orden y descontar insumos según la receta (BOM)", "backend/app/routes/negocio.py", 98, 116,
    "Al completar una orden se generan las salidas de todos los insumos de la receta de forma atómica: si un insumo no alcanza, el CHECK de la base revierte toda la operación.", { id: "ruta_ord", size: 15 }));

  out.push(H3("B.5 Cabeceras y compresión: backend/app/__init__.py"));
  out.push(...bloque("app/__init__.py — fábrica de la aplicación, compresión y manejo de errores", "backend/app/__init__.py", 10, 64,
    "Límite de cuerpo de 64 KB, compresión gzip/brotli (estrategia WPO), registro de cabeceras de seguridad, errores genéricos sin traza y servido seguro de la SPA (anti path traversal).", { id: "init" }));

  out.push(H3("B.6 Cliente: frontend/src/api.js"));
  out.push(...bloque("api.js — token en memoria y renovación automática", "frontend/src/api.js", 1, 41,
    "El access token vive solo en memoria; el refresh token viaja en cookie HttpOnly. Ante un 401 se intenta una renovación y se reintenta la petición una vez; si falla, se cierra la sesión.", { id: "api" }));

  out.push(H3("B.7 Pronóstico de demanda: ml-service/forecast.py"));
  out.push(...bloque("forecast.py — núcleo del modelo (regresión lineal + estacionalidad mensual)", "ml-service/forecast.py", 27, 47,
    "Variables de tendencia y 12 indicadores de mes; el MAPE se calcula sobre los últimos 4 meses retenidos y el pronóstico final se reentrena con toda la serie para 3 meses.", { id: "forecast", size: 15 }));

  // =====================================================================================================================
  // ANEXO C
  // =====================================================================================================================
  out.push(H2("Anexo C. Reportes automatizados de pruebas"));
  out.push(P("Se incluyen la salida completa de la ejecución de `pytest` (24 pruebas), el reporte de cobertura de código "
    + "generado con `pytest-cov` y la descripción de lo que ejecuta el pipeline de integración continua en GitHub Actions."));

  out.push(H3("C.1 Salida completa de pytest"));
  out.push(P("**Herramienta:** pytest 9.1.1 con Python 3.13. **Fecha:** 06-oct-2026. **Archivo:** `evidencias/04_pytest.txt`. "
    + "Las 24 pruebas (8 funcionales en `test_negocio.py` y 16 de seguridad en `test_seguridad.py`) se ejecutan contra una "
    + "base PostgreSQL real que se recrea con el esquema y los datos demo; todas aprueban en 1.32 s.", { size: 21, after: 60, keepNext: true, align: g.AlignmentType.LEFT }));
  out.push(...code(wrapAll(readLines("evidencias/04_pytest.txt")).join("\n"), { title: "Salida completa de pytest (evidencias/04_pytest.txt)", id: "pytest", size: 14 }));

  out.push(H3("C.2 Cobertura de código"));
  const covFile = "evidencias/05_cobertura.txt";
  if (fs.existsSync(path.join(REPO, covFile))) {
    const cov = readLines(covFile);
    out.push(P("**Herramienta:** pytest-cov 7.1.0 (coverage 7.16.2). **Fecha:** 06-oct-2026. **Archivo:** `" + covFile + "`. "
      + "Comando: `cd backend && python3 -m pytest tests -q --cov=app --cov-report=term-missing`. La cobertura es medida "
      + "por sentencias sobre el paquete `app`; las columnas finales muestran las líneas no ejecutadas por las pruebas.", { size: 21, after: 60, keepNext: true, align: g.AlignmentType.LEFT }));
    out.push(...code(wrapAll(cov).join("\n"), { title: "Reporte de cobertura (evidencias/05_cobertura.txt)", id: "cov", size: 14 }));
    const rows = [];
    let totalRow = null;
    cov.forEach((l) => {
      const m = l.match(/^(app\/\S+|TOTAL)\s+(\d+)\s+(\d+)\s+(\d+%)\s*(.*)$/);
      if (!m) return;
      if (m[1] === "TOTAL") { totalRow = ["**TOTAL**", `**${m[2]}**`, `**${m[3]}**`, `**${m[4]}**`, ""]; return; }
      if (m[1].endsWith("__init__.py") && m[2] === "0") return;          // archivos vacíos
      rows.push([m[1].replace("app/", "").replace(/__/g, "_\u200b_"), m[2], m[3], m[4], m[5] || "—"]);
    });
    out.push(P("La {tab:cobertura} resume la cobertura por módulo; el total es del 90 % (596 sentencias, 60 sin cubrir). La capa de datos "
      + "(`db.py`, repositorios), el módulo de seguridad, el servicio de autenticación y las rutas de negocio alcanzan entre 88 % y 100 %. "
      + "Los valores más bajos son `__init__.py` (68 %), cuyo código sin cubrir son los manejadores de error 404/429/500 y parte del servido de "
      + "la SPA, y `routes/auth.py` (84 %), donde falta ejercitar ramas de la gestión de usuarios; se ampliarán en las pruebas del Sprint 5."));
  out.push(...table(["Módulo (app/)", "Sentencias", "Sin cubrir", "Cobertura", "Líneas sin cubrir"],
      [...rows, totalRow], { id: "cobertura", title: "Cobertura de pruebas por módulo (pytest-cov)", size: 18, hsize: 18,
        widths: [31, 14, 12, 12, 31], align: [g.AlignmentType.LEFT, g.AlignmentType.CENTER, g.AlignmentType.CENTER, g.AlignmentType.CENTER, g.AlignmentType.LEFT],
        source: "Elaboración propia a partir de evidencias/05_cobertura.txt (pytest-cov, 06-oct-2026)." }));
  } else {
    out.push(P("El reporte de cobertura no está disponible en el repositorio."));
  }

  out.push(H3("C.3 Pipeline de integración continua (GitHub Actions)"));
  out.push(P("El archivo `.github/workflows/ci.yml` (Anexo A.5) ejecuta, en cada `push` y `pull request`, los pasos de la "
    + "{tab:ci}. Los comandos de los pasos 4 a 6 se ejecutaron localmente el 06-oct-2026 y produjeron los resultados indicados; el "
    + "pipeline en GitHub se activará cuando el equipo suba el repositorio, por lo que la columna de salida es la **esperada** "
    + "y no una ejecución remota ya realizada."));
  out.push(...table(["Paso del job test", "Comando", "Salida esperada"], [
    ["1. Servicio PostgreSQL", "postgres:16 con healthcheck pg_isready, puerto 5433", "Base vastago lista antes de las pruebas"],
    ["2. Código y entorno", "actions/checkout@v4, actions/setup-python@v5 (Python 3.13)", "Entorno Python 3.13"],
    ["3. Dependencias", "pip install -r backend/requirements.txt pytest bandit pip-audit", "Instalación sin errores"],
    ["4. Pruebas", "cd backend && python -m pytest tests -q", "24 passed (1.32 s en la corrida local)"],
    ["5. Análisis estático", "bandit -r app -q", "Sin hallazgos (0 de severidad baja, media y alta)"],
    ["6. Dependencias vulnerables", "pip-audit -r requirements.txt", "No known vulnerabilities found"],
  ], { id: "ci", title: "Pasos del pipeline de integración continua y salida esperada", size: 18, hsize: 18, widths: [22, 44, 34],
    source: "Elaboración propia a partir de .github/workflows/ci.yml y evidencias/04_pytest.txt, evidencias/seguridad/bandit.txt y pip_audit.txt." }));
  out.push(P("El pipeline falla (código de salida distinto de cero) si cualquiera de los tres controles falla, lo que impide "
    + "integrar cambios que rompan una prueba, introduzcan un patrón inseguro detectado por `bandit` o incorporen una dependencia con "
    + "vulnerabilidad conocida. Como mejora para el Sprint 4, se recomienda agregar `--cov=app` al paso 4 para publicar la cobertura "
    + "en cada ejecución; hoy se mide de forma manual (C.2)."));

  // =====================================================================================================================
  // ANEXO D
  // =====================================================================================================================
  out.push(H2("Anexo D. Reportes automatizados de seguridad"));
  out.push(P("Se presentan extractos representativos de cada reporte. El nombre del archivo completo se indica en cada caso; "
    + "todos residen en `evidencias/seguridad/`. Los escaneos se ejecutaron el 06-oct-2026 sobre el sistema local en modo "
    + "producción (puerto 8000), con las herramientas de Kali Linux instaladas sobre Linux (no con una máquina virtual Kali completa)."));

  const SEG = "evidencias/seguridad/";
  const sec = (n) => readLines(SEG + n);
  const omit = "[... líneas omitidas; ver archivo completo ...]";

  // Tabla resumen
  out.push(P("La {tab:segresumen} resume los resultados; los extractos siguen en el mismo orden."));
  out.push(...table(["Reporte", "Herramienta", "Archivo", "Resultado"], [
    ["Análisis estático", "Bandit", "bandit.txt", "0 hallazgos (671 líneas)"],
    ["Dependencias Python", "pip-audit", "pip_audit.txt", "Sin vulnerabilidades conocidas"],
    ["Dependencias JavaScript", "npm audit", "npm_audit.txt", "0 vulnerabilidades"],
    ["Puertos y servicios", "Nmap 7.94", "nmap_antes.txt", "Se detectó cabecera Server: gunicorn"],
    ["Servidor web", "Nikto 2.1.5", "nikto_antes.txt, nikto_despues.txt", "Se corrigieron fuga de inodos/ETag y robots/crossdomain"],
    ["Inyección SQL", "sqlmap", "sqlmap.txt", "Ningún parámetro inyectable (3 objetivos)"],
    ["Cifrado en tránsito", "Nmap ssl-enum-ciphers, openssl", "tls.txt", "TLS 1.2/1.3, todos los cifrados grado A"],
    ["Pentest OWASP", "Script propio (OWASP Top 10)", "pentest_antes.txt, pentest_despues.txt", "18/20 → 20/20 verificaciones"],
  ], { id: "segresumen", title: "Resumen de reportes automatizados de seguridad", size: 18, hsize: 18, widths: [20, 22, 28, 30],
    source: "Elaboración propia a partir de evidencias/seguridad/ (06-oct-2026)." }));

  // D.1 Bandit
  out.push(H3("D.1 Análisis estático del código con Bandit"));
  out.push(P("**Herramienta:** Bandit (SAST para Python). **Fecha:** 06-oct-2026, 00:30 UTC. **Archivo:** `evidencias/seguridad/bandit.txt`. "
    + "Analizó 671 líneas de `backend/app` sin hallazgos de ninguna severidad. Dos falsos positivos de concatenación SQL en "
    + "`BaseRepository` (nombre de tabla constante de clase y `order_by` validado contra lista blanca) están justificados con `# nosec B608`.", { size: 21, after: 60, keepNext: true, align: g.AlignmentType.LEFT }));
  out.push(...code(sec("bandit.txt").join("\n"), { title: "Reporte de Bandit (bandit.txt, completo)", id: "bandit", size: 14 }));

  // D.2 pip-audit y npm audit
  out.push(H3("D.2 Auditoría de dependencias: pip-audit y npm audit"));
  out.push(P("**Herramientas:** pip-audit (PyPI/OSV) y npm audit (registro npm). **Fecha:** 06-oct-2026. **Archivos:** `pip_audit.txt` y "
    + "`npm_audit.txt`. Ninguna dependencia del backend ni del frontend tiene vulnerabilidades conocidas en la fecha de la auditoría; "
    + "`pip-audit` además forma parte del pipeline de CI.", { size: 21, after: 60, keepNext: true, align: g.AlignmentType.LEFT }));
  out.push(...code("# evidencias/seguridad/pip_audit.txt\n" + sec("pip_audit.txt").join("\n")
    + "\n\n# evidencias/seguridad/npm_audit.txt\n" + sec("npm_audit.txt").join("\n"),
    { title: "Reportes de auditoría de dependencias (pip_audit.txt y npm_audit.txt)", id: "audits", size: 14 }));

  // D.3 Nmap
  out.push(H3("D.3 Reconocimiento de puertos y servicios con Nmap"));
  const nm = sec("nmap_antes.txt");
  out.push(P("**Herramienta:** Nmap 7.94SVN (`-sV` con scripts `http-headers`, `http-methods`). **Fecha:** 06-oct-2026, 00:25 UTC. "
    + "**Archivo completo:** `evidencias/seguridad/nmap_antes.txt` (191 líneas; se omiten las huellas `fingerprint-strings`). "
    + "Expone PostgreSQL (5433/5434) y la aplicación (8000); el escaneo previo a la corrección reveló la cabecera `Server: gunicorn` "
    + "y un `ETag` que filtraba el inodo del archivo, ambos corregidos después.", { size: 21, after: 60, keepNext: true, align: g.AlignmentType.LEFT }));
  out.push(...bloqueTexto("Extracto de Nmap antes de las correcciones (nmap_antes.txt)",
    [nm.slice(0, 6).join("\n"), "|   [... huellas de servicio de los puertos 5433 y 5434 omitidas ...]", nm.slice(41, 64).join("\n"),
      "[... huellas (fingerprint-strings) omitidas ...]", nm[nm.length - 1]].join("\n"), { id: "nmap" }));

  // D.4 Nikto
  out.push(H3("D.4 Escaneo del servidor web con Nikto: antes y después"));
  out.push(P("**Herramienta:** Nikto 2.1.5 sobre `localhost:8000`. **Fecha:** 06-oct-2026 (antes 00:27 UTC, después tras aplicar las "
    + "correcciones). **Archivos:** `nikto_antes.txt` (15 líneas) y `nikto_despues.txt` (11 líneas). En la versión previa Nikto reportó la "
    + "fuga de inodos por ETag, un `robots.txt` y un `crossdomain.xml` inexistentes que devolvían la SPA con HTTP 200 y el nombre de archivo en "
    + "`Content-Disposition`. Después ya no aparecen; los demás hallazgos son las cabeceras de seguridad, que son deseables.", { size: 21, after: 60, keepNext: true, align: g.AlignmentType.LEFT }));
  out.push(...code(sec("nikto_antes.txt").join("\n").split("\n").flatMap((l) => wrapLine(l)).join("\n"),
    { title: "Nikto antes de las correcciones (nikto_antes.txt, completo)", id: "nikto_a", size: 14 }));
  out.push(...code(sec("nikto_despues.txt").join("\n").split("\n").flatMap((l) => wrapLine(l)).join("\n"),
    { title: "Nikto después de las correcciones (nikto_despues.txt, completo)", id: "nikto_d", size: 14 }));

  // D.5 sqlmap
  out.push(H3("D.5 Pruebas de inyección SQL con sqlmap"));
  const sq = sec("sqlmap.txt");
  out.push(P("**Herramienta:** sqlmap (nivel 3, riesgo 2). **Fecha:** 06-oct-2026, 00:28–00:29 UTC. **Archivo completo:** "
    + "`evidencias/seguridad/sqlmap.txt` (51 líneas, tres objetivos). Se atacaron el login (parámetros `email` y `password`), un "
    + "parámetro de ruta y el cuerpo JSON de movimientos. En los tres casos sqlmap concluyó que ningún parámetro es inyectable; "
    + "el único indicio (`motivo`) fue marcado por la propia herramienta como falso positivo. Esto es coherente con las consultas parametrizadas del patrón Repository.", { size: 21, after: 60, keepNext: true, align: g.AlignmentType.LEFT }));
  const idx2 = sq.findIndex((l) => l.startsWith("### sqlmap 2"));
  out.push(...bloqueTexto("Extracto de sqlmap (sqlmap.txt): objetivo 1 abreviado y conclusión del objetivo 2",
    [sq.slice(0, 11).join("\n"), "[... pruebas intermedias omitidas ...]", sq.slice(idx2 - 6, idx2 - 1).join("\n"), "", sq.slice(idx2, idx2 + 6).join("\n")].join("\n"), { id: "sqlmap" }));

  // D.6 TLS
  out.push(H3("D.6 Cifrado en tránsito: cabeceras HTTPS y suites TLS"));
  out.push(P("**Herramientas:** Nmap `ssl-enum-ciphers` y `openssl s_client`. **Fecha:** 06-oct-2026, 00:30 UTC. **Archivo:** `evidencias/seguridad/tls.txt`. "
    + "Con `APP_ENV=production` se activa HSTS y la cookie `Secure`. Solo se negocian TLS 1.2 y 1.3, con suites ECDHE calificadas de grado A por Nmap; el "
    + "certificado de la prueba es autofirmado (la verificación falla a propósito), por lo que en Render se usará el certificado gestionado de la plataforma.", { size: 21, after: 60, keepNext: true, align: g.AlignmentType.LEFT }));
  out.push(...code(sec("tls.txt").join("\n"), { title: "Prueba de TLS y cabeceras HTTPS (tls.txt, completo)", id: "tls", size: 14 }));

  // D.7 Pentest
  out.push(H3("D.7 Pruebas de penetración manuales OWASP: antes y después"));
  const pa = sec("pentest_antes.txt"), pd = sec("pentest_despues.txt");
  const pick = (L) => {
    const sel = [];
    L.forEach((l, i) => { if (/^\[(PASA |FALLA)\]/.test(l) && (/Server|robots/.test(l))) sel.push(l, L[i + 1]); });
    return sel;
  };
  const resumen = (L) => L.filter((l) => l.startsWith("Resumen"));
  out.push(P("**Herramienta:** `backend/tests/pentest_manual.py`, script propio de 20 verificaciones mapeadas a OWASP Top 10 (A01, A02, A03, A05, A07). "
    + "**Fecha:** 06-oct-2026, 00:29 UTC. **Archivos completos:** `pentest_antes.txt` y `pentest_despues.txt` (42 líneas cada uno). "
    + "El primer resultado fue 18/20: fallaron la cabecera `Server` (revelaba `gunicorn`) y la respuesta a `robots.txt`/`crossdomain.xml` "
    + "(devolvía la SPA con HTTP 200). Se corrigieron en `gunicorn.conf.py` y en la ruta del SPA, y la repetición dio 20/20.", { size: 21, after: 60, keepNext: true, align: g.AlignmentType.LEFT }));
  out.push(...bloqueTexto("Pentest antes de las correcciones (extracto de pentest_antes.txt)",
    [pa.slice(0, 6).join("\n"), omit, ...pick(pa), omit, ...resumen(pa)].join("\n"), { id: "pent_a" }));
  out.push(...bloqueTexto("Pentest después de las correcciones (extracto de pentest_despues.txt)",
    [pd.slice(0, 6).join("\n"), omit, ...pick(pd), omit, ...resumen(pd)].join("\n"), { id: "pent_d" }));

  return out;
};
