// Capítulo 2 — Planificación y Gestión del Proyecto
module.exports = (g) => {
  const { H1, H2, H3, P, bullets, numbered, fig, table, note, spacer, AlignmentType } = g;
  const CT = AlignmentType.CENTER;

  // ====================================================================== datos maestros (fuente única de consistencia)
  const HORAS = 540, TARIFA = 25, CAP = 90;
  const fmt = (n) => "S/ " + n.toLocaleString("en-US");
  const costoHoras = HORAS * TARIFA, conting = Math.round(costoHoras * 0.10), totalRef = costoHoras + conting;

  // Historias de usuario: id, épica, título corto, rol/quiero/para, criterios, MoSCoW, puntos, sprint, estado
  const HU = [
    // ---- E1
    { id: "HU01", e: 1, t: "Registrar ingreso/salida de insumo", m: "Must", p: 5, s: 3, est: "Hecho",
      h: "Como **almacenero** quiero registrar el ingreso o la salida de un insumo para mantener el stock actualizado y saber quién realizó cada movimiento.",
      c: ["**Dado** que inicié sesión con un rol autorizado, **cuando** registro un INGRESO o una SALIDA con insumo, cantidad positiva y motivo, **entonces** el stock se actualiza de inmediato y el movimiento queda con usuario y fecha.",
          "**Dado** un insumo con stock de 10 unidades, **cuando** intento una salida de 15, **entonces** el sistema la rechaza con el mensaje «Stock insuficiente» y el stock no cambia.",
          "**Dado** un usuario sin permiso de escritura de inventario, **cuando** intenta registrar un movimiento, **entonces** recibe acceso denegado."] },
    { id: "HU02", e: 1, t: "Ver stock con semáforo", m: "Must", p: 3, s: 3, est: "Hecho",
      h: "Como **almacenero o jefe de producción** quiero ver el stock de cada insumo con un semáforo para identificar de un vistazo qué debo reponer.",
      c: ["**Dado** que consulto el inventario, **cuando** el stock es menor que el mínimo, **entonces** el insumo se muestra en estado crítico (rojo); si está entre el mínimo y el 120 % del mínimo, en advertencia (ámbar); en otro caso, en normal (verde).",
          "**Dado** un cambio de stock, **cuando** se registra un movimiento, **entonces** el semáforo se recalcula sin intervención manual."] },
    { id: "HU03", e: 1, t: "Consultar historial de movimientos", m: "Should", p: 3, s: 3, est: "Hecho",
      h: "Como **almacenero** quiero consultar el historial de movimientos de un insumo para rastrear entradas, salidas y consumos.",
      c: ["**Dado** un insumo con movimientos, **cuando** abro su historial, **entonces** veo fecha, tipo, cantidad, motivo y usuario de cada movimiento, del más reciente al más antiguo.",
          "**Dado** una orden completada, **cuando** reviso el historial, **entonces** el consumo aparece vinculado al lote de la orden."] },
    { id: "HU04", e: 1, t: "Alerta de stock mínimo (en el sistema)", m: "Must", p: 3, s: 3, est: "Hecho",
      h: "Como **jefe de producción** quiero ver una alerta cuando un insumo cae bajo su mínimo para anticipar la compra antes de que se detenga la producción.",
      c: ["**Dado** un insumo cuyo stock cae por debajo del mínimo, **cuando** ingreso al sistema, **entonces** el panel de alertas muestra una alerta crítica con el nombre del insumo.",
          "**Dado** que se repone el insumo por encima del mínimo, **cuando** consulto el estado, **entonces** el semáforo vuelve a normal."] },
    // ---- E2
    { id: "HU05", e: 2, t: "Crear orden de producción con vista previa (BOM)", m: "Must", p: 8, s: 3, est: "Hecho",
      h: "Como **jefe de producción** quiero crear una orden de producción y ver el consumo estimado de insumos según la receta para decidir si puedo producir.",
      c: ["**Dado** un producto y una cantidad entera positiva, **cuando** los selecciono en el formulario, **entonces** el sistema muestra el consumo estimado de cada insumo según la receta (BOM).",
          "**Dado** que confirmo la orden, **cuando** la creo, **entonces** se genera un lote correlativo en estado «Planificada» y la acción queda auditada.",
          "**Dado** una cantidad no entera, negativa o fuera de rango, **cuando** intento crear la orden, **entonces** el sistema la rechaza por datos inválidos."] },
    { id: "HU06", e: 2, t: "Completar orden y descontar insumos", m: "Must", p: 8, s: 3, est: "Hecho",
      h: "Como **jefe de producción** quiero completar una orden para que el sistema descuente automáticamente los insumos consumidos.",
      c: ["**Dado** una orden en proceso, **cuando** la completo y confirmo el aviso, **entonces** se registra una SALIDA por cada insumo de la receta, en una sola transacción, vinculada al lote.",
          "**Dado** que algún insumo no alcanza, **cuando** intento completar, **entonces** la operación no se confirma de forma parcial y el stock permanece consistente."] },
    { id: "HU07", e: 2, t: "Consultar recetas (BOM)", m: "Must", p: 3, s: 3, est: "Hecho",
      h: "Como **jefe de producción** quiero consultar la receta de cada producto para conocer los insumos y las cantidades por unidad.",
      c: ["**Dado** un producto, **cuando** consulto su receta, **entonces** veo cada insumo con su cantidad por unidad y su unidad de medida.",
          "**Dado** un producto inexistente, **cuando** lo solicito, **entonces** el sistema responde «Producto no encontrado»."] },
    // ---- E3
    { id: "HU08", e: 3, t: "Iniciar sesión de forma segura", m: "Must", p: 8, s: 3, est: "Hecho",
      h: "Como **usuario del sistema** quiero iniciar sesión con mi correo y contraseña para acceder solo a mi información y que mis acciones queden identificadas.",
      c: ["**Dado** credenciales válidas, **cuando** inicio sesión, **entonces** obtengo un token de acceso de 15 minutos y una sesión renovable en cookie HttpOnly.",
          "**Dado** credenciales inválidas, **cuando** intento ingresar, **entonces** el mensaje es genérico («Credenciales inválidas») y no revela si el correo existe.",
          "**Dado** cinco intentos fallidos consecutivos, **cuando** intento un sexto, **entonces** la cuenta se bloquea temporalmente y el evento se audita."] },
    { id: "HU09", e: 3, t: "Control de acceso por roles", m: "Must", p: 5, s: 3, est: "Hecho",
      h: "Como **administrador** quiero que cada rol vea y haga solo lo que le corresponde para proteger la información y evitar errores.",
      c: ["**Dado** un usuario autenticado, **cuando** inicia sesión, **entonces** el menú muestra solo las vistas permitidas a su rol (Administrador, Gerente, Jefe de producción o Almacenero).",
          "**Dado** un usuario que invoca una operación fuera de su rol, **cuando** la ejecuta, **entonces** el servidor responde «No tienes permisos» y registra el acceso denegado."] },
    { id: "HU10", e: 3, t: "Gestionar usuarios (administrador)", m: "Should", p: 5, s: 3, est: "Hecho",
      h: "Como **administrador** quiero crear, activar y desactivar usuarios y asignarles un rol para controlar quién accede al sistema.",
      c: ["**Dado** datos válidos, **cuando** creo un usuario, **entonces** se guarda con contraseña cifrada (bcrypt) y rol asignado; una contraseña débil es rechazada con el motivo.",
          "**Dado** un correo ya registrado, **cuando** intento crearlo de nuevo, **entonces** el sistema lo rechaza; y **dado** mi propia cuenta, **cuando** intento desactivarme, **entonces** el sistema lo impide."] },
    { id: "HU11", e: 3, t: "Consultar bitácora de auditoría", m: "Should", p: 5, s: 3, est: "Hecho",
      h: "Como **administrador** quiero consultar la bitácora de auditoría para saber quién hizo qué y cuándo.",
      c: ["**Dado** que ocurren acciones relevantes (inicio de sesión, movimientos, órdenes, accesos denegados), **cuando** abro la bitácora, **entonces** veo evento, usuario, fecha, IP y resultado.",
          "**Dado** un registro de auditoría, **cuando** se intenta modificarlo o borrarlo, **entonces** la base de datos lo impide (tabla de solo inserción)."] },
    // ---- E4
    { id: "HU12", e: 4, t: "Pronóstico de demanda a 3 meses con MAPE", m: "Must", p: 8, s: 5, est: "Parcial (base v1)",
      h: "Como **gerente** quiero ver el pronóstico de demanda de los próximos tres meses por producto con su error (MAPE) para saber cuánto confiar en la proyección.",
      c: ["**Dado** el histórico mensual de un producto, **cuando** abro la vista de analítica, **entonces** veo la serie histórica, el pronóstico de tres meses y el MAPE del modelo.",
          "**Dado** que se cargan datos reales de la empresa, **cuando** se reentrena el modelo, **entonces** el MAPE se recalcula sobre el período de validación y se informa la fecha de la corrida (Sprint 5)."] },
    { id: "HU13", e: 4, t: "Recomendación de producción según pronóstico", m: "Should", p: 5, s: 5, est: "Por hacer",
      h: "Como **jefe de producción** quiero una recomendación de cuánto producir según el pronóstico y el stock disponible para planificar los lotes con base en datos.",
      c: ["**Dado** el pronóstico de un producto y el stock de sus insumos, **cuando** consulto la recomendación, **entonces** veo la cantidad sugerida y los insumos que podrían faltar.",
          "**Dado** que la precisión del modelo es insuficiente (MAPE sobre el umbral acordado), **cuando** se muestra la recomendación, **entonces** el sistema lo advierte."] },
    // ---- E5
    { id: "HU14", e: 5, t: "Alerta por WhatsApp Business de quiebre inminente", m: "Should", p: 8, s: 4, est: "Por hacer",
      h: "Como **jefe de producción o almacenero** quiero recibir por WhatsApp Business una alerta cuando un insumo cae bajo su mínimo para reaccionar sin tener que abrir el sistema.",
      c: ["**Dado** un insumo que cruza su mínimo, **cuando** el sistema genera la alerta, **entonces** envía un mensaje de plantilla a los destinatarios autorizados en un máximo de 5 minutos.",
          "**Dado** un envío, **cuando** finaliza, **entonces** se registra su estado (enviado, entregado o fallido) con fecha y destinatario.",
          "**Dado** que el envío por WhatsApp falla tras los reintentos, **cuando** se agota el reintento, **entonces** la alerta se entrega por correo (HU15) y el fallo se audita."] },
    { id: "HU15", e: 5, t: "Resumen por correo (canal de respaldo)", m: "Could", p: 3, s: 4, est: "Por hacer",
      h: "Como **gerente** quiero recibir un resumen por correo de los insumos críticos para contar con un respaldo documental de las alertas.",
      c: ["**Dado** insumos en estado crítico, **cuando** llega la hora configurada del resumen, **entonces** se envía un correo con el listado de insumos, stock y mínimo.",
          "**Dado** que no hay insumos críticos, **cuando** llega la hora del resumen, **entonces** no se envía correo."] },
    // ---- E6
    { id: "HU16", e: 6, t: "KPIs de negocio e inventario por rol", m: "Must", p: 8, s: 4, est: "Parcial (v1)",
      h: "Como **gerente** quiero un dashboard con los indicadores clave de inventario y producción, adaptado a mi rol, para decidir con información actualizada.",
      c: ["**Dado** que inicio sesión, **cuando** abro el dashboard, **entonces** veo los indicadores y las alertas que corresponden a mi rol y no los de otros roles.",
          "**Dado** que cambia el stock o se completa una orden, **cuando** recargo el dashboard, **entonces** los indicadores reflejan los datos actuales (ampliación de KPIs en Sprint 4)."] },
    { id: "HU17", e: 6, t: "Exportar reporte", m: "Should", p: 5, s: 4, est: "Por hacer",
      h: "Como **gerente** quiero exportar un reporte de inventario y producción para compartirlo o archivarlo fuera del sistema.",
      c: ["**Dado** una vista de reporte con filtros, **cuando** pido exportar, **entonces** se descarga un archivo con los mismos datos y filtros visibles.",
          "**Dado** un usuario sin permiso sobre el reporte, **cuando** intenta exportarlo, **entonces** el sistema lo deniega."] },
    // ---- E7
    { id: "HU18", e: 7, t: "Despliegue en la nube", m: "Must", p: 8, s: 3, est: "En progreso",
      h: "Como **administrador** quiero que el sistema esté desplegado en la nube con HTTPS para que el personal lo use desde cualquier equipo.",
      c: ["**Dado** el repositorio con Dockerfile y `render.yaml`, **cuando** se ejecuta el despliegue, **entonces** la aplicación y la base de datos quedan operativas y accesibles por una URL pública con HTTPS.",
          "**Dado** que el despliegue finaliza, **cuando** se ejecuta la verificación de salud, **entonces** la aplicación responde correctamente y puede iniciarse sesión."] },
    { id: "HU19", e: 7, t: "Respaldo, replicación y monitoreo de la BD", m: "Should", p: 5, s: 3, est: "Hecho",
      h: "Como **administrador** quiero respaldo y replicación de la base de datos, con monitoreo, para proteger los datos ante fallas.",
      c: ["**Dado** la base primaria, **cuando** se inserta un dato, **entonces** la réplica en streaming lo recibe con retraso de 0 bytes en la verificación realizada.",
          "**Dado** un respaldo `pg_dump`, **cuando** se restaura en una base limpia, **entonces** los conteos de las tablas coinciden con los del origen."] },
  ];
  const EPICAS = [
    { n: 1, t: "Gestión de inventario", obj: "Conocer el stock real de cada insumo, con trazabilidad de movimientos y avisos de reposición.", rf: "RF01, RF02, RF03" },
    { n: 2, t: "Gestión de producción", obj: "Planificar y registrar órdenes con receta (BOM) y descuento automático de insumos.", rf: "RF04" },
    { n: 3, t: "Seguridad y accesos", obj: "Proteger los datos mediante autenticación, roles, administración de usuarios y auditoría.", rf: "RF05, RF06, RF07, RF08" },
    { n: 4, t: "Analítica e IA", obj: "Proyectar la demanda y orientar cuánto producir mediante un modelo de pronóstico.", rf: "RF09" },
    { n: 5, t: "Alertas y notificaciones", obj: "Avisar oportunamente al personal por el canal más viable (ver apartado 2.8).", rf: "RF12 (RF03 en el sistema)" },
    { n: 6, t: "Dashboard gerencial", obj: "Ofrecer indicadores por rol y reportes exportables a gerencia.", rf: "RF10, RF11" },
    { n: 7, t: "Despliegue y operación", obj: "Operar el sistema en la nube con respaldo, replicación y monitoreo.", rf: "RNF03, RNF06" },
  ];
  const huE = (n) => HU.filter((h) => h.e === n);
  const pts = (arr) => arr.reduce((a, h) => a + h.p, 0);
  const ptsS = (s) => pts(HU.filter((h) => h.s === s));
  const huS = (s) => HU.filter((h) => h.s === s).map((h) => h.id);
  const PTS_TOTAL = pts(HU);

  // Kanban: tarjetas por sprint (0=Por hacer, 1=En progreso, 2=Hecho). Estado al 06-oct-2026 (Sprint 3, día 9 de 21).
  const KB = {
    1: { fechas: "17-ago – 06-sep", cards: [
      ["Análisis empresarial (AS-IS / TO-BE)", 2], ["Levantamiento de requisitos (RF y RNF)", 2], ["Product Backlog, épicas e historias de usuario", 2],
      ["Retrospectiva del Sprint 1", 2], ["Cierre del Sprint 1 (Sprint Review)", 2]] },
    2: { fechas: "07-sep – 27-sep", cards: [
      ["Wireframes de baja fidelidad", 2], ["Mockups de alta fidelidad", 2], ["Arquitectura del sistema", 2], ["Diseño de la base de datos (modelo físico)", 2],
      ["Entrega del informe APF1 (12-sep)", 2], ["Retrospectiva del Sprint 2", 2], ["Cierre del Sprint 2 (Sprint Review)", 2]] },
    3: { fechas: "28-sep – 18-oct", cards: [
      ["Esquema PostgreSQL (tablas, trigger, vistas, datos semilla)", 2], ["Patrón Repository y transacciones", 2], ["Módulo de inventario (HU01–HU04)", 2],
      ["Módulo de producción con BOM (HU05–HU07)", 2], ["Autenticación, RBAC, usuarios y auditoría (HU08–HU11)", 2], ["Pruebas automáticas (24 pruebas de pytest)", 2],
      ["Optimización de rendimiento web (WPO)", 2], ["Replicación y respaldo de la base de datos (HU19)", 2],
      ["Despliegue cloud v1 en Render (HU18)", 1], ["Informe y presentación APF2", 1],
      ["Retrospectiva del Sprint 3", 0], ["Cierre del Sprint 3 (Sprint Review)", 0]] },
    4: { fechas: "19-oct – 08-nov", cards: [
      ["Dashboard gerencial y KPIs ampliados (HU16)", 0], ["Reportes y exportaciones (HU17)", 0], ["Alertas por WhatsApp Business (HU14)", 0], ["Resumen por correo (HU15)", 0],
      ["Retrospectiva del Sprint 4", 0], ["Cierre del Sprint 4 (Sprint Review)", 0]] },
    5: { fechas: "09-nov – 29-nov", cards: [
      ["Módulo IA: pronóstico afinado con datos reales (HU12)", 0], ["Recomendación de producción (HU13)", 0], ["Integración de módulos", 0],
      ["Pruebas funcionales y correcciones", 0], ["Retrospectiva del Sprint 5", 0], ["Cierre del Sprint 5 (Sprint Review)", 0]] },
    6: { fechas: "30-nov – 20-dic", cards: [
      ["Optimización y seguridad final", 0], ["Documentación técnica", 0], ["Presentación final y demo", 0],
      ["Retrospectiva del Sprint 6", 0], ["Cierre del Sprint 6 (Sprint Review)", 0]] },
  };
  const col = (s, k) => KB[s].cards.filter((c) => c[1] === k).map((c) => "• " + c[0]);
  const cnt = (s, k) => KB[s].cards.filter((c) => c[1] === k).length;
  const cntT = (k) => [1, 2, 3, 4, 5, 6].reduce((a, s) => a + cnt(s, k), 0);
  const pct = (a, b) => (b ? Math.round(a / b * 1000) / 10 : 0).toFixed(1).replace(".0", "") + " %";
  const kbTable = (s, extra) => table(["Por hacer", "En progreso", "Hecho"],
    [[col(s, 0).length ? col(s, 0) : ["—"], col(s, 1).length ? col(s, 1) : ["—"], col(s, 2).length ? col(s, 2) : ["—"]]],
    { id: "kb" + s, title: `Tablero Kanban del Sprint ${s} (${KB[s].fechas}) — ${extra}`, widths: [1, 1, 1], size: 18, zebra: false,
      source: "Elaboración propia; estado al 06-oct-2026." });

  return [
    H1("2. Planificación y Gestión del Proyecto"),
    P("Este capítulo recoge la planificación con la que el equipo conduce el proyecto bajo el marco ágil Scrum: el acta de constitución, el alcance, el cronograma, la planificación de sprints, los roles y artefactos, el tablero Kanban, el Product Backlog y las historias de usuario. Atiende las observaciones de la docente sobre el APF1: el cronograma muestra ahora meses, semanas, sprints y responsables ({fig:gantt}); el tablero Kanban refleja el estado real de cada sprint a la fecha de corte (06-oct-2026); y el medio de comunicación de las alertas se eligió mediante un análisis comparativo (apartado 2.8). Los números de horas, puntos y tarjetas se calculan a partir de una misma fuente de datos, de modo que las tablas del capítulo son consistentes entre sí."),

    // =====================================================================================================
    H2("2.1 Project Charter"),
    P("El Project Charter formaliza la existencia del proyecto y define su propósito, límites y responsables. La {tab:charter} resume sus elementos; los interesados se detallan en la {tab:interesados} y los hitos en la {tab:hitos}. Las cifras económicas son **referenciales**: valorizan el esfuerzo académico del equipo con una tarifa interna y no representan un desembolso."),
    ...table(["Elemento", "Contenido"], [
      ["Nombre del proyecto", "Sistema Web Inteligente para la Gestión de Producción e Inventarios en una Empresa Chocolatera mediante Analítica Predictiva e IA."],
      ["Propósito", "Reemplazar el control manual de insumos y producción de Vástago & Co por un sistema web que centralice el inventario, calcule el consumo por receta y proyecte la demanda, para reducir quiebres de stock y mermas no explicadas."],
      ["Justificación", "El proceso actual (AS-IS) depende de cuaderno, hojas de cálculo y experiencia del personal: stock desactualizado, sin alertas, sin proyección de demanda, sin trazabilidad de merma y sin responsables (problemas P1 a P5, apartado 1.6). Las metas de reducción se medirán contra una línea base que se levantará durante el piloto (**valor de referencia a validar con la empresa**)."],
      ["Objetivo general", "Desarrollar e implementar, entre el 17-ago y el 20-dic-2026, un sistema web seguro de inventario, producción con receta y pronóstico de demanda a 3 meses (apartado 1.1)."],
      ["Objetivos específicos", ["OE1. Modelar AS-IS/TO-BE y levantar requisitos.", "OE2. Implementar inventario y producción con BOM.", "OE3. Garantizar seguridad, roles y continuidad de datos.", "OE4. Entregar un pronóstico de demanda a 3 meses.", "OE5. Comunicar alertas por el canal más viable.", "OE6. Desplegar en la nube con buen rendimiento."]],
      ["Alcance", "Módulos de inventario, producción, seguridad y roles, analítica con pronóstico, dashboard por rol, alertas (sistema, WhatsApp y correo), reportes exportables y despliegue en la nube con respaldo y replicación (apartado 2.2)."],
      ["Entregables principales", ["Informe APF1 (12-sep) e informe APF2 con sustentación (06-oct).", "Sistema web v1 funcionando (Sprint 3); v2 con alertas, reportes e IA afinada (Sprints 4 y 5).", "Código en el repositorio GitHub, base de datos con respaldo y replicación, documentación técnica y presentación final con demo (Sprint 6)."]],
      ["Supuestos", ["La empresa facilitará información de procesos y, antes del Sprint 5, datos históricos de demanda; hasta entonces se usa un dataset de demostración.", "Cada integrante dispone de unas 10 h por semana.", "Se obtendrá la cuenta de WhatsApp Business y la plantilla de mensajes aprobada a tiempo para el Sprint 4."]],
      ["Restricciones", ["Plazo fijo: 18 semanas (17-ago a 20-dic-2026); equipo de 3 personas; 540 h en total.", "Infraestructura en plan gratuito durante la demostración (límites de recursos).", "Sin app móvil nativa; tecnologías de código abierto."]],
      ["Presupuesto referencial", [`Trabajo del equipo: ${HORAS} h × ${fmt(TARIFA)}/h (tarifa interna referencial) = ${fmt(costoHoras)}.`, "Infraestructura cloud: S/ 0 en el plan gratuito usado en la demostración; el plan de pago se estimará con la tarifa vigente del proveedor (a confirmar).", `Contingencia del 10 % sobre el trabajo: ${fmt(conting)}.`, `Total referencial: ${fmt(totalRef)} más infraestructura de pago, si se contratara (a confirmar).`]],
    ], { id: "charter", title: "Project Charter de Vástago & Co", widths: [20, 80], size: 18, boldFirst: true, source: "Elaboración propia." }),
    P("El desglose del presupuesto referencial se muestra en la {tab:presupuesto}. La tarifa de S/ 25 por hora es una convención interna del equipo para valorizar el esfuerzo; no proviene de una tarifa de mercado ni de un contrato."),
    ...table(["Concepto", "Cantidad", "Costo unitario", "Subtotal"], [
      ["Horas-equipo de desarrollo y documentación", `${HORAS} h`, `${fmt(TARIFA)} / h`, fmt(costoHoras)],
      ["Infraestructura cloud (servicio web y base de datos)", "5 meses", "S/ 0 (plan gratuito); plan de pago a confirmar", "S/ 0 + a confirmar"],
      ["Contingencia (10 % del trabajo)", "10 %", "—", fmt(conting)],
      ["**Total referencial**", "", "", `**${fmt(totalRef)}** + infraestructura (a confirmar)`],
    ], { id: "presupuesto", title: "Presupuesto referencial del proyecto", widths: [38, 14, 28, 20], size: 18, align: [null, CT, CT, CT],
         source: "Elaboración propia; tarifa interna referencial. El precio del plan de pago de Render debe confirmarse en la tarifa vigente del proveedor." }),
    P("Los interesados del proyecto y su nivel de influencia sobre él aparecen en la {tab:interesados}."),
    ...table(["Interesado", "Rol en el proyecto", "Interés principal", "Influencia"], [
      ["Gerencia de Vástago & Co", "Cliente y usuaria del dashboard", "Decidir con información actualizada; reducir pérdidas", "Alta"],
      ["Jefe de producción", "Usuario clave (órdenes y pronóstico)", "Planificar lotes sin quiebres", "Alta"],
      ["Almacenero", "Usuario clave (movimientos)", "Registrar rápido y sin errores", "Media"],
      ["Docente Yovana Connie Roca Ávila", "Evaluadora del proyecto", "Cumplimiento de los criterios de la asignatura", "Alta"],
      ["Equipo del proyecto (J. Caso, A. Lujan, L. Matamoros)", "Product Owner, Scrum Master y desarrollador", "Entregar el producto en plazo y con calidad", "Alta"],
    ], { id: "interesados", title: "Interesados del proyecto", widths: [27, 25, 33, 15], size: 18, align: [null, null, null, CT], source: "Elaboración propia." }),
    P("Los hitos de control del proyecto, con su fecha y estado a la fecha de corte, se presentan en la {tab:hitos}."),
    ...table(["Hito", "Fecha", "Descripción", "Estado al 06-oct"], [
      ["APF1", "12-sep-2026", "Entrega del avance 1 (análisis, requisitos, backlog)", "Cumplido"],
      ["Cierre Sprint 2", "27-sep-2026", "Prototipos, arquitectura y diseño de BD", "Cumplido"],
      ["APF2 (sustentación)", "06-oct-2026", "Sistema v1 con BD, seguridad y roles; informe APF2", "Hoy"],
      ["Cierre Sprint 3", "18-oct-2026", "Inventario, producción, BD, seguridad y despliegue v1", "En curso"],
      ["Cierre Sprint 4", "08-nov-2026", "Dashboard ampliado, reportes y alertas", "Por hacer"],
      ["Cierre Sprint 5", "29-nov-2026", "IA afinada, integración y pruebas funcionales", "Por hacer"],
      ["APF final", "Dic-2026 (a confirmar con el calendario de la UTP)", "Sistema final, documentación y presentación con demo; cierre del Sprint 6 el 20-dic", "Por hacer"],
    ], { id: "hitos", title: "Hitos del proyecto", widths: [20, 22, 40, 18], size: 18, source: "Elaboración propia." }),

    // =====================================================================================================
    H2("2.2 Alcance y objetivos del proyecto"),
    P("Los objetivos del proyecto (general y específicos OE1 a OE6, con criterios SMART) se formularon en el apartado 1.1 y no se repiten aquí. Esta sección precisa qué incluye y qué no incluye el proyecto, de modo que el alcance sea verificable al final de cada sprint. La {tab:alcance} lista los componentes del alcance con el requerimiento que los respalda y su estado al 06-oct-2026."),
    ...table(["Componente del alcance", "Requerimientos", "Sprint", "Estado al 06-oct"], [
      ["Inventario: movimientos, semáforo, historial y alerta en el sistema", "RF01, RF02, RF03", "S3", "Implementado"],
      ["Producción: recetas (BOM), órdenes y descuento automático", "RF04", "S3", "Implementado"],
      ["Seguridad: autenticación, roles, usuarios y auditoría", "RF05–RF08, RNF01", "S3", "Implementado"],
      ["Base de datos PostgreSQL con respaldo y replicación", "RNF03", "S3", "Implementado (validado en entorno local)"],
      ["Pronóstico de demanda a 3 meses con MAPE", "RF09", "S3 (base), S5", "Base v1; afinado en S5"],
      ["Dashboard de KPIs por rol", "RF10", "S3 (base), S4", "Base v1; ampliación en S4"],
      ["Reportes exportables", "RF11", "S4", "Por hacer"],
      ["Alertas por WhatsApp Business y correo", "RF12", "S4", "Por hacer"],
      ["Despliegue en la nube (Docker y Render)", "RNF06", "S3", "En progreso"],
    ], { id: "alcance", title: "Componentes del alcance del proyecto", widths: [44, 20, 14, 22], size: 18, source: "Elaboración propia a partir del Product Backlog (apartado 2.7)." }),
    P("Quedan **fuera del alcance** de este proyecto, por límites de tiempo y de recursos: una aplicación móvil nativa y las notificaciones push; el envío de SMS; la integración con facturación electrónica o con el sistema contable; un módulo de ventas, compras o proveedores; y la operación comercial multiempresa descrita en el Lean Canvas como hipótesis de crecimiento. Estas funciones podrían considerarse en una etapa posterior, y se clasifican como «Won't have» en el Product Backlog."),
    P("El proyecto se considerará exitoso, a la fecha de cierre, si se cumplen estos criterios: (a) todas las historias «Must» están implementadas y verificadas con pruebas; (b) el sistema se ejecuta en la nube con HTTPS; (c) las alertas se envían por el canal elegido con registro de entrega; (d) el pronóstico se ha recalibrado con datos reales o, en su defecto, se declara explícitamente que se usó un dataset de demostración; y (e) la documentación técnica y la demostración se entregan en el Sprint 6."),
    P("La estructura de desglose del trabajo (EDT) agrupa las actividades del Gantt en cuatro paquetes, como indica la {tab:edt}."),
    ...table(["Paquete de trabajo", "Actividades", "Sprint(s)"], [
      ["1. Análisis y diseño", "Análisis empresarial AS-IS/TO-BE; requisitos; Product Backlog; wireframes; mockups; arquitectura y diseño de BD", "S1–S2"],
      ["2. Construcción", "Módulos de inventario y producción; BD, seguridad y roles; dashboard y KPIs; reportes; alertas; módulo IA; integración de módulos", "S3–S5"],
      ["3. Verificación y despliegue", "Pruebas automáticas y funcionales; despliegue cloud; optimización y seguridad final", "S3, S5–S6"],
      ["4. Gestión y documentación", "Informes APF1 y APF2; documentación técnica; presentación final y demo; ceremonias Scrum", "S1–S6"],
    ], { id: "edt", title: "Estructura de desglose del trabajo (EDT)", widths: [24, 60, 16], size: 18, source: "Elaboración propia a partir del cronograma." }),

    // =====================================================================================================
    H2("2.3 Cronograma del proyecto (Diagrama de Gantt)"),
    P("El proyecto se ejecuta en 18 semanas, del 17 de agosto al 20 de diciembre de 2026, organizado en seis sprints de tres semanas. Siguiendo la observación de la docente, el diagrama de Gantt de la {fig:gantt} muestra de forma explícita los **meses** (agosto a diciembre), las **semanas** numeradas del 1 al 18, los **sprints** (S1 a S6, con sus fechas en la leyenda) y los **responsables** de cada actividad en la columna derecha. La línea azul marca la entrega del APF1 (12-sep) y la línea roja la fecha de corte de este informe (06-oct, semana 8)."),
    ...fig("assets/gantt_v.png", "Diagrama de Gantt del proyecto: meses, semanas, sprints y responsables", { id: "gantt", width: 610,
      desc: "Cada barra corresponde a una actividad y se rotula con su sprint; la columna «Responsables» identifica a J. Caso (Product Owner), A. Lujan (Scrum Master) y L. Matamoros (Desarrollador).",
      source: "Elaboración propia." }),
    P("La {tab:crono} detalla el cronograma por actividad con el mismo contenido del diagrama: responsables, sprint, fechas de inicio y fin, y meses que abarca cada actividad. Las actividades de un mismo sprint comparten fechas porque se ejecutan en paralelo dentro de las tres semanas del sprint."),
    ...(() => {
      const SP = { 1: ["S1 (sem. 1–3)", "17-ago – 06-sep", "Agosto, septiembre"], 2: ["S2 (sem. 4–6)", "07-sep – 27-sep", "Septiembre"], 3: ["S3 (sem. 7–9)", "28-sep – 18-oct", "Septiembre, octubre"],
        4: ["S4 (sem. 10–12)", "19-oct – 08-nov", "Octubre, noviembre"], 5: ["S5 (sem. 13–15)", "09-nov – 29-nov", "Noviembre"], 6: ["S6 (sem. 16–18)", "30-nov – 20-dic", "Noviembre, diciembre"] };
      const A = [[1, "Análisis empresarial (AS-IS / TO-BE)", "J. Caso, A. Lujan"], [1, "Levantamiento de requisitos", "J. Caso"], [1, "Product Backlog, épicas e HU", "J. Caso, A. Lujan"],
        [2, "Wireframes de baja fidelidad", "J. Caso"], [2, "Mockups de alta fidelidad", "J. Caso, L. Matamoros"], [2, "Arquitectura y diseño de BD", "A. Lujan"],
        [3, "Módulo de Inventario", "L. Matamoros"], [3, "Módulo de Producción (BOM, lotes)", "L. Matamoros, J. Caso"], [3, "BD PostgreSQL, seguridad y roles", "A. Lujan"], [3, "Despliegue cloud v1 (Render)", "A. Lujan, L. Matamoros"],
        [4, "Dashboard gerencial y KPIs", "J. Caso, L. Matamoros"], [4, "Reportes y exportaciones", "L. Matamoros"], [4, "Alertas WhatsApp / correo", "A. Lujan, L. Matamoros"],
        [5, "Módulo IA (pronóstico)", "L. Matamoros"], [5, "Integración de módulos", "A. Lujan"], [5, "Pruebas funcionales y correcciones", "Todo el equipo"],
        [6, "Optimización y seguridad final", "A. Lujan"], [6, "Documentación técnica", "J. Caso"], [6, "Presentación final y demo", "Todo el equipo"]];
      return table(["Actividad", "Responsable(s)", "Sprint (semanas)", "Inicio – fin", "Mes(es)"],
        A.map(([s, a, r]) => [a, r, SP[s][0], SP[s][1], SP[s][2]]),
        { id: "crono", title: "Cronograma por actividad", widths: [29, 20, 16, 17, 18], size: 18, source: "Elaboración propia; coincide con el diagrama de Gantt." });
    })(),
    P(`La capacidad total es de ${HORAS} horas-equipo: tres integrantes con aproximadamente 10 horas por semana (30 h semanales) durante 18 semanas. Cada sprint de tres semanas dispone, por tanto, de ${CAP} horas. A la fecha de corte el equipo se encuentra en la semana 8, en el día 9 de los 21 del Sprint 3.`),

    // =====================================================================================================
    H2("2.4 Planificación ágil – Sprint Planning"),
    P(`En cada Sprint Planning el equipo define la meta del sprint, selecciona del Product Backlog las historias que caben en la capacidad de ${CAP} horas y las descompone en tareas. Las historias se estiman en **puntos de historia** con la secuencia de Fibonacci (1, 2, 3, 5, 8), considerando complejidad, incertidumbre y esfuerzo; los puntos no equivalen linealmente a horas. La {tab:planning} resume los seis sprints. Los sprints S1, S2 y S6 se dedican a análisis, diseño, optimización y documentación, trabajo técnico que no se estima en puntos de historia; por eso no figuran historias en ellos.`),
    ...table(["Sprint (fechas)", "Meta del sprint", "HU incluidas", "Puntos", "Capacidad"], [
      ["S1 (17-ago – 06-sep)", "Comprender el negocio y definir qué construir: AS-IS/TO-BE, requisitos y Product Backlog.", "— (especificación de las 19 HU)", "—", `${CAP} h`],
      ["S2 (07-sep – 27-sep)", "Diseñar la solución: wireframes, mockups, arquitectura y modelo de BD.", "—", "—", `${CAP} h`],
      ["S3 (28-sep – 18-oct)", "Entregar la v1 operativa: inventario y producción con BOM, BD PostgreSQL con seguridad y roles, y despliegue cloud.", huS(3).join(", "), String(ptsS(3)), `${CAP} h`],
      ["S4 (19-oct – 08-nov)", "Completar la comunicación y el seguimiento gerencial: alertas por WhatsApp y correo, reportes exportables y dashboard ampliado.", huS(4).join(", "), String(ptsS(4)), `${CAP} h`],
      ["S5 (09-nov – 29-nov)", "Afinar el módulo de IA con datos reales, integrar los módulos y corregir mediante pruebas funcionales.", huS(5).join(", "), String(ptsS(5)), `${CAP} h`],
      ["S6 (30-nov – 20-dic)", "Cerrar el producto: optimización y seguridad final, documentación técnica, presentación y demo.", "— (tareas técnicas)", "—", `${CAP} h`],
      ["**Total**", "", `19 HU`, `**${PTS_TOTAL}**`, `**${HORAS} h**`],
    ], { id: "planning", title: "Planificación de los seis sprints", widths: [17, 41, 20, 8, 14], size: 18, align: [null, null, null, CT, CT],
         source: "Elaboración propia a partir del Product Backlog (apartado 2.7)." }),
    note(`**Lectura de la carga.** El Sprint 3 concentra ${ptsS(3)} de los ${PTS_TOTAL} puntos porque agrupa la base técnica del sistema (datos, seguridad, inventario y producción). Los Sprints 4 y 5 incluyen historias de integración y ampliación, y las horas restantes se dedican a pruebas y correcciones. La velocidad real del equipo (puntos completados por sprint) se calculará al cerrar el Sprint 3 y se usará para ajustar la carga de los Sprints 4 y 5.`, { fill: "FFF4CC" }),
    spacer(80),
    P(`El detalle del **Sprint 3** (en curso), con sus tareas, responsables y horas estimadas, se presenta en la {tab:s3backlog}. Las horas son las estimadas en la planificación (suman ${CAP} h) y no horas registradas.`),
    ...(() => {
      const T = [
        ["T3.1", "Esquema PostgreSQL: tablas, trigger de stock, vistas y datos semilla", "A. Lujan", 8, "RNF03", "Hecho"],
        ["T3.2", "Patrón Repository y transacciones (unit of work)", "L. Matamoros", 8, "RNF05", "Hecho"],
        ["T3.3", "Módulo de inventario: movimientos, semáforo, historial y alertas", "L. Matamoros", 12, "HU01–HU04", "Hecho"],
        ["T3.4", "Módulo de producción: recetas, órdenes y descuento por BOM", "L. Matamoros, J. Caso", 12, "HU05–HU07", "Hecho"],
        ["T3.5", "Autenticación, RBAC, gestión de usuarios y auditoría", "A. Lujan", 12, "HU08–HU11", "Hecho"],
        ["T3.6", "Pruebas automáticas (pytest) e integración continua", "J. Caso, A. Lujan", 5, "RNF05", "Hecho"],
        ["T3.7", "Optimización de rendimiento web (WPO)", "L. Matamoros", 4, "RNF02", "Hecho"],
        ["T3.8", "Replicación y respaldo de la base de datos", "A. Lujan", 6, "HU19", "Hecho"],
        ["T3.9", "Despliegue cloud v1 en Render", "A. Lujan, L. Matamoros", 7, "HU18", "En progreso"],
        ["T3.10", "Informe y presentación APF2", "Todo el equipo", 12, "—", "En progreso"],
        ["T3.11", "Retrospectiva del Sprint 3", "Todo el equipo", 2, "—", "Por hacer"],
        ["T3.12", "Cierre del Sprint 3 (Sprint Review)", "Todo el equipo", 2, "—", "Por hacer"],
      ];
      const tot = T.reduce((a, r) => a + r[3], 0);
      if (tot !== CAP) throw new Error("Sprint 3 no suma la capacidad: " + tot);
      return table(["ID", "Tarea", "Responsable(s)", "Horas est.", "HU / RNF", "Estado"],
        [...T.map((r) => [r[0], r[1], r[2], String(r[3]), r[4], r[5]]), ["", "**Total estimado**", "", `**${tot}**`, "", ""]],
        { id: "s3backlog", title: "Sprint Backlog del Sprint 3 (estado al 06-oct-2026)", widths: [7, 36, 20, 9, 14, 14], size: 18, align: [CT, null, null, CT, CT, CT],
          source: "Elaboración propia; horas estimadas en la planificación." });
    })(),

    // =====================================================================================================
    H2("2.5 Roles y artefactos Scrum"),
    P("El equipo aplica Scrum con tres integrantes. Los roles Scrum se reparten entre ellos, pero los tres también programan, documentan y prueban, de modo que el rol Scrum es una responsabilidad adicional y no sustituye el trabajo técnico. La {tab:roles_scrum} describe la distribución."),
    ...table(["Rol", "Integrante", "Responsabilidades Scrum", "Aporte técnico principal"], [
      ["Product Owner (PO)", "Jeaneli Rosmery Caso Valenzuela", "Gestiona y prioriza el Product Backlog; redacta las historias y sus criterios de aceptación; representa a la empresa ante el equipo; acepta o rechaza los incrementos.", "Análisis, requisitos, wireframes y mockups; módulo de producción; documentación técnica."],
      ["Scrum Master (SM)", "Arnold Steven Lujan Aderiano", "Facilita las ceremonias; elimina impedimentos; vela por que el equipo siga el marco y se cumplan la Definition of Ready y la Definition of Done.", "Arquitectura, base de datos, seguridad y roles; despliegue; optimización."],
      ["Desarrollador (Dev)", "Luis Facundo Matamoros Ylizarbe", "Estima y construye los incrementos; participa en las ceremonias; garantiza la calidad técnica del código.", "Módulos de inventario y de IA; patrón Repository; rendimiento web; alertas y reportes."],
    ], { id: "roles_scrum", title: "Roles Scrum del equipo", widths: [16, 20, 38, 26], size: 18, source: "Elaboración propia." }),
    P("Los artefactos de Scrum que utiliza el equipo, con su responsable y su evidencia en este informe, aparecen en la {tab:artefactos}."),
    ...table(["Artefacto", "Descripción", "Responsable", "Evidencia"], [
      ["Product Backlog", "Lista ordenada de épicas e historias de usuario con prioridad MoSCoW, puntos y sprint.", "Product Owner", "Apartado 2.7"],
      ["Sprint Backlog", "Historias del sprint descompuestas en tareas con responsable y horas estimadas.", "Equipo", "{tab:s3backlog}"],
      ["Incremento", "Versión del sistema que cumple la Definition of Done al cierre del sprint.", "Equipo", "Capítulos 7 a 10"],
      ["Tablero Kanban", "Estado de las tarjetas de cada sprint (Por hacer, En progreso, Hecho).", "Scrum Master", "Apartado 2.6"],
    ], { id: "artefactos", title: "Artefactos Scrum", widths: [18, 46, 17, 19], size: 18, source: "Elaboración propia." }),
    P("Las ceremonias se adaptaron a la disponibilidad de un equipo de estudiantes (unas 10 horas semanales por integrante). La {tab:ceremonias} indica su frecuencia y duración; son acuerdos del equipo."),
    ...table(["Ceremonia", "Frecuencia", "Duración", "Propósito"], [
      ["Sprint Planning", "Inicio de cada sprint", "2 h", "Definir la meta, seleccionar historias y descomponerlas en tareas."],
      ["Daily Scrum", "Tres veces por semana", "15 min", "Sincronizar avances, plan inmediato e impedimentos."],
      ["Refinamiento del backlog", "Semanal", "1 h", "Aclarar, estimar y ordenar historias futuras."],
      ["Sprint Review", "Fin de cada sprint", "1 h", "Demostrar el incremento y recoger retroalimentación."],
      ["Sprint Retrospective", "Fin de cada sprint", "1 h", "Identificar mejoras del proceso para el sprint siguiente."],
    ], { id: "ceremonias", title: "Ceremonias Scrum", widths: [22, 22, 12, 44], size: 18, align: [null, null, CT, null], source: "Elaboración propia." }),
    P("Una historia ingresa a un sprint solo si cumple la **Definition of Ready** (DoR) y se considera terminada solo si cumple la **Definition of Done** (DoD). Ambas se muestran en la {tab:dor_dod}."),
    ...table(["Definition of Ready (para entrar al sprint)", "Definition of Done (para considerarla terminada)"], [
      [["• Historia redactada como «Como… quiero… para…».", "• Criterios de aceptación Dado/Cuando/Entonces definidos.", "• Prioridad MoSCoW y puntos estimados.", "• Dependencias identificadas (datos, accesos, terceros).", "• Cabe en la capacidad del sprint."],
       ["• Código integrado en el repositorio y revisado.", "• Pruebas automáticas aprobadas y sin fallos en la integración continua.", "• Criterios de aceptación verificados.", "• Reglas de seguridad aplicadas (roles, validación de datos).", "• Documentación actualizada y demostrada en la Sprint Review."]],
    ], { id: "dor_dod", title: "Definition of Ready y Definition of Done", widths: [50, 50], size: 18, zebra: false, source: "Elaboración propia." }),

    // =====================================================================================================
    H2("2.6 Tablero Kanban/Scrum"),
    P("El equipo gestiona el avance con un tablero Kanban por sprint de tres columnas: **Por hacer**, **En progreso** y **Hecho**. Cada tarjeta corresponde a una actividad del sprint, incluidas las ceremonias de cierre. Una tarjeta pasa a «Hecho» solo cuando cumple la Definition of Done; en particular, la retrospectiva y el cierre (Sprint Review) de un sprint solo pasan a «Hecho» cuando la ceremonia se ha realizado. Se limita el trabajo en progreso a tres tarjetas por vez. Las tablas siguientes muestran el estado al **06-oct-2026**."),
    P("Los Sprints 1 y 2 están completados; por ello todas sus tarjetas, incluidas su retrospectiva y su cierre, se encuentran en «Hecho»."),
    ...kbTable(1, "completado"),
    ...kbTable(2, "completado"),
    P("El Sprint 3 está **en curso** (día 9 de 21; termina el 18-oct). La base de datos con su esquema, el patrón Repository, la autenticación con roles, las pruebas, la optimización web, la replicación y el respaldo están terminados. El despliegue en Render y el informe y la presentación del APF2 están en progreso. La **retrospectiva y el cierre del Sprint 3 (Sprint Review) permanecen en «Por hacer»** porque se realizarán al finalizar el sprint."),
    ...kbTable(3, "en curso"),
    P("Los Sprints 4, 5 y 6 aún no comienzan: todas sus tarjetas, incluidas la retrospectiva y el cierre de cada uno, están en «Por hacer»."),
    ...kbTable(4, "por iniciar"), ...kbTable(5, "por iniciar"), ...kbTable(6, "por iniciar"),
    P("La {tab:kb_global} consolida el conteo de tarjetas por columna y el porcentaje de avance, calculado como tarjetas en «Hecho» sobre el total de tarjetas de cada sprint. Es una medida del avance de las actividades, no del esfuerzo en horas."),
    ...table(["Sprint", "Por hacer", "En progreso", "Hecho", "Total", "Avance"],
      [...[1, 2, 3, 4, 5, 6].map((s) => ["S" + s + (s === 3 ? " (en curso)" : ""), String(cnt(s, 0)), String(cnt(s, 1)), String(cnt(s, 2)), String(KB[s].cards.length), pct(cnt(s, 2), KB[s].cards.length)]),
        ["**Total**", `**${cntT(0)}**`, `**${cntT(1)}**`, `**${cntT(2)}**`, `**${cntT(0) + cntT(1) + cntT(2)}**`, `**${pct(cntT(2), cntT(0) + cntT(1) + cntT(2))}**`]],
      { id: "kb_global", title: "Kanban global: tarjetas por columna y avance por sprint", widths: [22, 14, 16, 14, 14, 20], size: 19, align: [null, CT, CT, CT, CT, CT],
        source: "Elaboración propia; estado al 06-oct-2026 (semana 8 de 18)." }),

    // =====================================================================================================
    H2("2.7 Product Backlog"),
    P("El Product Backlog reúne las siete épicas del proyecto y las 19 historias de usuario que las componen. La {tab:backlog_epicas} presenta las épicas con su objetivo, las historias que agrupan, los requerimientos relacionados y los puntos."),
    ...table(["Épica", "Objetivo", "HU", "Puntos", "Requerimientos"],
      [...EPICAS.map((e) => [`E${e.n}. ${e.t}`, e.obj, huE(e.n).map((h) => h.id).join(", "), String(pts(huE(e.n))), e.rf]),
        ["**Total**", "", "19 HU", `**${PTS_TOTAL}**`, ""]],
      { id: "backlog_epicas", title: "Épicas del Product Backlog", widths: [20, 40, 14, 9, 17], size: 18, align: [null, null, null, CT, null], source: "Elaboración propia." }),
    P("La {tab:backlog_hu} lista las historias con su épica, prioridad según MoSCoW (Must: indispensable; Should: importante; Could: deseable), puntos de historia, sprint asignado y estado a la fecha de corte. «Parcial» indica que existe una base en la v1 y que el sprint asignado la completa."),
    ...table(["ID", "Historia (épica)", "MoSCoW", "Puntos", "Sprint", "Estado"],
      HU.map((h) => [h.id, [`**E${h.e}.** ${h.t}`], h.m, String(h.p), "S" + h.s, h.est]),
      { id: "backlog_hu", title: "Product Backlog: historias de usuario priorizadas", widths: [8, 42, 11, 9, 9, 21], size: 18, align: [CT, null, CT, CT, CT, CT],
        source: "Elaboración propia. Estado al 06-oct-2026." }),
    P("Las funciones fuera del alcance (aplicación móvil nativa, SMS, integración con facturación y módulo de ventas) se registran como «Won't have» para esta versión. Los requerimientos funcionales y no funcionales se asocian a las historias como indica la {tab:rf_map}; los pruebas de validación del capítulo 10 usan estos mismos identificadores."),
    ...table(["Requerimiento", "Descripción", "HU", "Estado v1"], [
      ["RF01", "Registrar movimientos de inventario (INGRESO, SALIDA, AJUSTE)", "HU01", "Implementado"],
      ["RF02", "Consultar stock con semáforo e historial", "HU02, HU03", "Implementado"],
      ["RF03", "Alertas de stock mínimo en el sistema", "HU04", "Implementado"],
      ["RF04", "Crear y completar órdenes con BOM y descuento de insumos", "HU05–HU07", "Implementado"],
      ["RF05", "Autenticación segura", "HU08", "Implementado"],
      ["RF06", "Autorización por roles", "HU09", "Implementado"],
      ["RF07", "Gestión de usuarios", "HU10", "Implementado"],
      ["RF08", "Bitácora de auditoría", "HU11", "Implementado"],
      ["RF09", "Pronóstico de demanda con IA", "HU12, HU13", "Base v1; S5"],
      ["RF10", "Dashboard de KPIs por rol", "HU16", "Implementado (base); ampliación en S4"],
      ["RF11", "Exportar reportes", "HU17", "Planificado (S4)"],
      ["RF12", "Alertas por WhatsApp y correo", "HU14, HU15", "Planificado (S4)"],
      ["RNF01–RNF06", "Seguridad; rendimiento; disponibilidad y respaldo; usabilidad; mantenibilidad; portabilidad y despliegue", "HU08–HU11, HU18, HU19", "Implementados en v1"],
    ], { id: "rf_map", title: "Requerimientos asociados a las historias de usuario", widths: [14, 46, 18, 22], size: 18, source: "Elaboración propia." }),

    // =====================================================================================================
    H2("2.8 Historias de usuario"),
    P("Cada historia se redacta en el formato «Como… quiero… para…» y se acompaña de criterios de aceptación en formato **Dado / Cuando / Entonces**, que son la base de las pruebas de validación. Las historias se agrupan por épica. La prioridad sigue la clasificación MoSCoW y los puntos son estimaciones en la secuencia de Fibonacci."),
    ...EPICAS.flatMap((e) => {
      const hs = huE(e.n);
      const intro = e.n === 5
        ? P("La épica E5 se define a partir del análisis del medio de comunicación más viable que se presenta al final de este apartado. Las historias HU14 y HU15 ya incorporan sus conclusiones.")
        : P(`Épica E${e.n}: ${e.obj}`);
      return [H3(`E${e.n}. ${e.t}`), intro,
        ...table(["HU", "Historia de usuario", "Criterios de aceptación", "Prioridad", "Pts"],
          hs.map((h) => [h.id, h.h, h.c, h.m, String(h.p)]),
          { id: "hu_e" + e.n, title: `Historias de usuario de la épica E${e.n}: ${e.t}`, widths: [7, 24, 53, 10, 6], size: 17, hsize: 18, align: [CT, null, null, CT, CT],
            source: "Elaboración propia a partir del Product Backlog." })];
    }),

    H3("Análisis del medio de comunicación más viable para las alertas"),
    P("En el APF1 la docente observó que las épicas y las historias de alertas no justificaban el medio por el que se comunicaría el personal. Para resolverlo, el equipo comparó cuatro medios candidatos con una matriz de criterios ponderados. Los criterios y sus pesos se eligieron según las necesidades de una planta pequeña peruana: la **adopción** (qué tan usado es el medio por el personal) pesa más porque una alerta que nadie lee carece de valor; el **costo** y el **esfuerzo de integración** pesan por la limitación de tiempo y presupuesto; y la **dependencia de terceros** pesa menos pero es relevante por el riesgo R9 (integración fallida con WhatsApp Business API)."),
    ...(() => {
      const crit = [["Adopción en planta peruana", 25, [5, 2, 4, 1]], ["Costo", 20, [3, 5, 2, 2]], ["Inmediatez", 15, [5, 2, 5, 5]], ["Trazabilidad (estado de entrega)", 15, [4, 4, 3, 3]],
        ["Esfuerzo de integración", 15, [3, 5, 3, 1]], ["Dependencia de terceros (5 = baja)", 10, [2, 4, 2, 3]]];
      const tot = [0, 1, 2, 3].map((j) => crit.reduce((a, c) => a + c[1] * c[2][j], 0) / 100);
      const best = tot.indexOf(Math.max(...tot));
      if (best !== 0) throw new Error("WhatsApp debe ser el mejor");
      return [P("La {tab:comunic} muestra las calificaciones de 1 (desfavorable) a 5 (favorable) y el puntaje ponderado. Las calificaciones son un **juicio del equipo** basado en el contexto del proyecto y en la documentación de cada medio; no provienen de una medición en campo y se validarán con el personal de Vástago & Co. Los costos específicos (tarifa por mensaje de WhatsApp o de SMS) deben confirmarse con la tarifa vigente del proveedor, por lo que no se consignan montos."),
        ...table(["Criterio", "Peso", "WhatsApp Business", "Correo", "SMS", "Push / app móvil"],
          [...crit.map((c) => [c[0], c[1] + " %", ...c[2].map(String)]), ["**Puntaje ponderado (máx. 5)**", "**100 %**", ...tot.map((v) => "**" + v.toFixed(2) + "**")]],
          { id: "comunic", title: "Comparación ponderada de medios de comunicación para alertas", widths: [31, 9, 17, 14, 12, 17], size: 18, align: [null, CT, CT, CT, CT, CT],
            source: "Elaboración propia; calificaciones del equipo (1 a 5). Costos por mensaje a confirmar con los proveedores." })];
    })(),
    P("**Conclusión.** WhatsApp Business obtiene el mayor puntaje, principalmente por su adopción y su inmediatez entre el personal de planta, y se adopta como **canal principal** (HU14). El correo electrónico, aunque menos inmediato y menos leído en planta, es el más barato y sencillo de integrar y deja un respaldo documental; se adopta como **canal secundario** (HU15). El SMS se descarta por costo por mensaje y por no aportar ventajas sobre WhatsApp, y la notificación push o app móvil se descarta porque el proyecto no contempla una aplicación móvil. La diferencia de puntaje entre WhatsApp y correo es moderada, y la principal debilidad de WhatsApp (dependencia de la plataforma y aprobación de plantillas) justifica mantener el correo como respaldo automático."),
    P("El análisis modificó el Product Backlog como indica la {tab:comunic_cambios}: la épica E5 deja de ser una promesa genérica de «notificaciones» y pasa a tener un canal principal, un canal de respaldo y reglas de contingencia."),
    ...table(["Elemento", "Antes (APF1)", "Ahora (APF2)"], [
      ["Épica E5", "Alertas y notificaciones sin canal definido.", "Alertas con canal principal (WhatsApp Business) y de respaldo (correo); SMS y push descartados con justificación."],
      ["HU14", "Alerta de quiebre inminente, sin medio especificado.", "Alerta por WhatsApp Business con plantilla, estado de entrega registrado y recuperación por correo si el envío falla (criterios en E5)."],
      ["HU15", "Notificación genérica.", "Resumen por correo de los insumos críticos, como respaldo documental; prioridad Could."],
      ["Riesgos", "Sin riesgo específico del canal.", "R9 (integración fallida con WhatsApp Business API) con el correo como mitigación."],
    ], { id: "comunic_cambios", title: "Efecto del análisis de medios sobre HU14, HU15 y la épica E5", widths: [14, 36, 50], size: 18, boldFirst: true, source: "Elaboración propia." }),
  ];
};
