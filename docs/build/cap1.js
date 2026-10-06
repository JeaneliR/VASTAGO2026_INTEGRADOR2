// Capítulo 1 — Análisis Empresarial
module.exports = (g) => {
  const { H1, H2, H3, P, bullets, numbered, fig, table, note, spacer, AlignmentType } = g;
  const CT = AlignmentType.CENTER;

  // ---------- datos del sector (CIEN-ADEX, 2025) — participaciones recalculadas para verificar coherencia
  const tot = 1249.8, grano = 778.8, manteca = 272.8, choco = 35.1;
  const otros = Math.round((tot - grano - manteca - choco) * 10) / 10;           // por diferencia
  const pct = (v) => (Math.round(v / tot * 1000) / 10).toFixed(1) + " %";
  const m1 = (v) => v.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(",", "\u00A0");

  return [
    H1("1. Análisis Empresarial"),

    // =====================================================================================================
    H2("1.1 Introducción"),
    P("Este informe presenta el segundo avance (APF2) del proyecto **Sistema Web Inteligente para la Gestión de Producción e Inventarios en una Empresa Chocolatera mediante Analítica Predictiva e IA**, desarrollado para Vástago & Co en el curso Integrador 2 de la UTP. El capítulo inicial recoge el análisis empresarial que sustenta el proyecto: el contexto del sector, la problemática que se pretende resolver, el modelo de negocio, el proceso actual (AS-IS) y el proceso propuesto (TO-BE). Esta versión reformula la problemática planteada en el primer avance, atendiendo la observación de la docente de mejorarla, y la apoya en un diagnóstico por síntomas, causas y consecuencias, en lugar de una enunciación general."),

    H3("Contexto del sector chocolatero peruano"),
    P("El Perú es un productor reconocido de cacao fino y de aroma, y su oferta exportable ha crecido de forma notable: según el Centro de Inteligencia de Negocios de ADEX, las ventas internacionales de cacao y derivados alcanzaron US$ 1 249.8 millones en 2024 (CIEN-ADEX, 2025). Ese crecimiento abre una oportunidad para las empresas que transforman el grano en productos de mayor valor, como las chocolaterías artesanales: marcas pequeñas que compran cacao fino y lo convierten en barras, bombones y cobertura."),
    P("Para esas empresas la ventaja no depende solo de la calidad del grano, sino de la consistencia con que cumplen pedidos y de la eficiencia con que transforman un insumo costoso (cacao, manteca de cacao, empaques) en producto terminado. Cada quiebre de un insumo clave detiene una línea de producción y cada merma no explicada reduce un margen ya estrecho. La gestión de inventarios y de la producción deja de ser, por tanto, una tarea administrativa para convertirse en un factor competitivo."),

    H3("Problemática de Vástago & Co"),
    P("Vástago & Co es una chocolatería artesanal peruana de pequeña escala (entre 15 y 20 trabajadores entre planta, almacén y administración). Su operación depende de un conjunto reducido de insumos críticos, entre ellos cacao en grano, manteca de cacao, azúcar, leche en polvo y material de empaque, cuyo agotamiento interrumpe la producción. A partir del levantamiento realizado en el Sprint 1 y del proceso modelado en la {fig:asis}, el equipo identifica cinco síntomas que se refuerzan entre sí:"),
    ...numbered([
      "**Quiebres de stock de insumos clave.** El nivel de existencias se verifica mediante un conteo físico semanal. Entre un conteo y el siguiente la empresa carece de visibilidad: un insumo puede agotarse a mitad de semana sin que nadie lo advierta hasta que el jefe de producción intenta preparar un lote. La respuesta habitual es una compra urgente, con sobrecosto, o la postergación del lote.",
      "**Producción planificada «por experiencia».** Los lotes se programan según la intuición del personal más antiguo y no según una proyección de demanda. En un negocio con temporadas de alta venta (por ejemplo, las campañas de fin de año) esto genera, alternadamente, faltante de producto terminado y sobreproducción con riesgo de vencimiento.",
      "**Mermas sin trazabilidad.** La merma se anota al final del día, sin vincularla a un lote, una receta o un responsable. La empresa puede saber que perdió insumo, pero no dónde, cuándo ni por qué, de modo que no puede corregir la causa.",
      "**Registros manuales y dispersos.** Las recepciones se anotan en un cuaderno o en hojas de cálculo, las recetas viven en papel y las compras se coordinan por llamada o mensajería personal. No existe una fuente única de información, y cada transcripción manual es una oportunidad de error.",
      "**Ausencia de alertas y de responsables.** Nada avisa cuando un insumo cae por debajo de su mínimo ni queda registro de quién movió qué insumo. La gerencia se entera de los problemas en la reunión mensual, cuando ya produjeron su costo."
    ]),
    P("Un rasgo importante de esta problemática es que la propia empresa no puede cuantificarla con precisión: al no existir registros estructurados, no se dispone de una línea base confiable de quiebres por mes, porcentaje de merma por lote u horas dedicadas al conteo. Esta ausencia de datos no es un detalle metodológico sino parte del problema; por ello, uno de los primeros resultados del sistema es generar esa información, y las metas de reducción se expresan respecto de una línea base que se medirá durante el piloto (**dato a levantar con la empresa**)."),

    H3("Análisis de causas y consecuencias"),
    P("El árbol de problemas de la {fig:arbol} organiza el diagnóstico: el problema central es que la gestión de insumos y producción de Vástago & Co se realiza sin información oportuna, trazable ni predictiva. Sus causas son cuatro condiciones de origen (registros manuales, recetas y conteos en papel, ausencia de histórico estructurado y ausencia de alertas y responsables) y sus efectos recaen sobre el costo, el cumplimiento, la merma y la calidad de las decisiones."),
    ...fig("assets/arbol_problemas.png", "Árbol de problemas de la gestión de insumos y producción en Vástago & Co", { id: "arbol", width: 600,
      desc: "Las cuatro causas de la parte inferior alimentan el problema central; de este se derivan los cuatro efectos de la parte superior.",
      source: "Elaboración propia a partir del levantamiento del Sprint 1." }),
    P("La {tab:pce} traduce ese árbol a una matriz que vincula cada síntoma con su causa raíz, su consecuencia, el indicador con que se medirá y la respuesta concreta del proyecto. La columna final es la que conecta el diagnóstico con el producto: cada síntoma tiene al menos una historia de usuario o requerimiento que lo atiende."),
    ...table(["Síntoma observado", "Causa raíz", "Efecto / impacto en el negocio", "Indicador de seguimiento", "Respuesta del proyecto"], [
      ["Quiebres de stock", "Conteo semanal manual; sin stock en tiempo real ni alertas", "Compras urgentes con sobrecosto; lotes postergados", "Quiebres de stock por mes", "HU02, HU04, HU14 (RF02, RF03, RF12)"],
      ["Producción «por experiencia»", "Sin histórico estructurado ni pronóstico", "Sobreproducción o faltante de producto terminado", "MAPE del pronóstico; cumplimiento de órdenes", "HU12, HU13 (RF09)"],
      ["Merma sin trazabilidad", "Merma anotada al cierre del día, sin lote ni responsable", "Pérdidas no explicadas; sin acción correctiva", "Merma de producción (%)", "HU05–HU07, HU11 (RF04, RF08)"],
      ["Registros manuales y dispersos", "Cuaderno, hojas de cálculo y recetas en papel", "Errores de transcripción; información desactualizada", "Movimientos registrados con usuario y motivo (%)", "HU01, HU03, HU07 (RF01, RF04)"],
      ["Sin alertas ni responsables", "Falta de control de acceso y bitácora; reuniones mensuales", "Decisiones tardías; sin rendición de cuentas", "Eventos auditados; tiempo hasta la alerta", "HU08–HU11, HU16 (RF05–RF08, RF10)"],
    ], { id: "pce", title: "Matriz síntoma–causa–efecto–indicador–respuesta", widths: [17, 22, 21, 20, 20], size: 18,
         source: "Elaboración propia." }),

    H3("Formulación del problema"),
    P("A partir del diagnóstico, el equipo formula la siguiente pregunta de investigación: **¿en qué medida un sistema web que integra el control de inventario, las órdenes de producción con receta (BOM) y un pronóstico de demanda basado en aprendizaje automático puede mejorar la trazabilidad de los insumos y la planificación de la producción de una chocolatería artesanal como Vástago & Co, reduciendo los quiebres de stock y las mermas no explicadas?**"),
    P("De la pregunta general se derivan tres preguntas específicas: (a) ¿cómo se realiza hoy el flujo de insumos y producción y dónde se originan los quiebres y las mermas?; (b) ¿qué requerimientos funcionales y no funcionales debe satisfacer un sistema que corrija esas brechas con los recursos de un equipo de tres personas y 540 horas?; y (c) ¿qué nivel de precisión alcanza un modelo de pronóstico simple, apropiado para un volumen de datos pequeño, y con qué canal se comunican las alertas para que el personal de planta realmente las reciba?"),

    H3("Objetivos"),
    P("**Objetivo general.** Desarrollar e implementar, entre el 17 de agosto y el 20 de diciembre de 2026 (18 semanas, seis sprints, 540 horas-equipo), un sistema web seguro que integre el control de inventario de insumos, la gestión de órdenes de producción con receta y el pronóstico de demanda a tres meses por producto, de modo que Vástago & Co disponga de stock en tiempo real, trazabilidad de cada movimiento y alertas oportunas para decidir qué producir y qué comprar."),
    P("Los objetivos específicos se formularon con criterios SMART: cada uno tiene un indicador medible, una meta, un plazo ligado al calendario de sprints y un estado verificable a la fecha de este informe (06-oct-2026), según la {tab:objetivos}."),
    ...table(["Objetivo específico", "Indicador y meta", "Plazo", "Estado a la fecha"], [
      ["OE1. Modelar el proceso actual y el propuesto, y levantar requisitos", "AS-IS y TO-BE modelados; 19 historias de usuario, 12 RF y 6 RNF aprobados en el Product Backlog", "Sprint 1 (06-sep)", "Cumplido (APF1)"],
      ["OE2. Implementar el módulo de inventario y producción con receta (BOM)", "100 % de los movimientos con usuario, fecha, tipo y motivo; descuento automático de insumos al completar la orden", "Sprint 3 (18-oct)", "Implementado en la v1; verificado con pruebas automáticas"],
      ["OE3. Garantizar seguridad, control de acceso y continuidad de datos", "4 roles con permisos; autenticación con bloqueo por intentos; auditoría inmutable; replicación y respaldo con RPO ≤ 24 h", "Sprint 3 (18-oct)", "Implementado; 24 pruebas automáticas aprobadas"],
      ["OE4. Entregar un pronóstico de demanda a 3 meses por producto", "MAPE ≤ 10 % por producto sobre los últimos 4 meses de validación", "Sprint 5 (29-nov)", "Base v1: MAPE de 2.1 %, 4.5 % y 7.0 % sobre el dataset de demostración; afinado en S5"],
      ["OE5. Comunicar alertas de stock mínimo por el canal más viable", "Alerta enviada en ≤ 5 min tras cruzar el mínimo, con estado de entrega registrado", "Sprint 4 (08-nov)", "Canal elegido (apartado 2.8); integración por hacer"],
      ["OE6. Desplegar el sistema en la nube con buen rendimiento", "Carga inicial < 1 s en red limitada simulada; disponibilidad objetivo 99 % mensual", "Sprint 3 al 6 (20-dic)", "Carga medida de 449 ms (local, red limitada); URL en la nube pendiente"],
    ], { id: "objetivos", title: "Objetivos específicos del proyecto con criterios SMART", widths: [26, 34, 13, 27], size: 18,
         source: "Elaboración propia; mediciones de ml-service/forecast_output.json y evidencias/wpo/wpo_metricas.json." }),
    note("**Nota sobre los datos del pronóstico.** Los valores de MAPE de OE4 se obtienen de un histórico de demanda de 24 meses (2024–2025) generado por el equipo como dataset de demostración, con tendencia y estacionalidad plausibles, porque la empresa aún no entrega su histórico real. Por ello esas cifras demuestran el funcionamiento del modelo, no su precisión sobre la demanda real de Vástago & Co; la recalibración con datos reales es un compromiso del Sprint 5 (**dato a confirmar con la empresa**).", { fill: "FFF4CC" }),
    spacer(80),

    H3("Justificación"),
    P("**Justificación económica y operativa.** Para una empresa pequeña, el costo de un quiebre o de una merma no explicada es proporcionalmente mayor que para una grande, porque no cuenta con holgura financiera para absorber compras de emergencia ni lotes perdidos. Un sistema que alerta antes del agotamiento, que muestra cuánto insumo exigirá una orden antes de iniciarla y que registra el consumo real ataca directamente esos costos. La inversión referencial del proyecto (apartado 2.4 y presupuesto del apartado 2.1) es modesta frente al tipo de pérdidas que busca evitar, y la infraestructura en la nube permite operar sin servidores propios."),
    P("**Justificación técnica.** La arquitectura elegida (aplicación web monolítica modular con PostgreSQL, patrón Repository y un servicio de pronóstico independiente) es suficiente para el volumen de la empresa, mantenible por un equipo pequeño y portable mediante contenedores. El pronóstico se apoya en un modelo de regresión con componente estacional, adecuado cuando se dispone de pocas series y pocos puntos, y explicable al personal no técnico, a diferencia de modelos más complejos que exigirían volúmenes de datos que la empresa no tiene."),
    P("**Justificación social y académica.** Digitalizar los registros de una chocolatería artesanal formaliza conocimiento que hoy reside en la experiencia de unas pocas personas y reduce la dependencia de ellas. Para el equipo, el proyecto integra competencias de las asignaturas de la carrera (metodologías ágiles, bases de datos, seguridad, analítica de datos y despliegue en la nube) en un producto con un cliente real y evaluable de principio a fin."),

    // =====================================================================================================
    H2("1.2 Descripción de la empresa"),
    P("Vástago & Co es una empresa chocolatera artesanal peruana, inscrita con RUC 20613556240, dedicada a la elaboración de chocolate a partir de cacao fino de aroma: barras o tabletas, bombones y cobertura. Su proceso productivo parte de la compra de insumos (cacao, manteca de cacao, azúcar, leche en polvo y material de empaque), continúa con la elaboración por lotes en planta y termina en la venta de producto terminado, principalmente por pedido. Su dotación aproximada es de 15 a 20 trabajadores repartidos entre planta de producción, almacén y administración."),
    P("En la operación se distinguen tres áreas que son también los actores del sistema: **Compras y Almacén**, responsable de adquirir, recibir y custodiar los insumos; **Producción**, que planifica y elabora los lotes con base en las recetas; y **Gerencia y Ventas**, que decide qué vender y qué producir y supervisa los resultados. Para el catálogo de demostración del sistema el equipo modeló tres productos representativos (Tableta 70 % Cacao 100 g, Bombones Caja x6 y Tableta de Regalo 150 g) y siete insumos maestros (cacao en grano, manteca de cacao, azúcar orgánica, leche en polvo, lecitina de soya y dos tipos de empaque), con sus recetas (BOM). Las existencias y costos cargados son datos de demostración y no cifras reales de la empresa."),
    ...table(["Campo", "Información"], [
      ["Razón o nombre comercial", "Vástago & Co"],
      ["RUC", "20613556240 (consignado por el equipo; verificar en la consulta RUC de SUNAT)"],
      ["Rubro", "Elaboración de chocolate artesanal: barras, bombones y cobertura, a partir de cacao fino de aroma"],
      ["Tamaño", "Pequeña empresa; aproximadamente 15 a 20 trabajadores en planta, almacén y administración"],
      ["Áreas operativas", "Compras y Almacén; Producción; Gerencia y Ventas"],
      ["Ubicación y domicilio fiscal", "Dato a confirmar con la empresa"],
      ["Fecha de constitución y régimen tributario", "Dato a confirmar con la empresa"],
      ["Representante / contraparte del proyecto", "Dato a confirmar con la empresa"],
      ["Situación tecnológica actual", "Registros en cuaderno y hojas de cálculo; recetas en papel; coordinación por llamada y mensajería; sin sistema de gestión de inventarios ni de producción"],
    ], { id: "empresa", title: "Ficha descriptiva de Vástago & Co", widths: [30, 70], size: 19, source: "Información proporcionada por la empresa y levantada por el equipo; los campos marcados requieren confirmación." }),

    H2("1.3 Visión"),
    P("«Ser reconocida en el Perú como una chocolatería artesanal de referencia por la calidad de su cacao fino y por la consistencia de su producción, apoyada en una gestión basada en datos que le permita crecer sin perder el carácter artesanal de sus productos.»"),
    P("Esta formulación fue elaborada por el equipo a partir de la información de la empresa y de su rubro; **queda sujeta a validación con la gerencia de Vástago & Co** antes de la versión final del informe. Su relación con el proyecto es directa: crecer manteniendo la consistencia exige conocer el inventario y la demanda con anticipación, que es lo que el sistema proporciona."),

    H2("1.4 Misión"),
    P("«Elaborar chocolate artesanal de alta calidad a partir de cacao fino de aroma peruano, cumpliendo oportunamente los pedidos de sus clientes mediante una producción planificada, trazable y con el menor desperdicio de insumos posible.»"),
    P("Como en el caso de la visión, el texto es una propuesta del equipo **pendiente de validación con la gerencia**. Los tres compromisos de la misión (oportunidad, trazabilidad y bajo desperdicio) se corresponden con los tres frentes del sistema: alertas y pronóstico, inventario con auditoría, y órdenes de producción con consumo calculado por receta."),

    // =====================================================================================================
    H2("1.5 Análisis de Negocio (Lean Canvas)"),
    P("Para analizar el modelo de negocio del proyecto se utilizó el Lean Canvas, una adaptación del Business Model Canvas orientada a problemas, soluciones y métricas, adecuada para validar una idea con recursos limitados. La {fig:lean} muestra el lienzo completo y la {tab:lean} describe cada uno de sus nueve bloques y su relación con el sistema construido."),
    ...fig("assets/lean_v.png", "Lean Canvas del Sistema Web Inteligente para Vástago & Co", { id: "lean", width: 610,
      desc: "Los nueve bloques del lienzo, numerados en el orden en que se analizan en la tabla siguiente.",
      source: "Elaboración propia." }),
    ...table(["Bloque", "Contenido", "Sustento y relación con el proyecto"], [
      ["1. Problema", "Quiebres de stock de insumos clave; producción «por experiencia»; mermas y vencimientos sin trazabilidad; registros manuales. Alternativas actuales: cuaderno, hojas de cálculo y llamadas.", "Síntomas diagnosticados en el apartado 1.1. Las soluciones genéricas existentes (ERP completos) suelen ser costosas para el tamaño de la empresa; el costo exacto de esas alternativas queda por validar."],
      ["2. Segmentos de clientes", "Chocolaterías artesanales y pequeñas fábricas de transformación; cliente piloto Vástago & Co; usuarios: producción, almacén y gerencia.", "Los cuatro roles del sistema (Administrador, Gerente, Jefe de producción, Almacenero) reflejan a los usuarios reales."],
      ["3. Propuesta de valor única", "Un solo sistema web que une inventario, producción y pronóstico de demanda con IA. Mensaje: «Sabe cuánto producir antes de quedarte sin cacao».", "Integra en una herramienta lo que hoy está repartido en cuaderno, hojas de cálculo y papel."],
      ["4. Solución", "Inventario con movimientos y alertas; órdenes de producción con receta (BOM); pronóstico de demanda (ML); dashboard de KPIs por rol.", "Módulos de la v1: RF01 a RF10. Las alertas por WhatsApp y correo (RF12) se completan en el Sprint 4."],
      ["5. Canales", "Aplicación web en la nube; alertas por WhatsApp y correo; capacitación en planta.", "El análisis comparativo de canales de comunicación (apartado 2.8) respalda esta elección."],
      ["6. Fuentes de ingreso", "Ahorro por menos mermas y quiebres; suscripción mensual a otras empresas del rubro; servicio de implementación y capacitación.", "En el alcance académico solo se evalúa el ahorro para Vástago & Co; la suscripción es una hipótesis de escalamiento sin validar."],
      ["7. Estructura de costos", "Desarrollo (540 h de equipo); hosting cloud y base de datos administrada; capacitación del personal; soporte y mantenimiento.", "Cuantificados en el presupuesto referencial del apartado 2.1."],
      ["8. Métricas clave", "Quiebres de stock por mes; merma de producción (%); precisión del pronóstico (MAPE).", "Se desarrollan como KPIs en el capítulo 6."],
      ["9. Ventaja competitiva", "Conocimiento del proceso real de la empresa; modelo entrenado con su propio histórico.", "Es una ventaja de cercanía y no una barrera permanente; su sostenibilidad depende de seguir trabajando con datos propios de la empresa."],
    ], { id: "lean", title: "Descripción de los nueve bloques del Lean Canvas", widths: [17, 42, 41], size: 18, source: "Elaboración propia." }),
    P("Del análisis del lienzo se desprenden tres hipótesis que el proyecto debe validar. La primera es que el personal de planta adoptará un sistema web si el registro de un movimiento es más rápido que anotarlo en el cuaderno, lo que justifica el cuidado puesto en la usabilidad (capítulo 4). La segunda es que el pronóstico, aun con un modelo simple, mejora la decisión de cuánto producir frente a la intuición; se contrastará en el Sprint 5 con datos reales. La tercera, la más débil, es que otras chocolaterías pagarían por el sistema; no será validada en este proyecto y se declara únicamente como una oportunidad de crecimiento."),

    // =====================================================================================================
    H2("1.6 Mapa de Procesos (AS-IS)"),
    P("El mapa de procesos identifica las actividades que sostienen la operación y su clasificación. En Vástago & Co, la {tab:procesos} agrupa los procesos según su función. El proceso de gestión de insumos y producción, que es el objeto del proyecto, atraviesa tres de ellos y se modela con detalle en la {fig:asis}."),
    ...table(["Tipo", "Proceso", "Responsable", "Herramienta actual"], [
      ["Estratégico", "Seguimiento gerencial y decisión de qué producir y vender", "Gerencia / Ventas", "Hojas de cálculo; reunión mensual"],
      ["Misional", "Abastecimiento y recepción de insumos", "Compras / Almacén", "Llamada, mensajería, cuaderno o Excel"],
      ["Misional", "Planificación y elaboración de lotes", "Producción", "Experiencia del personal; receta en papel"],
      ["Misional", "Venta de producto terminado por pedido", "Gerencia / Ventas", "Pedidos sin proyección de demanda"],
      ["De apoyo", "Control de inventario y conteo físico", "Compras / Almacén", "Conteo semanal manual"],
    ], { id: "procesos", title: "Mapa de procesos de Vástago & Co (clasificación propuesta)", widths: [14, 38, 22, 26], size: 19,
         source: "Elaboración propia; clasificación de procesos propuesta por el equipo (tipo estratégico, misional y de apoyo)." }),
    P("El diagrama AS-IS de la {fig:asis} se organiza en tres carriles que corresponden a las áreas de la empresa. Los círculos rojos señalan dónde se origina cada uno de los cinco problemas detectados, numerados como en la leyenda de la figura."),
    ...fig("assets/asis_v.png", "Proceso AS-IS: gestión actual de insumos y producción (sin sistema)", { id: "asis", width: 560,
      desc: "Diagrama de carriles de la operación actual: Compras y Almacén, Producción, y Gerencia y Ventas. Los círculos rojos numeran los problemas detectados.",
      source: "Elaboración propia a partir del levantamiento de procesos del Sprint 1." }),
    P("La {tab:asis_carriles} detalla las actividades de cada carril en el orden en que ocurren, la herramienta o registro que se utiliza y los problemas asociados."),
    ...table(["Carril", "Actividades en secuencia", "Registro o herramienta", "Prob."], [
      ["Compras / Almacén", ["1) Compra insumos por llamada o WhatsApp.", "2) Anota la recepción en cuaderno o Excel.", "3) Realiza un conteo físico semanal manual.", "4) Ejecuta una compra urgente, con sobrecosto, cuando Producción detecta un faltante."], "Cuaderno, Excel, llamadas y mensajería", "1, 2, 5"],
      ["Producción", ["1) Planifica los lotes «por experiencia».", "2) Calcula los insumos con la receta en papel.", "3) Decide si falta algún insumo: si falta, solicita la compra urgente; si no, continúa.", "4) Elabora el lote y anota la merma al final del día."], "Receta en papel; anotación diaria", "2, 3, 4"],
      ["Gerencia / Ventas", ["1) Vende por pedido, sin proyección de demanda.", "2) Realiza una reunión mensual en la que revisa hojas de cálculo."], "Hojas de cálculo", "1, 3"],
    ], { id: "asis_carriles", title: "Carriles y actividades del proceso AS-IS", widths: [16, 48, 23, 13], size: 18, source: "Elaboración propia, a partir de la figura del proceso AS-IS. Prob. = problemas numerados en la figura." }),
    P("La {tab:problemas} rotula los cinco problemas con los identificadores P1 a P5, que corresponden a los círculos numerados de la {fig:asis}, e indica en qué actividad se originan, qué efecto producen y cómo se medirá su reducción. Se trata de una descripción cualitativa: al no existir registros estructurados, las líneas base se levantarán durante el piloto (**dato a validar con la empresa**)."),
    ...table(["ID", "Problema detectado", "Actividad donde se origina", "Efecto sobre la operación", "Indicador de seguimiento"], [
      ["P1", "Stock desactualizado", "Anotación en cuaderno o Excel; conteo físico semanal; reunión mensual", "El stock real se desconoce entre conteos; decisiones con información vieja", "Diferencia entre stock físico y registrado; movimientos con registro (%)"],
      ["P2", "Sin alertas de mínimos", "Cálculo de insumos con receta en papel; decisión «¿falta insumo?»; compra urgente", "El faltante se descubre al producir y se resuelve con compra urgente o lote postergado", "Quiebres de stock por mes; compras urgentes por mes"],
      ["P3", "Demanda no proyectada", "Planificación de lotes «por experiencia»; venta por pedido", "Sobreproducción o faltante de producto terminado", "MAPE del pronóstico; cumplimiento de órdenes"],
      ["P4", "Merma sin trazabilidad", "Elaboración del lote; merma anotada al final del día", "Pérdidas que no se asocian a lote, receta ni causa", "Merma de producción (%) por lote"],
      ["P5", "Sin registro de responsables", "Anotación de recepciones y movimientos", "No se sabe quién movió qué insumo; sin rendición de cuentas", "Movimientos con usuario (%); eventos auditados"],
    ], { id: "problemas", title: "Problemas detectados en el proceso AS-IS (P1 a P5)", widths: [6, 17, 28, 28, 21], size: 18,
         source: "Elaboración propia; los problemas P1 a P5 son los rotulados en la figura del proceso AS-IS." }),
    P("Los cinco problemas se interpretan así: **(P1) stock desactualizado**, porque el único control es el conteo semanal y las anotaciones manuales; **(P2) sin alertas de mínimos**, de modo que el faltante se descubre al intentar producir y se resuelve con compra urgente; **(P3) demanda no proyectada**, porque tanto la planificación del lote como la venta ocurren sin una estimación de lo que se necesitará; **(P4) merma sin trazabilidad**, por anotarse al final del día sin asociarla a un lote; y **(P5) sin registro de responsables**, pues ninguna anotación identifica quién movió qué. Obsérvese que la compra urgente es una actividad que no debería existir en un proceso bien planificado: su presencia en el mapa es, en sí misma, la señal de que falta información anticipada."),

    // =====================================================================================================
    H2("1.7 Oportunidades de mejora y modelo propuesto (TO-BE)"),
    H3("Oportunidades de mejora"),
    P("A partir de los problemas P1 a P5 se identificaron siete oportunidades de mejora. Para ordenarlas, el equipo calificó cada una por su impacto sobre la operación y por el esfuerzo de implementación (alto, medio o bajo, juicio del equipo) y asignó una prioridad: se prioriza lo que combina impacto alto con esfuerzo asumible dentro de las 540 horas disponibles. La {tab:oportunidades} presenta el resultado en orden de prioridad y remite a las historias de usuario que materializan cada oportunidad en el Product Backlog (apartado 2.7)."),
    ...table(["Prior.", "Oportunidad de mejora", "Problema que ataca", "Impacto / esfuerzo", "Historias y sprint"], [
      ["1", "O1. Centralizar el inventario en una única fuente de verdad en tiempo real", "P1, P5", "Alto / medio", "HU01–HU03 (S3)"],
      ["2", "O5. Auditar cada acción y asignar responsables mediante roles", "P5", "Alto / medio", "HU08–HU11 (S3)"],
      ["3", "O4. Digitalizar la receta (BOM) y descontar el consumo automáticamente", "P2, P4", "Medio-alto / medio", "HU05–HU07 (S3)"],
      ["4", "O2. Alertar cuando un insumo cae bajo su mínimo", "P2", "Alto / bajo (en el sistema); medio (WhatsApp)", "HU04 (S3); HU14 y HU15 (S4)"],
      ["5", "O3. Pronosticar la demanda para guiar cuánto producir", "P3", "Alto / alto (depende de los datos)", "HU12 y HU13 (S5; base en v1)"],
      ["6", "O6. Mostrar KPIs actualizados a gerencia y permitir exportar reportes", "P1, P3", "Medio / medio", "HU16 (v1) y HU17 (S4)"],
      ["7", "O7. Formalizar el canal de comunicación de alertas en lugar de llamadas informales", "P2", "Medio / medio", "HU14 y HU15 (S4)"],
    ], { id: "oportunidades", title: "Oportunidades de mejora priorizadas", widths: [7, 38, 12, 22, 21], size: 18,
         source: "Elaboración propia; la calificación de impacto y esfuerzo es un juicio del equipo, sin ponderación cuantitativa." }),

    H3("Modelo propuesto (TO-BE)"),
    P("El modelo TO-BE de la {fig:tobe} redefine el flujo con el Sistema Web Inteligente como actor central. Ahora son cuatro los carriles: Almacenero, Sistema Web Inteligente, Jefe de producción y Gerencia. El proceso comienza cuando el almacenero inicia sesión con su rol y registra un ingreso o una salida; a partir de ese registro, el sistema actúa de manera automática sin intervención humana adicional. La {tab:tobe_carriles} describe las actividades de cada carril y el requerimiento que las respalda, y la {fig:tobe} las integra en un solo flujo."),
    ...table(["Carril", "Actividades en secuencia", "Función del sistema y requerimientos"], [
      ["Almacenero", ["1) Inicia sesión con su rol.", "2) Registra el ingreso o la salida de un insumo."], "Autenticación y autorización por rol (RF05, RF06); registro de movimientos (RF01)."],
      ["Sistema Web Inteligente", ["1) Un trigger de la base de datos actualiza el stock en tiempo real.", "2) Evalúa el stock mínimo y genera alertas.", "3) El modelo de ML aporta el pronóstico de demanda de tres meses.", "4) Al completarse la orden, descuenta los insumos según la receta y audita la acción."], "Stock y semáforo (RF02); alertas (RF03; WhatsApp y correo, RF12); pronóstico (RF09); descuento por BOM (RF04); auditoría (RF08)."],
      ["Jefe de producción", ["1) Consulta las alertas y el pronóstico.", "2) Crea la orden con vista previa de los insumos requeridos (BOM).", "3) Completa la orden."], "Órdenes con BOM y descuento (RF04); consulta del pronóstico (RF09)."],
      ["Gerencia", ["1) Consulta el dashboard de KPIs actualizado."], "Dashboard por rol (RF10); exportación de reportes (RF11, Sprint 4)."],
    ], { id: "tobe_carriles", title: "Carriles y actividades del proceso TO-BE", widths: [17, 48, 35], size: 18, source: "Elaboración propia, a partir de la figura del proceso TO-BE." }),
    note("**Alcance real de la v1.** En el TO-BE, el stock en tiempo real, el semáforo, las órdenes con BOM, la auditoría, el control por roles y el dashboard están implementados y probados. El envío de alertas por WhatsApp y correo y la exportación de reportes se planifican para el Sprint 4. En la v1 el pronóstico se calcula con el script `ml-service/forecast.py` y se carga en la tabla `pronosticos`; su ejecución recurrente integrada al sistema se aborda en el Sprint 5.", { fill: "E4F3E9", bar: "2E7D4F" }),
    spacer(100),
    ...fig("assets/tobe_v.png", "Proceso TO-BE: gestión con el Sistema Web Inteligente", { id: "tobe", width: 560,
      desc: "Diagrama de carriles del proceso propuesto. El borde discontinuo indica el envío de alertas por WhatsApp y correo, planificado para el Sprint 4.",
      source: "Elaboración propia a partir del diseño del sistema (Sprints 1 y 2)." }),
    P("La {tab:brechas} compara los dos modelos actividad por actividad. Para cada una se indica la situación actual, la propuesta, el beneficio esperado y el requerimiento funcional que la cubre, de modo que cada mejora sea trazable hasta el producto."),
    ...table(["Proceso", "Situación actual (AS-IS)", "Propuesta (TO-BE)", "Beneficio esperado", "RF"], [
      ["Registro de movimientos de insumos", "Anotación en cuaderno o Excel, sin usuario ni motivo", "Registro de INGRESO, SALIDA y AJUSTE en el sistema; el stock se actualiza por trigger de BD", "Trazabilidad completa y stock en tiempo real", "RF01, RF02"],
      ["Control de stock y reposición", "Conteo físico semanal; compra urgente al faltar un insumo", "Semáforo por insumo y alerta de stock mínimo (en el sistema; WhatsApp y correo en S4)", "Menos quiebres y compras planificadas", "RF02, RF03, RF12"],
      ["Planificación de la producción", "Lotes «por experiencia», sin proyección", "Pronóstico a 3 meses por producto con MAPE y recomendación de producción", "Producción alineada con la demanda", "RF09"],
      ["Cálculo de insumos por lote", "Receta en papel y cálculo manual", "Orden con vista previa de insumos (BOM) y descuento automático al completarla", "Menos errores y consumo registrado", "RF04"],
      ["Registro de merma", "Anotada al final del día, sin lote", "Consumo asociado a la orden y al lote; auditoría de cada movimiento", "Base para medir la merma por lote", "RF04, RF08"],
      ["Responsabilidad y acceso", "Sin registro de quién hizo qué", "Autenticación segura, cuatro roles y bitácora inmutable", "Rendición de cuentas y seguridad", "RF05–RF08"],
      ["Seguimiento gerencial", "Reunión mensual con hojas de cálculo", "Dashboard de KPIs por rol y exportación de reportes (S4)", "Decisiones oportunas", "RF10, RF11"],
    ], { id: "brechas", title: "Comparación AS-IS vs TO-BE por actividad y mejora esperada", widths: [17, 22, 29, 21, 11], size: 18, source: "Elaboración propia." }),
    P("Las mejoras de mayor efecto son las que cambian el momento en que la información está disponible: del conteo semanal al stock en tiempo real, y de la reunión mensual al indicador actualizado. El resultado esperado no es solo un proceso más ordenado, sino la eliminación de la actividad de compra urgente como respuesta habitual, al ser sustituida por alertas y pronóstico que permiten comprar y producir con anticipación."),
  ];
};
