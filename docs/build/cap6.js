// Capítulo 6 — Definición de Métricas y Niveles de Servicio
module.exports = (g) => {
  const { H1, H2, H3, P, bullets, fig, note, AlignmentType } = g;
  // En celdas se evita el formato de código en línea (el helper lo dibuja a 11 pt y rompe la legibilidad)
  const table = (h, rows, o) => g.table(h, rows.map((r) => r.map((c) => String(c).replace(/`/g, ""))), o);
  const L = AlignmentType.LEFT, C = AlignmentType.CENTER;
  const SRC_IMPL = "Elaboración propia a partir de db/schema.sql, backend/app/repositories (inventario.py, produccion.py, analitica.py) y backend/app/routes/negocio.py.";

  return [
    H1("6. Definición de Métricas y Niveles de Servicio"),
    P("Este capítulo define qué se va a medir para saber si el sistema cumple su propósito (indicadores de negocio, de inventario y técnicos), qué nivel de servicio se compromete (objetivos SLO y acuerdos SLA propuestos) y cómo se mide en la práctica (herramientas, frecuencia y valores obtenidos a la fecha, 06-oct-2026). Se incorpora aquí la corrección de la observación del APF1 sobre la tabla de indicadores del dashboard gerencial, que resultaba ilegible: ahora los indicadores se presentan en tres tablas de cinco columnas como máximo, con fuente de 9 puntos o más y una fila por indicador."),
    P("Se aplica un criterio de honestidad que se mantiene en todo el capítulo. Un indicador está **implementado** cuando el sistema lo calcula a partir de los datos de la base; está **definido** (†) cuando su fórmula y su fuente de datos existen en el modelo pero el dashboard aún no lo muestra; y los **valores de demostración** se declaran como tales. Las metas y los niveles de servicio son **objetivos propuestos** por el equipo, no valores contractuales."),

    // ------------------------------------------------------------------ 6.1
    H2("6.1 Identificación de KPIs y métricas del sistema"),
    P("Los indicadores se derivan de los objetivos del proyecto (reducir quiebres de stock, ordenar la producción y anticipar la demanda) y de los requisitos RF03, RF04, RF09 y RF10 y RNF02, RNF03 y RNF05. Se agrupan en tres familias: **negocio y producción**, **inventario** y **técnicos del sistema**. Cada indicador tiene una fórmula, una fuente de datos real del modelo físico (tablas y vistas de `db/schema.sql`), una meta propuesta y una frecuencia de revisión."),
    P("{fig:dash_kpis} muestra el dashboard que ve el Gerente en la versión 1. Las cuatro tarjetas superiores son los indicadores que el sistema entrega hoy a través del endpoint `GET /api/kpis`; el panel inferior lista las alertas registradas en la tabla `alertas`. La captura sirve de referencia para las tablas siguientes, que indican qué tarjeta corresponde a qué fórmula y si su valor es calculado o de demostración."),
    ...fig("../../evidencias/capturas/gerente_Dashboard.png", "Dashboard gerencial de la versión 1 con las cuatro tarjetas de KPI y el panel de alertas", { id: "dash_kpis", width: 470,
      desc: "Quiebres de stock (3), merma de producción del mes (2.3 %), órdenes activas (3: 1 en proceso y 2 planificadas) y precisión del modelo de IA (95.5 %, MAPE promedio 4.5 %).",
      source: "evidencias/capturas/gerente_Dashboard.png (captura propia, 06-oct-2026; usuario Gerente)." }),
    P("{tab:dash_impl} vincula cada tarjeta de la captura con su implementación. Tres de las cuatro tarjetas se calculan con consultas SQL sobre los datos reales de la base; la tarjeta de merma devuelve un valor fijo en la versión 1 porque el modelo de datos todavía no registra el consumo real de insumos frente al teórico de la receta (el sistema descuenta exactamente lo que indica el BOM). Se declara de forma explícita para no presentar como medición lo que es un valor de demostración. Además, en la versión 1 las cuatro tarjetas se muestran por igual a los cuatro roles que tienen el permiso `dashboard:ver`; la personalización de tarjetas por rol (HU16) se planifica para el Sprint 4."),
    ...table(["Tarjeta del dashboard", "Cálculo en el sistema", "Valor en la captura", "Naturaleza"], [
      ["Quiebres de stock", "`InsumoRepository.contar_quiebres()`: cuenta insumos con `stock_actual < stock_minimo`.", "3", "Calculado desde la base"],
      ["Merma de producción (mes)", "Texto fijo en `routes/negocio.py` (2.3 % y «−1.1 pp vs. mes anterior»).", "2.3 %", "**Valor de demostración**"],
      ["Órdenes activas", "`OrdenRepository.contar_activas()`: órdenes en estado «En proceso» más «Planificada».", "3 (1 y 2)", "Calculado desde la base"],
      ["Precisión del modelo IA", "100 − MAPE promedio; `PronosticoRepository.mape_promedio()` sobre la tabla `pronosticos`.", "95.5 %", "Calculado (histórico sintético)"],
      ["Panel de alertas", "`AlertaRepository.listar()`: lectura de la tabla `alertas` (4 filas visibles).", "4 alertas", "Filas cargadas; generación automática en Sprint 4"],
    ], { id: "dash_impl", title: "Correspondencia entre las tarjetas del dashboard y su implementación en la versión 1", widths: [22, 41, 14, 23], size: 18, align: [L, L, C, L], source: SRC_IMPL }),
    P("{tab:kpi_neg} reúne los indicadores de negocio y de producción. La precisión del pronóstico se expresa como el complemento del error porcentual absoluto medio (MAPE), que `ml-service/forecast.py` calcula con los últimos cuatro meses de cada producto. La meta de MAPE de 10 % es más exigente que el umbral de 15 % que el plan de riesgos ({tab:plan}) usa como disparador de R2. El MAPE actual (4.5 %) se obtuvo sobre un histórico sintético, por lo que valida el método y no el desempeño sobre la demanda real de Vástago & Co."),
    ...table(["KPI", "Fórmula o definición", "Fuente de datos", "Meta propuesta", "Frecuencia"], [
      ["**Órdenes activas**", "Órdenes en estado «En proceso» + «Planificada».", "`ordenes_produccion`", "Informativo (carga de planta)", "Tiempo real"],
      ["**Cumplimiento de órdenes** †", "Órdenes «Completada» ÷ órdenes con fecha de inicio en el mes × 100.", "`ordenes_produccion`", "≥ 90 %", "Mensual"],
      ["**Merma de producción**", "(Kg consumidos reales − kg teóricos según BOM) ÷ kg teóricos × 100.", "`movimientos_inventario` (SALIDA con `orden_id`) y `bom`", "≤ 3 %", "Mensual"],
      ["**Precisión del pronóstico**", "100 − MAPE promedio de los productos; MAPE = media de |real − pronóstico| ÷ real × 100.", "`pronosticos` (campo `mape`) y `demanda_historica`", "MAPE ≤ 10 %", "Tras reentrenar"],
    ], { id: "kpi_neg", title: "KPIs de negocio y producción", widths: [18, 30, 24, 15, 13], size: 18, align: [L, L, L, L, L], source: SRC_IMPL + " † Definido, aún no visible en el dashboard." }),
    P("{tab:kpi_inv} presenta los indicadores de inventario. El primero es el que muestra la tarjeta de quiebres del dashboard; los demás se derivan de la vista `v_inventario`, que clasifica cada insumo con el semáforo del sistema (crítico si el stock es menor que el mínimo, advertencia si es menor que 1.2 veces el mínimo y óptimo en caso contrario). La exactitud del inventario retoma el indicador de seguimiento del riesgo R10 ({tab:plan}): la diferencia entre el conteo físico y el stock del sistema no debe superar el 2 %."),
    ...table(["KPI", "Fórmula o definición", "Fuente de datos", "Meta propuesta", "Frecuencia"], [
      ["**Quiebres de stock**", "Insumos con `stock_actual < stock_minimo` (estado «crit»).", "`insumos` y vista `v_inventario`", "0 insumos", "Tiempo real"],
      ["**Insumos en estado óptimo** †", "Insumos en estado «ok» ÷ total de insumos × 100.", "Vista `v_inventario`", "≥ 80 %", "Diaria"],
      ["**Valor del inventario** †", "Suma de `stock_actual` × `costo_unitario` de todos los insumos (S/).", "`insumos`", "Informativo", "Mensual"],
      ["**Rotación de inventario** †", "Consumo del periodo (SALIDAS) ÷ stock promedio del periodo.", "`movimientos_inventario` e `insumos`", "A calibrar con 3 meses de datos", "Mensual"],
      ["**Exactitud del inventario**", "|Conteo físico − `stock_actual`| ÷ conteo físico × 100.", "Conteo físico e `insumos`", "≤ 2 %", "Mensual (conteo cíclico)"],
    ], { id: "kpi_inv", title: "KPIs de inventario", widths: [18, 30, 24, 15, 13], size: 18, align: [L, L, L, L, L], source: SRC_IMPL + " † Definido, aún no visible en el dashboard." }),
    P("Los indicadores técnicos ({tab:kpi_tec}) controlan la calidad del servicio que reciben los usuarios y respaldan los requisitos no funcionales. Sus valores medidos hasta hoy se reportan en la sección 6.3.2; los objetivos de servicio asociados se formalizan en la sección 6.2."),
    ...table(["Métrica técnica", "Definición", "Fuente de datos", "Meta propuesta", "Frecuencia"], [
      ["**Disponibilidad**", "Minutos con `/api/health` respondiendo «ok» ÷ minutos del mes × 100.", "Sondeo de `/api/health` y panel de Render", "≥ 99.0 % mensual", "Mensual"],
      ["**Latencia p95 de la API**", "Percentil 95 del tiempo de respuesta de los endpoints autenticados.", "`evidencias/medir_latencia.py`", "< 500 ms", "Cada sprint"],
      ["**Primer contenido visible (FCP)**", "Instante del primer contenido pintado, con red de 4 Mbps y 100 ms.", "Playwright y CDP (`medir_wpo.py`)", "< 1 s", "Cada sprint"],
      ["**Peso de la carga inicial**", "Bytes transferidos al abrir la aplicación sin caché.", "Playwright y CDP (`medir_wpo.py`)", "< 150 KB", "Cada sprint"],
      ["**Pruebas automáticas aprobadas**", "Pruebas pytest aprobadas ÷ pruebas ejecutadas.", "pytest y CI de GitHub Actions", "100 %", "En cada commit"],
      ["**Cobertura de pruebas**", "Líneas ejecutadas por las pruebas ÷ líneas del backend.", "pytest-cov", "≥ 80 %", "Cada sprint"],
      ["**Aciertos de caché de la BD**", "Bloques leídos desde memoria ÷ bloques solicitados × 100.", "`pg_stat_database` (`monitoreo.sql`)", "> 99 %", "Semanal"],
      ["**Retraso de replicación**", "Bytes de WAL pendientes entre primario y réplica.", "`pg_stat_replication`", "0 bytes sostenido", "Semanal"],
    ], { id: "kpi_tec", title: "Métricas técnicas del sistema", widths: [21, 30, 24, 12, 13], size: 18, align: [L, L, L, L, L], source: "Elaboración propia a partir de los requisitos RNF02, RNF03 y RNF05 y de las herramientas del repositorio (evidencias/ y db/admin/monitoreo.sql)." }),

    // ------------------------------------------------------------------ 6.2
    H2("6.2 Definición de SLA y SLO"),
    P("Se distinguen tres conceptos. Un **indicador de nivel de servicio (SLI)** es la medida concreta (por ejemplo, el percentil 95 de la latencia). Un **objetivo de nivel de servicio (SLO)** es la meta interna que el equipo fija para ese indicador. Un **acuerdo de nivel de servicio (SLA)** es el compromiso formal con el cliente, con consecuencias si no se cumple. Como el sistema es una versión 1 académica y se alojará en el plan gratuito de Render, los SLO de {tab:slo} son **objetivos propuestos** para la demostración y para orientar el piloto; no constituyen un compromiso contractual."),
    P("{tab:slo} enlaza cada objetivo con lo que se midió realmente. La columna de resultado indica el valor obtenido y su alcance: las mediciones de latencia y de carga se hicieron contra el mismo servidor de producción (gunicorn) ejecutado de forma local, por lo que **no incluyen la latencia de la red hacia Render**; esas mediciones se repetirán cuando se complete el despliegue en la nube (pendiente descrito en el capítulo 11)."),
    ...table(["Indicador (SLI)", "Objetivo (SLO)", "Cómo se mide", "Resultado medido", "Estado"], [
      ["Disponibilidad mensual", "≥ 99.0 %", "Sondeo de `/api/health` y panel de Render", "No medido en la nube (sin despliegue aún)", "Pendiente"],
      ["Latencia p95 de la API", "< 500 ms", "`medir_latencia.py`, 300 solicitudes por endpoint", "p95 entre 1.8 y 3.2 ms (local)", "Cumple en local"],
      ["Errores de servidor", "< 1 % de solicitudes con 5xx", "Mismo script (aserta HTTP 200)", "0 errores en 1 500 solicitudes", "Cumple en local"],
      ["Carga inicial en red limitada", "FCP < 1 s y carga completa < 1 s", "Playwright con CDP: 4 Mbps y 100 ms", "FCP 480 ms; carga 449 ms", "Cumple"],
      ["Punto de recuperación (RPO)", "≤ 24 h con respaldo diario", "Respaldo `pg_dump` y replicación streaming", "Retraso de réplica de 0 bytes; respaldo en 0.12 s", "Cumple en prueba; falta programar el respaldo diario"],
      ["Tiempo de recuperación (RTO)", "≤ 2 h", "Prueba de promoción de réplica y de restauración", "Promoción en 0.11 s; restauración en 0.13 s (BD de demostración)", "Cumple en prueba"],
      ["Calidad del código", "Pruebas al 100 % y cobertura ≥ 80 %", "pytest y pytest-cov", "24 de 24 aprobadas; cobertura 90 %", "Cumple"],
      ["Seguridad", "0 vulnerabilidades altas o críticas abiertas", "bandit, pip-audit, npm audit y pruebas OWASP", "0 hallazgos; pruebas OWASP 20 de 20", "Cumple"],
    ], { id: "slo", title: "Objetivos de nivel de servicio (SLO) propuestos y valor medido a la fecha", widths: [20, 19, 23, 24, 14], size: 17, align: [L, L, L, L, L], source: "Elaboración propia; resultados de evidencias/05_latencia_api.txt, evidencias/wpo/wpo_metricas.json, evidencias/01 a 07, evidencias/04_pytest.txt, evidencias/05_cobertura.txt y evidencias/seguridad/." }),
    P("Un SLO de disponibilidad de 99.0 % mensual equivale a un presupuesto de error de unas 7.2 horas de indisponibilidad en un mes de 30 días; el SLA contractual futuro, de 99.5 %, lo reduciría a 3.6 horas. Para un negocio que opera en horario de planta y que no depende del sistema las 24 horas, el equipo considera adecuado el objetivo de 99.0 % durante el piloto, con la reserva de que el plan gratuito de Render suspende el servicio tras 15 minutos sin tráfico y el primer acceso posterior sufre un arranque lento. Esa demora se documenta (riesgo R8) y se excluye del cómputo de disponibilidad mientras se use el plan gratuito, pero deja de excluirse en un plan de pago."),
    P("{tab:sla} resume los compromisos de servicio propuestos para una eventual operación con el cliente y {tab:sev} define el tiempo de atención según la severidad de un incidente. Ambos son una propuesta del equipo para discusión con Vástago & Co y quedan sujetos a la validación del piloto."),
    ...table(["Aspecto", "Compromiso propuesto", "Observación"], [
      ["Disponibilidad", "99.0 % mensual en el piloto; 99.5 % en un servicio contractual futuro.", "El plan gratuito no ofrece garantía de disponibilidad."],
      ["Horario de soporte", "Lunes a viernes, de 8:00 a 18:00 (horario de planta).", "Sin soporte fuera de horario durante el curso."],
      ["Ventana de mantenimiento", "Domingos de 22:00 a 24:00, con aviso previo de 48 horas.", "Despliegues con la integración continua del repositorio."],
      ["Respaldo y recuperación", "Respaldo diario; RPO ≤ 24 h y RTO ≤ 2 h.", "El respaldo diario aún debe programarse (capítulo 8)."],
      ["Seguridad y datos", "Revisión de bitácora de auditoría y de dependencias en cada sprint.", "Cumplimiento de la Ley N.º 29733 para datos personales."],
      ["Compensación por incumplimiento", "Informe de causa raíz y plan correctivo en el siguiente sprint.", "No se prevén penalidades económicas en el proyecto académico."],
    ], { id: "sla", title: "Compromisos de servicio (SLA) propuestos", widths: [22, 45, 33], size: 18, align: [L, L, L], source: "Elaboración propia; límites del plan gratuito según la documentación oficial de Render (render.com/docs/free)." }),
    ...table(["Severidad", "Descripción", "Respuesta", "Resolución objetivo"], [
      ["**1 - Crítica**", "Sistema caído, pérdida o corrupción de datos, brecha de seguridad.", "1 hora", "2 horas (RTO)"],
      ["**2 - Alta**", "Función principal inutilizable (movimientos, órdenes) sin caída total.", "4 horas", "1 día hábil"],
      ["**3 - Media**", "Falla parcial con alternativa disponible o error de datos aislado.", "1 día hábil", "3 días hábiles"],
      ["**4 - Baja**", "Mejora, error visual o consulta de uso.", "2 días hábiles", "Siguiente sprint"],
    ], { id: "sev", title: "Severidad de incidentes y tiempos de atención propuestos", widths: [16, 46, 17, 21], size: 18, align: [L, L, C, C], source: "Elaboración propia." }),

    // ------------------------------------------------------------------ 6.3
    H2("6.3 Plan de Medición y Monitoreo"),
    P("El plan de medición define con qué herramientas se obtiene cada métrica, con qué frecuencia, quién la revisa y qué umbral activa una acción. Se apoya en herramientas que ya existen en el repositorio o en la plataforma, de modo que medir no requiere software adicional de pago, y se integra a las ceremonias de Scrum descritas en la sección 5.3.2."),

    H3("6.3.1 Herramientas de monitoreo utilizadas"),
    P("{tab:herr} lista las herramientas, la métrica que cada una entrega y el archivo de evidencia que el equipo conserva en el repositorio. Las herramientas del ámbito de Render (panel de métricas, registros y chequeo de salud) quedan configuradas en `render.yaml`, pero su evidencia se obtendrá cuando el equipo complete el despliegue en su cuenta."),
    ...table(["Herramienta", "Qué mide", "Cómo se usa", "Evidencia"], [
      ["**`db/admin/monitoreo.sql`**", "Siete consultas de administración: conexiones, tamaño de tablas, caché, índices, dead tuples, roles y cifrado de contraseñas.", "`psql -f` con el rol de la aplicación", "evidencias/03_monitoreo_bd.txt"],
      ["**Vistas `pg_stat_*`**", "`pg_stat_activity`, `pg_stat_database`, `pg_stat_user_tables`, `pg_stat_user_indexes` y `pg_stat_replication` (retraso de réplica).", "Consultas SQL del script y de la prueba de réplica", "evidencias/01_replicacion.txt y 03"],
      ["**`EXPLAIN ANALYZE`**", "Plan y tiempo de ejecución de las consultas reales del sistema.", "Sobre el primario, en transacciones de solo lectura", "evidencias/05_explain_analyze.txt"],
      ["**Playwright con CDP**", "FCP, carga, bytes y solicitudes de la SPA sin caché, con red limitada a 4 Mbps y 100 ms (mediana de 12 corridas).", "`evidencias/wpo/medir_wpo.py`", "evidencias/wpo/wpo_metricas.json"],
      ["**`medir_latencia.py`**", "Latencia p50, p95 y p99 de cinco endpoints (300 solicitudes cada uno).", "Contra gunicorn con 2 workers", "evidencias/05_latencia_api.txt"],
      ["**pytest y pytest-cov**", "Pruebas funcionales y de seguridad (24) y cobertura de líneas.", "Localmente y en CI (GitHub Actions)", "evidencias/04_pytest.txt y 05_cobertura.txt"],
      ["**Auditoría (`auditoria`)**", "Eventos como `ACCESO_DENEGADO` y `LOGIN_BLOQUEADO`, con usuario, IP y resultado.", "Vista de bitácora del Administrador (HU11)", "Tabla `auditoria` (solo anexado)"],
      ["**`/api/health`**", "Estado del servicio web (respuesta «ok»).", "Chequeo de salud de Render (`healthCheckPath`)", "render.yaml; sondeo en el despliegue"],
      ["**Métricas de Render**", "CPU, memoria, registros, eventos de despliegue y horas de uso del plan.", "Panel del servicio en Render", "Pendiente: despliegue del equipo"],
      ["**bandit, pip-audit, npm audit**", "Vulnerabilidades en el código y en las dependencias.", "En CI y manualmente cada sprint", "evidencias/seguridad/"],
    ], { id: "herr", title: "Herramientas de medición y monitoreo", widths: [20, 36, 22, 22], size: 17, align: [L, L, L, L], source: "Elaboración propia a partir del contenido de evidencias/, db/admin/monitoreo.sql, .github/workflows/ci.yml y render.yaml." }),
    P("{tab:plan_med} organiza esas herramientas en un calendario de revisión con responsable y umbral de acción. Los responsables siguen la asignación del plan de riesgos (sección 5.3): J. Caso (Product Owner), A. Lujan (Scrum Master) y L. Matamoros (Desarrollador)."),
    ...table(["Actividad de medición", "Frecuencia", "Responsable", "Umbral que activa una acción"], [
      ["Pruebas pytest y cobertura", "En cada commit (CI) y cada sprint", "A. Lujan", "Alguna prueba en rojo o cobertura < 80 %"],
      ["Monitoreo de BD (`monitoreo.sql`)", "Semanal", "L. Matamoros", "Caché < 99 %, deadlocks > 0 o dead tuples crecientes"],
      ["Retraso de replicación", "Semanal", "L. Matamoros", "Retraso mayor que 0 de forma sostenida (riesgo R5)"],
      ["Latencia de API y WPO", "Cada sprint, antes de la Sprint Review", "L. Matamoros", "p95 ≥ 500 ms o FCP ≥ 1 s"],
      ["Revisión de la bitácora de auditoría", "Semanal", "A. Lujan", "Picos de `ACCESO_DENEGADO` o `LOGIN_BLOQUEADO` (riesgo R3)"],
      ["Escaneos de seguridad", "Cada sprint", "A. Lujan", "Hallazgo alto o crítico"],
      ["Revisión de KPIs de negocio con el cliente", "Cada sprint (Sprint Review)", "J. Caso", "Meta de la {tab:kpi_neg} o {tab:kpi_inv} incumplida"],
      ["Disponibilidad y consumo de horas en Render", "Semanal, tras el despliegue", "A. Lujan", "Caída de más de 1 hora o más de 600 de 750 horas (riesgo R8)"],
    ], { id: "plan_med", title: "Plan de medición: frecuencia, responsable y umbral de acción", widths: [28, 21, 16, 35], size: 18, align: [L, L, L, L], source: "Elaboración propia; umbrales coherentes con los indicadores de seguimiento de la " + g.R("tab:plan") + " (capítulo 5)." }),

    H3("6.3.2 Métricas recolectadas"),
    P("Las tablas siguientes reportan los valores medidos el 06-oct-2026, tomados sin modificación de los archivos de evidencia del repositorio. {tab:m_bd} resume el estado de la base de datos de demostración. El ratio de caché de 99.92 % supera la meta de 99 %, no hay deadlocks y solo 11 de 483 transacciones se revirtieron (2.3 %). La base ocupa 9 071 kB con 8 tablas, y el rol de la aplicación `vastago_app` no tiene privilegios de superusuario ni de replicación."),
    ...table(["Métrica", "Valor medido", "Meta", "Resultado"], [
      ["Conexiones activas", "1 (estado `active`)", "Sin saturación", "Normal"],
      ["Tamaño de la base de datos", "9 071 kB (8 tablas)", "Informativo", "Informativo"],
      ["Aciertos de caché", "99.92 %", "> 99 %", "Cumple"],
      ["Transacciones confirmadas / revertidas", "472 / 11", "Informativo", "Informativo (2.3 % revertidas)"],
      ["Deadlocks", "0", "0", "Cumple"],
      ["Filas de auditoría / sesiones / usuarios", "85 / 66 / 5", "Informativo", "Informativo"],
      ["Cifrado de contraseñas del servidor", "`scram-sha-256`", "SCRAM-SHA-256", "Cumple"],
      ["Roles con privilegios elevados", "Solo `postgres` (superusuario) y `replicator` (replicación)", "La aplicación sin privilegios", "Cumple"],
    ], { id: "m_bd", title: "Métricas de la base de datos recolectadas con monitoreo.sql", widths: [30, 30, 22, 18], size: 18, align: [L, L, L, L], source: "evidencias/03_monitoreo_bd.txt (db/admin/monitoreo.sql sobre PostgreSQL 16, 06-oct-2026)." }),
    P("{tab:m_wpo} presenta las mediciones de carga de la aplicación. Cada valor es la mediana de 12 corridas en frío, sin caché y con una red emulada de 4 Mbps y 100 ms de latencia mediante el protocolo de depuración de Chrome (CDP). La versión «antes» es el empaquetado sin optimizar y la «después» incluye las optimizaciones del capítulo 7. La última columna recoge una segunda medición completa, que confirma que los resultados son reproducibles."),
    ...table(["Métrica", "Antes", "Después", "Reducción", "Repetición (antes → después)"], [
      ["Primer contenido visible (FCP)", "2 812 ms", "480 ms", "−82.9 %", "2 794 → 484 ms"],
      ["Carga completa (load)", "2 780 ms", "449 ms", "−83.8 %", "2 769 → 456 ms"],
      ["DOMContentLoaded", "2 777 ms", "449 ms", "−83.8 %", "2 768 → 456 ms"],
      ["Bytes transferidos", "1 269 679 B", "82 266 B", "−93.5 %", "1 269 679 → 82 266 B"],
      ["Solicitudes HTTP", "4", "4", "Sin cambio", "4 → 4"],
    ], { id: "m_wpo", title: "Métricas de rendimiento web (WPO) antes y después de la optimización", widths: [27, 16, 16, 15, 26], size: 18, align: [L, C, C, C, C], source: "evidencias/wpo/wpo_metricas.json y wpo_reproduccion_06oct.json (medir_wpo.py, mediana de 12 corridas, 4 Mbps y 100 ms)." }),
    P("{tab:m_api} reporta la latencia de la API medida con conexión persistente contra gunicorn con 2 workers, en el mismo equipo (loopback). Todos los endpoints cumplen con amplio margen el objetivo de 500 ms. Como el cliente y el servidor comparten máquina, estos tiempos reflejan el costo de procesamiento y de acceso a la base, no el de la red; por ello se repetirán sobre Render."),
    ...table(["Endpoint", "p50 (ms)", "p95 (ms)", "p99 (ms)", "Máximo (ms)"], [
      ["`/api/health`", "0.8", "3.2", "8.6", "28.1"],
      ["`/api/kpis`", "1.8", "2.8", "4.8", "7.8"],
      ["`/api/alertas`", "1.5", "2.9", "6.1", "7.9"],
      ["`/api/produccion`", "1.4", "1.8", "2.3", "5.6"],
      ["`/api/forecast`", "2.3", "2.9", "3.7", "5.2"],
    ], { id: "m_api", title: "Latencia de la API (300 solicitudes por endpoint)", widths: [32, 17, 17, 17, 17], size: 18, align: [L, C, C, C, C], source: "evidencias/05_latencia_api.txt (medir_latencia.py, gunicorn con 2 workers, loopback, 06-oct-2026)." }),
    P("Finalmente, {tab:m_cal} reúne las métricas de calidad, seguridad y recuperación. Los tiempos de respaldo, restauración y promoción corresponden a la base de demostración (decenas de miles de bytes), por lo que son una cota inferior: crecerán con el volumen de datos reales y deberán volver a medirse en el piloto."),
    ...table(["Métrica", "Valor medido", "Meta", "Fuente"], [
      ["Pruebas automáticas aprobadas", "24 de 24 (16 de seguridad)", "100 %", "evidencias/04_pytest.txt"],
      ["Cobertura de líneas del backend", "90 % (596 líneas, 60 sin cubrir)", "≥ 80 %", "evidencias/05_cobertura.txt"],
      ["Pruebas de seguridad web (OWASP)", "18 de 20 antes de las correcciones; 20 de 20 después", "20 de 20", "evidencias/seguridad/pentest_despues.txt"],
      ["Hallazgos de bandit, pip-audit y npm audit", "0, 0 y 0", "0", "evidencias/seguridad/"],
      ["Retraso de replicación", "0 bytes (slot `replica1_slot`)", "0 bytes", "evidencias/01_replicacion.txt"],
      ["Respaldo `pg_dump` y restauración", "0.12 s y 0.13 s; 8 tablas con conteos iguales", "RTO ≤ 2 h", "evidencias/02b_tiempos_restauracion.txt"],
      ["Promoción de la réplica (failover)", "0.11 s", "RTO ≤ 2 h", "evidencias/07_failover.txt"],
    ], { id: "m_cal", title: "Métricas de calidad, seguridad y recuperación", widths: [29, 33, 14, 24], size: 18, align: [L, L, L, L], source: "Archivos de evidencia indicados en la última columna (repositorio del proyecto, 06-oct-2026)." }),
    note("**Alcance de las mediciones.** Todos los valores de esta sección se obtuvieron en el entorno de desarrollo, con datos de demostración y sin tráfico real de usuarios. Cuando el equipo complete el despliegue en Render se repetirán las mediciones de latencia y de carga, y se iniciará el registro de disponibilidad mensual; hasta entonces, el SLO de disponibilidad figura como pendiente en la {tab:slo}."),
  ];
};
