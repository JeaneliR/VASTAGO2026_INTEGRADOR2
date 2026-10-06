// Capítulo 9 — Seguridad del Sistema (APF2)
// Todo lo afirmado sale del código de /home/claude/vastago-sistema y de evidencias/ (ver BIBLIA.md).
module.exports = (g) => {
  const { H1, H2, H3, P, bullets, numbered, fig, table, code, note, spacer, AlignmentType, D } = g;
  const { Paragraph, TextRun, ExternalHyperlink } = D;

  // Tablas en texto plano (el código en línea dentro de celdas pequeñas se renderiza más grande que el texto).
  const plain = (c) => (Array.isArray(c) ? c.map((x) => String(x).replace(/`/g, "")) : String(c).replace(/`/g, ""));
  const T = (h, rows, o) => table(h.map(plain), rows.map((r) => r.map(plain)), o);
  // Bloque de código con título numerado y fuente. Líneas <= 95 caracteres.
  const cod = (text, title, id, source, max = 95, size = 15) => {
    text.split("\n").forEach((l, i) => { if (l.length > max) throw new Error(`cap9: línea >${max} (${l.length}) en "${title}", línea ${i + 1}: ${l}`); });
    return [...code(text, { title, id, size }), P("Fuente: " + source, { size: 18, color: "6B5B4B", align: AlignmentType.CENTER, after: 160 })];
  };
  const TXT = (t, o = {}) => P(t, { size: 21, align: AlignmentType.LEFT, ...o });
  const REPO = "https://github.com/JeaneliR/VASTAGO2026_INTEGRADOR2/blob/main/";
  const link = (ruta, desc) => new Paragraph({ numbering: { reference: "bul", level: 0 }, spacing: { after: 60, line: 280 },
    children: [new ExternalHyperlink({ link: REPO + ruta, children: [new TextRun({ text: ruta, font: "Arial", size: 19, color: "1155CC", underline: {} })] }),
      new TextRun({ text: " — " + desc, font: "Arial", size: 20 })] });

  // ====================================================================== catálogo de controles (datos)
  // [ID, control, implementación (archivo), estándar (líneas), estado]
  const GRUPOS = [
    { id: "ctl_acceso", t: "Acceso y autenticación", intro: "Controles que establecen quién puede entrar al sistema y qué puede hacer una vez dentro. Son los que más peso tienen frente al riesgo R3 (acceso no autorizado a los datos).", rows: [
      ["C01", "Autenticación individual con correo y contraseña; mensaje único «Credenciales inválidas» y hash ficticio para igualar el tiempo de respuesta (anti-enumeración)", "`services/auth_service.py` (login), `routes/auth.py`", ["ISO 27001 A.8.5 Autenticación segura", "OWASP A07 · ASVS V2"], "Implementado"],
      ["C02", "Contraseñas almacenadas con bcrypt, cost 12, sal aleatoria por contraseña", "`security.py` (hash_password), `config.py` (BCRYPT_ROUNDS)", ["ISO 27001 A.5.17 Información de autenticación", "OWASP A02 · ASVS V2.4", "NIST 800-63B §5.1.1.2"], "Implementado"],
      ["C03", "Política de contraseñas: mínimo 10 caracteres, mayúscula, minúscula, número y símbolo", "`security.py` (validar_politica_password), alta de usuario en `routes/auth.py`. Pendiente: mínimo de 12, máximo de 72 bytes y lista de claves filtradas", ["ISO 27001 A.5.17", "ASVS V2.1", "NIST 800-63B §5.1.1.2"], "Parcial"],
      ["C04", "Bloqueo temporal tras 5 intentos fallidos (15 minutos, HTTP 423); el contador se pone a cero con un acceso correcto", "`auth_service.py`, `repositories/usuarios.py` (registrar_fallo); columnas `intentos_fallidos` y `bloqueado_hasta`", ["ISO 27001 A.8.5", "OWASP A07", "NIST 800-63B §5.2.2"], "Implementado"],
      ["C05", "Limitación de tasa por IP: login 10/min, refresh 30/min y 300/min global", "`extensions.py`, `routes/auth.py` (Flask-Limiter)", ["OWASP A04, A07", "NIST 800-63B §5.2.2", "ISO 27001 A.8.5"], "Implementado"],
      ["C06", "Control de acceso basado en roles: 8 permisos y 4 roles, verificados en cada endpoint", "`security.py` (PERMISOS, login_required)", ["ISO 27001 A.5.15 Control de acceso, A.5.18 Derechos de acceso", "OWASP A01 · ASVS V4", "NIST CSF 2.0 PR.AA"], "Implementado"],
      ["C07", "Menú y vistas filtrados por los permisos de la sesión (apoyo de usabilidad; la autorización efectiva está en la API)", "`frontend/src/App.jsx` (VISTAS.filter)", ["ISO 27001 A.8.3 Restricción del acceso a la información", "OWASP A01"], "Implementado"],
      ["C08", "Cuentas gestionadas solo por el Administrador; no puede desactivarse a sí mismo; un usuario inactivo no renueva la sesión", "`routes/auth.py` (estado_usuario), `auth_service.py` (refresh)", ["ISO 27001 A.5.16 Gestión de identidades, A.8.2 Derechos de acceso privilegiados", "OWASP A01"], "Implementado"],
      ["C09", "Mínimo privilegio en la base de datos: el rol de la aplicación no es superusuario ni de replicación. Pendiente: separar propietario de tablas y rol de aplicación", "`evidencias/03_monitoreo_bd.txt`, `db/replication/01_primary_config.sql`", ["ISO 27001 A.8.2", "OWASP A01, A05", "NIST CSF 2.0 PR.AA"], "Parcial"],
      ["C10", "Autenticación multifactor (TOTP) para el rol Administrador", "No implementado; previsto para el Sprint 6", ["ISO 27001 A.8.5", "OWASP A07", "NIST 800-63B (AAL2)"], "Planificado"],
    ] },
    { id: "ctl_sesion", t: "Sesión y tokens", intro: "Controles sobre el ciclo de vida de la sesión: emisión, renovación, almacenamiento en el navegador y revocación.", rows: [
      ["C11", "Access token JWT firmado con HS256, vigencia 15 minutos; algoritmo fijado en la verificación y claims exp, sub y rol obligatorios", "`security.py` (crear_access_token, decodificar_access_token)", ["ISO 27001 A.8.5", "OWASP A07, A08 · ASVS V3.5", "RFC 7519"], "Implementado"],
      ["C12", "Refresh token opaco de 48 bytes aleatorios; en la base solo se guarda su hash SHA-256", "`security.py` (nuevo_refresh_token), tabla `sesiones`", ["ISO 27001 A.8.24 Uso de criptografía", "OWASP A02, A07 · ASVS V3"], "Implementado"],
      ["C13", "Rotación del refresh token en cada renovación; el anterior queda revocado y su reutilización se rechaza", "`auth_service.py` (refresh)", ["OWASP A07 · ASVS V3.3", "NIST CSF 2.0 PR.AA"], "Implementado"],
      ["C14", "Cookie del refresh token HttpOnly, SameSite=Strict, Path=/api/auth, Secure en producción, 7 días", "`routes/auth.py` (_set_cookie), `config.py` (COOKIE_SECURE)", ["OWASP A02, A07 · ASVS V3.4", "ISO 27001 A.8.5"], "Implementado"],
      ["C15", "Defensa anti-CSRF: cabecera X-Requested-With obligatoria en /auth/refresh y access token enviado por cabecera Authorization (no por cookie)", "`routes/auth.py` (_csrf_ok), `frontend/src/api.js`", ["OWASP A01 · ASVS V4", "ISO 27001 A.8.26 Requisitos de seguridad de las aplicaciones"], "Implementado"],
      ["C16", "Access token solo en memoria del navegador (sin localStorage); el cierre de sesión revoca el refresh y borra la cookie", "`frontend/src/api.js`, `auth_service.py` (logout)", ["OWASP A07 · ASVS V3.3", "ISO 27001 A.8.5"], "Implementado"],
      ["C17", "Revocación en cadena de las sesiones del usuario y registro de auditoría al detectar la reutilización de un refresh", "No implementado (`SesionRepository.revocar_todas` existe, pero no se invoca); previsto para el Sprint 4", ["OWASP A07", "ISO 27001 A.8.15 Registro"], "Planificado"],
    ] },
    { id: "ctl_cripto", t: "Criptografía y protección de datos", intro: "Controles que protegen la confidencialidad e integridad de los datos en reposo, en tránsito y en los secretos de configuración.", rows: [
      ["C18", "Cifrado en reposo AES-256-GCM del teléfono del usuario (nonce de 12 bytes por registro; formato nonce, texto cifrado y etiqueta)", "`security.py` (cifrar, descifrar); columna `usuarios.telefono_cifrado`", ["ISO 27001 A.8.24 Uso de criptografía, A.5.34 Privacidad y protección de datos personales", "OWASP A02 · ASVS V6", "NIST CSF 2.0 PR.DS"], "Implementado"],
      ["C19", "Secretos solo en variables de entorno: Render genera JWT_SECRET y la clave AES; en producción el arranque rechaza las claves de desarrollo", "`config.py` (validate), `render.yaml`, `.env.example`, `.gitignore`", ["ISO 27001 A.8.24", "OWASP A02, A05 · ASVS V6.4"], "Implementado"],
      ["C20", "Cifrado en tránsito: TLS terminado por la plataforma, HSTS de un año con includeSubDomains y cookie Secure. Pendiente: verificar sobre la URL de Render", "`security.py` (aplicar_cabeceras), `evidencias/seguridad/tls.txt` (prueba local)", ["ISO 27001 A.8.24, A.8.20 Seguridad de redes", "OWASP A02 · ASVS V9", "RFC 6797"], "Parcial"],
      ["C21", "Autenticación de PostgreSQL con SCRAM-SHA-256; la replicación exige hostssl con scram-sha-256", "`evidencias/03_monitoreo_bd.txt`, `db/replication/01_primary_config.sql`", ["ISO 27001 A.8.5, A.8.24", "OWASP A02, A07"], "Implementado"],
      ["C22", "Minimización de datos: ninguna respuesta de la API incluye hash de contraseña ni teléfono", "`repositories/usuarios.py` (listar), `routes/auth.py` (login)", ["ISO 27001 A.5.34", "OWASP A02 · ASVS V8"], "Implementado"],
      ["C23", "Rotación de secretos: procedimiento para JWT_SECRET y clave AES con identificador de versión dentro del cifrado", "No implementado; previsto para el Sprint 6", ["ISO 27001 A.8.24", "OWASP A02"], "Planificado"],
    ] },
    { id: "ctl_entrada", t: "Entrada, salida y configuración", intro: "Controles contra inyección y abuso de datos de entrada, y de endurecimiento de la configuración del servidor y del contenedor.", rows: [
      ["C24", "Consultas parametrizadas en todos los repositorios; lista blanca para la única columna de ordenamiento dinámica", "`repositories/base.py` y demás repositorios", ["ISO 27001 A.8.28 Codificación segura", "OWASP A03 · ASVS V5.3"], "Implementado"],
      ["C25", "Validación de entrada: expresión regular de correo, longitudes máximas, listas cerradas de tipo, estado y rol, rangos numéricos; restricciones CHECK en la base", "`routes/auth.py`, `routes/negocio.py` (_num), `db/schema.sql`", ["OWASP A03, A04 · ASVS V5.1", "ISO 27001 A.8.28"], "Implementado"],
      ["C26", "Límites de tamaño: cuerpo máximo de 64 KB, línea de petición de 4094 bytes y 50 campos de cabecera", "`app/_​_init_​_.py`, `gunicorn.conf.py`", ["OWASP A04, A05 · ASVS V13", "ISO 27001 A.8.9 Gestión de la configuración"], "Implementado"],
      ["C27", "Salida segura: la API responde solo JSON; React escapa el contenido; la SPA no usa dangerouslySetInnerHTML ni innerHTML", "`frontend/src/` (verificado con búsqueda en el código)", ["OWASP A03 (XSS) · ASVS V5.3", "ISO 27001 A.8.28"], "Implementado"],
      ["C28", "Cabeceras de seguridad: CSP restrictiva, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy y COOP. Pendiente: eliminar 'unsafe-inline' de style-src", "`security.py` (aplicar_cabeceras)", ["ISO 27001 A.8.9", "OWASP A05 · ASVS V14.4"], "Parcial"],
      ["C29", "Cache-Control no-store en /api/*, ocultamiento de la tecnología del servidor (Server: webserver) y ETag desactivado", "`security.py`, `gunicorn.conf.py`, `app/_​_init_​_.py`", ["OWASP A05", "ISO 27001 A.8.9"], "Implementado"],
      ["C30", "Errores genéricos sin trazas de pila; las excepciones se registran solo en el log del servidor", "`app/_​_init_​_.py` (manejadores de error)", ["OWASP A05, A09 · ASVS V7.4", "ISO 27001 A.8.9"], "Implementado"],
      ["C31", "Mismo origen sin CORS; servido de la SPA con realpath y prefijo del directorio estático (anti path traversal); archivos inexistentes responden 404", "`app/_​_init_​_.py` (spa)", ["OWASP A01, A05 · ASVS V12.3", "ISO 27001 A.8.9"], "Implementado"],
      ["C32", "Contenedor sin privilegios (usuario UID 10001), imagen multi-etapa. Pendiente: la imagen no se pudo construir en el entorno de desarrollo", "`Dockerfile`", ["ISO 27001 A.8.9", "OWASP A05", "NIST CSF 2.0 PR.PS"], "Parcial"],
    ] },
    { id: "ctl_registro", t: "Registro, auditoría, disponibilidad e integridad de la base de datos", intro: "Controles de trazabilidad (quién hizo qué y cuándo) y de continuidad e integridad de los datos del negocio.", rows: [
      ["C33", "Bitácora de auditoría con 12 acciones (accesos, bloqueos, denegaciones, usuarios, movimientos, órdenes), con IP y resultado; consulta restringida al Administrador", "`repositories/analitica.py` (AuditoriaRepository), rutas y `auth_service.py`", ["ISO 27001 A.8.15 Registro", "OWASP A09 · ASVS V7", "NIST CSF 2.0 DE.CM"], "Implementado"],
      ["C34", "Inmutabilidad de la bitácora: un trigger impide UPDATE y DELETE. Pendiente: TRUNCATE no está bloqueado", "`db/schema.sql` (fn_bloquear_auditoria, trg_auditoria_inmutable)", ["ISO 27001 A.8.15", "OWASP A09"], "Parcial"],
      ["C35", "Monitoreo y alertas automáticas de eventos de seguridad (ráfagas de bloqueos y accesos denegados)", "No implementado; la consulta manual existe en la pantalla Auditoría. Previsto para el Sprint 6", ["ISO 27001 A.8.16 Actividades de seguimiento", "OWASP A09", "NIST CSF 2.0 DE.AE"], "Planificado"],
      ["C36", "Integridad de los datos del negocio: CHECK, claves foráneas, UNIQUE, trigger de stock y SELECT FOR UPDATE en transacciones", "`db/schema.sql`, `routes/negocio.py`", ["ISO 27001 A.8.26", "OWASP A04", "NIST CSF 2.0 PR.DS"], "Implementado"],
      ["C37", "Respaldo con pg_dump/pg_restore verificado y replicación streaming asíncrona. En Render dependerá del plan contratado", "`db/admin/backup_restore.sh`, `db/replication/`, `evidencias/01` a `03`", ["ISO 27001 A.8.13 Respaldo de la información, A.8.14 Redundancia", "NIST CSF 2.0 PR.IR, RC.RP"], "Parcial"],
      ["C38", "Disponibilidad básica: healthcheck /api/health, tiempo máximo de 30 s por petición, 2 workers y pool de 1 a 10 conexiones", "`gunicorn.conf.py`, `render.yaml`, `app/db.py`", ["ISO 27001 A.8.14", "OWASP A04", "NIST CSF 2.0 PR.IR"], "Implementado"],
    ] },
    { id: "ctl_cadena", t: "Cadena de suministro y pruebas de seguridad", intro: "Controles sobre el código propio, las dependencias de terceros y la verificación continua de la seguridad.", rows: [
      ["C39", "Análisis estático con Bandit (0 hallazgos sobre 671 líneas), ejecutado también en el pipeline de CI", "`.github/workflows/ci.yml`, `evidencias/seguridad/bandit.txt`", ["ISO 27001 A.8.28, A.8.29 Pruebas de seguridad en desarrollo", "OWASP A04, A08"], "Implementado"],
      ["C40", "Auditoría de dependencias: pip-audit (también en CI) y npm audit, sin vulnerabilidades; versiones fijadas con == y package-lock.json con npm ci", "`requirements.txt`, `Dockerfile`, `evidencias/seguridad/pip_audit.txt`, `npm_audit.txt`", ["ISO 27001 A.8.8 Gestión de vulnerabilidades técnicas", "OWASP A06, A08"], "Implementado"],
      ["C41", "Pruebas automáticas: 16 pruebas pytest de seguridad y 20 verificaciones OWASP en el script propio", "`tests/test_seguridad.py`, `tests/pentest_manual.py`", ["ISO 27001 A.8.29", "OWASP A01–A07"], "Implementado"],
      ["C42", "Pruebas de penetración sobre la URL desplegada en Render (nmap, nikto, sqlmap, script propio, análisis TLS externo)", "Pendiente de ejecutar tras el despliegue", ["ISO 27001 A.8.29", "OWASP WSTG"], "Planificado"],
      ["C43", "Pruebas dinámicas (DAST) automatizadas en el pipeline de CI", "No implementado; previsto para el Sprint 6", ["ISO 27001 A.8.29", "OWASP A05"], "Planificado"],
    ] },
  ];
  const todos = GRUPOS.flatMap((x) => x.rows);
  const cuenta = (e) => todos.filter((r) => r[4] === e).length;

  // ====================================================================== datos reales de la auditoría (psql)
  const PSQL_ACCIONES = `vastago=> SELECT accion, exito, count(*) FROM auditoria GROUP BY 1,2 ORDER BY 3 DESC;
       accion       | exito | count
--------------------+-------+-------
 LOGIN_OK           | t     |    67
 LOGIN_FALLIDO      | f     |     8
 ACCESO_DENEGADO    | f     |     5
 LOGOUT             | t     |     1
 TOKEN_REFRESCADO   | t     |     1
 USUARIO_CREADO     | t     |     1
 ORDEN_CREADA       | t     |     1
 ORDEN_ESTADO       | t     |     1
 LOGIN_BLOQUEADO    | f     |     1
 MOVIMIENTO_INGRESO | t     |     1
(10 rows)          -- total: 87 registros, 14 con exito = false`;
  const PSQL_EJEMPLOS = `vastago=> SELECT DISTINCT ON (accion) id, to_char(fecha,'HH24:MI:SS') AS hora, accion,
          entidad, exito, detalle FROM auditoria ORDER BY accion, id DESC;
 id |   hora   |       accion       |      entidad       | exito |                    detalle
----+----------+--------------------+--------------------+-------+--------------------------------
 51 | 00:45:32 | ACCESO_DENEGADO    | inventario:ver     | f     | {}
 57 | 00:45:32 | LOGIN_BLOQUEADO    |                    | f     | {}
 86 | 00:45:32 | LOGIN_FALLIDO      |                    | f     | {"intentos": 1}
 87 | 01:01:21 | LOGIN_OK           |                    | t     | {}
 68 | 00:45:32 | LOGOUT             |                    | t     | {}
  9 | 00:45:31 | MOVIMIENTO_INGRESO | insumos            | t     | {"cantidad": 100.0, "insumo_id": 4}
 22 | 00:45:31 | ORDEN_CREADA       | ordenes_produccion | t     | {"lote": "L-2026-017", "cantidad": 100}
 23 | 00:45:31 | ORDEN_ESTADO       | ordenes_produccion | t     | {"lote": "L-2026-017", "estado": "Completada"}
 59 | 00:45:32 | TOKEN_REFRESCADO   |                    | t     | {}
 73 | 00:45:32 | USUARIO_CREADO     | usuarios           | t     | {"rol": "Gerente", "nuevo_id": 5}`;

  return [
    H1("9. Seguridad del Sistema"),
    P("Este capítulo documenta cómo se protege el sistema de Vástago & Co: el catálogo de controles implementados, el módulo de autenticación y autorización, el informe técnico de cifrado y trazabilidad, y las pruebas de seguridad web realizadas con sus resultados. Cada afirmación se verificó contra el código del repositorio (`backend/app/security.py`, `services/auth_service.py`, `routes/auth.py`, `routes/negocio.py`, `db/schema.sql`, `frontend/src/api.js` y `backend/tests/`) y contra los reportes reales guardados en `evidencias/seguridad/`. La seguridad responde al requisito RNF01 y al riesgo R3 (brecha de seguridad con acceso no autorizado a datos) del capítulo 5."),
    note("**Alcance y límites de las pruebas.** Todos los escaneos se ejecutaron el 06-oct-2026 contra el sistema levantado en el equipo de desarrollo del propio equipo (http://127.0.0.1:8000, servidor gunicorn), con autorización del propietario del sistema. Las pruebas HTTP del puerto 8000 no usan TLS: HSTS y la cookie Secure dependen de `APP_ENV=production` y se comprobaron aparte (puerto 8443, certificado autofirmado). **El sistema aún no está desplegado en Render**, de modo que no se ha probado contra la URL pública; esa prueba figura como acción pendiente en la sección 9.4.3. Las herramientas son las de Kali Linux (nmap, nikto, sqlmap) instaladas sobre Linux; no se usó una máquina virtual Kali completa."),

    // ===================================================================== 9.1
    H2("9.1 Catálogo de controles de seguridad"),
    P("El sistema aplica el principio de **defensa en profundidad**: ninguna capa se considera suficiente por sí sola, de modo que un fallo en una (por ejemplo, un token robado) sea contenido por otra (permisos por rol, expiración corta y auditoría). La {fig:capas} resume las seis capas de protección y los controles principales de cada una."),
    ...fig("assets/seguridad_capas.png", "Capas de defensa en profundidad del sistema", { id: "capas", width: 560,
      desc: "De arriba hacia abajo: transporte, perímetro, identidad, autorización, datos y trazabilidad. Cada capa agrupa controles del catálogo de las tablas siguientes.",
      source: "Elaboración propia a partir de backend/app/security.py, config.py, db/schema.sql y render.yaml." }),
    P("El catálogo se organizó en seis grupos y suma **" + todos.length + " controles**, cada uno con un identificador (C01 a C" + todos.length + "), su implementación concreta con el archivo del repositorio donde se encuentra y el estándar al que se alinea. Los estados se asignaron con criterio estricto: **Implementado** significa que existe en el código y tiene una prueba o evidencia; **Parcial**, que existe pero con una limitación declarada en la propia fila; **Planificado**, que aún no existe y tiene sprint previsto. Resultado: **" + cuenta("Implementado") + " implementados, " + cuenta("Parcial") + " parciales y " + cuenta("Planificado") + " planificados**."),
    P("**Estándares utilizados.** __ISO 27001__ es ISO/IEC 27001:2022, Anexo A (controles A.5 organizacionales y A.8 tecnológicos); __OWASP__ es el Top 10 de 2021 (A01 a A10) y __ASVS__ el capítulo correspondiente del Application Security Verification Standard 4.0.3; __NIST 800-63B__ es la guía de identidad digital SP 800-63B (Grassi et al., 2017) y __NIST CSF__ la versión 2.0 del Cybersecurity Framework (NIST, 2024); __RFC__ identifica el estándar de Internet citado. Cuando no se tuvo certeza de un código exacto se citó solo el nombre del control."),
    ...GRUPOS.flatMap((gr, i) => [
      H3(`Grupo ${String.fromCharCode(65 + i)}. ${gr.t}`),
      P(gr.intro + " La {tab:" + gr.id + "} detalla los controles de este grupo."),
      ...T(["ID", "Control", "Implementación", "Estándar alineado", "Estado"], gr.rows, { id: gr.id, title: "Controles de seguridad — " + gr.t, widths: [0.5, 2.55, 2.3, 2.3, 1.3], size: 17, hsize: 18,
        source: "Elaboración propia a partir del código del repositorio; ISO/IEC (2022), OWASP Foundation (2021, 2020), Grassi et al. (2017) y NIST (2024)." }),
    ]),
    P("Los controles parciales y planificados no son omisiones ocultas: cada uno se vincula con una acción concreta de la sección 9.4.3, de modo que el catálogo y el plan de mejora cuenten la misma historia."),

    // ===================================================================== 9.2
    H2("9.2 Módulo de Autenticación y Autorización implementado"),
    P("El módulo cubre las historias HU08 (iniciar sesión de forma segura), HU09 (control por roles), HU10 (gestión de usuarios) y HU11 (bitácora), y los requisitos RF05 a RF08. Está repartido en cuatro piezas: las **rutas** de autenticación (`routes/auth.py`), el **caso de uso** (`services/auth_service.py`), las **primitivas de seguridad** (`security.py`: bcrypt, JWT, AES, permisos) y el **cliente** de la SPA (`frontend/src/api.js`)."),
    H3("Código fuente en GitHub"),
    P("Las rutas siguientes se resuelven sobre el repositorio del equipo (rama `main`). Los enlaces estarán activos cuando el equipo publique la versión de este sprint, porque el envío al repositorio no pudo realizarse desde el entorno de desarrollo."),
    link("backend/app/security.py", "bcrypt, JWT, AES-256-GCM, PERMISOS, login_required y cabeceras."),
    link("backend/app/services/auth_service.py", "inicio de sesión con bloqueo, rotación del refresh y cierre de sesión."),
    link("backend/app/routes/auth.py", "endpoints de login, refresh, logout, usuarios y auditoría; cookie y control CSRF."),
    link("backend/app/routes/negocio.py", "endpoints de inventario, producción y analítica protegidos por permiso."),
    link("backend/app/config.py", "parámetros de seguridad y validación de secretos en producción."),
    link("backend/tests/test_seguridad.py", "16 pruebas automáticas de seguridad."),
    link("db/schema.sql", "tablas usuarios, roles, sesiones y auditoría; trigger de inmutabilidad."),
    link("frontend/src/api.js", "cliente HTTP con el token en memoria y renovación automática."),
    spacer(80),
    H3("Pantalla de inicio de sesión"),
    P("La {fig:login} muestra la pantalla que ve cualquier usuario no autenticado. Pide solo correo y contraseña, limita la longitud de ambos campos (120 y 128 caracteres, igual que la API), informa que el acceso es restringido y que toda actividad queda registrada, y no ofrece enlaces de registro ni de recuperación: las cuentas las crea el Administrador."),
    ...fig("assets/cap9_01_login.png", "Pantalla de inicio de sesión del sistema", { id: "login", width: 380,
      desc: "Formulario con correo corporativo y contraseña; el aviso inferior recuerda el registro de la actividad.",
      source: "Captura del sistema local, evidencias/capturas/01_login.png (06-oct-2026), recortada al formulario." }),
    P("Ante credenciales incorrectas (ver {fig:login_err}) el sistema muestra un mensaje único, «Credenciales inválidas», tanto si el correo no existe como si la contraseña es errónea, y vacía el campo de contraseña. La respuesta de la API es idéntica en ambos casos (prueba `test_login_incorrecto_mensaje_generico`), lo que impide descubrir qué correos están registrados. Tras cinco fallos consecutivos la cuenta se bloquea 15 minutos y la API responde 423."),
    ...fig("assets/cap9_02_login_error.png", "Mensaje genérico ante credenciales inválidas", { id: "login_err", width: 380,
      desc: "El mensaje no distingue entre usuario inexistente y contraseña incorrecta; el campo de contraseña se limpia.",
      source: "Captura del sistema local, evidencias/capturas/02_login_error.png (06-oct-2026), recortada al formulario." }),

    H3("Flujo de autenticación: JWT de 15 minutos y refresh rotatorio"),
    P("La {fig:secuencia} describe el recorrido completo. El inicio de sesión devuelve en el cuerpo un **token de acceso JWT** de 15 minutos y, en una cookie `HttpOnly`, un **token de renovación** (refresh) opaco de 7 días. El navegador guarda el primero solo en memoria; el segundo no es legible por JavaScript. Cuando el token de acceso vence, la SPA pide uno nuevo con la cookie, y en cada renovación el refresh anterior se revoca y se emite otro (rotación). Si alguien presenta un refresh ya usado, la API responde 401 y borra la cookie."),
    ...fig("assets/cap9_secuencia_auth.png", "Secuencia de autenticación, uso del token y rotación del refresh", { id: "secuencia", width: 600,
      desc: "Los pasos 1 a 4 corresponden al login; 5 a 7 al uso del token de acceso; 8 a 10 a la renovación con rotación; 11 y 12 al intento de reutilización de un refresh ya rotado.",
      source: "Elaboración propia a partir de routes/auth.py, services/auth_service.py y security.py." }),
    P("Los detalles que hacen robusto el flujo son los siguientes."),
    ...numbered([
      "**Verificación de contraseña** con `bcrypt.checkpw`. Si el correo no existe, igualmente se calcula un hash contra una clave ficticia para que la respuesta tarde lo mismo (paso 2).",
      "**Registro del fallo antes del error.** Los fallos se confirman en la base antes de lanzar la excepción; si se lanzara dentro de la transacción, el rollback borraría el contador y la auditoría del intento.",
      "**Token de acceso mínimo.** Lleva solo el identificador, el rol y el nombre (más `iat`, `exp` y un `jti`); no contiene datos sensibles. Se firma con HS256 y la clave `JWT_SECRET`.",
      "**Refresh opaco.** No es un JWT: son 48 bytes aleatorios (`secrets.token_urlsafe`). La base solo guarda su hash SHA-256, de modo que una filtración de la tabla `sesiones` no permite reconstruir ningún token.",
      "**Consulta de sesión válida.** Una sesión sirve solo si no está revocada y no ha expirado (`NOT revocada AND expira_en > now()`).",
    ]),
    ...cod(`def login(email, password, ip, user_agent):       # (abreviado)
    error = None
    with transaction() as cur:
        u = users.find_by_email(email)
        if not u:
            sec.verify_password(password, _DUMMY)       # mismo costo que un usuario real
            aud.registrar("LOGIN_FALLIDO", email=email, ip=ip, exito=False, ...)
            error = AuthError("Credenciales inválidas")
        elif u["bloqueado_hasta"] and u["bloqueado_hasta"] > datetime.now(timezone.utc):
            aud.registrar("LOGIN_BLOQUEADO", u["id"], email, ip=ip, exito=False)
            error = AuthError("Cuenta bloqueada temporalmente por intentos fallidos", 423)
        elif not u["activo"] or not sec.verify_password(password, u["password_hash"]):
            r = users.registrar_fallo(u["id"], cfg["MAX_LOGIN_ATTEMPTS"],
                                      cfg["LOCKOUT_MINUTES"])
            aud.registrar("LOGIN_FALLIDO", u["id"], email, ip=ip, exito=False, ...)
            error = AuthError("Credenciales inválidas")
        else:
            users.registrar_acceso(u["id"])             # contador de fallos a cero
            token, token_hash = sec.nuevo_refresh_token()
            sess.crear(u["id"], token_hash, ..., ip, user_agent)
            aud.registrar("LOGIN_OK", u["id"], email, ip=ip)
    if error:                    # se lanza DESPUÉS del commit: el intento queda registrado
        raise error`, "Inicio de sesión con bloqueo, anti-enumeración y auditoría", "login_fn",
      "backend/app/services/auth_service.py, función login (abreviada; saltos de línea ajustados al ancho de página)."),
    ...cod(`def refresh(refresh_token, ip, user_agent):         # (abreviado)
    with transaction() as cur:
        h = sec.hash_token(refresh_token)
        s = sess.buscar_valida(h)                  # NOT revocada AND expira_en > now()
        if not s:
            raise AuthError("Sesión inválida o expirada")
        u = users.get_con_rol(s["usuario_id"])
        if not u or not u["activo"]:
            raise AuthError("Usuario inactivo")
        sess.revocar(h)                            # el refresh usado queda inutilizable
        nuevo, nuevo_hash = sec.nuevo_refresh_token()
        sess.crear(u["id"], nuevo_hash, ..., ip, user_agent)
        aud.registrar("TOKEN_REFRESCADO", u["id"], u["email"], ip=ip)
    return usuario, sec.crear_access_token(usuario), nuevo`, "Rotación del refresh token", "refresh_fn",
      "backend/app/services/auth_service.py, función refresh (abreviada)."),

    H3("Credenciales: parámetros de seguridad"),
    P("La {tab:parametros} reúne los parámetros que gobiernan la autenticación. Todos salvo la política de contraseñas se leen de variables de entorno con un valor por defecto seguro, de modo que se pueden endurecer sin tocar el código."),
    ...T(["Parámetro", "Valor", "Dónde se define"], [
      ["Algoritmo de contraseñas", "bcrypt, cost 12, sal aleatoria por contraseña", "config.py: BCRYPT_ROUNDS (12)"],
      ["Política de contraseñas", "Mínimo 10 caracteres con mayúscula, minúscula, número y símbolo", "security.py: validar_politica_password"],
      ["Longitud máxima aceptada", "Correo 120 y contraseña 128 caracteres", "routes/auth.py (login)"],
      ["Bloqueo de cuenta", "5 intentos fallidos, bloqueo de 15 minutos (HTTP 423)", "config.py: MAX_LOGIN_ATTEMPTS, LOCKOUT_MINUTES"],
      ["Token de acceso", "JWT HS256, 15 minutos, claims exp, sub y rol obligatorios", "config.py: ACCESS_TOKEN_MINUTES"],
      ["Token de renovación", "48 bytes aleatorios (384 bits), 7 días, hash SHA-256 en la base", "config.py: REFRESH_TOKEN_DAYS"],
      ["Limitación de tasa", "Login 10/min; refresh 30/min; global 300/min por IP", "extensions.py y routes/auth.py"],
      ["Respuesta de error", "Mensaje único «Credenciales inválidas» (401) para usuario inexistente o clave errónea", "routes/auth.py, auth_service.py"],
    ], { id: "parametros", title: "Parámetros de autenticación y credenciales", widths: [2.1, 4.1, 2.9], size: 18,
      source: "Elaboración propia a partir de backend/app/config.py, security.py, extensions.py y routes/auth.py." }),
    P("**Costo de bcrypt.** En el equipo de desarrollo, una medición puntual con bcrypt 5.0.0 dio unos 265 ms por hash con cost 12, frente a 1 ms con cost 4. Ese costo (aceptable para un inicio de sesión) es el que encarece un ataque de fuerza bruta contra una base filtrada. La base local de pruebas contiene hashes `$2b$04$` porque las pruebas pytest vuelven a sembrar los datos con `BCRYPT_ROUNDS=4` para ejecutarse rápido; en el despliegue rige el valor por defecto de 12."),
    P("**Bloqueo y su contrapartida.** El bloqueo por cuenta frena la fuerza bruta contra un usuario concreto, pero permitiría a un atacante bloquear cuentas ajenas a propósito. Se acepta ese riesgo porque el bloqueo es corto (15 minutos), existe limitación de tasa por IP y todo intento queda auditado; la mejora prevista es el segundo factor (C10)."),

    H3("Autorización por roles (RBAC)"),
    P("El sistema define cuatro roles (Administrador, Jefe de Producción, Almacenero y Gerente) y ocho permisos con formato `recurso:acción`. La tabla `PERMISOS` de `security.py` es la **única fuente de verdad**: el decorador `login_required(\"permiso\")` consulta esa tabla en cada petición, y el endpoint de login devuelve a la SPA la lista de permisos del rol para construir el menú. La {tab:rolperm} reproduce la tabla real."),
    ...cod(`PERMISOS = {
    "dashboard:ver": {"Administrador", "Jefe de Producción", "Almacenero", "Gerente"},
    "inventario:ver": {"Administrador", "Jefe de Producción", "Almacenero"},
    "inventario:escribir": {"Administrador", "Almacenero"},
    "produccion:ver": {"Administrador", "Jefe de Producción", "Almacenero", "Gerente"},
    "produccion:escribir": {"Administrador", "Jefe de Producción"},
    "analitica:ver": {"Administrador", "Jefe de Producción", "Gerente"},
    "usuarios:gestionar": {"Administrador"},
    "auditoria:ver": {"Administrador"},
}`, "Tabla de permisos por rol", "permisos", "backend/app/security.py, constante PERMISOS."),
    ...T(["Permiso", "Administrador", "Jefe de Producción", "Almacenero", "Gerente"], [
      ["dashboard:ver", "Sí", "Sí", "Sí", "Sí"],
      ["inventario:ver", "Sí", "Sí", "Sí", "—"],
      ["inventario:escribir", "Sí", "—", "Sí", "—"],
      ["produccion:ver", "Sí", "Sí", "Sí", "Sí"],
      ["produccion:escribir", "Sí", "Sí", "—", "—"],
      ["analitica:ver", "Sí", "Sí", "—", "Sí"],
      ["usuarios:gestionar", "Sí", "—", "—", "—"],
      ["auditoria:ver", "Sí", "—", "—", "—"],
    ], { id: "rolperm", title: "Matriz rol × permiso", widths: [2.6, 1.6, 1.8, 1.5, 1.4], size: 19, align: [AlignmentType.LEFT, AlignmentType.CENTER, AlignmentType.CENTER, AlignmentType.CENTER, AlignmentType.CENTER],
      source: "Elaboración propia a partir de la constante PERMISOS de backend/app/security.py." }),
    P("Cada endpoint protegido declara el permiso que exige. La {tab:endpoints_rol} cruza los endpoints reales con los roles; un «—» significa que la API responde 403 y registra el evento `ACCESO_DENEGADO`, y un acceso sin token responde 401."),
    ...T(["Endpoint", "Permiso requerido", "Adm.", "Jefe", "Alm.", "Ger."], [
      ["POST /api/auth/login", "Público (10/min)", "Sí", "Sí", "Sí", "Sí"],
      ["POST /api/auth/refresh", "Cookie + cabecera anti-CSRF (30/min)", "Sí", "Sí", "Sí", "Sí"],
      ["POST /api/auth/logout", "Token válido", "Sí", "Sí", "Sí", "Sí"],
      ["GET /api/health", "Público (healthcheck)", "Sí", "Sí", "Sí", "Sí"],
      ["GET /api/inventario; GET /api/inventario/{id}/movimientos", "inventario:ver", "Sí", "Sí", "Sí", "—"],
      ["POST /api/inventario/{id}/movimientos", "inventario:escribir", "Sí", "—", "Sí", "—"],
      ["GET /api/productos; /api/productos/{id}/bom; /api/produccion", "produccion:ver", "Sí", "Sí", "Sí", "Sí"],
      ["POST /api/produccion; PATCH /api/produccion/{id}/estado", "produccion:escribir", "Sí", "Sí", "—", "—"],
      ["GET /api/alertas; GET /api/kpis", "dashboard:ver", "Sí", "Sí", "Sí", "Sí"],
      ["GET /api/forecast", "analitica:ver", "Sí", "Sí", "—", "Sí"],
      ["GET y POST /api/auth/usuarios; PATCH /api/auth/usuarios/{id}", "usuarios:gestionar", "Sí", "—", "—", "—"],
      ["GET /api/auth/auditoria", "auditoria:ver", "Sí", "—", "—", "—"],
    ], { id: "endpoints_rol", title: "Matriz endpoint × rol (comportamiento real de la API)", widths: [4.2, 2.4, 0.7, 0.7, 0.7, 0.7], size: 17,
      align: [AlignmentType.LEFT, AlignmentType.LEFT, AlignmentType.CENTER, AlignmentType.CENTER, AlignmentType.CENTER, AlignmentType.CENTER],
      source: "Elaboración propia a partir de backend/app/routes/auth.py y negocio.py; contrastada con tests/test_seguridad.py (escalada de privilegios)." }),
    P("La prueba `test_escalada_de_privilegios_bloqueada_por_rol` verifica esta matriz con peticiones reales: el Almacenero no puede listar usuarios ni crear órdenes de producción, el Jefe de Producción no puede ver la auditoría ni registrar movimientos de inventario, el Gerente no puede consultar el inventario y el Administrador sí accede a la gestión de usuarios. El script de penetración repite las dos primeras comprobaciones contra la instancia en ejecución (sección 9.4)."),
    P("La interfaz refleja los permisos: el menú lateral se construye con las vistas cuyo permiso figura en la sesión, por lo que cada rol ve solo lo que puede usar ({fig:menus}). Esto mejora la usabilidad, pero **no es el control de seguridad**: aunque alguien llamara a la API directamente, el servidor rechazaría la acción."),
    ...fig("assets/cap9_menus_rol.png", "Menú lateral según el rol del usuario", { id: "menus", width: 520,
      desc: "El Administrador ve las seis vistas; el Almacenero, tres (Dashboard, Inventario y Producción); el Gerente, tres (Dashboard, Producción y Analítica IA). No se capturó la sesión del Jefe de Producción, cuyo menú resulta de PERMISOS: todas las vistas salvo Usuarios y Auditoría.",
      source: "Capturas del sistema local (evidencias/capturas/admin_Dashboard.png, almacenero_Dashboard.png y gerente_Dashboard.png), recortadas." }),
    P("La gestión de cuentas (HU10) es exclusiva del Administrador: puede crear usuarios (con la política de contraseñas y un teléfono opcional cifrado), activar o desactivar cuentas, pero no puede desactivarse a sí mismo. La {fig:usuarios} muestra la pantalla, que solo aparece en el menú de ese rol."),
    ...fig("../../evidencias/capturas/admin_Usuarios.png", "Gestión de usuarios (solo Administrador)", { id: "usuarios", width: 440,
      desc: "Listado de usuarios con su rol y estado; el botón permite activar o desactivar la cuenta. La API no devuelve hashes ni teléfonos.",
      source: "Captura del sistema local, evidencias/capturas/admin_Usuarios.png (06-oct-2026)." }),

    H3("Sesiones y tokens: cookie, CSRF, revocación y reutilización"),
    P("La {tab:cookie} detalla los atributos de la cookie `vastago_rt` y la amenaza que mitiga cada uno. Los valores de la cookie observados en la prueba de penetración (`Max-Age=604800; HttpOnly; Path=/api/auth; SameSite=Strict`) coinciden con el código; el atributo `Secure` no aparece en esa prueba porque el servidor se ejecutó sin `APP_ENV=production`, y se activa automáticamente en producción."),
    ...T(["Atributo", "Valor", "Amenaza que mitiga"], [
      ["HttpOnly", "Activado", "Robo del refresh token mediante XSS: JavaScript no puede leer la cookie."],
      ["SameSite", "Strict", "CSRF: el navegador no envía la cookie en peticiones iniciadas desde otro sitio."],
      ["Path", "/api/auth", "Reduce la exposición: la cookie solo viaja a los endpoints de autenticación."],
      ["Secure", "Activado cuando APP_ENV=production", "Intercepción en redes sin cifrar: solo se envía por HTTPS."],
      ["Max-Age", "7 días (604800 s)", "Limita la ventana de uso de un token robado."],
    ], { id: "cookie", title: "Atributos de la cookie de renovación (vastago_rt)", widths: [1.4, 2.6, 5.1], size: 18,
      source: "Elaboración propia a partir de routes/auth.py (_set_cookie) y evidencias/seguridad/pentest_antes.txt." }),
    ...cod(`def _set_cookie(resp, token):
    cfg = current_app.config
    resp.set_cookie(COOKIE, token, max_age=cfg["REFRESH_TOKEN_DAYS"] * 86400,
                    httponly=True, secure=cfg["COOKIE_SECURE"],
                    samesite="Strict", path="/api/auth")      # (saltos de línea ajustados)
    return resp

def _csrf_ok():
    # Defensa adicional contra CSRF: las llamadas legítimas del frontend envían esta cabecera
    return request.headers.get("X-Requested-With") == "vastago-web"`, "Cookie del refresh token y control anti-CSRF", "cookie_fn",
      "backend/app/routes/auth.py, funciones _set_cookie y _csrf_ok."),
    P("**Defensa contra CSRF.** El token de acceso viaja en la cabecera `Authorization`, que un sitio malicioso no puede añadir a una petición ajena. El único endpoint que depende de una cookie es `/api/auth/refresh`, y está protegido dos veces: con `SameSite=Strict` y exigiendo la cabecera personalizada `X-Requested-With: vastago-web`, que un formulario cruzado no puede fijar. La prueba `test_refresh_sin_cabecera_csrf_rechazado` y la verificación A01 del script de penetración confirman el rechazo (HTTP 403)."),
    ...cod(`let accessToken = null;   // el access token vive SOLO en memoria (no localStorage)
...
headers: { "Content-Type": "application/json", "X-Requested-With": "vastago-web",
  ...(accessToken ? { Authorization: "Bearer " + accessToken } : {}), ... },
...
if (res.status === 401 && path !== "/auth/login" && path !== "/auth/refresh") {
  const ok = await refreshSession();          // POST /auth/refresh con la cookie HttpOnly
  if (ok) ({ res, body } = await raw(path, opts));    // reintenta una sola vez
  else onSessionLost();                       // sin sesión: vuelve a la pantalla de login
}`, "Cliente de la SPA: token en memoria y renovación automática", "api_js",
      "frontend/src/api.js (fragmentos)."),
    P("**Revocación y reutilización.** Una sesión deja de ser válida por cuatro vías: cierre de sesión (`/auth/logout` revoca el refresh y borra la cookie), rotación (cada renovación revoca el token usado), expiración (7 días) y desactivación del usuario (la renovación falla con «Usuario inactivo»). La prueba `test_refresh_rota_el_token_y_detecta_reutilizacion` simula a un atacante que presenta un refresh ya rotado desde otro cliente y obtiene 401. **Limitación declarada:** el rechazo no revoca la sesión sucesora ni deja un registro en la auditoría; ese endurecimiento es el control C17. Además, como el token de acceso es sin estado, un usuario desactivado conserva su token de acceso hasta 15 minutos (riesgo aceptado, observación O-06)."),

    H3("Pruebas automáticas del módulo"),
    P("Las 16 pruebas de `backend/tests/test_seguridad.py` forman parte de las 24 pruebas pytest que pasan en la integración continua (evidencia `evidencias/04_pytest.txt`). La {tab:tests} indica qué verifica cada una y con qué control del catálogo se relaciona."),
    ...T(["Prueba", "Qué verifica", "Control"], [
      ["login_correcto_devuelve_token_y_cookie_httponly", "Login 200 con rol correcto; cookie HttpOnly, SameSite=Strict y Path=/api/auth", "C11, C14"],
      ["login_incorrecto_mensaje_generico", "Misma respuesta 401 para usuario inexistente y clave errónea", "C01"],
      ["sin_token_401", "Un endpoint protegido sin token responde 401", "C06"],
      ["token_manipulado_o_alg_none_rechazado", "Token malformado y token con alg=none rechazados", "C11"],
      ["token_expirado", "Un token vencido responde 401", "C11"],
      ["escalada_de_privilegios_bloqueada_por_rol", "Peticiones de cada rol fuera de su permiso reciben 403", "C06"],
      ["bloqueo_por_intentos_fallidos", "Tras 5 fallos, la clave correcta recibe 423", "C04"],
      ["refresh_rota_el_token_y_detecta_reutilizacion", "La rotación funciona y el refresh reutilizado recibe 401", "C13"],
      ["refresh_sin_cabecera_csrf_rechazado", "El refresh sin X-Requested-With recibe 403", "C15"],
      ["logout_revoca_sesion", "Tras cerrar sesión, el refresh ya no sirve (401)", "C16"],
      ["politica_de_contrasenas_y_hash_bcrypt", "Clave débil rechazada; en la base el hash empieza por $2b$ y el teléfono no es legible", "C02, C03, C18"],
      ["cifrado_aes_gcm_ida_y_vuelta_y_manipulacion", "Descifrado correcto y error al alterar un byte del cifrado", "C18"],
      ["inyeccion_sql_no_funciona", "Cargas SQL en login y en un parámetro de ruta no producen efecto", "C24"],
      ["cabeceras_de_seguridad", "Presencia de cabeceras y Cache-Control no-store", "C28, C29"],
      ["errores_sin_traza", "Una petición inválida no devuelve trazas de pila", "C30"],
      ["auditoria_registra_y_es_inmutable", "Se registra LOGIN_FALLIDO y un DELETE sobre la bitácora falla", "C33, C34"],
    ], { id: "tests", title: "Pruebas pytest de seguridad y control que respaldan", widths: [3.5, 4.4, 1.2], size: 17,
      source: "Elaboración propia a partir de backend/tests/test_seguridad.py y evidencias/04_pytest.txt (24 pruebas aprobadas)." }),

    H3("Justificación de las decisiones de diseño"),
    P("La {tab:just} resume por qué se eligió cada mecanismo y qué alternativa se descartó. El criterio general fue elegir mecanismos estándar y mantenibles por un equipo de tres personas, en lugar de soluciones propias."),
    ...T(["Decisión", "Alternativa descartada", "Justificación"], [
      ["Token de acceso JWT corto (15 min) más refresh opaco rotatorio en cookie HttpOnly", "Sesión de servidor con identificador en cookie, o JWT de larga duración", "El JWT corto evita consultar la base en cada petición y limita el daño de un robo; el refresh opaco en la base permite revocar y rotar. Un JWT largo no se podría revocar."],
      ["bcrypt con cost 12", "Argon2id o PBKDF2", "OWASP prefiere Argon2id, pero acepta bcrypt con un factor de trabajo de al menos 10 (OWASP Foundation, 2024). bcrypt está disponible y probado en Python; su límite de 72 bytes es una limitación documentada (observación O-03). Migrar a Argon2id queda como mejora."],
      ["Permisos con formato recurso:acción en una tabla central", "Comprobar el rol directamente en cada ruta", "Un solo punto de verdad: añadir un rol o permiso no obliga a tocar cada endpoint y la SPA recibe la lista de permisos ya resuelta."],
      ["Autorización siempre en el servidor; el menú solo apoya la usabilidad", "Confiar en ocultar botones en la interfaz", "Ocultar un botón no impide llamar a la API; el servidor decide con el rol firmado en el token."],
      ["Bloqueo por cuenta más límite de tasa por IP", "Solo CAPTCHA o solo límite por IP", "Un CAPTCHA complica el uso en planta; el límite por IP no frena un ataque distribuido contra una cuenta. Combinar ambos es proporcionado al riesgo."],
      ["Auditoría en la misma base, con trigger de solo-anexar", "Servicio de registro externo (SIEM)", "Un SIEM excede el alcance y el plan gratuito; la base ofrece transacciones y consulta inmediata. La evolución prevista es el control C35."],
    ], { id: "just", title: "Decisiones de diseño de autenticación y autorización, alternativas descartadas y justificación", widths: [2.6, 2.1, 4.4], size: 17,
      source: "Elaboración propia; OWASP Foundation (2024), Password Storage Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html" }),

    // ===================================================================== 9.3
    H2("9.3 Informe Técnico de Seguridad y Cifrado de Datos"),
    P("Esta sección explica qué datos se protegen, con qué algoritmos y por qué. Se organiza según las propiedades de la seguridad de la información: confidencialidad (quién puede leer), integridad (que nadie altere sin ser detectado) y trazabilidad (poder reconstruir qué ocurrió)."),
    H3("Datos a proteger y mecanismo aplicado"),
    P("La {tab:datos} clasifica los datos que maneja el sistema según su sensibilidad y la protección que recibe cada uno. El teléfono del usuario es un dato personal (Ley N.° 29733, Ley de Protección de Datos Personales del Perú), por lo que es el único campo de negocio que se cifra en reposo; el resto se protege con control de acceso."),
    ...T(["Dato", "Dónde vive", "Sensibilidad", "Protección"], [
      ["Contraseña", "usuarios.password_hash", "Crítica", "Solo existe su hash bcrypt (cost 12); nunca en claro ni en respuestas"],
      ["Teléfono del usuario", "usuarios.telefono_cifrado", "Alta (dato personal)", "AES-256-GCM con nonce aleatorio; clave fuera de la base"],
      ["Refresh token", "Cookie HttpOnly; sesiones.token_hash", "Alta", "En la base solo el hash SHA-256; cookie HttpOnly, SameSite=Strict"],
      ["Access token", "Memoria del navegador", "Alta", "JWT firmado con HS256, vigencia de 15 minutos"],
      ["Correo del usuario", "usuarios.email", "Media", "Control de acceso; se usa como identificador, por eso no se cifra"],
      ["Inventario y producción", "insumos, ordenes_produccion y afines", "Media (negocio)", "RBAC por permiso, CHECK, transacciones y auditoría"],
      ["Bitácora", "auditoria", "Media", "Solo-anexar por trigger; sin contraseñas ni tokens en el detalle"],
      ["Secretos de configuración", "Variables de entorno", "Crítica", "Fuera del repositorio; Render genera JWT_SECRET y la clave AES"],
    ], { id: "datos", title: "Clasificación de datos y protección aplicada", widths: [1.8, 2.4, 1.5, 3.4], size: 17,
      source: "Elaboración propia a partir de db/schema.sql, security.py y render.yaml; Congreso de la República del Perú (2011), Ley N.° 29733." }),
    H3("Cifrado en reposo: AES-256-GCM"),
    P("El teléfono se cifra con **AES-256 en modo GCM** (cifrado autenticado, NIST SP 800-38D; Dworkin, 2007). La clave de 32 bytes llega por la variable `FIELD_ENCRYPTION_KEY` (codificada en base64) y nunca se guarda en la base ni en el repositorio; si no mide 32 bytes la aplicación se niega a funcionar. Para cada valor se genera un **nonce** aleatorio de 12 bytes con `os.urandom` (generador criptográfico del sistema operativo) y se guarda concatenado con el resultado. El formato almacenado en la columna `BYTEA` es: **nonce (12 bytes) ‖ texto cifrado ‖ etiqueta de autenticación (16 bytes)**. Además se usa un dato asociado fijo (`vastago-v1`) que liga el cifrado a la versión del formato."),
    ...cod(`def _aes():
    key = base64.b64decode(current_app.config["FIELD_ENCRYPTION_KEY"])
    if len(key) != 32:
        raise RuntimeError("FIELD_ENCRYPTION_KEY debe decodificar a 32 bytes (AES-256)")
    return AESGCM(key)

def cifrar(texto: str) -> bytes:
    nonce = os.urandom(12)                                    # nunca se reutiliza
    return nonce + _aes().encrypt(nonce, texto.encode(), b"vastago-v1")

def descifrar(blob) -> str:
    blob = bytes(blob)
    return _aes().decrypt(blob[:12], blob[12:], b"vastago-v1").decode()`, "Cifrado y descifrado de campos con AES-256-GCM", "aes", "backend/app/security.py, funciones _aes, cifrar y descifrar."),
    P("La {tab:aes_ev} muestra la evidencia real consultada con `psql` en el puerto 5433 de la base `vastago` (06-oct-2026): se leyeron únicamente la longitud y los primeros bytes del valor almacenado, nunca el teléfono. Los registros miden 37 bytes, que corresponden a 12 (nonce) + 9 (un teléfono de 9 dígitos) + 16 (etiqueta); los nonces son distintos en cada fila, como exige GCM. La prueba `test_cifrado_aes_gcm_ida_y_vuelta_y_manipulacion` comprueba además que alterar un solo byte hace fallar el descifrado, y `test_politica_de_contrasenas_y_hash_bcrypt` que el número no aparece dentro del valor almacenado."),
    ...T(["id", "Longitud (bytes)", "Nonce (hex, 12 bytes)", "Inicio del texto cifrado (hex)"], [
      ["1", "37", "b86cd4da1d523a190de3c4d6", "48ee3fce224e"],
      ["2", "37", "e9c9285c704801502bcdae77", "13fd65fe123b"],
      ["3", "37", "e33bfa1e445e317b2edb2ed3", "6791db22e2ff"],
    ], { id: "aes_ev", title: "Muestra real de usuarios.telefono_cifrado (sin datos en claro)", widths: [0.7, 1.6, 3.4, 2.6], size: 18,
      align: [AlignmentType.CENTER, AlignmentType.CENTER, AlignmentType.LEFT, AlignmentType.LEFT],
      source: "Consulta psql sobre la base local vastago (puerto 5433), 06-oct-2026: SELECT id, length(telefono_cifrado), encode(substring(...), 'hex')." }),
    P("**Por qué este diseño.** GCM aporta confidencialidad e integridad en una sola operación; con nonces aleatorios de 96 bits el límite práctico es del orden de 2^32 cifrados por clave (NIST SP 800-38D), un margen enorme frente a los pocos cientos de teléfonos de una empresa de 15 a 20 personas. **Limitaciones:** el valor no lleva identificador de clave, por lo que la rotación de la clave AES exigiría recifrar los registros (control C23, planificado); y perder la clave equivale a perder los teléfonos, por lo que debe respaldarse por separado del respaldo de la base."),
    H3("Cifrado en tránsito: TLS y HSTS"),
    P("En Render, el balanceador de la plataforma termina TLS con un certificado gestionado y reenvía el tráfico a gunicorn; la aplicación refuerza el canal con la cabecera `Strict-Transport-Security: max-age=31536000; includeSubDomains` (RFC 6797) y marca la cookie como `Secure`, ambas activadas por `APP_ENV=production`. El comportamiento de la plataforma se comprobará sobre la URL real tras el despliegue (capítulo 11)."),
    note("**Aclaración sobre la evidencia TLS.** El archivo `evidencias/seguridad/tls.txt` es una **prueba local**: se levantó el sistema en modo producción detrás de un terminador TLS en el puerto 8443 con un **certificado autofirmado** (por eso `openssl` informa «self-signed certificate»). Demuestra que la aplicación emite las cabeceras HTTPS correctas y qué suites negocia el terminador local; **no es una evaluación del certificado ni de la configuración de Render**, que queda como acción pendiente (sección 9.4.3).", { fill: "FDE9D7", bar: "B3261E" }),
    P("La {tab:tls} resume lo observado con Nmap (`ssl-enum-ciphers`) y `openssl s_client`. Solo se negocian TLS 1.2 y TLS 1.3, ambos con suites de intercambio de claves efímero (ECDHE) y cifrado autenticado AEAD en las preferidas; Nmap califica todas las suites con grado A. Las dos suites de TLS 1.2 con CBC (SHA-256 y SHA-384) también reciben grado A en la escala de Nmap, aunque se recomienda desactivarlas si el terminador final lo permite."),
    ...T(["Aspecto", "Resultado observado"], [
      ["Cabeceras HTTPS (modo producción)", "Strict-Transport-Security: max-age=31536000; includeSubDomains; X-Frame-Options: DENY; CSP restrictiva; Cache-Control: no-store"],
      ["TLS 1.2", "5 suites ECDHE (AES-256-GCM, AES-128-GCM, ChaCha20-Poly1305, AES-256-CBC-SHA384 y AES-128-CBC-SHA256), todas grado A; preferencia del servidor"],
      ["TLS 1.3", "3 suites (AES-256-GCM-SHA384, ChaCha20-Poly1305-SHA256 y AES-128-GCM-SHA256), todas grado A"],
      ["Protocolos antiguos", "No aparecen versiones anteriores a TLS 1.2 en la enumeración"],
      ["Negociación real (openssl)", "TLS 1.3 con TLS_AES_256_GCM_SHA384"],
      ["Certificado", "Autofirmado: la verificación falla a propósito (prueba local)"],
    ], { id: "tls", title: "Resultados de la prueba TLS local (certificado autofirmado, puerto 8443)", widths: [2.4, 6.7], size: 18,
      source: "evidencias/seguridad/tls.txt (Nmap 7.94 ssl-enum-ciphers y openssl s_client, 06-oct-2026). TLS 1.3 definido en Rescorla (2018), RFC 8446." }),
    P("El enlace entre la aplicación y PostgreSQL en el laboratorio ocurre por la interfaz local (127.0.0.1) y no se cifra; en Render la conexión usa la red interna de la plataforma. La **replicación** entre primario y réplica se configuró con `hostssl ... scram-sha-256` en `db/replication/01_primary_config.sql`, es decir, exige TLS y autenticación SCRAM entre servidores."),
    H3("Hashing y algoritmos criptográficos"),
    P("La {tab:algos} lista cada algoritmo usado, para qué sirve y por qué es adecuado. Un detalle de diseño relevante es que **no todos los hash son iguales**: las contraseñas, que tienen poca entropía, se protegen con bcrypt (lento a propósito); los refresh tokens, que son aleatorios de 384 bits, solo necesitan SHA-256, porque no hay nada que adivinar por fuerza bruta."),
    ...T(["Propósito", "Algoritmo", "Parámetros y ubicación", "Propiedad"], [
      ["Contraseñas", "bcrypt (Provos y Mazières, 1999)", "cost 12, sal por contraseña; security.py", "Confidencialidad"],
      ["Refresh tokens en la base", "SHA-256", "Sobre 48 bytes aleatorios; security.hash_token", "Confidencialidad"],
      ["Firma del token de acceso", "HMAC-SHA256 (HS256, RFC 7519)", "JWT_SECRET en variable de entorno; algoritmo fijado al verificar", "Integridad y autenticidad"],
      ["Datos sensibles en reposo", "AES-256-GCM", "Nonce de 12 bytes; etiqueta de 16 bytes", "Confidencialidad e integridad"],
      ["Autenticación en PostgreSQL", "SCRAM-SHA-256 (RFC 5802)", "password_encryption = scram-sha-256", "Confidencialidad"],
      ["Canal cliente-servidor", "TLS 1.2 y 1.3 (RFC 8446)", "Suites ECDHE con AEAD; terminado por la plataforma", "Confidencialidad e integridad"],
      ["Aleatoriedad", "secrets y os.urandom", "Tokens, jti y nonces", "Imprevisibilidad"],
    ], { id: "algos", title: "Algoritmos criptográficos empleados", widths: [2.0, 2.4, 3.1, 1.6], size: 17,
      source: "Elaboración propia a partir de backend/app/security.py y config.py; Provos & Mazières (1999); Jones et al. (2015), RFC 7519; Newman et al. (2010), RFC 5802." }),
    H3("Integridad"),
    P("La integridad se garantiza en cuatro niveles. **En tránsito y en los tokens:** el JWT se firma con HS256 y la verificación fija el algoritmo (`algorithms=[\"HS256\"]`), de modo que un token alterado o con `alg=none` se rechaza (prueba `test_token_manipulado_o_alg_none_rechazado` y verificación A07 del pentest). **En los datos cifrados:** la etiqueta GCM detecta cualquier modificación. **En el negocio:** las restricciones `CHECK`, las claves foráneas, el trigger `fn_aplicar_movimiento` y el bloqueo de filas `SELECT ... FOR UPDATE` impiden un stock negativo o inconsistente (riesgo R10). **En la bitácora:** el trigger que impide modificarla, descrito más abajo."),
    H3("SCRAM-SHA-256 en PostgreSQL"),
    P("PostgreSQL autentica a los roles con **SCRAM-SHA-256** (RFC 5802; PostgreSQL Global Development Group, 2025): el servidor guarda un verificador derivado con sal e iteraciones y la contraseña nunca viaja por la red; el cliente y el servidor se demuestran mutuamente que conocen el secreto mediante un desafío. Reemplaza al antiguo MD5, que es vulnerable a ataques de reutilización del hash. La consulta `SHOW password_encryption` devolvió `scram-sha-256` tanto en `evidencias/03_monitoreo_bd.txt` como al repetirla el 06-oct-2026 sobre la base local. En esa evidencia también consta el **mínimo privilegio**: la aplicación se conecta con el rol `vastago_app`, que no es superusuario, no puede crear bases ni replicar; el rol `replicator` solo puede replicar."),
    H3("Confidencialidad"),
    P("Además del cifrado, la confidencialidad se apoya en medidas de diseño: la autorización por roles (9.2); la minimización de datos, ya que ninguna respuesta de la API incluye hashes ni teléfonos (verificación A02 del pentest); los mensajes de error genéricos, que no revelan si un usuario existe ni exponen trazas; la cabecera `Cache-Control: no-store` en `/api/*`, que evita que respuestas con datos queden en cachés; `Referrer-Policy: no-referrer`; y la gestión de secretos fuera del repositorio (`.env` está en `.gitignore`, `.env.example` solo trae marcadores, y `render.yaml` hace que Render genere `JWT_SECRET` y la clave AES). La contraseña de las cuentas de demostración se define en el panel de Render (`sync: false`) y no se guarda en Git."),
    H3("Trazabilidad y auditoría"),
    P("Toda acción relevante deja una fila en la tabla `auditoria` con fecha, usuario, correo, acción, entidad, detalle en JSON, IP y resultado. Las acciones registradas, verificadas en el código, son las de la {tab:acciones}. La bitácora **no guarda contraseñas, tokens ni teléfonos**: el detalle solo contiene datos de negocio mínimos (identificadores, lote, cantidad, número de intento)."),
    ...T(["Acción", "Se registra cuando", "Origen en el código", "Resultado"], [
      ["LOGIN_OK", "Inicio de sesión correcto", "auth_service.login", "Éxito"],
      ["LOGIN_FALLIDO", "Usuario inexistente, usuario inactivo o clave errónea (guarda el nº de intentos)", "auth_service.login", "Fallo"],
      ["LOGIN_BLOQUEADO", "Intento de acceso a una cuenta bloqueada", "auth_service.login", "Fallo"],
      ["TOKEN_REFRESCADO", "Renovación correcta de la sesión", "auth_service.refresh", "Éxito"],
      ["LOGOUT", "Cierre de sesión", "auth_service.logout", "Éxito"],
      ["ACCESO_DENEGADO", "Un rol invoca un endpoint sin el permiso (guarda el permiso exigido)", "security.login_required", "Fallo"],
      ["USUARIO_CREADO", "El Administrador crea una cuenta (id y rol)", "routes/auth.crear_usuario", "Éxito"],
      ["USUARIO_ESTADO", "El Administrador activa o desactiva una cuenta", "routes/auth.estado_usuario", "Éxito"],
      ["MOVIMIENTO_INGRESO / MOVIMIENTO_SALIDA", "Se registra un movimiento de inventario (insumo y cantidad)", "routes/negocio.movimiento", "Éxito"],
      ["ORDEN_CREADA", "Se crea una orden de producción (lote y cantidad)", "routes/negocio.crear_orden", "Éxito"],
      ["ORDEN_ESTADO", "Cambia el estado de una orden (lote y estado)", "routes/negocio.estado_orden", "Éxito"],
    ], { id: "acciones", title: "Acciones registradas en la bitácora de auditoría", widths: [2.2, 3.4, 2.0, 1.4], size: 17,
      source: "Elaboración propia a partir de los llamados a AuditoriaRepository.registrar en backend/app/." }),
    P("La inmutabilidad se logra en la base de datos y no en la aplicación: un trigger por fila lanza una excepción ante cualquier `UPDATE` o `DELETE` sobre `auditoria`, aunque el intento provenga de un script ajeno a la API. Al intentar `DELETE FROM auditoria WHERE id=1` en el entorno local, PostgreSQL respondió `ERROR: La tabla auditoria es de solo lectura/anexado`."),
    ...cod(`CREATE FUNCTION fn_bloquear_auditoria() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'La tabla auditoria es de solo lectura/anexado';
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_auditoria_inmutable BEFORE UPDATE OR DELETE ON auditoria
    FOR EACH ROW EXECUTE FUNCTION fn_bloquear_auditoria();`, "Trigger de inmutabilidad de la bitácora", "trg_aud", "db/schema.sql, líneas 139 a 145."),
    P("**Limitación comprobada.** El trigger por fila no intercepta `TRUNCATE`, y el rol de la aplicación es propietario de la tabla. Se verificó ejecutando `BEGIN; TRUNCATE auditoria; ... ROLLBACK;` en la base local: la operación fue aceptada (y revertida, conservándose los 87 registros). La protección actual cubre, por tanto, los cambios fila a fila, pero no un borrado total por un actor con acceso directo a la base. La corrección (trigger de sentencia para `TRUNCATE` y separación de roles) figura en la sección 9.4.3."),
    P("Los bloques {cod:psql_acc} y {cod:psql_ej} muestran registros reales de la base `vastago` (puerto 5433) consultados con `psql` el 06-oct-2026. Corresponden al uso de las pruebas automáticas y manuales, por lo que predominan los accesos; se omitió la columna de correo para no mostrar datos personales."),
    ...cod(PSQL_ACCIONES, "Consulta psql: acciones registradas en la bitácora y su cantidad", "psql_acc", "Base local vastago, puerto 5433, 06-oct-2026 (salida de psql; el comentario final es explicativo).", 110, 14),
    ...cod(PSQL_EJEMPLOS, "Consulta psql: un registro de ejemplo por cada acción (sin datos personales)", "psql_ej", "Base local vastago, puerto 5433, 06-oct-2026 (columnas usuario_id, email e ip omitidas; ancho ajustado).", 115, 14),
    P("Para el usuario final, la misma información está disponible en la pantalla **Auditoría**, visible solo para el Administrador (HU11), que muestra fecha, usuario, acción, entidad, IP y resultado de los 200 eventos más recientes ({fig:audit})."),
    ...fig("../../evidencias/capturas/admin_Auditoria.png", "Pantalla de auditoría del sistema", { id: "audit", width: 440,
      desc: "Los eventos aparecen con su resultado (OK o Fallido). La nota superior recuerda que ningún usuario puede modificar ni borrar los registros.",
      source: "Captura del sistema local, evidencias/capturas/admin_Auditoria.png (06-oct-2026)." }),
    H3("Estándares y justificación"),
    P("La {tab:owasp} contrasta el sistema con las diez categorías del OWASP Top 10 de 2021 (OWASP Foundation, 2021), indicando los controles del catálogo y la evidencia que los respalda. La lectura es honesta: A01, A02, A03, A05 y A07 tienen evidencia de pruebas dinámicas; A04, A06, A08 y A09 se cubren con diseño y análisis estático, y quedan mejoras parciales."),
    ...T(["Categoría OWASP 2021", "Controles", "Evidencia", "Cobertura"], [
      ["A01 Control de acceso roto", "C06, C07, C08, C15, C31", "pytest (escalada de privilegios), pentest A01 (4/4)", "Cubierta"],
      ["A02 Fallos criptográficos", "C02, C12, C14, C18, C19, C20, C21", "pytest, pentest A02 (2/2), tls.txt (local)", "Cubierta; TLS pendiente en Render"],
      ["A03 Inyección", "C24, C25, C27", "sqlmap (3 objetivos), pytest, pentest A03 (3/3), Bandit", "Cubierta"],
      ["A04 Diseño inseguro", "C05, C25, C26, C36, C38", "Gestión de riesgos (capítulo 5), límites y validaciones", "Parcial"],
      ["A05 Configuración de seguridad incorrecta", "C26 a C32", "Nikto, Nmap, pentest A05 (5/7 → 7/7)", "Cubierta tras correcciones"],
      ["A06 Componentes vulnerables y obsoletos", "C40", "pip-audit y npm audit sin vulnerabilidades", "Cubierta; npm audit aún manual"],
      ["A07 Fallos de identificación y autenticación", "C01 a C05, C10 a C17", "pytest, pentest A07 (4/4)", "Cubierta; MFA planificado"],
      ["A08 Fallos de integridad de software y datos", "C11, C39, C40", "JWT con algoritmo fijo, dependencias fijadas, CI", "Parcial"],
      ["A09 Fallos de registro y monitoreo", "C33, C34, C35", "Bitácora y consultas psql", "Parcial; sin alertas automáticas"],
      ["A10 Falsificación de solicitudes del lado del servidor", "No aplica", "El servidor no realiza solicitudes salientes a URL aportadas por el usuario", "No aplica"],
    ], { id: "owasp", title: "Cobertura del OWASP Top 10 2021 por el sistema", widths: [2.5, 1.9, 3.2, 1.5], size: 17,
      source: "Elaboración propia; OWASP Foundation (2021), OWASP Top 10:2021, https://owasp.org/Top10/" }),
    P("**Justificación de la elección de estándares.** ISO/IEC 27001:2022 es el marco de referencia para un sistema de gestión de seguridad de la información y permite expresar los controles en un lenguaje auditable; el OWASP Top 10 y el ASVS son la referencia práctica específica de aplicaciones web y guían qué verificar; NIST SP 800-63B fundamenta las decisiones de autenticación (almacenamiento con hash lento y sal, limitación de intentos, tokens de sesión); y el Cybersecurity Framework 2.0 ordena las capacidades en proteger, detectar y recuperar. En conjunto cubren desde la política hasta la verificación técnica, sin exigir una certificación formal que no corresponde al alcance de un proyecto académico: se trata de **alineación**, no de cumplimiento certificado."),

    // ===================================================================== 9.4
    H2("9.4 Pruebas de seguridad web"),
    H3("9.4.1 Metodología empleada"),
    P("Las pruebas siguen la estructura de la **Guía de pruebas de seguridad web de OWASP (WSTG)** (OWASP Foundation, 2020), que organiza la verificación en recopilación de información, configuración, identidad y autenticación, autorización, gestión de sesiones, validación de entradas, manejo de errores y criptografía. Se aplicó un ciclo simple y repetible, mostrado en la {fig:metodo}: se define el alcance, se ejecutan las herramientas, se clasifican los hallazgos, se corrigen y se vuelve a probar con las mismas herramientas para comparar el estado antes y después."),
    ...fig("assets/cap9_metodologia.png", "Ciclo de pruebas de seguridad aplicado", { id: "metodo", width: 600,
      desc: "Ocho pasos: alcance, reconocimiento, configuración, explotación, análisis de código y dependencias, triaje, corrección y re-prueba.",
      source: "Elaboración propia a partir de OWASP WSTG v4.2." }),
    P("**Entorno y alcance.** El objetivo fue el propio sistema, levantado el 06-oct-2026 en el equipo de desarrollo (gunicorn en el puerto 8000, base PostgreSQL local en los puertos 5433 y 5434). No se atacó ningún sistema de terceros y el propietario del sistema, el equipo, autorizó las pruebas. **Sobre Kali Linux:** se emplearon **herramientas de Kali** (nmap, nikto y sqlmap) instaladas sobre Linux, no una máquina virtual Kali completa. La {tab:herr_seg} detalla las herramientas, su propósito y la evidencia que dejó cada una."),
    ...T(["Herramienta", "Tipo de prueba", "Qué se probó", "Evidencia"], [
      ["Nmap 7.94SVN", "Reconocimiento y TLS", "Puertos 8000, 5433 y 5434 con detección de versión y scripts http-headers y http-methods; en el puerto 8443, ssl-enum-ciphers", "nmap_antes.txt, tls.txt"],
      ["Nikto 2.1.5", "Configuración del servidor web", "Cabeceras, archivos por defecto, métodos HTTP y fugas de información en localhost:8000, antes y después de las correcciones", "nikto_antes.txt, nikto_despues.txt"],
      ["sqlmap 1.10", "Inyección SQL", "Nivel 3, riesgo 2, sobre tres objetivos: login (email y password), parámetro de ruta y cuerpo JSON de movimientos", "sqlmap.txt"],
      ["pentest_manual.py (propio)", "Pruebas OWASP automatizadas", "20 verificaciones sobre A01, A02, A03, A05 y A07 contra la instancia en ejecución, antes y después", "pentest_antes.txt, pentest_despues.txt"],
      ["Bandit 1.9.4", "Análisis estático (SAST)", "Código Python de backend/app (671 líneas)", "bandit.txt"],
      ["pip-audit 2.10.1 y npm audit", "Dependencias (SCA)", "Vulnerabilidades conocidas en paquetes de Python y de JavaScript", "pip_audit.txt, npm_audit.txt"],
      ["pytest 9.1.1", "Pruebas de seguridad automáticas", "16 pruebas de autenticación, autorización, cifrado y auditoría", "04_pytest.txt"],
    ], { id: "herr_seg", title: "Herramientas de seguridad utilizadas, alcance y evidencia", widths: [1.7, 1.7, 4.2, 1.9], size: 17,
      source: "Elaboración propia a partir de evidencias/seguridad/ y evidencias/04_pytest.txt; versiones según el capítulo 3." }),
    P("**Criterio de severidad.** Se usó una escala cualitativa de cinco niveles (informativa, baja, media, alta y crítica) según el impacto sobre la confidencialidad, integridad y disponibilidad y la facilidad de explotación. Es un criterio del equipo y **no un puntaje CVSS calculado**. Los reportes completos se incluyen en el Anexo D."),

    H3("9.4.2 Resultados y vulnerabilidades detectadas"),
    P("La {tab:resumen} sintetiza el resultado de cada herramienta. En resumen: el análisis estático, la auditoría de dependencias y las pruebas de inyección SQL no encontraron vulnerabilidades; los hallazgos reales provinieron de la configuración del servidor (Nmap, Nikto y el script de penetración) y fueron de severidad baja o informativa."),
    ...T(["Herramienta", "Resultado", "Detalle"], [
      ["Bandit", "0 hallazgos", "671 líneas analizadas; 2 posibles avisos B608 justificados con # nosec (nombre de tabla constante y order_by validado contra lista blanca)"],
      ["pip-audit", "Sin vulnerabilidades", "«No known vulnerabilities found»"],
      ["npm audit", "0 vulnerabilidades", "«found 0 vulnerabilities»"],
      ["sqlmap", "Ningún parámetro inyectable", "Login: 593 respuestas 401 a las cargas; el único indicio (campo motivo) fue descartado por sqlmap como falso positivo"],
      ["Nikto", "12 → 8 observaciones", "Antes: fuga de inodo por ETag, robots.txt, crossdomain.xml, clientaccesspolicy.xml y Content-Disposition con nombre de archivo. Después: solo cabeceras de seguridad (deseables) y métodos permitidos"],
      ["Nmap", "3 puertos, 1 hallazgo", "Servicio HTTP con Server: gunicorn y PostgreSQL en 5433 y 5434 (host local); escaneo de 117,6 s"],
      ["Script OWASP", "18/20 → 20/20", "Fallaron la cabecera Server y la respuesta a robots.txt/crossdomain.xml; ambas se corrigieron"],
      ["TLS (local)", "TLS 1.2 y 1.3, grado A", "Certificado autofirmado de prueba; ver la tabla de TLS"],
    ], { id: "resumen", title: "Resumen de resultados por herramienta", widths: [1.5, 2.0, 5.6], size: 17,
      source: "Elaboración propia a partir de evidencias/seguridad/*.txt (06-oct-2026)." }),
    P("La {tab:hallazgos} lista los hallazgos detectados por las herramientas, con su severidad y estado antes y después de la corrección. El estado «después» proviene de volver a ejecutar el script de penetración y Nikto; **no se repitió Nmap** tras las correcciones, por lo que la desaparición de `Server: gunicorn` se confirma con el script (`Server: webserver`, prueba PASA) y no con un segundo escaneo."),
    ...T(["ID", "Herramienta", "Hallazgo", "Severidad", "Estado antes → después"], [
      ["V-01", "Nmap; script A05", "La cabecera Server: gunicorn revela el servidor de aplicaciones", "Baja", "Abierto → Corregido (Server: webserver; prueba PASA)"],
      ["V-02", "Nikto; script A05", "/robots.txt, /crossdomain.xml y /clientaccesspolicy.xml, inexistentes, devolvían la SPA con HTTP 200", "Baja", "Abierto → Corregido (HTTP 404; Nikto ya no los lista)"],
      ["V-03", "Nikto", "El ETag expone el inodo, el tamaño y la fecha del archivo servido", "Baja", "Abierto → Corregido (etag desactivado; no aparece en Nikto)"],
      ["V-04", "Nikto", "Content-Disposition: inline; filename=index.html revela el nombre del archivo", "Informativa", "Abierto → Corregido (solo inline)"],
      ["V-05", "Nmap", "PostgreSQL accesible en los puertos 5433 y 5434 del host de laboratorio (necesarios para la replicación)", "Informativa", "Aceptado en laboratorio → por verificar en Render"],
      ["V-06", "sqlmap", "Indicio boolean-based blind en el campo motivo, descartado por la herramienta como falso positivo", "Informativa", "Falso positivo; sin cambio de código"],
    ], { id: "hallazgos", title: "Hallazgos detectados por las herramientas, severidad y estado antes y después", widths: [0.6, 1.3, 3.5, 1.3, 2.6], size: 17,
      source: "Elaboración propia a partir de nmap_antes.txt, nikto_antes.txt, nikto_despues.txt, sqlmap.txt, pentest_antes.txt y pentest_despues.txt." }),
    P("El script de penetración organiza sus 20 verificaciones por categoría OWASP. La {tab:pentest} muestra cuántas se superaron en cada ejecución: las únicas dos que fallaron en la primera pertenecían a la configuración (A05)."),
    ...T(["Categoría OWASP", "Verificaciones", "Antes", "Después"], [
      ["A01 Control de acceso roto", "4", "4/4", "4/4"],
      ["A02 Fallos criptográficos", "2", "2/2", "2/2"],
      ["A03 Inyección", "3", "3/3", "3/3"],
      ["A05 Configuración incorrecta", "7", "5/7", "7/7"],
      ["A07 Fallos de autenticación", "4", "4/4", "4/4"],
      ["Total", "20", "18/20", "20/20"],
    ], { id: "pentest", title: "Verificaciones del script OWASP superadas antes y después de las correcciones", widths: [3.4, 1.8, 1.6, 1.6], size: 19,
      align: [AlignmentType.LEFT, AlignmentType.CENTER, AlignmentType.CENTER, AlignmentType.CENTER], boldFirst: false,
      source: "evidencias/seguridad/pentest_antes.txt y pentest_despues.txt (06-oct-2026)." }),
    P("Además de los hallazgos de las herramientas, durante la redacción del informe el equipo revisó el código y probó manualmente comportamientos que las herramientas no cubren. La {tab:obs_rev} los presenta por separado, porque **no fueron detectados por el escaneo automático** sino por revisión. Todos están abiertos o aceptados y se tratan en la sección 9.4.3."),
    ...T(["ID", "Origen", "Observación", "Severidad", "Estado"], [
      ["O-01", "Prueba manual en psql", "TRUNCATE auditoria es aceptado (se probó dentro de una transacción revertida); el trigger solo cubre UPDATE y DELETE", "Media", "Pendiente"],
      ["O-02", "Revisión de código y pytest", "Un refresh reutilizado se rechaza con 401, pero no revoca la sesión sucesora ni se audita", "Media", "Pendiente"],
      ["O-03", "Prueba manual", "Una contraseña de más de 72 bytes hace fallar bcrypt 5 al crear un usuario: la API responde 500 genérico; la política no fija máximo", "Baja", "Pendiente"],
      ["O-04", "Revisión de código", "La CSP permite 'unsafe-inline' en style-src, por los estilos en línea de React", "Baja", "Pendiente"],
      ["O-05", "Revisión de código", "El límite de tasa usa memoria por proceso (2 workers); tras el balanceador de Render la IP del cliente puede ser la del proxy", "Baja", "Por verificar tras desplegar"],
      ["O-06", "Revisión de código", "Un usuario desactivado conserva su token de acceso hasta 15 minutos (JWT sin estado)", "Baja", "Riesgo aceptado"],
      ["O-07", "Consulta a la base", "El rol de la aplicación es propietario de las tablas, incluida auditoria", "Baja", "Pendiente (con O-01)"],
      ["O-08", "Revisión de configuración", "La contraseña de demostración tiene un valor por defecto público en seed.py y .env.example", "Media si se usara en producción", "Mitigado en render.yaml (sync: false); pendiente rotarla"],
    ], { id: "obs_rev", title: "Observaciones de revisión de código y pruebas manuales (no detectadas por las herramientas)", widths: [0.6, 1.5, 3.7, 1.4, 1.7], size: 17,
      source: "Elaboración propia a partir de la revisión de backend/app/, db/schema.sql, render.yaml y de consultas a la base local (06-oct-2026)." }),

    H3("9.4.3 Acciones correctivas y recomendaciones"),
    P("**Correcciones ya aplicadas y verificadas.** Los hallazgos V-01 a V-04 se corrigieron con cambios pequeños en la configuración de gunicorn y en la ruta que sirve la SPA, y se verificaron repitiendo las pruebas. La {tab:correcciones} relaciona cada hallazgo con su corrección y la evidencia de la re-prueba."),
    ...T(["Hallazgo", "Corrección aplicada", "Archivo", "Evidencia de re-prueba"], [
      ["V-01 Server: gunicorn", "Se fijan SERVER y SERVER_SOFTWARE de gunicorn en «webserver»", "backend/gunicorn.conf.py", "pentest_despues.txt: A05 «No se filtra la tecnología» PASA (Server: webserver)"],
      ["V-02 robots.txt y crossdomain.xml", "Si la ruta parece un archivo (tiene extensión) y no existe, se responde 404 en lugar de la SPA", "backend/app/_​_init_​_.py (spa)", "pentest_despues.txt: HTTP 404; Nikto ya no lo reporta"],
      ["V-03 ETag con inodo", "send_from_directory con etag=False", "backend/app/_​_init_​_.py", "nikto_despues.txt sin el aviso de inodos"],
      ["V-04 Content-Disposition", "Se envía solo «inline», sin nombre de archivo", "backend/app/_​_init_​_.py", "nikto_despues.txt: content-disposition inline"],
    ], { id: "correcciones", title: "Correcciones aplicadas a los hallazgos de las herramientas", widths: [1.8, 3.0, 1.9, 2.4], size: 17,
      source: "Elaboración propia a partir de backend/gunicorn.conf.py, backend/app/_​_init_​_.py y evidencias/seguridad/." }),
    ...cod(`# backend/gunicorn.conf.py
gunicorn.SERVER = "webserver"          # oculta nombre y versión del servidor
gunicorn.SERVER_SOFTWARE = "webserver"

# backend/app/_​_init_​_.py, función spa()
if "." in path.rsplit("/", 1)[-1]:     # parece un archivo que no existe -> 404
    return jsonify(error="No encontrado"), 404
resp = _plano(send_from_directory(static_dir, "index.html", etag=False, max_age=0))
resp.headers["Content-Disposition"] = "inline"`, "Correcciones de configuración (V-01 a V-04)", "fix_cfg", "backend/gunicorn.conf.py y backend/app/_​_init_​_.py (fragmentos)."),
    P("**Recomendaciones y acciones pendientes.** La {tab:pendientes} prioriza el trabajo restante. Las tres primeras filas son las que el equipo se ha comprometido a completar: la prueba sobre la URL de Render apenas se despliegue, el segundo factor y la rotación de secretos; el resto son endurecimientos derivados de las observaciones de la {tab:obs_rev}."),
    ...T(["N.º", "Recomendación", "Motivo", "Control u obs.", "Sprint"], [
      ["1", "Repetir pentest (Nmap, Nikto, sqlmap, script propio) y un análisis TLS externo sobre la URL de Render tras el despliegue; adjuntar evidencias al capítulo 11", "Las pruebas actuales son locales; no se ha probado la plataforma real", "C20, C42, V-05, O-05", "S3 (cierre)"],
      ["2", "Segundo factor TOTP para el rol Administrador", "Es la cuenta con más privilegios (usuarios y auditoría)", "C10", "S6"],
      ["3", "Rotación de secretos: procedimiento para JWT_SECRET y clave AES con identificador de versión en el cifrado", "Reducir el impacto de una filtración y permitir recifrar", "C23", "S6"],
      ["4", "DAST automatizado en CI (por ejemplo, OWASP ZAP en modo baseline contra un contenedor efímero) y npm audit en el pipeline", "Detectar regresiones en cada cambio", "C43, C40", "S6"],
      ["5", "Revocar todas las sesiones del usuario y auditar cuando se detecte la reutilización de un refresh (usar revocar_todas)", "Un refresh robado y ya rotado indica un posible compromiso", "C17, O-02", "S4"],
      ["6", "Trigger de sentencia que bloquee TRUNCATE en auditoria y separar el rol propietario del rol de aplicación (solo INSERT y SELECT)", "Completar la inmutabilidad de la bitácora", "C34, C09, O-01, O-07", "S6"],
      ["7", "Política de contraseñas: mínimo 12, máximo 72 bytes con mensaje claro y rechazo de claves de listas filtradas", "Alinear con ASVS y NIST 800-63B; evitar el error 500 de bcrypt", "C03, O-03", "S4"],
      ["8", "Almacenamiento compartido para el límite de tasa y ProxyFix para obtener la IP real tras el balanceador", "Que el límite y la auditoría usen la IP del cliente", "C05, O-05", "S4"],
      ["9", "Eliminar 'unsafe-inline' de style-src moviendo los estilos en línea a hojas de estilo o usando nonces", "Endurecer la CSP contra inyección de estilos", "C28, O-04", "S6"],
      ["10", "Cambiar la contraseña de demostración tras el primer acceso y no usar cuentas demo con datos reales", "Evitar credenciales conocidas en producción", "O-08", "S3 (cierre)"],
      ["11", "Alertas automáticas ante ráfagas de LOGIN_FALLIDO o ACCESO_DENEGADO", "Pasar de registrar a detectar", "C35", "S6"],
    ], { id: "pendientes", title: "Recomendaciones y acciones pendientes de seguridad, priorizadas", widths: [0.5, 3.8, 2.5, 1.4, 0.9], size: 17,
      source: "Elaboración propia a partir de las tablas de hallazgos y observaciones y del plan de sprints del capítulo 2." }),
    P("**Conclusión.** Con las evidencias disponibles, el sistema alcanza un nivel de seguridad adecuado para una versión v1 de demostración: las pruebas automáticas, el análisis estático, la auditoría de dependencias y las pruebas de inyección no encontraron vulnerabilidades explotables en el código ni en las dependencias, los hallazgos de configuración se corrigieron y se re-probaron, y los puntos débiles restantes están identificados, clasificados y programados. Las limitaciones que el lector debe tener presentes son que las pruebas se hicieron en un entorno local, que no equivalen a una auditoría profesional independiente y que la verificación sobre la plataforma real de Render sigue pendiente. Con ello, el riesgo R3 pasa de una probabilidad inicial moderada a un estado mitigado y bajo seguimiento en cada Sprint Review."),
  ];
};
