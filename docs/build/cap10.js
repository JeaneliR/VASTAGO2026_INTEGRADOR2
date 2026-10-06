// Capítulo 10 — Validación y Verificación del Sistema (APF2)
// Todo resultado citado sale de ejecuciones reales del 06-oct-2026: evidencias/04..10, evidencias/seguridad/*, evidencias/wpo/*,
// backend/tests/*.py, evidencias/smoke_test.py y evidencias/uat_ui.py. Lo no ejecutado se declara como tal.
module.exports = (g) => {
  const { H1, H2, H3, bullets, fig, code, note, spacer, AlignmentType } = g;
  // P local: gen.js P pasa bold/italics = undefined a runs() y anula **negrita** y __cursiva__; aquí no se pasan esas claves.
  const P = (text, o = {}) => new g.D.Paragraph({ children: g.runs(text, { size: o.size || 22, color: o.color }), alignment: o.align || g.AlignmentType.JUSTIFIED,
    spacing: { after: o.after ?? 120, line: 300, before: o.before || 0 }, indent: o.indent, keepNext: o.keepNext });

  const L = AlignmentType.LEFT, C = AlignmentType.CENTER;
  // En celdas se evita el formato de código en línea: el helper lo dibuja más grande que el texto de la tabla.
  const T = (h, rows, o) => g.table(h.map((x) => String(x).replace(/`/g, "")), rows.map((r) => r.map((c) => Array.isArray(c) ? c.map((x) => String(x).replace(/`/g, "")) : String(c).replace(/`/g, ""))), o);
  const SRC_TEST = "backend/tests/test_negocio.py, backend/tests/test_seguridad.py y evidencias/04_pytest.txt";
  const PEND = "[PENDIENTE: URL Render]";

  // Fila de caso de prueba: [id, objetivo + precondición, pasos, esperado, obtenido + estado]
  const cp = (id, obj, pre, pasos, esp, obt, est = "PASA") => [`**${id}**`, [`**Objetivo:** ${obj}`, `**Pre:** ${pre}`], pasos, esp, [`**${est}.**`, obt]];
  const HDR_CP = ["ID", "Objetivo y precondición", "Pasos", "Resultado esperado", "Obtenido y estado"];
  const W_CP = [0.8, 2.1, 2.2, 1.85, 2.1];

  return [
    H1("10. Validación y Verificación del Sistema"),
    P("Este capítulo responde dos preguntas distintas. La **verificación** pregunta si el sistema se construyó correctamente: si el código cumple lo que se diseñó, lo que comprueban las pruebas automáticas, el análisis estático, las pruebas de seguridad y las mediciones de rendimiento. La **validación** pregunta si se construyó el sistema correcto: si las personas de cada rol pueden completar sus tareas, que es lo que comprueban los recorridos de aceptación por rol. La sección 10.1 define el plan de pruebas y la sección 10.2 presenta las evidencias obtenidas el 06-oct-2026."),
    note("**Alcance y honestidad de las pruebas.** Todas las pruebas se ejecutaron en el entorno local de desarrollo (Linux, Python 3.13, PostgreSQL 16 real, gunicorn en modo producción) y no sobre Render: la ejecución en la nube queda **" + PEND + "** y se completa con el procedimiento del capítulo 11. Las funcionalidades RF11 (exportar reportes) y RF12 (alertas por WhatsApp y correo) figuran como **«No ejecutado — planificado S4»**, porque aún no existen en el código. Los recorridos de aceptación los realizó el equipo (con un script de Chromium); la aceptación formal por parte del personal de Vástago & Co está prevista para el Sprint 5."),

    // ===================================================================== 10.1
    H2("10.1 Plan de pruebas del sistema"),
    P("El plan sigue la estructura de la norma **IEEE 829-2008** (IEEE, 2008), simplificada para un proyecto de tres personas. Esa norma está reemplazada hoy por ISO/IEC/IEEE 29119-3:2021 (ISO/IEC/IEEE, 2021), que mantiene la misma idea de documentar el plan, el diseño, los casos y los resultados; se conservó la estructura de IEEE 829 por ser la más conocida y la más directa para este tamaño de proyecto. La {tab:v_ieee} indica dónde se cubre cada elemento del plan."),
    ...T(["Elemento de IEEE 829", "Contenido en este informe", "Dónde"], [
      ["Identificador y referencias", "Datos del plan y documentos de los que depende.", "Identificación del plan"],
      ["Ítems a probar y características", "Requisitos RF01–RF12 y RNF01–RNF06; qué queda fuera.", "Alcance"],
      ["Enfoque", "Niveles y técnicas de prueba, herramientas y automatización.", "Enfoque y niveles"],
      ["Criterios de aprobación", "Condiciones para dar por aprobada la versión.", "Criterios de entrada, salida y suspensión"],
      ["Entorno y recursos", "Software, datos de prueba, bases de datos y personas.", "Recursos y entorno"],
      ["Cronograma y responsables", "Pruebas previstas por sprint.", "Cronograma por sprint"],
      ["Diseño y casos de prueba", "54 casos con objetivo, precondición, pasos, resultado esperado y obtenido.", "Casos de prueba"],
      ["Trazabilidad", "Relación entre requisitos y casos.", "Matriz de trazabilidad"],
      ["Informe de resultados", "Resultados, defectos y observaciones abiertas.", "Sección 10.2"],
    ], { id: "v_ieee", title: "Correspondencia entre los elementos de IEEE 829 y este capítulo", widths: [2.2, 4.4, 2.4], size: 18,
      source: "Elaboración propia a partir de IEEE (2008) e ISO/IEC/IEEE (2021)." }),

    H3("Identificación del plan"),
    P("La {tab:v_ident} identifica el plan, el sistema bajo prueba y las responsabilidades. Los roles Scrum son los del capítulo 2; en las pruebas, los tres integrantes ejecutan casos, pero cada uno responde por un frente."),
    ...T(["Campo", "Contenido"], [
      ["**Identificador y versión**", "PP-APF2-01, versión 1.0, 06-oct-2026 (Sprint 3, día 9 de 21)."],
      ["**Sistema bajo prueba**", "Sistema Web Inteligente de Producción e Inventarios de Vástago & Co, versión 1: Flask 3 y gunicorn, React 19, PostgreSQL 16 (repositorio JeaneliR/VASTAGO2026_INTEGRADOR2)."],
      ["**Documentos de referencia**", "Historias de usuario y criterios de aceptación (capítulo 2), objetivos de servicio (capítulo 6), arquitectura (capítulo 7), base de datos (capítulo 8) y seguridad (capítulo 9)."],
      ["**Responsables**", "J. Caso (Product Owner): criterios de aceptación y recorridos por rol. A. Lujan (Scrum Master): seguridad, base de datos y despliegue. L. Matamoros (Desarrollador): pruebas automáticas y rendimiento."],
      ["**Aprobación**", "Revisión del Product Owner en la Sprint Review de cierre del Sprint 3 (18-oct-2026)."],
    ], { id: "v_ident", title: "Identificación del plan de pruebas PP-APF2-01", widths: [2.2, 6.8], size: 18, source: "Elaboración propia." }),

    H3("Alcance"),
    P("El alcance se define con los requisitos funcionales (RF) y no funcionales (RNF) del capítulo 2. La {tab:v_alcance} separa lo que se prueba de lo que no se prueba y explica el motivo de cada exclusión, para que ninguna ausencia pase inadvertida."),
    ...T(["Ámbito", "Dentro del alcance", "Fuera del alcance (motivo)"], [
      ["**Funcional**", "RF01 a RF10: movimientos de inventario, semáforo e historial, alertas dentro del sistema, órdenes con receta (BOM), autenticación, roles, usuarios, bitácora, pronóstico y dashboard.", "RF11 (exportar reportes) y RF12 (alertas por WhatsApp y correo): no están implementados. Se diseñaron los casos CP52 a CP54 para ejecutarlos en el Sprint 4."],
      ["**No funcional**", "RNF01 seguridad, RNF02 rendimiento, RNF03 disponibilidad y respaldo, RNF04 usabilidad, RNF05 mantenibilidad y RNF06 portabilidad (arranque en modo producción con gunicorn).", "Imagen Docker: no se pudo construir en el entorno de desarrollo (Docker Hub bloqueado). Ejecución en Render: pendiente (CP51)."],
      ["**Datos**", "Datos de demostración del `seed.py`: 4 usuarios, 7 insumos, productos con receta, órdenes y serie sintética de demanda.", "Datos reales de la empresa: se obtendrán antes del Sprint 5."],
      ["**Entorno**", "Chromium de escritorio (1280 × 760); API probada por HTTP y con el cliente de pruebas de Flask.", "Otros navegadores, móviles y lectores de pantalla; pruebas de carga con muchos usuarios simultáneos (se midieron 300 solicitudes secuenciales por endpoint)."],
    ], { id: "v_alcance", title: "Alcance de las pruebas: elementos incluidos y excluidos", widths: [1.3, 4.2, 3.5], size: 18, source: "Elaboración propia a partir de los requisitos del capítulo 2 y del estado real del repositorio." }),

    H3("Enfoque y niveles de prueba"),
    P("Se combinan pruebas automáticas, que se repiten en cada cambio, con recorridos por rol y mediciones puntuales. La {tab:v_enfoque} resume los niveles, la herramienta de cada uno y los casos que lo componen. Las pruebas de integración usan **PostgreSQL real** y no simuladores, porque las reglas más importantes del sistema (trigger de stock, restricciones CHECK, bitácora de solo anexar) viven en la base de datos y un simulador no las ejercitaría."),
    ...T(["Nivel o tipo", "Técnica y herramienta", "Qué verifica", "Automatización", "Casos"], [
      ["**Integración de API**", "pytest 9.1.1, cliente de pruebas de Flask y PostgreSQL 16.", "Reglas de negocio: movimientos, órdenes, receta, KPIs, pronóstico.", "Automática (GitHub Actions)", "CP01–CP08"],
      ["**Seguridad automática**", "pytest sobre la misma base.", "Autenticación, sesiones, roles, cifrado, inyección, cabeceras y bitácora.", "Automática (GitHub Actions)", "CP09–CP24"],
      ["**Aceptación por rol**", "Chromium con Playwright; script `evidencias/uat_ui.py`.", "Flujos de las historias de usuario como los vería cada rol, mensajes de error y menú.", "Semiautomática, repetible", "CP25–CP35"],
      ["**Humo de despliegue**", "`evidencias/smoke_test.py` contra gunicorn en modo producción.", "Arranque, configuración de producción, cabeceras, compresión y datos.", "Automática", "CP36–CP40, CP51"],
      ["**Rendimiento (WPO)**", "Playwright con protocolo CDP (4 Mbps, 100 ms); `medir_latencia.py`.", "RNF02: carga inicial y latencia de la API.", "Automática", "CP41–CP42"],
      ["**Base de datos**", "psql, pg_dump, pg_restore, pg_basebackup.", "Integridad, respaldo, replicación y conmutación.", "Guiones SQL y bash", "CP43–CP46"],
      ["**Seguridad dinámica y estática**", "Script OWASP propio, Nmap, Nikto, sqlmap, Bandit, pip-audit, npm audit.", "RNF01 sobre OWASP Top 10.", "Herramientas", "CP47–CP50"],
      ["**Planificadas**", "Por definir en el Sprint 4.", "RF11 y RF12.", "—", "CP52–CP54"],
    ], { id: "v_enfoque", title: "Niveles y tipos de prueba, herramientas y casos asociados", widths: [1.5, 2.4, 2.5, 1.7, 1.2], size: 17, source: "Elaboración propia." }),
    P("Para diseñar los casos se aplicaron tres técnicas: **partición de equivalencia y valores límite** en las cantidades de los movimientos (−5, 0, «abc», nulo y 10⁹ en CP04); **tabla de decisión por rol**, tomada de la matriz de permisos del capítulo 7 (CP14 y CP25 a CP32); y **transición de estados** de las órdenes de producción (Planificada → En proceso → Completada en CP27)."),

    H3("Recursos y entorno de pruebas"),
    P("La {tab:v_recursos} lista el software, las bases de datos y los puertos usados. Se emplearon bases separadas porque `pytest` **recrea el esquema** (`DROP TABLE` y creación) en la base indicada por `DATABASE_URL`: ejecutarlo contra la base de desarrollo borraría sus datos."),
    ...T(["Recurso", "Detalle"], [
      ["**Sistema operativo y lenguajes**", "Linux (Ubuntu 24.04); Python 3.13.16; Node.js 22."],
      ["**Herramientas de prueba**", "pytest 9.1.1 y pytest-cov 7.1.0; Playwright con Chromium; Nmap 7.94SVN, Nikto 2.1.5, sqlmap 1.10, Bandit 1.9.4, pip-audit 2.10.1 y npm audit. Las herramientas de Kali Linux se usaron instaladas sobre Linux, no mediante una máquina virtual de Kali."],
      ["**Servidor**", "Flask 3.1.3 y gunicorn 26.2.0 con 2 workers; PostgreSQL 16.15."],
      ["**Bases de datos de prueba**", "`vastago_test` (pytest), `vastago_smoke` (modo producción local con `python -m app.seed --if-empty`) y `vastago` (desarrollo y evidencias de administración)."],
      ["**Puertos**", "5433 PostgreSQL primario; 5434 réplica; 8200 servicio de desarrollo; 8100 servicio en modo producción para las pruebas de humo y de aceptación. El puerto 8000 se usó en las mediciones previas y no estaba activo al repetirlas."],
      ["**Integración continua**", "`.github/workflows/ci.yml` (pytest, Bandit y pip-audit con PostgreSQL 16 efímero). Aún no se ha ejecutado en GitHub porque el repositorio se sube desde la cuenta del equipo; los resultados locales son los de este capítulo."],
      ["**Personas**", "J. Caso, A. Lujan y L. Matamoros, según la {tab:v_ident}."],
    ], { id: "v_recursos", title: "Recursos y entorno de pruebas", widths: [2.0, 7.0], size: 18, source: "Elaboración propia; versiones obtenidas del entorno el 06-oct-2026." }),

    H3("Criterios de entrada, salida y suspensión"),
    P("Los criterios de la {tab:v_criterios} responden a una decisión concreta: cuándo se puede empezar a probar, cuándo se considera aprobada la versión y cuándo se detienen las pruebas. La columna final compara cada criterio con el resultado real al 06-oct-2026."),
    ...T(["Tipo", "Criterio", "Estado al 06-oct-2026"], [
      ["**Entrada**", "La SPA compila (`npm run build`) y el esquema y las semillas se aplican sin error.", "Cumplido."],
      ["**Entrada**", "Las historias del sprint cumplen la Definition of Ready y sus casos están definidos.", "Cumplido (CP01–CP54)."],
      ["**Salida**", "100 % de los casos de prioridad alta ejecutados y aprobados.", "50 de 50 casos ejecutados aprobados; CP51 (Render) pendiente."],
      ["**Salida**", "Sin defectos críticos o altos abiertos.", "Cumplido: 0 críticos y 0 altos; ver la {tab:v_def} y la {tab:v_obs}."],
      ["**Salida**", "Cobertura de líneas de las pruebas automáticas ≥ 80 %.", "Cumplido: 90 % (536 de 596 líneas)."],
      ["**Salida**", "Sin vulnerabilidades en análisis estático y de dependencias; 20/20 en el script OWASP.", "Cumplido (Bandit 0, pip-audit y npm audit sin hallazgos, 20/20)."],
      ["**Salida**", "API con p95 < 500 ms y carga inicial < 1 s con red limitada (RNF02).", "Cumplido en local: p95 ≤ 3.2 ms y 449 ms."],
      ["**Salida**", "Pruebas de humo al 100 % sobre la URL de Render.", "**" + PEND + "**."],
      ["**Suspensión**", "Base de datos no disponible, compilación rota o defecto bloqueante en el inicio de sesión.", "No ocurrió."],
      ["**Reanudación**", "Servicio restablecido y repetición de las pruebas de humo.", "No aplicó."],
    ], { id: "v_criterios", title: "Criterios de entrada, salida, suspensión y reanudación", widths: [1.3, 4.6, 3.1], size: 18, source: "Elaboración propia; resultados de la sección 10.2." }),

    H3("Cronograma de pruebas por sprint"),
    P("Las pruebas se reparten en los seis sprints del cronograma (capítulo 2). La {tab:v_crono} muestra qué se prueba en cada uno; lo previsto para sprints futuros es una propuesta del equipo, sujeta al backlog."),
    ...T(["Sprint", "Fechas", "Pruebas", "Estado"], [
      ["**S1** (sem. 1–3)", "17-ago – 06-sep", "Criterios de aceptación Dado/Cuando/Entonces de las historias, que son la base de los casos.", "Completado"],
      ["**S2** (sem. 4–6)", "07-sep – 27-sep", "Evaluación heurística de prototipos (Nielsen) y contraste WCAG (capítulo 4); diseño del enfoque de seguridad.", "Completado"],
      ["**S3** (sem. 7–9)", "28-sep – 18-oct", "24 pruebas pytest y CI; pruebas de seguridad antes y después; WPO; integridad, respaldo, replicación y conmutación de la base; humo en modo producción local; recorridos por rol. **Humo en Render: " + PEND + ".**", "En curso: local hecho el 06-oct"],
      ["**S4** (sem. 10–12)", "19-oct – 08-nov", "Casos CP52–CP54 (exportación y alertas); alertas generadas desde el inventario (HAL-01); regresión de pytest.", "Por hacer"],
      ["**S5** (sem. 13–15)", "09-nov – 29-nov", "Pruebas funcionales de integración y correcciones; MAPE con datos reales; aceptación con el personal de Vástago & Co.", "Por hacer"],
      ["**S6** (sem. 16–18)", "30-nov – 20-dic", "Seguridad final sobre Render (pentest, TLS externo, DAST en CI), pruebas de carga, regresión y demostración.", "Por hacer"],
    ], { id: "v_crono", title: "Cronograma de pruebas alineado a los sprints", widths: [1.4, 1.5, 4.8, 1.5], size: 18, source: "Elaboración propia a partir del cronograma del capítulo 2." }),

    H3("Matriz de trazabilidad entre requisitos y casos de prueba"),
    P("La {tab:v_traza} relaciona cada requisito con los casos que lo verifican. Sirve para detectar requisitos sin prueba y pruebas sin requisito. Se marca como **parcial** el requisito cuya verificación deja un hallazgo abierto (sección 10.2) y como **no ejecutado** el que aún no existe en el código."),
    ...T(["Requisito", "Descripción", "Casos de prueba", "Estado"], [
      ["**RF01**", "Registrar movimientos de inventario.", "CP02, CP03, CP04, CP28, CP29", "Parcial: la API solo admite INGRESO y SALIDA, no AJUSTE (HAL-06)."],
      ["**RF02**", "Consultar stock con semáforo e historial.", "CP01, CP02, CP28", "Verificado"],
      ["**RF03**", "Alertas de stock mínimo en el sistema.", "CP01, CP07", "Parcial: las alertas del panel son filas fijas (HAL-01)."],
      ["**RF04**", "Órdenes de producción con receta y descuento.", "CP05, CP06, CP26, CP27", "Verificado"],
      ["**RF05**", "Autenticación segura.", "CP09–CP13, CP15–CP18, CP35", "Verificado"],
      ["**RF06**", "Autorización por roles.", "CP11, CP14, CP25, CP30–CP32", "Verificado"],
      ["**RF07**", "Gestión de usuarios.", "CP19, CP33", "Verificado"],
      ["**RF08**", "Bitácora de auditoría.", "CP24, CP34", "Verificado"],
      ["**RF09**", "Pronóstico de demanda con IA.", "CP08, CP31", "Verificado (datos de demostración; HAL-07)"],
      ["**RF10**", "Dashboard de KPIs por rol.", "CP07, CP25, CP31, CP32", "Parcial: contenido igual para todos los roles (HAL-05); merma fija (HAL-02)."],
      ["**RF11**", "Exportar reportes.", "CP52", "**No ejecutado — planificado S4**"],
      ["**RF12**", "Alertas por WhatsApp y correo.", "CP53, CP54", "**No ejecutado — planificado S4**"],
      ["**RNF01**", "Seguridad (OWASP, ISO 27001).", "CP10, CP12, CP17, CP19–CP23, CP47–CP50", "Verificado en local"],
      ["**RNF02**", "Rendimiento.", "CP37, CP41, CP42", "Verificado en local"],
      ["**RNF03**", "Disponibilidad y respaldo.", "CP44, CP45, CP46", "Verificado en local"],
      ["**RNF04**", "Usabilidad.", "CP25, CP28–CP31", "Verificado"],
      ["**RNF05**", "Mantenibilidad (pruebas, Repository, CI).", "CP01–CP24 y cobertura del 90 %", "Verificado; CI sin ejecutar en GitHub"],
      ["**RNF06**", "Portabilidad y despliegue.", "CP36–CP40, CP51", "Parcial: gunicorn en producción local; Docker y Render pendientes"],
    ], { id: "v_traza", title: "Matriz de trazabilidad entre requisitos y casos de prueba", widths: [1.1, 2.5, 2.5, 2.9], size: 17, source: "Elaboración propia a partir de los requisitos del capítulo 2 y de los casos de las tablas siguientes." }),

    // ---------------------------------------------------------------- casos
    H3("Casos de prueba"),
    P("Los casos se presentan en cinco tablas, una por familia. Cada caso indica el objetivo y la precondición, los pasos, el resultado esperado y el resultado **obtenido** con su estado. Los estados posibles son **PASA**, **FALLA**, **PENDIENTE** (depende de Render) y **NO EJECUTADO** (funcionalidad aún inexistente). Los casos CP01 a CP24 son las 24 pruebas de pytest, una por una, con el nombre de la función para que cualquiera pueda reproducirlas con `python -m pytest tests -v`."),
    P("La {tab:v_cp_neg} reúne los ocho casos de reglas de negocio (`test_negocio.py`). El inventario inicial de la base de demostración es de siete insumos."),
    ...T(HDR_CP, [
      cp("CP01", "El inventario se lista con su semáforo (RF02, RF03).", "Base sembrada con 7 insumos; sesión de Almacenero.", "test_inventario_lista_con_estado: GET /api/inventario.", "7 insumos; «Leche en polvo» con estado crit.", "7 insumos; Leche en polvo en estado crit."),
      cp("CP02", "Un ingreso actualiza el stock mediante el trigger (RF01, RF02).", "Stock inicial de Leche en polvo conocido.", "test_ingreso_actualiza_stock_via_trigger: POST INGRESO de 100; GET historial.", "Stock = inicial + 100 con estado ok; el último movimiento es INGRESO.", "Stock incrementado en 100, estado ok, historial coherente."),
      cp("CP03", "Una salida mayor al stock se rechaza (RF01; riesgo R10).", "Insumo 4 con stock menor a 999,999.", "test_salida_mayor_al_stock_rechazada: POST SALIDA de 999999.", "HTTP 409.", "HTTP 409 «Stock insuficiente»."),
      cp("CP04", "Las cantidades inválidas se rechazan (valores límite).", "Sesión de Almacenero.", "test_validacion_de_cantidades: POST con −5, 0, «abc», nulo y 10⁹.", "HTTP 400 en los cinco casos.", "Cinco respuestas HTTP 400."),
      cp("CP05", "Crear y completar una orden descuenta la receta (RF04).", "Sesión de Jefe de Producción; stock inicial leído.", "test_crear_orden_y_completar_descuenta_bom: crear orden de 100 Tableta 70 %; PATCH a Completada; comparar stock.", "HTTP 201 con lote L-2026-xxx; cacao −6.5 kg (0.065 × 100); empaque −100 u.", "Cacao −6.5 kg y empaque −100 u.; lote asignado."),
      cp("CP06", "Consultar la receta (BOM) de un producto (RF04).", "Sesión de Jefe de Producción.", "test_bom_de_producto: GET /api/productos/{id}/bom.", "Al menos 3 líneas con cantidadPorUnidad.", "Al menos 3 líneas con el campo esperado."),
      cp("CP07", "KPIs y alertas del dashboard (RF10, RF03).", "Sesión de Gerente.", "test_kpis_y_alertas: GET /api/kpis y /api/alertas.", "4 indicadores y 4 alertas.", "4 indicadores y 4 alertas."),
      cp("CP08", "Estructura del pronóstico (RF09).", "Sesión de Gerente.", "test_forecast_estructura: GET /api/forecast.", "24 meses históricos; 3 series; 3 meses de pronóstico; MAPE de Bombones = 4.5.", "Estructura y MAPE 4.5 coinciden."),
    ], { id: "v_cp_neg", title: "Casos de prueba CP01–CP08: reglas de negocio (pytest)", widths: W_CP, size: 16, source: SRC_TEST + "." }),

    P("La {tab:v_cp_seg} contiene los 16 casos de seguridad automáticos (`test_seguridad.py`). Todos arrancan desde la base de demostración y, cuando bloquean usuarios o modifican datos, los restablecen al terminar."),
    ...T(HDR_CP, [
      cp("CP09", "Login correcto y cookie de refresh segura (RF05).", "Usuario admin@vastagoyco.pe activo.", "test_login_correcto_devuelve_token_y_cookie_httponly: POST /api/auth/login.", "HTTP 200, rol Administrador; cookie con HttpOnly, SameSite=Strict y Path=/api/auth.", "Respuesta y atributos de cookie coinciden."),
      cp("CP10", "Credenciales inválidas sin enumeración de usuarios (RNF01).", "Un correo existente y otro inexistente.", "test_login_incorrecto_mensaje_generico: login con clave errónea.", "HTTP 401 con cuerpo idéntico en ambos casos.", "Ambos HTTP 401 con el mismo mensaje."),
      cp("CP11", "Un endpoint protegido exige token (RF05, RF06).", "Sin cabecera Authorization.", "test_sin_token_401: GET /api/inventario.", "HTTP 401.", "HTTP 401."),
      cp("CP12", "Token manipulado o con alg=none rechazado (RNF01).", "Tokens falsificados.", "test_token_manipulado_o_alg_none_rechazado.", "HTTP 401 en ambos.", "Ambos HTTP 401."),
      cp("CP13", "Token expirado rechazado (RF05).", "JWT firmado con exp en el pasado.", "test_token_expirado: GET /api/inventario.", "HTTP 401.", "HTTP 401."),
      cp("CP14", "Los roles no pueden escalar privilegios (RF06).", "Tokens de los cuatro roles.", "test_escalada_de_privilegios_bloqueada_por_rol: 5 combinaciones no permitidas y 1 permitida.", "HTTP 403 en las 5 no permitidas; 200 para el Administrador.", "Cinco 403 y un 200."),
      cp("CP15", "Bloqueo tras 5 intentos fallidos (RF05).", "Usuario almacenero activo.", "test_bloqueo_por_intentos_fallidos: 5 claves erróneas y luego la correcta.", "HTTP 423 aun con la clave correcta.", "HTTP 423; el usuario se restablece al terminar."),
      cp("CP16", "El refresh rota y detecta reutilización (RF05).", "Sesión con cookie de refresh.", "test_refresh_rota_el_token_y_detecta_reutilizacion.", "Primer refresh 200; reutilizar el token viejo, 401.", "200 y luego 401."),
      cp("CP17", "El refresh exige cabecera anti-CSRF (RNF01).", "Sesión con cookie.", "test_refresh_sin_cabecera_csrf_rechazado.", "HTTP 403.", "HTTP 403."),
      cp("CP18", "El cierre de sesión revoca el refresh (RF05).", "Sesión del Jefe de Producción.", "test_logout_revoca_sesion: logout y luego refresh.", "Logout 200; refresh posterior 401.", "200 y 401."),
      cp("CP19", "Política de contraseñas y hash bcrypt (RF07, RNF01).", "Sesión de Administrador.", "test_politica_de_contrasenas_y_hash_bcrypt: crear usuario con «corta» y con una clave válida.", "400 con clave débil; 201 con clave válida; hash que empieza con $2b$; teléfono no legible en la base.", "400, 201, hash bcrypt y teléfono cifrado."),
      cp("CP20", "Cifrado AES-256-GCM íntegro (RNF01).", "Clave de 32 bytes.", "test_cifrado_aes_gcm_ida_y_vuelta_y_manipulacion: cifrar, descifrar y alterar un bit.", "Descifrado igual al original; el dato alterado lanza excepción.", "Ida y vuelta correcta; la alteración se detecta."),
      cp("CP21", "La inyección SQL no prospera (RNF01).", "Cargas con comillas en login y en la ruta.", "test_inyeccion_sql_no_funciona.", "Login 401 y ruta con comilla 404.", "401 y 404."),
      cp("CP22", "Cabeceras de seguridad presentes (RNF01).", "Sin sesión.", "test_cabeceras_de_seguridad: GET /api/health.", "X-Content-Type-Options, X-Frame-Options, CSP, Referrer-Policy y Cache-Control no-store.", "Todas presentes."),
      cp("CP23", "Los errores no exponen trazas (RNF01).", "Cuerpo que no es JSON.", "test_errores_sin_traza: POST text/plain a /api/produccion.", "HTTP 400 o 415 sin «Traceback».", "Código esperado y sin traza."),
      cp("CP24", "La auditoría registra y es inmutable (RF08, RNF01).", "Un login fallido previo.", "test_auditoria_registra_y_es_inmutable: consultar bitácora; DELETE FROM auditoria.", "Aparece LOGIN_FALLIDO; el DELETE falla con error de la base.", "Evento visible; DELETE rechazado por el trigger."),
    ], { id: "v_cp_seg", title: "Casos de prueba CP09–CP24: seguridad (pytest)", widths: W_CP, size: 16, source: SRC_TEST + "." }),

    P("La {tab:v_cp_uat} presenta los casos de aceptación por rol (CP25 a CP35), ejecutados con `evidencias/uat_ui.py`. El script abre Chromium, inicia sesión con cada rol y recorre las pantallas; cada caso agrupa una o más de sus 21 verificaciones. Se ejecutó sobre el servicio en modo producción local (puerto 8100) con una base recién sembrada. Los lotes y cantidades citados son los de esa corrida."),
    ...T(HDR_CP, [
      cp("CP25", "El Jefe de Producción ve su menú y no puede editar inventario (HU09; RF06, RNF04).", "Sesión de jefe.produccion@vastagoyco.pe.", "Iniciar sesión; leer el menú; abrir Inventario.", "Menú: Dashboard, Inventario, Producción, Analítica IA; botón «Ver historial» y ningún «Registrar movimiento».", "Menú de 4 entradas; 7 botones «Ver historial» y 0 de registro."),
      cp("CP26", "Nueva orden con vista previa de insumos (HU05; RF04).", "Sesión del Jefe de Producción.", "Producción → «+ Nueva orden»; Tableta 70 % × 100; Crear.", "Vista previa: azúcar 3.0 kg, cacao 6.5 kg, empaque 100 u., manteca 1.8 kg; orden Planificada al inicio de la lista.", "Vista previa exacta; orden L-2026-018 en estado Planificada."),
      cp("CP27", "Ciclo de la orden y descuento de insumos (HU06; RF04).", "Orden L-2026-018 planificada; stock de cacao leído.", "Iniciar; Completar y aceptar la confirmación; abrir Inventario.", "En proceso; diálogo que advierte el descuento; Completada sin más botones; cacao −6.5 kg.", "Diálogo mostrado; Completada; cacao 1,240 → 1,233.5 kg."),
      cp("CP28", "El Almacenero registra un ingreso y el semáforo cambia (HU01, HU02; RF01, RF02).", "Sesión de almacen@vastagoyco.pe; Leche en polvo = 95 kg (Crítico).", "Inventario → Registrar movimiento → Ingreso de 100 kg con motivo.", "Stock 195 kg y estado OK; menú Dashboard, Inventario, Producción.", "95 kg (Crítico) → 195 kg (OK); menú correcto."),
      cp("CP29", "Una salida mayor al stock muestra un mensaje claro (HU01; RNF04).", "Mismo modal de movimiento.", "Salida de 999999 kg; Guardar.", "Mensaje legible y stock sin cambios.", "Mensaje «Stock insuficiente» dentro del modal."),
      cp("CP30", "El Almacenero solo consulta Producción (HU09; RF06).", "Sesión del Almacenero.", "Abrir Producción.", "Sin «+ Nueva orden» ni botones de estado.", "0 botones de escritura."),
      cp("CP31", "El Gerente ve un menú reducido y consulta el pronóstico (HU12, HU16; RF09).", "Sesión de gerente@vastagoyco.pe.", "Leer el menú; Analítica IA; cambiar de producto.", "Menú Dashboard, Producción, Analítica IA; MAPE distinto por producto; 3 meses proyectados.", "Menú de 3 entradas; MAPE 4.5 % → 2.1 %; 3 filas."),
      cp("CP32", "El Administrador accede a los seis módulos (HU09; RF06).", "Sesión de admin@vastagoyco.pe.", "Leer el menú.", "Dashboard, Inventario, Producción, Analítica IA, Usuarios y Auditoría.", "Los seis módulos."),
      cp("CP33", "Alta de usuario con política de contraseña y desactivación (HU10; RF07).", "Sesión del Administrador.", "Nuevo usuario con clave «corta»; corregir a una clave válida; Desactivar.", "Mensaje con lo que falta; usuario creado y luego Inactivo.", "«Contraseña débil: falta mínimo 10 caracteres, una mayúscula, un número, un símbolo»; 5 usuarios; Inactivo."),
      cp("CP34", "La bitácora muestra las acciones realizadas (HU11; RF08).", "Flujo de CP26 a CP33 ejecutado.", "Abrir Auditoría.", "Acciones de usuarios, órdenes y movimientos visibles.", "USUARIO_CREADO, USUARIO_ESTADO, ORDEN_ESTADO, MOVIMIENTO_INGRESO y otras."),
      cp("CP35", "Persistencia y cierre de la sesión (HU08; RF05).", "Sesión del Administrador.", "Recargar (F5); Cerrar sesión; recargar de nuevo.", "F5 conserva la sesión; tras cerrar, el login aparece y recargar no la restaura.", "Sesión restaurada con F5; login tras cerrar; no se restaura."),
    ], { id: "v_cp_uat", title: "Casos de prueba CP25–CP35: aceptación por rol (Chromium)", widths: W_CP, size: 16, source: "evidencias/uat_ui.py y evidencias/09_uat_ui.txt (21 verificaciones, 06-oct-2026)." }),

    P("La {tab:v_cp_dep} reúne los casos de despliegue en modo producción local, rendimiento, base de datos y seguridad dinámica y estática (CP36 a CP51). Muchos reutilizan las evidencias de los capítulos 7 a 9, que se vuelven a citar aquí para completar la trazabilidad."),
    ...T(HDR_CP, [
      cp("CP36", "Las pruebas de humo completas pasan en modo producción (RNF06).", "BD vacía `vastago_smoke`; APP_ENV=production; secretos aleatorios; PORT=8100.", "`python -m app.seed --if-empty`; iniciar gunicorn; `smoke_test.py --escritura`.", "28 verificaciones superadas.", "28/28 (capítulo 11, tabla de humo)."),
      cp("CP37", "La compresión reduce el bundle (RNF02).", "Servicio en producción local.", "GET /bundle.js con Accept-Encoding gzip y br.", "Content-Encoding gzip; tamaño menos de la mitad.", "243,725 B → 74,627 B con gzip (−69.4 %); 75,016 B con Brotli."),
      cp("CP38", "HSTS y cookie Secure en producción (RNF01).", "APP_ENV=production.", "GET /api/health; login y lectura de Set-Cookie.", "Strict-Transport-Security presente; cookie con Secure.", "max-age=31536000; includeSubDomains; cookie con HttpOnly, Secure y SameSite=Strict. El navegador solo honra HSTS sobre HTTPS (Render)."),
      cp("CP39", "Los secretos de desarrollo se rechazan en producción (RNF01).", "APP_ENV=production sin JWT_SECRET ni FIELD_ENCRYPTION_KEY.", "Ejecutar create_app().", "La aplicación no arranca.", "RuntimeError: «JWT_SECRET de desarrollo no permitido en producción»."),
      cp("CP40", "La carga inicial es idempotente (RNF06).", "BD ya sembrada.", "Ejecutar `python -m app.seed --if-empty` dos veces.", "La segunda no modifica datos.", "«La base de datos ya contiene datos: no se modifica.»"),
      cp("CP41", "Carga inicial en red lenta (RNF02).", "Chromium con 4 Mbps y 100 ms; 12 corridas sin caché.", "`evidencias/wpo/medir_wpo.py`.", "Carga < 1 s.", "FCP 480 ms; carga 449.4 ms; 82,266 B (antes: 2,812 ms; 2,779.6 ms; 1,269,679 B). Repetición: 484 y 456.4 ms."),
      cp("CP42", "Latencia de la API (RNF02).", "gunicorn con 2 workers, loopback.", "`medir_latencia.py` (300 solicitudes por endpoint) y SM22–SM23.", "p95 < 500 ms.", "p95 entre 1.8 y 3.2 ms en 5 endpoints; /api/health 2.3 ms y /api/kpis 6.2 ms en la prueba de humo."),
      cp("CP43", "Integridad de datos en la base (RNF03; R10).", "Rol vastago_app, sin privilegios de superusuario.", "En transacciones con ROLLBACK: stock −1, salida de 999999 y DELETE en auditoria.", "Los tres intentos son rechazados.", "Errores de CHECK, de trigger y «La tabla auditoria es de solo lectura/anexado»; stock real intacto."),
      cp("CP44", "Respaldo y restauración (RNF03).", "Base con datos de demostración.", "`db/admin/backup_restore.sh`; pg_dump y pg_restore.", "Conteos iguales por tabla.", "8 tablas con conteos iguales; respaldo 0.12 s y restauración 0.13 s."),
      cp("CP45", "Replicación streaming (RNF03).", "Primario 5433 y réplica 5434.", "Consultar pg_stat_replication; escribir en el primario; leer y escribir en la réplica.", "Estado streaming; retraso 0; la réplica es de solo lectura.", "streaming, asíncrona, lag_bytes = 0; el UPDATE en la réplica fue rechazado."),
      cp("CP46", "Conmutación por promoción de la réplica (RNF03).", "Réplica descartable en el puerto 5435.", "`pg_ctl promote`; escribir en la promovida.", "Acepta escrituras en segundos.", "Promoción en 0.11 s; la promovida aceptó escrituras y el primario no las recibió."),
      cp("CP47", "Verificaciones OWASP automatizadas (RNF01).", "Instancia en ejecución.", "`backend/tests/pentest_manual.py`, antes y después de las correcciones.", "20/20 después de corregir.", "18/20 antes y 20/20 después."),
      cp("CP48", "Exploración con Nmap, Nikto y sqlmap (RNF01).", "Servicio local.", "Nmap con scripts HTTP; Nikto antes y después; sqlmap nivel 3, riesgo 2.", "Sin parámetros inyectables; fugas de configuración corregidas.", "sqlmap: ningún parámetro inyectable; Nikto: 12 → 8 observaciones; Nmap: Server filtrado y corregido."),
      cp("CP49", "Análisis estático y de dependencias (RNF01, RNF05).", "Código y dependencias del proyecto.", "Bandit; pip-audit; npm audit.", "Sin hallazgos.", "Bandit 0 hallazgos; pip-audit y npm audit sin vulnerabilidades."),
      cp("CP50", "Cifrados TLS ofrecidos (RNF01).", "Proxy TLS de prueba con certificado autofirmado, puerto 8443.", "Nmap ssl-enum-ciphers y openssl s_client.", "TLS 1.2 y 1.3 sin cifrados débiles.", "TLS 1.2 y 1.3; «least strength: A». Es una prueba local, no la de Render."),
      cp("CP51", "Humo sobre la URL de Render (RNF06).", "Servicio desplegado desde el Blueprint; **" + PEND + "**.", "`python evidencias/smoke_test.py <URL> <clave> --escritura`.", "28 verificaciones superadas sobre HTTPS.", "No ejecutado: el entorno de desarrollo no puede desplegar en la cuenta de Render del equipo.", "PENDIENTE"),
    ], { id: "v_cp_dep", title: "Casos de prueba CP36–CP51: despliegue, rendimiento, base de datos y seguridad", widths: W_CP, size: 16, source: "evidencias/08_smoke_produccion_local.txt, evidencias/wpo/, 05_latencia_api.txt, 01 a 07, evidencias/seguridad/ y backend/tests/pentest_manual.py." }),

    P("La {tab:v_cp_plan} contiene los casos diseñados para las funcionalidades que todavía no existen. Se documentan desde ahora para que el Sprint 4 los implemente primero como criterios de aceptación; **no tienen resultado obtenido** y no cuentan como ejecutados."),
    ...T(HDR_CP, [
      cp("CP52", "Exportar el dashboard a PDF o Excel (HU17; RF11).", "Sesión de Gerente; dashboard cargado.", "Pulsar «Exportar»; abrir el archivo.", "Archivo con los KPIs y la fecha de generación; solo para roles con permiso.", "No ejecutado: la función no existe.", "NO EJECUTADO — planificado S4"),
      cp("CP53", "Alerta de quiebre por WhatsApp Business (HU14; RF12).", "Plantilla aprobada y número configurado; insumo bajo el mínimo.", "Registrar una salida que deje el insumo bajo el mínimo.", "Mensaje al responsable en menos de 1 minuto y registro de entrega en la bitácora.", "No ejecutado: la integración no existe.", "NO EJECUTADO — planificado S4"),
      cp("CP54", "Resumen por correo como respaldo (HU15; RF12).", "Proveedor de correo por API HTTPS configurado.", "Disparar el resumen diario.", "Correo recibido con insumos críticos y registro de envío.", "No ejecutado: la función no existe.", "NO EJECUTADO — planificado S4"),
    ], { id: "v_cp_plan", title: "Casos de prueba CP52–CP54: funcionalidades planificadas para el Sprint 4", widths: W_CP, size: 16, source: "Elaboración propia a partir de las historias HU14, HU15 y HU17 del capítulo 2." }),

    // ===================================================================== 10.2
    H2("10.2 Evidencias de pruebas del sistema"),
    P("Esta sección presenta los resultados reales del 06-oct-2026; cada tabla indica su archivo de salida en `evidencias/`."),

    H3("Resumen de resultados"),
    P("La {tab:v_resumen} totaliza los 54 casos: de los 50 ejecutados, los 50 aprobaron; el caso en Render está pendiente y los tres de RF11 y RF12 están planificados. Un resultado sin fallos no implica un sistema sin hallazgos: las observaciones de la {tab:v_obs} son lo más útil de esta fase para el Sprint 4."),
    ...T(["Nivel", "Casos", "Ejecutados", "Aprobados", "Fallidos", "Pend. o planificados"], [
      ["Integración y seguridad automática (pytest)", "24", "24", "24", "0", "0"],
      ["Aceptación por rol (21 verificaciones)", "11", "11", "11", "0", "0"],
      ["Despliegue local, rendimiento, base de datos y seguridad", "15", "15", "15", "0", "0"],
      ["Render (CP51) y RF11–RF12 (CP52–CP54)", "4", "0", "0", "0", "1 pendiente y 3 planificadas"],
      ["**Total**", "**54**", "**50**", "**50**", "**0**", "**4**"],
    ], { id: "v_resumen", title: "Resumen de resultados de los casos de prueba al 06-oct-2026", widths: [3.4, 0.8, 1.3, 1.3, 1.1, 1.9], size: 18,
      align: [L, C, C, C, C, C], source: "Elaboración propia a partir de las tablas de casos de la sección 10.1." }),

    H3("Pruebas automáticas con pytest"),
    P("Las 24 pruebas pasan: la salida registrada en `evidencias/04_pytest.txt` indica `24 passed in 1.32s` y la repetición del 06-oct-2026 con medición de cobertura, `24 passed in 1.55s` sobre una base nueva (`vastago_test`). Ocho pruebas son de negocio y dieciséis de seguridad. El {cod:v_pytest} muestra el comando y el resultado."),
    ...code(`$ cd backend && python -m pytest tests -q --cov=app
........................                                                 [100%]
TOTAL                              596     60    90%
24 passed in 1.55s`, { title: "Ejecución de las pruebas automáticas con medición de cobertura", id: "v_pytest", size: 16 }),
    P("Fuente: evidencias/04_pytest.txt y evidencias/05_cobertura.txt; repetición del 06-oct-2026.", { size: 18, color: "6B5B4B", align: C, after: 160 }),
    P("La {fig:v_cobertura} muestra la cobertura de líneas por módulo. El total es del 90 % (536 de 596 líneas) y todos los módulos superan el criterio de salida de 80 %, salvo el archivo `__init__.py` de la aplicación (68 %), cuya parte no cubierta corresponde a la entrega de la SPA y a los manejadores de error. Esas líneas no quedan sin probar: las ejercitan las pruebas de humo y de aceptación, como detalla la {tab:v_gaps}."),
    ...fig("assets/cap10_cobertura.png", "Cobertura de líneas de las pruebas pytest por módulo del backend", { id: "v_cobertura", width: 520,
      desc: "Cada barra es un archivo de backend/app. Verde: 90 % o más; ámbar: entre 80 % y 89 %; rojo: menos de 80 %. La línea discontinua marca el criterio de salida (80 %).",
      source: "evidencias/05_cobertura.txt (pytest-cov 7.1.0, 06-oct-2026); gráfico propio con docs/build/figs_cap10.py." }),
    P("La {tab:v_gaps} identifica las líneas que pytest no ejecuta y qué prueba posterior sí las ejecuta. Las que quedan sin prueba alguna son ramas de error poco frecuentes."),
    ...T(["Archivo y líneas", "Qué hacen", "Qué las ejercita"], [
      ["`app/_​_init_​_.py` 31, 35, 39–43", "Manejadores de error 404, 429 y 500.", "404 y 429: pruebas de humo SM20 y SM28. El 500 genérico: no se provocó."],
      ["`app/_​_init_​_.py` 48–50, 57–64", "Entrega de la SPA y de archivos estáticos (`_plano()`).", "Humo SM02 a SM05 (HTML, bundle, gzip y Brotli) y recorridos de aceptación."],
      ["`app/security.py` 124", "Cabecera HSTS (solo con APP_ENV=production).", "Humo SM08 en modo producción."],
      ["`app/config.py` 31–34", "Rechazo de secretos de desarrollo.", "Caso CP39 (arranque en producción sin secretos)."],
      ["`app/seed.py` 20–24, 59", "Opción `--if-empty`.", "Caso CP40."],
      ["`routes/auth.py` 102–110; `repositories/usuarios.py` 40", "Activar o desactivar un usuario.", "Aceptación CP33 (Desactivar)."],
      ["`routes/auth.py` 51–54, 86, 92; `routes/negocio.py` 43, 74, 90, 104, 108; otras", "Ramas de error de datos inválidos, duplicados y recursos inexistentes.", "Sin prueba: se agregarán en el Sprint 4 (regresión)."],
    ], { id: "v_gaps", title: "Líneas no cubiertas por pytest y prueba que las ejercita", widths: [3.0, 2.8, 3.2], size: 17, source: "evidencias/05_cobertura.txt (columna Missing) y evidencias/08_smoke_produccion_local.txt, 09_uat_ui.txt." }),

    H3("Pruebas de aceptación por rol"),
    P("Las capturas siguientes son reales: provienen de la aplicación ejecutándose con sesiones iniciadas con cuentas de cada rol, en Chromium a 1280 × 760 píxeles. Las figuras de este apartado muestran dos pantallas apiladas, marcadas con las letras a y b."),
    P("En la primera ejecución del script una verificación falló por un error del propio script (tomaba el nombre de la marca en lugar del valor del MAPE). Se corrigió el selector y se repitió la corrida completa sobre una base reiniciada: 21 de 21 verificaciones superadas (`evidencias/09_uat_ui.txt`)."),
    ...fig("assets/cap10_ui_login.png", "Acceso al sistema: formulario de inicio de sesión y error de credenciales", { id: "v_ui_login", width: 520,
      desc: "(a) Formulario con el aviso «Acceso restringido. Toda actividad queda registrada». (b) Tras una clave incorrecta se muestra «Credenciales inválidas», sin indicar si el correo existe (CP10, CP35).",
      source: "evidencias/capturas/01_login.png y 02_login_error.png (captura propia, 06-oct-2026)." }),
    ...fig("assets/cap10_ui_jefe.png", "Jefe de Producción: dashboard y vista previa de insumos al crear una orden", { id: "v_ui_jefe", width: 600,
      desc: "(a) El menú del Jefe de Producción incluye Inventario, Producción y Analítica IA, pero no Usuarios ni Auditoría (CP25). (b) El formulario de nueva orden calcula el consumo de insumos de la receta: 6.5 kg de cacao para 100 unidades (CP26).",
      source: "evidencias/capturas/uat_jefe_Dashboard.png y uat_jefe_Nueva_orden_BOM.png (captura propia, 06-oct-2026; usuario Jefe de Producción)." }),
    ...fig("assets/cap10_ui_almacenero.png", "Almacenero: registro de un ingreso y rechazo de una salida mayor al stock", { id: "v_ui_almacenero", width: 520,
      desc: "(a) Modal de movimiento con un ingreso de 100 kg de leche en polvo y su motivo (CP28). (b) Tras guardar, la leche en polvo pasa de Crítico a OK; al intentar una salida de 999,999 kg el modal muestra «Stock insuficiente» (CP29).",
      source: "evidencias/capturas/uat_almacenero_Movimiento.png y uat_almacenero_Error_stock.png (captura propia, 06-oct-2026; usuario Almacenero)." }),
    ...fig("../../evidencias/capturas/gerente_Analitica_IA.png", "Gerente: analítica con serie histórica, pronóstico a 3 meses y MAPE", { id: "v_ui_gerente", width: 430,
      desc: "El menú del Gerente solo muestra Dashboard, Producción y Analítica IA. La pantalla presenta la serie de Bombones Caja x6 (línea continua), el pronóstico (línea discontinua), el MAPE de 4.5 % y la tabla de tres meses con su margen de error (CP31).",
      source: "evidencias/capturas/gerente_Analitica_IA.png (captura propia, 06-oct-2026; usuario Gerente)." }),
    ...fig("assets/cap10_ui_admin.png", "Administrador: inventario completo y gestión de usuarios con un usuario desactivado", { id: "v_ui_admin", width: 470,
      desc: "(a) El Administrador puede registrar movimientos en todos los insumos. (b) La pantalla Usuarios lista los cuatro usuarios de demostración y el usuario de prueba creado en el recorrido, ya Inactivo (CP32, CP33).",
      source: "evidencias/capturas/admin_Inventario.png y uat_admin_Usuarios_inactivo.png (captura propia, 06-oct-2026; usuario Administrador)." }),
    P("La {tab:v_capturas} cataloga todas las capturas por rol. Las que ya se muestran en otros capítulos se citan por su figura para no repetirlas."),
    ...T(["Archivo en evidencias/capturas", "Rol", "Pantalla y estado mostrado", "Caso", "Figura"], [
      ["01_login, 02_login_error", "Sin sesión", "Formulario y error genérico.", "CP10, CP35", "{fig:v_ui_login}"],
      ["admin_Dashboard", "Administrador", "KPIs y 4 alertas.", "CP07, CP32", "{fig:cap_admin_dash}"],
      ["admin_Inventario", "Administrador", "7 insumos con semáforo y acción de registro.", "CP28", "{fig:v_ui_admin}"],
      ["admin_Produccion", "Administrador", "5 órdenes con estado y acciones.", "CP26, CP27", "{fig:cap_prod}"],
      ["admin_Analitica_IA", "Administrador", "Serie, pronóstico y MAPE.", "CP31", "{fig:cap_ia}"],
      ["admin_Usuarios", "Administrador", "4 usuarios activos.", "CP33", "(en el repositorio)"],
      ["admin_Auditoria", "Administrador", "Bitácora de solo anexar.", "CP34", "{fig:cap_aud}"],
      ["almacenero_Dashboard", "Almacenero", "Dashboard con menú de 3 entradas.", "CP28, CP30", "(recortada en el cap. 4)"],
      ["almacenero_Inventario", "Almacenero", "Inventario con 3 insumos Críticos.", "CP28", "{fig:cap_alm_inv}"],
      ["gerente_Dashboard", "Gerente", "Dashboard con menú de 3 entradas.", "CP31", "{fig:cap_ger_dash}"],
      ["gerente_Analitica_IA", "Gerente", "Analítica con pronóstico.", "CP31", "{fig:v_ui_gerente}"],
      ["uat_jefe_Dashboard, uat_jefe_Nueva_orden_BOM", "Jefe de Producción", "Menú de 4 entradas; vista previa de la receta.", "CP25, CP26", "{fig:v_ui_jefe}"],
      ["uat_almacenero_Movimiento, uat_almacenero_Error_stock", "Almacenero", "Ingreso de 100 kg; error de stock.", "CP28, CP29", "{fig:v_ui_almacenero}"],
      ["uat_admin_Usuarios_inactivo", "Administrador", "Usuario creado y desactivado.", "CP33", "{fig:v_ui_admin}"],
    ], { id: "v_capturas", title: "Catálogo de capturas reales por rol y casos de prueba asociados", widths: [3.0, 1.4, 2.8, 1.0, 1.6], size: 17,
      source: "Elaboración propia a partir de evidencias/capturas/ (06-oct-2026)." }),

    H3("Pruebas de seguridad antes y después"),
    P("El script `pentest_manual.py` ejecuta 20 verificaciones sobre cinco categorías del OWASP Top 10 (OWASP Foundation, 2021) contra una instancia en ejecución. Falló en 2 de 20 verificaciones antes de las correcciones y pasó 20 de 20 después; el procedimiento completo, las herramientas y los hallazgos están en la sección 9.4. La {fig:v_pentest} resume el resultado por categoría."),
    ...fig("assets/cap10_pentest.png", "Verificaciones OWASP superadas por categoría, antes y después de las correcciones", { id: "v_pentest", width: 520,
      desc: "Las dos verificaciones fallidas estaban en A05 (configuración insegura): la cabecera Server revelaba el servidor y robots.txt o crossdomain.xml devolvían la aplicación en lugar de un 404.",
      source: "evidencias/seguridad/pentest_antes.txt y pentest_despues.txt (06-oct-2026); gráfico propio con docs/build/figs_cap10.py." }),
    P("La {tab:v_seg_res} resume los resultados de las demás herramientas. Las pruebas son locales: se repetirán sobre la URL de Render tras el despliegue (recomendación 1 de la sección 9.4.3)."),
    ...T(["Herramienta", "Resultado", "Evidencia"], [
      ["Script OWASP propio", "18/20 antes; 20/20 después.", "pentest_antes.txt, pentest_despues.txt"],
      ["sqlmap (nivel 3, riesgo 2)", "Ningún parámetro inyectable; 593 respuestas 401 a las cargas sobre el login.", "sqlmap.txt"],
      ["Nikto 2.1.5", "12 observaciones antes; 8 después (solo cabeceras deseables y métodos permitidos).", "nikto_antes.txt, nikto_despues.txt"],
      ["Bandit", "0 hallazgos.", "bandit.txt"],
      ["pip-audit y npm audit", "Sin vulnerabilidades conocidas.", "pip_audit.txt, npm_audit.txt"],
      ["Nmap ssl-enum-ciphers", "TLS 1.2 y 1.3; «least strength: A» (certificado de prueba).", "tls.txt"],
    ], { id: "v_seg_res", title: "Resultados de las herramientas de seguridad", widths: [2.4, 4.6, 2.4], size: 18, source: "evidencias/seguridad/ (06-oct-2026); detalle en el capítulo 9." }),

    H3("Rendimiento: carga inicial y latencia de la API"),
    P("La carga inicial se midió con Chromium y red limitada a 4 Mbps y 100 ms de latencia, sin caché, con la mediana de 12 corridas por versión (capítulo 7, {tab:wpo}). La {tab:v_wpo} reproduce el resultado y el de la repetición independiente del 06-oct-2026, que difiere menos de 2 % en tiempo y coincide exactamente en bytes. Como referencia externa, el umbral «bueno» del indicador LCP de Core Web Vitals es 2.5 s (Google, 2024); el LCP no se midió, de modo que no se afirma cumplimiento de ese indicador."),
    ...T(["Métrica", "Antes", "Después", "Repetición (después)", "Meta RNF02"], [
      ["Primer contenido (FCP)", "2,812 ms", "480 ms", "484 ms", "< 1,000 ms"],
      ["Evento de carga", "2,779.6 ms", "449.4 ms", "456.4 ms", "< 1,000 ms"],
      ["Bytes transferidos", "1,269,679 B", "82,266 B", "82,266 B", "—"],
    ], { id: "v_wpo", title: "Carga inicial antes y después de la optimización, con su repetición", widths: [2.6, 1.6, 1.5, 1.9, 1.4], size: 18, align: [L, C, C, C, C],
      source: "evidencias/wpo/wpo_metricas.json y wpo_reproduccion_06oct.json (medir_wpo.py)." }),
    P("La latencia de la API se midió en bucle local, de modo que no incluye la red ni el arranque en frío de Render. La {tab:v_lat} muestra que todos los endpoints responden en menos de 10 ms en el percentil 95, muy por debajo de la meta de 500 ms. En Render habrá que sumar la red y, en el plan gratuito, hasta un minuto de arranque tras 15 minutos de inactividad (capítulo 11)."),
    ...T(["Endpoint", "Solicitudes", "p50", "p95", "p99", "Máximo"], [
      ["/api/health", "300", "0.8 ms", "3.2 ms", "8.6 ms", "28.1 ms"],
      ["/api/kpis", "300", "1.8 ms", "2.8 ms", "4.8 ms", "7.8 ms"],
      ["/api/alertas", "300", "1.5 ms", "2.9 ms", "6.1 ms", "7.9 ms"],
      ["/api/produccion", "300", "1.4 ms", "1.8 ms", "2.3 ms", "5.6 ms"],
      ["/api/forecast", "300", "2.3 ms", "2.9 ms", "3.7 ms", "5.2 ms"],
    ], { id: "v_lat", title: "Latencia de la API en producción local (gunicorn con 2 workers, bucle local)", widths: [2.4, 1.3, 1.3, 1.3, 1.3, 1.3], size: 18, align: [L, C, C, C, C, C],
      source: "evidencias/05_latencia_api.txt (medir_latencia.py, 06-oct-2026)." }),

    H3("Pruebas de humo en modo producción"),
    P("Las pruebas de humo (CP36 a CP40) arrancan el sistema como lo haría el contenedor —sembrado con `--if-empty` y luego gunicorn con `APP_ENV=production`— y verifican 28 puntos. El resultado fue **28 de 28**; la tabla completa de resultados está en la sección 11.2 junto con el registro previsto para Render."),

    H3("Defectos encontrados y corregidos"),
    P("La {tab:v_def} lista los defectos detectados por las pruebas que ya se corrigieron en el código y volvieron a probarse. Los cuatro primeros son los hallazgos V-01 a V-04 del capítulo 9; los dos últimos surgieron al preparar el despliegue y las mediciones de rendimiento. Todos se verificaron en el código y en una prueba posterior."),
    ...T(["ID", "Defecto", "Severidad", "Corrección", "Verificación posterior"], [
      ["**DEF-01** (V-01)", "La cabecera `Server: gunicorn` revelaba el servidor de aplicaciones.", "Baja", "`gunicorn.conf.py` fija `SERVER` en «webserver».", "pentest_despues: PASA; humo SM07 («Server: webserver»)."],
      ["**DEF-02** (V-02)", "/robots.txt y /crossdomain.xml respondían 200 con la SPA.", "Baja", "`spa()` responde 404 si la ruta parece un archivo inexistente.", "pentest_despues: HTTP 404; humo SM20."],
      ["**DEF-03** (V-03)", "El ETag exponía el inodo, tamaño y fecha del archivo.", "Baja", "`send_from_directory(..., etag=False)`.", "nikto_despues: sin el aviso de inodos."],
      ["**DEF-04** (V-04)", "`Content-Disposition` incluía `filename=index.html`.", "Informativa", "Se envía solo `inline`.", "nikto_despues: «inline»."],
      ["**DEF-05**", "Los archivos estáticos no se comprimían: eran respuestas directas que Flask-Compress omite.", "Media (rendimiento)", "`_plano()` desactiva `direct_passthrough` y materializa la respuesta.", "Experimento aislado (10_defecto_compresion.txt): sin `_plano()` no hay compresión y con `_plano()` 243,725 → 74,627 B; humo SM04."],
      ["**DEF-06**", "Reiniciar el servicio con `seed` repetía `schema.sql`, que borra las tablas.", "Alta (si ocurriera en producción)", "`seed --if-empty`: solo siembra si la base no tiene usuarios.", "CP40: la segunda ejecución no modifica datos."],
    ], { id: "v_def", title: "Defectos encontrados y corregidos", widths: [1.4, 2.6, 1.3, 2.2, 2.3], size: 16, source: "Elaboración propia; evidencias/seguridad/pentest_*.txt, nikto_*.txt, evidencias/10_defecto_compresion.txt y backend/." }),

    H3("Observaciones abiertas"),
    P("La {tab:v_obs} recoge lo que las pruebas de esta fase **no** corrigieron. Son limitaciones reales de la versión 1, se declaran aquí con su plan y no se ocultan en la presentación. HAL-04 y HAL-03 coinciden con O-08 y O-05 del capítulo 9, que las describe desde la seguridad."),
    ...T(["ID", "Hallazgo", "Severidad", "Origen", "Plan"], [
      ["**HAL-01**", "Las alertas del dashboard son filas fijas de la tabla `alertas`: al ingresar 100 kg de leche en polvo el indicador de quiebres bajó de 3 a 2, pero la alerta «Leche en polvo bajo stock mínimo» siguió visible. Además, «Manteca de cacao cerca del mínimo» se muestra en ámbar mientras el inventario la marca Crítica.", "Media", "CP28 y CP34 (RF03, HU04)", "Generarlas desde `v_inventario` en el Sprint 4, junto con las alertas externas (RF12)."],
      ["**HAL-02**", "La tarjeta «Merma de producción» devuelve un texto fijo (2.3 %), no un cálculo.", "Media", "Revisión del código (capítulo 6)", "Calcularla con consumos reales frente a la receta (Sprint 4)."],
      ["**HAL-03**", "El límite de tasa usa la IP del par TCP y memoria por proceso: detrás de Render la IP sería la del balanceador y cada worker cuenta aparte. En local, un login con `X-Forwarded-For` quedó registrado con 127.0.0.1.", "Media", "evidencias/08b_observaciones_despliegue.txt (O-05 del capítulo 9)", "`ProxyFix` y almacenamiento compartido del límite (Sprint 4); verificar en Render."],
      ["**HAL-04**", "`seed.py` usa una contraseña de demostración pública si no se define `DEMO_PASSWORD`, y no existe una función de cambio de contraseña en la v1.", "Media", "Revisión del despliegue (O-08 del capítulo 9)", "Definir `DEMO_PASSWORD` antes del primer despliegue; agregar el cambio de contraseña (Sprint 4)."],
      ["**HAL-05**", "Los cuatro roles ven el mismo dashboard; el menú cambia, pero no los indicadores.", "Baja", "CP31 y CP25 (RF10)", "Indicadores por rol en el Sprint 4."],
      ["**HAL-06**", "El esquema admite movimientos AJUSTE, pero la API solo acepta INGRESO y SALIDA.", "Baja", "Revisión de `negocio.py` (RF01)", "Exponer AJUSTE con motivo obligatorio (Sprint 4)."],
      ["**HAL-07**", "El pronóstico es de enero a marzo de 2026 con datos de demostración hasta diciembre de 2025.", "Baja", "CP08 y CP31 (RF09, R2)", "Recalibrar con datos reales de la empresa (Sprint 5)."],
      ["**HAL-08**", "Render bloquea los puertos SMTP (25, 465 y 587) en el plan gratuito, así que el correo del RF12 debe enviarse por la API HTTPS de un proveedor.", "Informativa", "Documentación de Render (Render, s. f.-a)", "Elegir proveedor de correo por API en el Sprint 4."],
    ], { id: "v_obs", title: "Observaciones abiertas de la fase de validación", widths: [0.95, 3.4, 1.25, 1.8, 2.2], size: 16, source: "Elaboración propia a partir de las pruebas de la sección 10.2 y de Render (s. f.-a)." }),

    H3("Funcionalidades no ejecutadas y pruebas pendientes"),
    note("**No ejecutado — planificado S4:** RF11 (exportar reportes; CP52) y RF12 (alertas por WhatsApp Business y correo; CP53 y CP54). No se presentan resultados porque las funciones no existen aún. **" + PEND + "** y **[PENDIENTE: captura en Render]**: el caso CP51 (pruebas de humo sobre la URL pública) y las capturas del sistema en la nube se completan en la sección 11.2 cuando el equipo despliegue en su cuenta de Render."),

    H3("Conclusión de la validación"),
    P("La versión 1 cumple los criterios de salida que pueden evaluarse en local: 24 de 24 pruebas automáticas, 90 % de cobertura, 21 de 21 verificaciones de aceptación por rol, 28 de 28 pruebas de humo en modo producción, 20 de 20 verificaciones de seguridad, sin hallazgos en análisis estático y de dependencias, y un rendimiento holgado respecto a RNF02. Quedan tres frentes abiertos que el informe no oculta: ejecutar las pruebas en Render, implementar y probar RF11 y RF12 en el Sprint 4, y resolver las observaciones HAL-01 a HAL-08, entre las cuales las alertas fijas (HAL-01) y la IP detrás del balanceador (HAL-03) son las prioritarias."),
  ];
};
