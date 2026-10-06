// Levantamiento de observaciones del APF1 + trazabilidad con la rúbrica del APF2
module.exports = (g) => {
  const { H1, H2, P, table, note, bullets, AlignmentType } = g;
  const CT = AlignmentType.CENTER;
  return [
    H1("Levantamiento de observaciones del APF1"),
    P("La docente Yovana Roca remitió el 12 de septiembre de 2026 nueve observaciones sobre el Avance de Proyecto Final 1. La sustentación del APF2 se inicia con su levantamiento; por ello este informe las atiende antes de presentar los nuevos artefactos. La {tab:obs_apf1} resume cada observación, la acción realizada y el apartado donde puede verificarse."),
    ...table(["N.º", "Observación de la docente (APF1)", "Acción realizada en este informe", "Dónde verificarla"], [
      ["1", "Mejorar la problemática del proyecto.", "Se reescribió la problemática con contexto del sector, cinco síntomas medibles, árbol de causas (causa → efecto → impacto), pregunta de investigación y objetivos SMART.", "Sección 1.1"],
      ["2", "Realizar el diseño del modelo AS-IS y TO-BE.", "Se modelaron ambos procesos como diagramas de carriles (swimlane) con actores, decisiones y problemas numerados P1–P5; se añadió la comparación AS-IS vs TO-BE por actividad.", "Secciones 1.6 y 1.7 ({fig:asis}, {fig:tobe})"],
      ["3", "En figuras y tablas: enumerarlas y colocar el título.", "Toda figura, tabla y bloque de código lleva numeración automática, título, breve descripción y fuente; las referencias cruzadas se generan por identificador y no se escriben a mano.", "Todo el documento"],
      ["4", "En el Gantt indicar el mes y los responsables.", "El diagrama muestra la franja de meses (agosto–diciembre), las 18 semanas, los seis sprints con sus fechas y la columna de responsables por actividad; se añadió la tabla de cronograma por actividad.", "Sección 2.3 ({fig:gantt})"],
      ["5", "En el Kanban, la retrospectiva y el cierre del sprint no pueden estar en «Hecho» mientras el sprint no termine: van en «Por hacer».", "En el Sprint 3 (en curso) la retrospectiva y el cierre (Sprint Review) están en «Por hacer»; solo los Sprints 1 y 2, ya concluidos, los tienen en «Hecho». Se añadió una regla en la Definition of Done.", "Sección 2.6 ({tab:kb3})"],
      ["6", "Épicas e HU: considerar el medio de comunicación más viable y mejorar la propuesta.", "Se realizó un análisis comparativo de medios (WhatsApp Business, correo, SMS y aplicación móvil) con criterios ponderados; WhatsApp Business es el canal principal y el correo el respaldo. Se reformularon HU14 y HU15 y la épica E5; todas las HU llevan criterios de aceptación.", "Secciones 2.7 y 2.8 ({tab:comunic})"],
      ["7", "Herramientas bien seleccionadas; está pendiente la configuración.", "Se documenta la configuración con comandos y salidas reales (entorno Python, Node, PostgreSQL, Git, CI, Docker, Render) y una tabla paso → comando → verificación. Las capturas de las máquinas de los integrantes quedan rotuladas como pendientes.", "Sección 3.2"],
      ["8", "Prototipos: título y breve descripción en cada figura, y el enlace de los diseños como fuente.", "Cada wireframe y mockup tiene número, título, descripción y fuente. El enlace al diseño figura como marcador «[PENDIENTE: pegar enlace del diseño en Figma]» hasta que el equipo lo publique; los archivos fuente están en el repositorio.", "Secciones 4.1 y 4.2"],
      ["9", "Tabla «KPIs de Negocio e Inventario (Dashboard Gerencial)» ilegible: mejorar el formato.", "La tabla se dividió en tres (negocio y producción, inventario, técnicos) con un máximo de cinco columnas y tamaño de letra de 9 pt; cada KPI indica fórmula, fuente en la base de datos, meta y frecuencia.", "Sección 6.1"],
    ], { id: "obs_apf1", title: "Levantamiento de las observaciones del APF1", widths: [6, 28, 48, 18], size: 18, align: [CT, null, null, null],
         source: "Observaciones de la docente Yovana Roca (mensaje del 12-sep-2026); elaboración propia." }),
    note("**Estado de los pendientes.** Cuatro elementos no pudieron completarse desde el entorno de desarrollo y están rotulados como «PENDIENTE» donde corresponde: la URL del despliegue en Render y sus capturas (Capítulo 11), el enlace del diseño de los prototipos (Capítulo 4) y las capturas de configuración tomadas en los equipos de los integrantes (Sección 3.2). La imagen Docker no pudo construirse en el entorno de desarrollo; el procedimiento y los artefactos están listos para el despliegue.", { fill: "FFF4CC" }),

    H2("Trazabilidad con la rúbrica del APF2"),
    P("La {tab:rubrica} relaciona cada artefacto exigido en la consigna del APF2 con el apartado del informe que lo contiene, para facilitar la revisión."),
    ...table(["Criterio de la rúbrica", "Artefacto exigido", "Dónde está"], [
      ["Integración con base de datos", "Diseño físico de BD y script SQL", "Sección 8.1 y Anexo A"],
      ["", "Informe de Administración y Replicación", "Sección 8.2"],
      ["", "Implementación del Patrón de Acceso a Datos", "Sección 8.3 y Anexo B"],
      ["Medidas de seguridad", "Catálogo de Controles de Seguridad", "Sección 9.1"],
      ["", "Módulo de Autenticación y Autorización", "Sección 9.2"],
      ["", "Informe Técnico de Seguridad y Cifrado de Datos", "Sección 9.3"],
      ["", "Prueba de seguridad web", "Sección 9.4 y Anexo D"],
      ["Despliegue de la aplicación", "Plan de pruebas del sistema", "Sección 10.1"],
      ["", "Manual de despliegue", "Sección 11.1 y docs/MANUAL_DESPLIEGUE.md"],
      ["", "Evidencia de pruebas de despliegue", "Sección 11.2"],
      ["", "Evidencias de monitoreo y administración de BD", "Sección 8.2.3 y Sección 6.3"],
      ["Validación y verificación en la nube", "Pruebas según el plan de pruebas", "Secciones 10.2 y 11.2"],
      ["Levantamiento de observaciones", "Nueve observaciones del APF1", "Tabla anterior"],
    ], { id: "rubrica", title: "Trazabilidad entre la rúbrica del APF2 y el informe", widths: [26, 44, 30], size: 18, boldFirst: true,
         source: "Consigna y rúbrica del Avance de Proyecto Final 2 (UTP, 2026); elaboración propia." }),
  ];
};
