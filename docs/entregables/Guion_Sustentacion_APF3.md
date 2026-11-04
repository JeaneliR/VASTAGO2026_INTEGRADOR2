# Guion de sustentación APF3 (propuesta, unos 4 minutos por integrante)

La rúbrica pide: todos participan, cada uno expone sus propios aportes, se empieza por las observaciones resueltas del APF2 y se muestra la v2 en la nube. El reparto es una propuesta basada en los roles; pueden cambiarlo, pero cada persona debe hablar de lo que sí hizo.

## Antes de entrar (30 minutos antes)

1. Abre https://vastago-sistema.onrender.com y espera a que cargue (el plan gratuito puede tardar un minuto en despertar).
2. Entra con la cuenta del gerente. No muestres la contraseña en pantalla.
3. Ten Gmail abierto con el último resumen de insumos críticos.
4. Ten abierta la pestaña Commits del repositorio en GitHub.
5. Ten a mano las capturas del informe como plan B por si falla internet.
6. Diapositiva 3: ya tiene las 4 observaciones de la docente (11 de octubre). Completa solo la fila de "recomendaciones de clase" con lo que recuerden de las sesiones y dónde se incorporó.

## Jeaneli (Product Owner)

Diapositivas 1, 2, 3, 4, 9, 10 y 14.

1. Saludo y objetivo: "Presentamos la versión 2 integrada con un sistema externo, con pruebas automatizadas y desplegada en la nube."
2. Observaciones del avance 2 (diapositiva 3): gráfico de la base de datos (ahora horizontal y con las 26 tablas de la v2), títulos de tablas y figuras, recomendaciones de clase y trabajo en equipo. Lee cada una, cómo se resolvió y dónde se ve.
3. Qué incluye la v2: dashboard por rol, reportes, correo y alertas, usuarios y el asistente con datos reales de la planta.
4. Usabilidad (ISO/IEC 25010): "Evaluamos aprendizaje, protección frente a errores, asistencia y participación. Cumplimos los criterios que definimos antes de medir."
5. Hallazgos: "Encontramos defectos reales (contraste de colores, campos sin etiqueta, un mensaje poco claro). Los corregimos: accesibilidad en Lighthouse pasó de 90 a 100."
6. Límite honesto: "Son medidas automáticas; falta probar con usuarios de la planta."

## Arnold (Scrum Master)

Diapositivas 11 y 12.

1. Despliegue: Render construye la imagen Docker desde el repositorio con el Blueprint; el arranque migra el esquema sin borrar datos; las claves van como variables de entorno.
2. Muestra la URL en vivo y la ruta /api/health.
3. Control de versiones: ramas main, develop y feature; flujo de pull request con integración continua en verde.
4. Muestra la pestaña Commits (fecha, hora, autor, mensaje). Explica con honestidad quién hizo qué.

## Luis (Desarrollador)

Diapositivas 5, 6, 7, 8 y 13.

1. Integración: Flask guarda el envío en una cola en PostgreSQL y llama a la API de Resend por HTTPS con clave de idempotencia; el resultado queda en el historial y en la auditoría.
2. Pruebas funcionales: 7 de 7 en Render y 89 de 89 en pytest con 92 % de cobertura.
3. Pruebas de integración: 4 de 4 en Render; 14 casos contra un servidor que imita a Resend (errores, tiempo de espera, reintento sin duplicar) y 14 contra la API REST.
4. Pruebas de usabilidad: 5 de 5 en Render y 22 de 22 locales.
5. Demostración en vivo (diapositiva 13): gerente, Dashboard, Asistente ("¿Para cuánto alcanza el suero de leche?", unos 45 días al corte del 6 de octubre), Reportes (filtro Crítico y Excel), Correo (solicitar resumen y ver Aceptado), Gmail.

## Preguntas probables y respuestas cortas

**¿Por qué Resend y no WhatsApp?** WhatsApp Business obtuvo el mayor puntaje en la comparación inicial, pero sus posibles cargos por mensajería quedaban fuera del presupuesto de la demostración. Con Resend el aviso llega por correo (HU15) con una API HTTPS simple y plan gratuito. Con el remitente de prueba, el destinatario debe ser el correo de la cuenta de Resend (sección 3 del informe).

**¿Por qué cambió el diagrama de la base de datos?** La docente pidió que se leyera mejor en página horizontal. Además lo regeneramos desde la base real de la v2: ahora muestra las 26 tablas (la versión anterior mostraba las 12 de la v1) con una vista general y siete figuras de detalle por módulo.

**¿Qué pasa si Resend no responde?** El envío queda como Fallido con un mensaje claro y se puede reintentar sin duplicar el correo porque usa la misma clave de idempotencia. Está probado (INT05 e INT06).

**¿Dónde está la clave de la API?** Solo en variables de entorno de Render. Nunca en el repositorio ni en la interfaz (INT03 e INT09 lo verifican).

**¿Cómo se mide la usabilidad sin usuarios?** Con métricas contables definidas antes: clics por tarea, escenarios de error explicados, sugerencias de ayuda, accesibilidad WCAG con axe-core y Lighthouse. Reconocemos que falta una prueba con usuarios reales (escala SUS).

**¿Qué corrigieron gracias a las pruebas?** Contraste insuficiente (255 elementos), etiquetas sin asociar en dos formularios y un mensaje de error poco claro.

**¿Qué tan bueno es el pronóstico?** Con datos reales el error es alto (WAPE entre 58 % y 74 %) porque la demanda es irregular y la serie es corta. Lo mostramos como error, no como precisión.

**¿Qué falta?** Probar el resumen diario y la alerta por stock en Render, repetir las suites contra Render de forma automática y evaluar con usuarios.

## Si algo falla en vivo

Di "voy a mostrar la evidencia que ya capturamos" y pasa a la diapositiva correspondiente o a las capturas del informe. No intentes arreglar nada en pantalla.
