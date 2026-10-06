// Capítulo 4 — Prototipos
module.exports = (g) => {
  const { H1, H2, H3, P, bullets, numbered, fig, table, code, note, AlignmentType } = g;
  const L = AlignmentType.LEFT, C = AlignmentType.CENTER;
  const PEND = "[PENDIENTE: pegar enlace del diseño (Figma u otro)]";
  const srcWire = "Elaboración propia, wireframe generado con el script wireframes.py (repositorio, carpeta docs/build). Diseño de prototipo: " + PEND;
  const srcHifi = "Captura de la aplicación React v1 (compilación local, rol Administrador, datos de demostración, 06-oct-2026). Diseño de prototipo: " + PEND;
  const W = (f, t, id, desc) => fig("assets/wire/" + f, t, { id, desc, source: srcWire, width: 470 });
  const H = (f, t, id, desc) => fig("assets/hifi/" + f, t, { id, desc, source: srcHifi, width: 520 });

  return [
    H1("4. Prototipos"),
    P("Los prototipos del sistema se elaboraron en el Sprint 2 (07 al 27 de setiembre de 2026) y siguen una progresión de tres niveles de fidelidad: wireframes de baja fidelidad en escala de grises, que fijan la estructura y el flujo de cada pantalla sin distraer con color; mockups de alta fidelidad, que aplican la identidad visual de Vástago & Co; y la implementación en React de la versión 1, de la cual proceden las capturas reales que se presentan como mockups finales. Cada pantalla está trazada a las historias de usuario y requerimientos del capítulo 2, de modo que ningún prototipo existe sin una necesidad de negocio detrás."),
    P("En atención a la observación del docente sobre el APF1, **todas las figuras de este capítulo llevan título, una breve descripción de lo que muestran y su fuente**, y la fuente incluye el enlace al diseño de prototipo."),
    note("**Pendiente que completa el equipo:** los wireframes se generaron con un script reproducible (`wireframes.py`) y los mockups son capturas de la aplicación; no existe aún un archivo de diseño en Figma u otra herramienta cuyo enlace pueda citarse. Todas las fuentes de este capítulo contienen el marcador **" + PEND + "**: el equipo debe reemplazarlo por la URL del tablero o archivo de diseño cuando lo publique. Los archivos de imagen sí están versionados en el repositorio (`docs/build/assets/wire` y `docs/build/assets/hifi`)."),

    // ------------------------------------------------------------------ 4.1
    H2("4.1 Wireframes de baja fidelidad"),
    P("Los ocho wireframes se dibujaron en escala de grises, con barras grises que representan texto y el símbolo `##` que representa un valor numérico, para que la discusión con la Product Owner se centrara en la disposición de los elementos y no en colores o textos. Todos comparten una misma estructura (patrón de aplicación de panel): una barra lateral izquierda con el logotipo, las opciones de menú del rol y el bloque de usuario con el botón Cerrar sesión, y un área de contenido a la derecha con el título de la pantalla. Las pantallas de listado usan una tabla con columna de acción; las acciones de escritura (movimiento de inventario, nueva orden) se resuelven en ventanas modales que conservan el contexto de la lista. {tab:mapa_pantallas} relaciona cada pantalla con sus figuras, historias de usuario y roles con acceso."),
    ...table(["Pantalla", "Wireframe y mockup", "Historias y requerimientos", "Roles con acceso"], [
      ["Inicio de sesión", "{fig:wire_login}, {fig:hifi_login}", "HU08 · RF05", "Todos (pública)"],
      ["Dashboard", "{fig:wire_dash}, {fig:hifi_dash}", "HU04, HU16 · RF03, RF10", "Los cuatro roles"],
      ["Inventario", "{fig:wire_inv}, {fig:hifi_inv}", "HU01, HU02, HU03 · RF01, RF02", "Administrador, Jefe de Producción (lectura), Almacenero"],
      ["Producción", "{fig:wire_prod}, {fig:hifi_prod}", "HU06, HU07 · RF04", "Todos ven; escriben Administrador y Jefe de Producción"],
      ["Nueva orden (modal)", "{fig:wire_orden}, {fig:hifi_orden}", "HU05, HU07 · RF04", "Administrador, Jefe de Producción"],
      ["Analítica IA", "{fig:wire_ana}, {fig:hifi_ana}", "HU12, HU13 · RF09", "Administrador, Jefe de Producción, Gerente"],
      ["Usuarios", "{fig:wire_usr}, {fig:hifi_usr}", "HU10 · RF07", "Administrador"],
      ["Auditoría", "{fig:wire_aud}, {fig:hifi_aud}", "HU11 · RF08", "Administrador"],
    ], { id: "mapa_pantallas", title: "Trazabilidad entre pantallas, prototipos, historias de usuario y roles", widths: [20, 27, 25, 28], size: 18, align: [L, L, L, L], source: "Elaboración propia a partir del backlog (capítulo 2) y de la matriz de permisos PERMISOS de backend/app/security.py." }),
    ...W("00_login.png", "Wireframe de la pantalla de inicio de sesión", "wire_login", "Tarjeta centrada con logotipo, campos de correo corporativo y contraseña, botón Ingresar y leyenda de acceso restringido. Prioriza un único camino de acción (HU08)."),
    ...W("01_dashboard.png", "Wireframe del Dashboard gerencial", "wire_dash", "Cuatro tarjetas de indicadores (quiebres de stock, merma, órdenes activas y precisión del modelo) sobre un panel de alertas con severidad crítica o de advertencia."),
    ...W("02_inventario.png", "Wireframe de la pantalla de Inventario", "wire_inv", "Tabla de insumos con stock actual, stock mínimo, estado de semáforo y botón de movimiento por fila; la acción se abre en un modal."),
    ...W("03_produccion.png", "Wireframe de la pantalla de Producción", "wire_prod", "Botón principal para crear una orden y tabla de órdenes con lote, producto, cantidad, fecha de inicio, estado y acción de avance."),
    ...W("04_nueva_orden.png", "Wireframe del modal Nueva orden de producción", "wire_orden", "Ventana modal sobre la lista, con selección de producto, cantidad y vista previa del consumo de insumos según la receta (BOM) antes de confirmar."),
    ...W("05_analitica.png", "Wireframe de la pantalla de Analítica IA", "wire_ana", "Selector de producto, gráfico de demanda histórica (línea continua) y proyección (línea punteada), error de validación (MAPE) y tabla de tres meses proyectados con margen de error."),
    ...W("06_usuarios.png", "Wireframe de la gestión de Usuarios", "wire_usr", "Pantalla exclusiva del Administrador: botón de nuevo usuario y tabla con nombre, correo, rol, estado y acción de activar o desactivar."),
    ...W("07_auditoria.png", "Wireframe de la bitácora de Auditoría", "wire_aud", "Tabla de solo lectura con fecha, usuario, acción, entidad, IP y resultado; una nota declara que los registros no pueden modificarse ni borrarse."),
    P("Los wireframes dejaron plasmadas tres decisiones de diseño que se mantuvieron en la implementación: el semáforo de inventario debe ser legible sin depender solo del color (las alertas se rotulan «Crítica» o «Advertencia»), la vista previa de insumos se muestra antes de crear la orden y la analítica acompaña siempre la proyección con su error de validación (MAPE), para que el gerente entienda el margen de confianza."),

    // ------------------------------------------------------------------ 4.2
    H2("4.2 Mockups de alta fidelidad"),
    P("Los mockups de alta fidelidad aplican la identidad visual de la marca: tonos de cacao oscuro para la navegación y los textos, caramelo para el elemento activo y las acciones destacadas, y crema para el fondo, evocando el producto. {tab:paleta} resume las variables de color del sistema (definidas como variables CSS en `frontend/src/styles.css`); la tipografía es la fuente del sistema (`-apple-system`, `Segoe UI`, `Roboto`), lo que evita descargar fuentes externas y contribuye al rendimiento (capítulo 7)."),
    ...table(["Color", "Código", "Uso en la interfaz"], [
      ["Cacao 900", "`#2E1B12`", "Texto principal, títulos y login"],
      ["Cacao 800 / 700", "`#3E2419` / `#4A2C1F`", "Barra lateral y botones primarios"],
      ["Caramelo", "`#C89B3C`", "Opción de menú activa, subtítulo de marca, línea de proyección"],
      ["Crema", "`#FAF3E7` / `#FFFDF9`", "Fondo de la aplicación y de los paneles"],
      ["Verde / Ámbar / Rojo", "`#2E7D4F` / `#B8860B` / `#B3261E`", "Semáforo: OK, Bajo (advertencia) y Crítico; mensajes de error"],
    ], { id: "paleta", title: "Paleta de colores y tipografía de la interfaz", widths: [22, 33, 45], size: 18, align: [L, L, L], source: "Elaboración propia a partir de las variables CSS de frontend/src/styles.css." }),
    P("Las ocho capturas siguientes proceden de la aplicación real compilada en local, con el rol Administrador y los datos de demostración, de modo que lo que se muestra es lo que efectivamente se implementó y no una maqueta que pudiera diferir del producto. Las cifras visibles (por ejemplo, 3 insumos bajo el mínimo y precisión del modelo de 95.5 %) provienen de la base de datos de demostración."),
    ...H("00_login.png", "Mockup de alta fidelidad: inicio de sesión", "hifi_login", "Tarjeta de acceso sobre fondo cacao con campos de correo corporativo y contraseña; el pie recuerda que toda actividad queda registrada."),
    ...H("01_dashboard.png", "Mockup de alta fidelidad: Dashboard", "hifi_dash", "Cuatro indicadores (3 insumos bajo el mínimo, merma 2.3 %, 3 órdenes activas, precisión del modelo 95.5 %) y alertas con punto de color, título y detalle accionable."),
    ...H("02_inventario.png", "Mockup de alta fidelidad: Inventario", "hifi_inv", "Siete insumos con stock y mínimo en su unidad; las insignias OK y Crítico combinan color y texto. Tres insumos aparecen en estado Crítico."),
    ...H("03_produccion.png", "Mockup de alta fidelidad: Producción", "hifi_prod", "Órdenes L-2026-012 a L-2026-016 con su estado (Planificada, En proceso, Completada) y el botón de avance Iniciar o Completar según corresponda."),
    ...H("04_nueva_orden.png", "Mockup de alta fidelidad: nueva orden de producción", "hifi_orden", "Modal con producto y cantidad; la lista de consumo estimado (cacao 4.0 kg, empaque 100 unid., leche en polvo 1.5 kg, manteca 2.0 kg) se recalcula al cambiar la cantidad."),
    ...H("05_analitica.png", "Mockup de alta fidelidad: Analítica IA", "hifi_ana", "Serie histórica 2024–2025 (línea continua) y proyección de enero a marzo de 2026 (línea punteada) para Bombones Caja x6, con MAPE de 4.5 % y margen de error por mes."),
    ...H("06_usuarios.png", "Mockup de alta fidelidad: gestión de Usuarios", "hifi_usr", "Los cuatro usuarios de demostración con su rol y estado Activo, y el botón para desactivar cada cuenta; solo visible para el Administrador."),
    ...H("07_auditoria.png", "Mockup de alta fidelidad: bitácora de Auditoría", "hifi_aud", "Eventos recientes (LOGIN_OK, TOKEN_REFRESCADO) con fecha, usuario, IP y resultado; la nota superior recuerda que la bitácora es de solo anexado."),
    P("{tab:wire_vs_hifi} resume qué cambió entre el wireframe y la versión implementada, como evidencia de que el diseño evolucionó con el desarrollo."),
    ...table(["Pantalla", "Wireframe (Sprint 2)", "Versión implementada (Sprint 3)"], [
      ["Login", "Solo el camino feliz.", "Se añade el mensaje genérico «Credenciales inválidas» con `role=\"alert\"` y el estado «Verificando…» del botón."],
      ["Dashboard", "Alertas rotuladas «Crítica» y «Advertencia».", "Punto de color y borde lateral por severidad, más título y detalle con la acción recomendada."],
      ["Inventario", "Botón genérico «Movimiento».", "El botón cambia según el rol: «Registrar movimiento» o «Ver historial»; el modal muestra los últimos movimientos."],
      ["Producción", "Columna «Acción» sin detalle.", "Botón contextual Iniciar o Completar; Completar pide confirmación porque descuenta insumos."],
      ["Analítica", "Tabla con margen de error.", "El margen se calcula como la demanda estimada multiplicada por el MAPE; el gráfico se dibuja en canvas con etiqueta accesible."],
    ], { id: "wire_vs_hifi", title: "Evolución del diseño entre wireframes y versión implementada", widths: [16, 34, 50], size: 18, align: [L, L, L], source: "Elaboración propia comparando assets/wire con el código de frontend/src/components." }),

    // ------------------------------------------------------------------ 4.3
    H2("4.3 Principios y buenas prácticas UX/UI aplicadas"),
    P("La interfaz se diseñó para un usuario de planta o almacén con poca experiencia en software: acciones frecuentes a uno o dos clics, lenguaje del oficio (insumo, lote, receta, stock mínimo) y retroalimentación inmediata. Esta sección contrasta las heurísticas de usabilidad de Nielsen con las pantallas y el código reales y declara con honestidad los puntos que cumplen solo en forma parcial. {tab:nielsen} presenta la evaluación."),
    ...table(["Heurística de Nielsen", "Aplicación en el sistema", "Dónde se verifica", "Grado"], [
      ["1. Visibilidad del estado del sistema", "Mensajes «Cargando…» y «Verificando…»; insignias de estado en inventario, órdenes y usuarios.", "Dashboard, Login, {fig:hifi_inv}", "Cumple"],
      ["2. Coincidencia con el mundo real", "Vocabulario de la chocolatería: insumo, lote, receta (BOM), kg, merma; fechas y números en formato peruano en la bitácora.", "{fig:hifi_prod}, {fig:hifi_orden}", "Cumple"],
      ["3. Control y libertad del usuario", "Botones Cancelar y Cerrar en cada modal; clic fuera del modal lo cierra; cierre de sesión siempre visible.", "{fig:hifi_orden}", "Cumple"],
      ["4. Consistencia y estándares", "Un solo sistema de botones, insignias, tablas y paneles definido por variables CSS; mismo patrón de lista y modal en todas las pantallas.", "Figuras {fig:hifi_inv} a {fig:hifi_aud}", "Cumple"],
      ["5. Prevención de errores", "Campos numéricos con mínimo y máximo, `required` y `maxLength`; confirmación antes de completar una orden; la API rechaza salidas mayores al stock (HTTP 409).", "Producción, Inventario", "Cumple"],
      ["6. Reconocer antes que recordar", "El producto se elige de una lista; la receta se muestra al crear la orden en vez de pedir recordarla.", "{fig:hifi_orden}", "Cumple"],
      ["7. Flexibilidad y eficiencia", "Menú por rol y acciones directas por fila; **no** hay búsqueda, filtros ni atajos de teclado en las tablas.", "{fig:hifi_inv}", "Parcial"],
      ["8. Diseño estético y minimalista", "Cada pantalla muestra solo lo necesario para su tarea; jerarquía por tamaño y color de acento, sin adornos.", "{fig:hifi_dash}", "Cumple"],
      ["9. Ayudar a reconocer y recuperarse de errores", "Mensajes en español y sin trazas técnicas («Stock insuficiente», «Datos inválidos»); el error de login es genérico por seguridad.", "{fig:ux_roles}", "Cumple"],
      ["10. Ayuda y documentación", "No existe ayuda en línea; la guía de uso se entrega como manual del usuario final (planificado para el Sprint 6).", "—", "Pendiente"],
    ], { id: "nielsen", title: "Evaluación heurística de la interfaz (Nielsen) sobre la versión 1", widths: [22, 44, 22, 12], size: 18, align: [L, L, L, C], source: "Elaboración propia; heurísticas de Nielsen (1994), contrastadas con frontend/src y con las capturas del sistema." }),

    H3("Jerarquía visual"),
    P("La jerarquía se construye con tamaño, peso y posición antes que con color. El título de pantalla usa 28 px; los valores de los indicadores del dashboard, 26 px en negrita, de modo que la cifra es lo primero que se lee; las etiquetas de columna y de indicador van en 11 px en mayúsculas y color secundario; y el color caramelo se reserva para el elemento activo del menú, de manera que señala dónde está el usuario sin competir con el contenido. Los botones primarios son de fondo oscuro y las acciones secundarias son contorneadas, lo que distingue la acción principal (por ejemplo, «Nueva orden de producción») de las secundarias (Cancelar, Ver historial)."),

    H3("Semáforo accesible: color más texto"),
    P("El estado del inventario no se comunica solo con color: cada insignia contiene además una palabra (OK, Bajo, Crítico), lo que permite distinguirlas a personas con daltonismo o en pantallas de poco brillo, un riesgo real en un almacén. En el dashboard cada alerta lleva un punto de color, un borde lateral y un título que indica el problema con su cifra. La regla del semáforo vive en la base de datos (vista `v_inventario`), no en la interfaz, por lo que cualquier pantalla o reporte futuro (por ejemplo, la exportación del Sprint 4) usará el mismo criterio."),
    ...table(["Estado", "Regla en v_inventario", "Texto en pantalla", "Color"], [
      ["Crítico (`crit`)", "`stock_actual < stock_minimo`", "Crítico", "Rojo `#B3261E` sobre fondo rosado"],
      ["Bajo (`warn`)", "`stock_actual < stock_minimo × 1.2`", "Bajo", "Ámbar `#B8860B` sobre fondo crema"],
      ["Normal (`ok`)", "En otro caso", "OK", "Verde `#2E7D4F` sobre fondo verde claro"],
    ], { id: "semaforo", title: "Regla del semáforo de inventario y su representación", widths: [20, 36, 20, 24], size: 18, align: [L, L, C, L], source: "Elaboración propia a partir de db/schema.sql (vista v_inventario) y frontend/src/styles.css." }),

    H3("Contraste de color"),
    P("Se calculó la razón de contraste WCAG 2.1 entre los colores de texto y fondo realmente definidos en la hoja de estilos. El criterio AA exige al menos 4.5:1 para texto normal. {tab:contraste} muestra el resultado, que incluye dos incumplimientos que el equipo corregirá."),
    ...table(["Combinación (texto sobre fondo)", "Razón", "AA (4.5:1)"], [
      ["Texto principal `#2E1B12` sobre crema `#FAF3E7`", "14.85:1", "Cumple"],
      ["Menú `#FAF3E7` sobre barra lateral `#3E2419`", "12.94:1", "Cumple"],
      ["Menú activo `#2E1B12` sobre caramelo `#C89B3C`", "6.41:1", "Cumple"],
      ["Botón primario `#FAF3E7` sobre `#4A2C1F`", "11.39:1", "Cumple"],
      ["Texto secundario `#8A5636` sobre panel `#FFFDF9`", "5.97:1", "Cumple"],
      ["Mensaje de error `#B3261E` sobre panel `#FFFDF9`", "6.43:1", "Cumple"],
      ["Insignia Crítico `#B3261E` sobre `#FBE3E1`", "5.35:1", "Cumple"],
      ["Insignia OK `#2E7D4F` sobre `#E4F3E9`", "4.40:1", "No cumple (casi)"],
      ["Insignia Bajo `#B8860B` sobre `#FBF0D6`", "2.87:1", "No cumple"],
    ], { id: "contraste", title: "Razones de contraste WCAG de los pares de color de la interfaz", widths: [62, 16, 22], size: 18, align: [L, C, C], source: "Elaboración propia; cálculo con la fórmula de luminancia relativa de WCAG 2.1 sobre los colores de frontend/src/styles.css." }),
    P("Las insignias Bajo y OK quedan por debajo del umbral AA para texto pequeño. Como la palabra que contienen respalda el significado, el estado sigue siendo comprensible, pero el texto debe ser más legible. La corrección es oscurecer el color del texto: `#8A6100` sobre `#FBF0D6` alcanza 4.89:1 y `#256B42` sobre `#E4F3E9` alcanza 5.61:1. Se programa en el Sprint 4, junto con los cambios del dashboard."),

    H3("Consistencia, retroalimentación y menú por rol"),
    P("La consistencia se garantiza con una hoja de estilos única de poco más de 30 líneas que define componentes reutilizables (panel, botón, insignia, campo, modal, tabla); ninguna pantalla define estilos propios. La retroalimentación cubre cuatro momentos: carga (texto «Cargando…»), proceso (botón «Verificando…» deshabilitado), éxito (la lista se actualiza y el modal se cierra, con el nuevo stock y su semáforo visibles) y error (mensaje rojo en el propio modal o encima de la tabla). Las acciones irreversibles piden confirmación: al completar una orden se advierte que se descontarán los insumos del inventario."),
    P("El menú se construye a partir de los permisos que devuelve la API en el inicio de sesión: la interfaz filtra las vistas permitidas (`VISTAS.filter`) y por tanto cada rol ve solo lo que puede usar, con lo que se reduce la carga cognitiva y el riesgo de errores. La seguridad no depende de este filtro: el backend vuelve a validar el permiso en cada petición (capítulo 9). {fig:ux_roles} contrasta el menú del Almacenero (Dashboard, Inventario, Producción) con el del Gerente (Dashboard, Producción, Analítica IA) y muestra el mensaje de error de acceso."),
    ...fig("assets/ux_roles_feedback.png", "Menú diferenciado por rol y retroalimentación de error de acceso", { id: "ux_roles", width: 600,
      desc: "Recortes de capturas reales: el Almacenero no ve Analítica ni administración, el Gerente no ve Inventario, y un acceso fallido muestra un mensaje genérico que no revela si el usuario existe.",
      source: "Capturas de la aplicación React v1 (evidencias/capturas: almacenero_Dashboard, gerente_Dashboard y 02_login_error), recortadas para esta figura. Diseño de prototipo: " + PEND }),

    H3("Hallazgos y mejoras planificadas"),
    P("La revisión de las pantallas contra el código detectó limitaciones que se registran aquí en lugar de ocultarse. {tab:mejoras} las lista con la acción propuesta y el sprint en que se abordarían."),
    ...table(["Hallazgo", "Efecto", "Acción propuesta", "Sprint"], [
      ["Contraste insuficiente en insignias Bajo y OK", "Lectura difícil con poca luz.", "Oscurecer el texto (`#8A6100`, `#256B42`).", "S4"],
      ["Fechas de órdenes en formato inglés (por ejemplo «Thu, 03 Sep 2026»)", "Inconsistencia con la bitácora, que usa formato peruano.", "Formatear con `toLocaleDateString(\"es-PE\")`.", "S4"],
      ["Sin búsqueda ni filtros en tablas", "Menor eficiencia con muchos insumos.", "Buscador por nombre y filtro por estado.", "S5"],
      ["La barra lateral se oculta bajo 900 px y no hay menú alternativo", "En móvil no se puede navegar entre pantallas.", "Menú tipo hamburguesa.", "S6"],
      ["Sin ayuda en línea", "Dependencia de capacitación presencial.", "Manual de usuario y textos de ayuda por pantalla.", "S6"],
    ], { id: "mejoras", title: "Hallazgos de usabilidad y mejoras planificadas", widths: [30, 25, 33, 12], size: 18, align: [L, L, L, C], source: "Elaboración propia a partir de la revisión de frontend/src; los sprints son una propuesta sujeta a priorización de la Product Owner." }),

    // ------------------------------------------------------------------ 4.4
    H2("4.4 Navegación y flujo de interacción del usuario"),
    P("{fig:flujo} muestra el flujo de navegación de la aplicación. Toda sesión comienza en el inicio de sesión: si las credenciales son válidas se llega al Dashboard, que actúa como página de inicio común y punto de partida hacia el resto de pantallas; si fallan, el sistema muestra un mensaje genérico y, tras cinco intentos fallidos, bloquea la cuenta temporalmente. Desde el Dashboard se accede a Inventario, Producción, Analítica IA, Usuarios y Auditoría según el rol, y en cualquier momento se puede cerrar sesión. Dos pantallas abren un modal de acción: Inventario (registrar ingreso o salida) y Producción (nueva orden con vista previa de la receta)."),
    ...fig("assets/flujo_navegacion.png", "Diagrama de flujo de navegación del sistema", { id: "flujo", width: 600,
      desc: "Del inicio de sesión al Dashboard y de este a las cinco pantallas funcionales, con indicación de los roles que acceden a cada una y de los dos modales de acción.",
      source: "Elaboración propia (diagrama Graphviz assets/flujo_navegacion.dot), según la matriz PERMISOS de backend/app/security.py. Diseño de prototipo: " + PEND }),
    P("La sesión usa un token de acceso de 15 minutos que se renueva de forma transparente con un token de refresco guardado en una cookie HttpOnly; si la renovación falla (sesión revocada, expirada o cuenta desactivada), el cliente descarta la sesión y devuelve al usuario al inicio de sesión sin mensajes técnicos. {tab:roles_flujo} detalla las pantallas disponibles por rol y {tab:tareas} describe el recorrido típico de cada uno."),
    ...table(["Rol", "Dashboard", "Inventario", "Producción", "Analítica / Admin"], [
      ["Administrador", "Sí", "Ver y registrar", "Ver y crear/avanzar", "Analítica, Usuarios y Auditoría"],
      ["Jefe de Producción", "Sí", "Solo ver", "Ver y crear/avanzar", "Analítica"],
      ["Almacenero", "Sí", "Ver y registrar", "Solo ver", "—"],
      ["Gerente", "Sí", "No", "Solo ver", "Analítica"],
    ], { id: "roles_flujo", title: "Pantallas y nivel de acceso por rol", widths: [19, 15, 20, 22, 24], size: 18, align: [L, C, L, L, L], source: "Elaboración propia a partir de PERMISOS en backend/app/security.py y de la lista VISTAS de frontend/src/App.jsx." }),
    ...table(["Rol", "Recorrido típico", "Resultado"], [
      ["Almacenero", "Inicia sesión, revisa las alertas del Dashboard, abre Inventario, pulsa «Registrar movimiento» en el insumo, elige Ingreso o Salida, indica cantidad y motivo y guarda.", "El stock y el semáforo se actualizan; el movimiento queda en el historial y en la auditoría (HU01 a HU04)."],
      ["Jefe de Producción", "Abre Producción, pulsa «Nueva orden», elige producto y cantidad, revisa el consumo estimado de insumos y crea la orden; luego la inicia y, al terminar, la completa y confirma el aviso.", "Se genera el lote, y al completar se descuentan los insumos de la receta en una sola transacción (HU05 a HU07)."],
      ["Gerente", "Entra al Dashboard, revisa indicadores y alertas, abre Analítica IA y elige el producto para ver la proyección de tres meses y su error.", "Decisión informada de compras o producción (HU12, HU16)."],
      ["Administrador", "Gestiona usuarios (crear con política de contraseña, activar o desactivar) y consulta la bitácora de auditoría para revisar accesos y operaciones.", "Control de accesos y trazabilidad (HU09 a HU11)."],
    ], { id: "tareas", title: "Recorridos típicos de interacción por rol", widths: [16, 50, 34], size: 18, align: [L, L, L], source: "Elaboración propia a partir del flujo de la aplicación y de las historias de usuario del capítulo 2." }),
    P("Los recorridos se pensaron para completarse con pocas interacciones: registrar un movimiento de inventario requiere cuatro acciones desde el Dashboard (abrir Inventario, abrir el insumo, completar el formulario y guardar), y crear una orden de producción, cinco. Estas cifras sirven como línea base para evaluar la usabilidad en las pruebas funcionales del Sprint 5."),
  ];
};
