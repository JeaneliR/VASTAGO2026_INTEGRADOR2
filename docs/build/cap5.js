// Capítulo 5 — Gestión de riesgos del proyecto
module.exports = (g) => {
  const { H1, H2, H3, P, bullets, fig, table, code, note, AlignmentType } = g;
  const L = AlignmentType.LEFT, C = AlignmentType.CENTER;

  return [
    H1("5. Gestión de riesgos del proyecto"),
    P("La gestión de riesgos permite anticipar los eventos que podrían impedir que el equipo entregue el sistema de Vástago & Co con la calidad y en los plazos comprometidos (18 semanas, del 17 de agosto al 20 de diciembre de 2026, con una capacidad de 540 horas-equipo). Este capítulo identifica once riesgos (R1 a R11), los valora con una matriz de probabilidad por impacto, define la estrategia de respuesta, el responsable y el indicador de seguimiento de cada uno, y reporta su estado a la fecha de este avance (06-oct-2026, semana 8, Sprint 3 en curso), citando evidencia real del sistema cuando existe. A diferencia de un listado estático, el plan se revisa en cada Sprint Review y se actualiza con el avance del proyecto."),

    // ------------------------------------------------------------------ 5.1
    H2("5.1 Identificación de riesgos"),
    P("Los riesgos se identificaron a partir de tres fuentes: el análisis del negocio y de los requisitos (capítulos 1 y 2), la revisión de la arquitectura y las herramientas elegidas (capítulos 3 y 7) y las limitaciones del entorno (tiempo de los estudiantes, plan gratuito de la nube). Se clasificaron en seis categorías: gestión y alcance, datos, seguridad, recursos y cronograma, infraestructura y tecnología, y organizacional. La valoración usa dos escalas de 1 a 5 definidas para este proyecto ({tab:escalas}); el nivel de cada riesgo es el producto de probabilidad (P) e impacto (I), con los umbrales bajo (≤ 5), medio (6 a 12), alto (13 a 19) y crítico (≥ 20)."),
    ...table(["Valor", "Probabilidad (P)", "Impacto (I) sobre el proyecto"], [
      ["1", "Muy rara: menos del 10 %", "Muy bajo: sin efecto en el sprint"],
      ["2", "Rara: 10 % a 30 %", "Bajo: retraso de pocos días en una tarea"],
      ["3", "Posible: 30 % a 50 %", "Moderado: afecta un entregable del sprint (cerca de una semana)"],
      ["4", "Probable: 50 % a 70 %", "Alto: compromete un hito (APF) o un requisito clave"],
      ["5", "Casi segura: más del 70 %", "Crítico: pérdida de datos, brecha de seguridad o incumplimiento del proyecto"],
    ], { id: "escalas", title: "Escalas de probabilidad e impacto usadas en la matriz de riesgos", widths: [10, 36, 54], size: 18, align: [C, L, L], source: "Elaboración propia; escalas de 1 a 5 según la práctica habitual de matrices de probabilidad por impacto." }),
    P("{tab:riesgos_desc} describe cada riesgo con su causa y su consecuencia. Dos descripciones incorporan información verificada durante el desarrollo: en R2, el histórico de demanda con el que se entrenó el pronóstico de la versión 1 es sintético, y en R8, los límites del plan gratuito de Render se tomaron de su documentación oficial."),
    ...table(["ID", "Riesgo", "Causa", "Consecuencia"], [
      ["**R1**", "Cambios de requisitos y crecimiento del alcance.", "El cliente propone funciones nuevas al ver los prototipos (alertas por WhatsApp, reportes); el alcance «IA» es abierto.", "Retrasos, sobrecarga de las 90 horas por sprint y entregables incompletos."],
      ["**R2**", "Baja calidad o escasez de datos históricos para entrenar el pronóstico.", "La empresa no tiene registros digitales sistemáticos; el histórico de la v1 es sintético (generado con semilla fija en `ml-service/forecast.py`).", "Pronóstico poco fiable, MAPE alto o no representativo y decisiones de compra erradas."],
      ["**R3**", "Brecha de seguridad: acceso no autorizado a datos.", "Credenciales débiles, vulnerabilidades web (OWASP Top 10), datos personales (teléfono) y configuración insegura.", "Filtración o alteración de datos, pérdida de confianza e incumplimiento de la Ley N.º 29733 de Protección de Datos Personales."],
      ["**R4**", "Retrasos por disponibilidad de tiempo del equipo.", "Los integrantes son estudiantes con otros cursos, exámenes y trabajo; capacidad de 10 horas por integrante y semana.", "El sprint no alcanza su meta; acumulación de historias pendientes."],
      ["**R5**", "Pérdida de datos o falla de la base de datos.", "Fallo de disco o servicio, borrado accidental, expiración de la base gratuita en la nube.", "Pérdida de inventario y órdenes registrados; reinicio del sistema desde cero."],
      ["**R6**", "Resistencia al cambio del personal de planta.", "Hábitos de registro manual, desconfianza hacia un sistema nuevo y poca experiencia digital.", "Baja adopción; datos del sistema desactualizados frente a la realidad del almacén."],
      ["**R7**", "Incompatibilidad o curva de aprendizaje de tecnologías.", "Uso de herramientas nuevas para el equipo (replicación PostgreSQL, Docker, esbuild, React 19).", "Tareas que superan su estimación y bloqueos técnicos."],
      ["**R8**", "Caída o límites del servicio en la nube (plan gratuito).", "Render suspende el servicio tras 15 minutos sin tráfico, ofrece 750 horas al mes y su base gratuita expira a los 30 días y no incluye respaldos.", "Demostración con arranque lento, indisponibilidad o pérdida de la base alojada."],
      ["**R9**", "Integración fallida con WhatsApp Business API.", "Requisitos de cuenta de negocio verificada, aprobación de plantillas y costos por conversación; dependencia de un tercero.", "Alertas inmediatas (HU14) no disponibles en el Sprint 4."],
      ["**R10**", "Pérdida de integridad del inventario (stock inconsistente).", "Operaciones concurrentes, errores de digitación o fallos a mitad de una orden de producción.", "Stock negativo o distinto del real; quiebres no detectados y decisiones erradas."],
      ["**R11**", "Desviación de calidad del código y deuda técnica.", "Presión de plazos, ausencia de revisión y de pruebas automáticas.", "Defectos en producción y mayor costo de mantenimiento."],
    ], { id: "riesgos_desc", title: "Registro de riesgos: descripción, causa y consecuencia", widths: [7, 24, 36, 33], size: 17, align: [C, L, L, L], source: "Elaboración propia; límites de Render según su documentación oficial (render.com/docs/free), consultada el 06-oct-2026; naturaleza sintética del histórico según ml-service/forecast.py." }),
    P("{tab:riesgos_val} asigna a cada riesgo su categoría, probabilidad, impacto y nivel. Ningún riesgo alcanza el nivel alto: los once se ubican en el rango medio (6 a 12), con R1 y R2 en el límite superior (12). Sin embargo, el nivel por sí solo no basta: R3, R5 y R10 tienen una probabilidad baja pero un impacto crítico (I = 5), por lo que el equipo los trata como prioritarios aunque su producto sea 10."),
    ...table(["ID", "Categoría", "P", "I", "P × I", "Nivel"], [
      ["**R1**", "Gestión y alcance", "4", "3", "12", "Medio"],
      ["**R2**", "Datos", "3", "4", "12", "Medio"],
      ["**R3**", "Seguridad", "2", "5", "10", "Medio (impacto crítico)"],
      ["**R4**", "Recursos y cronograma", "3", "3", "9", "Medio"],
      ["**R5**", "Datos e infraestructura", "2", "5", "10", "Medio (impacto crítico)"],
      ["**R6**", "Organizacional", "3", "3", "9", "Medio"],
      ["**R7**", "Tecnología", "3", "2", "6", "Medio"],
      ["**R8**", "Infraestructura (nube)", "2", "4", "8", "Medio"],
      ["**R9**", "Integración con terceros", "3", "3", "9", "Medio"],
      ["**R10**", "Integridad de datos", "2", "5", "10", "Medio (impacto crítico)"],
      ["**R11**", "Calidad del software", "3", "3", "9", "Medio"],
    ], { id: "riesgos_val", title: "Valoración de los riesgos: probabilidad, impacto y nivel", widths: [9, 30, 8, 8, 12, 33], size: 18, align: [C, L, C, C, C, L], source: "Elaboración propia con las escalas de la " + g.R("tab:escalas") + " (1 a 5) y los umbrales: bajo ≤ 5, medio 6–12, alto 13–19, crítico ≥ 20." }),

    // ------------------------------------------------------------------ 5.2
    H2("5.2 Mapa de riesgos (Matriz de Probabilidad–Impacto + Heatmap)"),
    P("{fig:riesgos} ubica los once riesgos en la matriz de probabilidad por impacto. Cada celda muestra su valor P×I en la esquina inferior derecha y el color indica el nivel: verde para bajo, amarillo para medio, naranja para alto y rojo para crítico. Las celdas con más de un riesgo agrupan los de igual posición."),
    ...fig("assets/risk_matrix.png", "Matriz de probabilidad por impacto y mapa de calor de los riesgos R1 a R11", { id: "riesgos", width: 500,
      desc: "R1 (P4, I3) y R2 (P3, I4) encabezan el mapa con 12 puntos; R3, R5 y R10 comparten la celda de impacto crítico (P2, I5); R4, R6, R9 y R11 se agrupan en P3×I3.",
      source: "Elaboración propia con los valores de la " + g.R("tab:riesgos_val") + " (script de diagramas del repositorio, docs/build)." }),
    P("**Lectura del mapa.** La mayor concentración está en la franja de probabilidad 3 (posible), con seis riesgos (R2, R4, R6, R7, R9 y R11), lo que refleja que las principales amenazas del proyecto son de gestión y de contexto más que técnicas: alcance cambiante, datos escasos, tiempo del equipo, adopción por el personal y dependencia de terceros. Los riesgos técnicos de mayor impacto (R3 seguridad, R5 pérdida de datos y R10 integridad del inventario) tienen probabilidad baja precisamente porque se decidió atacarlos de forma temprana con controles de diseño en el Sprint 3: la seguridad por capas, la replicación y respaldo, y las restricciones de integridad en la base de datos. R8 (límites de la nube gratuita) combina baja probabilidad con impacto alto, y R7 (tecnologías) es el de menor nivel (6)."),
    P("Para priorizar la atención, el equipo aplica dos reglas: primero se atienden los riesgos de mayor producto (R1 y R2) y, de forma paralela, los de impacto 5 (R3, R5 y R10), cuya materialización sería irrecuperable aunque improbable. Ningún riesgo está en el rango alto o crítico, por lo que no se requiere replanificar el cronograma, pero el mapa se recalcula en cada Sprint Review porque las probabilidades cambian (por ejemplo, R9 sube de nivel si no se obtiene la cuenta de WhatsApp Business antes del Sprint 4)."),

    // ------------------------------------------------------------------ 5.3
    H2("5.3 Plan de gestión de riesgos"),
    P("El plan define para cada riesgo una estrategia de respuesta —mitigar (reducir probabilidad o impacto), evitar (eliminar la causa), transferir (pasar el efecto a un tercero) o aceptar (asumirlo conscientemente con un plan de contingencia)—, una acción concreta, un responsable entre los integrantes del equipo, un disparador o indicador que avisa que el riesgo se activa y la fecha de su próxima revisión."),

    H3("5.3.1 Estrategias de mitigación y respuesta"),
    P("{tab:plan} presenta el plan. Los responsables se indican con las abreviaturas del cronograma: J. Caso (Product Owner), A. Lujan (Scrum Master) y L. Matamoros (Desarrollador). La fecha de revisión corresponde al cierre del sprint indicado (18-oct: Sprint 3; 08-nov: Sprint 4; 29-nov: Sprint 5; 20-dic: Sprint 6), además del seguimiento semanal."),
    ...table(["ID y estrategia", "Acción concreta", "Responsable", "Disparador o indicador", "Revisión"], [
      ["**R1** Mitigar", "Alcance congelado por sprint; todo cambio entra al Product Backlog y lo prioriza la PO con MoSCoW. RF11 (exportar) y RF12 (alertas externas) quedan declarados como planificados.", "J. Caso", "Más de 2 historias nuevas en un sprint o cambio fuera del Sprint Planning.", "18-oct"],
      ["**R2** Mitigar", "Entrenar con series de 24 meses y estacionalidad, medir con MAPE y reemplazar el histórico sintético por ventas reales de 2024 y 2025 solicitadas a Vástago & Co; modelo de respaldo: promedio móvil.", "L. Matamoros y J. Caso", "MAPE superior a 15 % o menos de 12 meses de datos reales al inicio del Sprint 5.", "08-nov"],
      ["**R3** Mitigar (y transferir el TLS a la plataforma)", "Controles por capas (bcrypt, JWT corto, RBAC, AES-256-GCM, auditoría, cabeceras, rate limiting) y pruebas de seguridad en cada sprint; el cifrado en tránsito lo provee Render.", "A. Lujan", "Hallazgo alto o crítico en bandit, pip-audit o pruebas OWASP; picos de ACCESO_DENEGADO o LOGIN_BLOQUEADO en auditoría.", "Cada sprint"],
      ["**R4** Mitigar y aceptar", "Planificar con capacidad real (30 h semanales del equipo, 90 h por sprint), reservar margen y repartir tareas por especialidad; reunión semanal breve.", "A. Lujan", "Burndown con más de 20 % de atraso al cierre de la segunda semana del sprint.", "Semanal"],
      ["**R5** Mitigar y transferir", "Replicación streaming a una réplica de lectura más respaldo pg_dump con restauración verificada; en Render, programar respaldos externos porque la base gratuita no los incluye y recrearla antes de los 30 días.", "L. Matamoros", "Retraso de réplica mayor que 0 de forma sostenida, respaldo fallido o día 25 de vida de la base gratuita.", "18-oct"],
      ["**R6** Mitigar", "Involucrar al jefe de producción y al almacenero desde los prototipos; interfaz simple con menú por rol; capacitación breve y piloto con datos reales.", "J. Caso", "Menos de la mitad de los movimientos del piloto registrados en el sistema o quejas de uso.", "29-nov"],
      ["**R7** Mitigar", "Elegir herramientas de amplia documentación, documentar cada decisión técnica y trabajar en parejas las tareas nuevas.", "L. Matamoros y A. Lujan", "Tarea técnica que supera el doble de su estimación.", "Cada sprint"],
      ["**R8** Aceptar con contingencia", "Aceptar los límites para la demostración; usar el chequeo `/api/health`, calentar el servicio antes de presentar y mantener la ejecución local con el mismo contenedor como plan B; migrar a plan de pago si hay piloto real.", "A. Lujan", "Indisponibilidad mayor a 1 hora en una demostración; consumo superior a 600 de las 750 horas mensuales.", "18-oct"],
      ["**R9** Evitar la dependencia", "Diseñar las notificaciones desacopladas del canal y mantener el correo como respaldo (HU15); gestionar la cuenta de negocio de WhatsApp y probar en entorno de pruebas antes del Sprint 4.", "L. Matamoros y J. Caso", "Cuenta o plantillas no aprobadas al 19-oct (inicio del Sprint 4).", "18-oct"],
      ["**R10** Mitigar", "Integridad en la base de datos: restricción de stock no negativo, trigger de movimientos, bloqueo de fila en operaciones y transacción única al completar órdenes; pruebas automáticas.", "L. Matamoros", "Diferencia mayor a 2 % entre inventario físico y sistema en el piloto; cualquier error de integridad en pruebas.", "Cada sprint"],
      ["**R11** Mitigar", "Integración continua, cobertura de pruebas, análisis estático, patrón Repository y revisión cruzada en cada Pull Request.", "A. Lujan", "Cobertura inferior a 80 %, CI en rojo o incidencias de bandit.", "Cada sprint"],
    ], { id: "plan", title: "Plan de respuesta a los riesgos: estrategia, acción, responsable, indicador y revisión", widths: [12, 33, 15, 28, 12], size: 17, align: [L, L, L, L, C], source: "Elaboración propia a partir del cronograma (capítulo 2) y de los controles descritos en los capítulos 7 a 10." }),

    H3("5.3.2 Seguimiento y control de riesgos"),
    P("El control de riesgos se integra a las ceremonias de Scrum para no crear una carga adicional. En el **Sprint Planning** se revisan los riesgos que afectan las historias comprometidas; en la **reunión semanal** el Scrum Master verifica los indicadores de {tab:plan}; en la **Sprint Review** el equipo actualiza el estado y recalcula la matriz con la Product Owner; y en la **Retrospectiva** se analizan los riesgos materializados y las respuestas que funcionaron. El **registro de riesgos** vigente es la {tab:riesgos_desc} junto con la {tab:plan}; cada cambio de probabilidad o de estado se fecha en la revisión correspondiente y los riesgos cerrados se conservan como lecciones aprendidas."),
    P("Cuando un indicador se activa o un riesgo cambia de nivel, se aplica el procedimiento de escalamiento de {tab:escalamiento}."),
    ...table(["Situación", "Acción", "Quién decide", "Plazo"], [
      ["Indicador activado, nivel medio (6 a 12)", "Aplicar la acción de respuesta y registrar el cambio en la reunión semanal.", "Responsable del riesgo", "En la semana"],
      ["Nivel alto (13 a 19)", "Plan de contingencia, aviso a la Product Owner y a la docente y replanificación del sprint si afecta un hito.", "Scrum Master y Product Owner", "24 horas"],
      ["Nivel crítico (≥ 20) o riesgo materializado con impacto 5", "Detener el alcance no esencial, convocar al equipo completo y comunicar a la docente con un plan de recuperación.", "Equipo completo", "Mismo día"],
    ], { id: "escalamiento", title: "Criterios de escalamiento de riesgos", widths: [27, 41, 20, 12], size: 18, align: [L, L, L, C], source: "Elaboración propia." }),

    P("**Estado de los riesgos al 06-oct-2026.** {tab:estado} resume el estado de cada riesgo con la evidencia disponible en el repositorio. Se distingue entre riesgos **mitigados** (existe un control implementado y verificado), **en seguimiento** (controlados parcialmente) y **abiertos** (la mitigación aún no empieza o depende de terceros)."),
    ...table(["ID", "Estado", "Evidencia a la fecha"], [
      ["**R1**", "En seguimiento", "El alcance de la v1 se limitó a RF01–RF10; RF11 (exportar reportes) y RF12 (alertas por WhatsApp y correo) están reprogramados al Sprint 4 y declarados como no implementados."],
      ["**R2**", "Abierto", "El pronóstico usa un histórico sintético de 24 meses (`ml-service/forecast.py`, semilla fija); sus MAPE de 2.1 %, 4.5 % y 7.0 % (promedio 4.5 %) no demuestran precisión real. Acción pendiente: obtener ventas reales de Vástago & Co."],
      ["**R3**", "Mitigado", "24 pruebas pytest aprobadas (16 de seguridad); bandit sin incidencias; pip-audit y npm audit sin vulnerabilidades; pruebas OWASP: 18 de 20 aprobadas antes de las correcciones y 20 de 20 después (evidencias/seguridad). Detalle en el capítulo 9."],
      ["**R4**", "En seguimiento", "Los Sprints 1 y 2 se completaron según el cronograma; el Sprint 3 está en curso (día 9 de 21) y concentra la base de datos, la seguridad y el despliegue."],
      ["**R5**", "Mitigado (parcial)", "Replicación streaming primario a réplica con retraso de 0 bytes y slot `replica1_slot`; respaldo y restauración verificados en 5 tablas (evidencias 01 y 02). Pendiente: programar el respaldo diario y definir el respaldo externo en Render (capítulo 8)."],
      ["**R6**", "Abierto", "Aún no hay piloto con el personal de planta; la mitigación disponible es la interfaz simple con menú por rol (capítulo 4). El piloto se prevé en los Sprints 5 y 6."],
      ["**R7**", "En seguimiento", "El stack completo (Flask, PostgreSQL, React, CI, replicación) ya funciona sin bloqueos. Pendiente: construir la imagen Docker, que no pudo hacerse en el entorno de desarrollo."],
      ["**R8**", "Abierto (aceptado)", "Límites del plan gratuito documentados; `render.yaml` define el chequeo de salud `/api/health`. Pendiente: despliegue en la cuenta de Render del equipo y URL pública."],
      ["**R9**", "Abierto", "Sin integración aún: en la v1 las alertas se muestran solo dentro del sistema. La gestión de la cuenta de WhatsApp Business se inicia antes del Sprint 4."],
      ["**R10**", "Mitigado", "Restricción CHECK de stock no negativo, trigger de movimientos, bloqueo `FOR UPDATE` y transacción única; verificado con pruebas automáticas y con las pruebas directas de {cod:integridad}."],
      ["**R11**", "Mitigado", "Cobertura de pruebas de 90 % (evidencias/05_cobertura.txt), patrón Repository, bandit sin incidencias y flujo de CI definido (su primera ejecución ocurre al subir el repositorio)."],
    ], { id: "estado", title: "Estado de los riesgos al 06-oct-2026 y evidencia disponible", widths: [8, 17, 75], size: 17, align: [C, L, L], source: "Elaboración propia a partir de las evidencias del repositorio (evidencias/01 a 06 y evidencias/seguridad) y del estado del cronograma." }),
    P("La evidencia de R10 y de la inmutabilidad de la bitácora (control de R3) se obtuvo ejecutando intentos de violación directamente sobre la base de datos con el rol de la aplicación, cada uno revertido con `ROLLBACK` para no alterar los datos. {cod:integridad} reproduce las salidas reales."),
    ...code(String.raw`-- 1) Stock negativo por UPDATE directo
BEGIN;
UPDATE insumos SET stock_actual = -1 WHERE nombre = 'Lecitina de soya';
ERROR:  new row for relation "insumos" violates check constraint "insumos_stock_actual_check"
ROLLBACK;

-- 2) Salida de 999999 unidades mediante un movimiento (el trigger intenta restar)
INSERT INTO movimientos_inventario (insumo_id, tipo, cantidad, motivo, usuario_id)
  SELECT id, 'SALIDA', 999999, 'prueba de integridad', 1 FROM insumos WHERE nombre='Lecitina de soya';
ERROR:  new row for relation "insumos" violates check constraint "insumos_stock_actual_check"
CONTEXT:  PL/pgSQL function fn_aplicar_movimiento() line 7 at SQL statement

-- 3) Borrado de un registro de auditoría
DELETE FROM auditoria WHERE id = 1;
ERROR:  La tabla auditoria es de solo lectura/anexado
CONTEXT:  PL/pgSQL function fn_bloquear_auditoria() line 3 at RAISE`, { title: "Pruebas de integridad en la base de datos (salida real; evidencias/06_integridad_bd.txt)", id: "integridad" }),
    note("**Riesgo que ya se materializó parcialmente:** R2. El histórico de demanda de la v1 es sintético, de modo que el MAPE reportado valida el método, no el desempeño sobre la demanda real de Vástago & Co. El equipo lo declara aquí y en el capítulo 6, y la respuesta es la solicitud de los datos reales de ventas para el Sprint 5, donde el modelo se afinará."),
    P("En síntesis, a doce días del cierre del Sprint 3 los riesgos de mayor impacto técnico (R3, R5 y R10) cuentan con controles verificados, mientras que los abiertos (R2, R6, R8 y R9) dependen de datos, de usuarios o de cuentas externas que el equipo debe gestionar con el cliente y con las plataformas. Esa es la agenda de riesgos para la Sprint Review del 18 de octubre."),
  ];
};
