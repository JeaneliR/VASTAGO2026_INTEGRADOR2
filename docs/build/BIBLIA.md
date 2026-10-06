# BIBLIA DEL INFORME APF2 — decisiones compartidas (todos los capítulos deben ser coherentes con esto)

## Contexto
- Universidad: UTP. Curso: Integrador 2. Docente: Yovana Connie Roca Ávila. Evaluación grupal (APF2 = Avance de Proyecto Final 2).
- Empresa cliente: **Vástago & Co** (RUC 20613556240), empresa chocolatera artesanal peruana (cacao fino de aroma, barras, bombones, cobertura). Pequeña empresa, ~15–20 trabajadores en planta/almacén/administración.
- Proyecto: "Sistema Web Inteligente para la Gestión de Producción e Inventarios en una Empresa Chocolatera mediante Analítica Predictiva e IA".
- Equipo (3): **Jeaneli Rosmery Caso Valenzuela — Product Owner (PO)**; **Arnold Steven Lujan Aderiano — Scrum Master (SM)**; **Luis Facundo Matamoros Ylizarbe — Desarrollador (Dev)**. En el Gantt se abrevian "J. Caso", "A. Lujan", "L. Matamoros". Los tres programan/documentan; los roles Scrum son además de eso.
- Hoy = 06-oct-2026 (semana 8 de 18, Sprint 3 en curso). APF1 se entregó el 12-sep-2026; docente envió observaciones el 12-sep.
- Repositorio (URL dada por el usuario): https://github.com/JeaneliR/VASTAGO2026_INTEGRADOR2 (el push desde el sandbox NO se pudo hacer: el equipo lo sube). El código vive en el árbol /home/claude/vastago-sistema.
- Idioma: español neutro/peruano formal-académico, tercera persona o "el equipo". NUNCA mencionar "Claude", "IA generativa que escribió", ni herramientas de redacción. NO inventar resultados: todo número técnico debe salir de /home/claude/vastago-sistema (código, evidencias/, tests). Lo que no se pudo hacer se declara con honestidad (ver "Pendientes").

## Cronograma (fig Gantt ya creada: assets/gantt.png) — 18 semanas, 17-ago → 20-dic-2026
| Sprint | Fechas | Semanas | Contenido | Estado hoy |
|---|---|---|---|---|
| S1 | 17-ago – 06-sep | 1–3 | Análisis empresarial AS-IS/TO-BE, levantamiento de requisitos, Product Backlog/épicas/HU (J. Caso, A. Lujan) | Completado (APF1) |
| S2 | 07-sep – 27-sep | 4–6 | Wireframes, mockups, arquitectura y diseño de BD | Completado |
| S3 | 28-sep – 18-oct | 7–9 | Módulo Inventario y Producción v1, **BD PostgreSQL + seguridad + roles**, **despliegue cloud v1 (Render)** — es el sprint de APF2 | **En curso** (día 9 de 21) |
| S4 | 19-oct – 08-nov | 10–12 | Dashboard gerencial y KPIs, reportes/exportaciones, alertas WhatsApp/correo | Por hacer |
| S5 | 09-nov – 29-nov | 13–15 | Módulo IA (pronóstico) afinado, integración de módulos, pruebas funcionales y correcciones | Por hacer |
| S6 | 30-nov – 20-dic | 16–18 | Optimización y seguridad final, documentación técnica, presentación final y demo | Por hacer |
Meses: Agosto (sem 1–2 y parte de 3), Septiembre, Octubre, Noviembre, Diciembre. Capacidad: 540 h-equipo en total (30 h/semana entre los 3 ≈ 10 h/integrante/semana) → 90 h por sprint de 3 semanas.
Hitos: APF1 12-sep, APF2 (hoy, 06-oct, sustentación), APF final dic.
Nota de honestidad: el v1 ya incluye dashboard y un pronóstico básico (regresión lineal + estacionalidad, `ml-service/forecast.py`) como base técnica; S4 y S5 lo amplían (exportaciones, alertas reales por WhatsApp/correo, afinar modelo). El sistema es una v1.

## Roles del sistema (RBAC, 4 roles; confirmar en backend/app/security.py PERMISOS)
Administrador, Gerente, Jefe de producción, Almacenero. Usuarios demo en seed.py (contraseña vía variable DEMO_PASSWORD en producción).

## Épicas (E) e Historias de usuario (HU) — IDs fijos
- E1 Gestión de inventario: HU01 registrar ingreso/salida de insumo; HU02 ver stock con semáforo (ok/warn/crit); HU03 historial de movimientos; HU04 alerta de stock mínimo.
- E2 Gestión de producción: HU05 crear orden de producción con vista previa de insumos (BOM); HU06 completar orden y descontar insumos; HU07 consultar recetas (BOM).
- E3 Seguridad y accesos: HU08 iniciar sesión seguro; HU09 control por roles; HU10 gestionar usuarios (admin); HU11 consultar bitácora de auditoría.
- E4 Analítica e IA: HU12 pronóstico de demanda de 3 meses por producto con MAPE; HU13 recomendación de producción según pronóstico.
- E5 Alertas y notificaciones: HU14 alerta por **WhatsApp Business** (canal principal) de quiebre inminente; HU15 resumen por **correo** (canal secundario/respaldo documental).
- E6 Dashboard gerencial: HU16 KPIs de negocio e inventario por rol; HU17 exportar reporte.
- E7 Despliegue y operación: HU18 despliegue en la nube; HU19 respaldo/replicación de BD y monitoreo.
Observación APF1 sobre épicas/HU → mejora: análisis comparativo del **medio de comunicación más viable** para las alertas (WhatsApp Business vs correo electrónico vs SMS vs notificación push/app) con criterios ponderados (adopción en planta peruana, costo, inmediatez, trazabilidad, esfuerzo de integración, dependencia de terceros). Resultado: WhatsApp Business como canal principal (HU14), correo como respaldo (HU15), SMS descartado por costo/limitación, push descartado (no hay app móvil). Las HU deben llevar criterios de aceptación Dado/Cuando/Entonces, prioridad MoSCoW, puntos de historia, sprint asignado, responsable.

## Riesgos (IDs fijos; posiciones en la matriz ya dibujadas en assets/risk_matrix.png: P×I)
R1 (P4,I3=12) Cambios de requisitos / alcance creciente; R2 (P3,I4=12) Baja calidad/escasez de datos históricos para entrenar el pronóstico; R3 (P2,I5=10) Brecha de seguridad (acceso no autorizado a datos); R4 (P3,I3=9) Retrasos por disponibilidad de tiempo del equipo (estudiantes); R5 (P2,I5=10) Pérdida de datos/falla de BD; R6 (P3,I3=9) Resistencia al cambio del personal de planta; R7 (P3,I2=6) Incompatibilidad/curva de aprendizaje de tecnologías; R8 (P2,I4=8) Caída o límites del servicio cloud (plan gratuito); R9 (P3,I3=9) Integración fallida con WhatsApp Business API; R10 (P2,I5=10) Pérdida de integridad del inventario (stock inconsistente); R11 (P3,I3=9) Desviación de calidad del código / deuda técnica.
Escala 1–5; nivel = P×I; bajo ≤5, medio 6–12 (amarillo), alto 13–19, crítico ≥20. Plan: estrategias mitigar/evitar/transferir/aceptar, responsable, indicador de seguimiento, revisión en cada Sprint Review.

## KPIs del sistema (cap. 6) — tabla "KPIs de Negocio e Inventario (Dashboard Gerencial)" debe ser LEGIBLE
Columnas máx. 5, fuente 9–9.5 pt: KPI | Fórmula / definición | Fuente de datos (tabla/vista) | Meta | Frecuencia. Usar nombres de tablas reales de db/schema.sql. Ejemplos: Quiebres de stock/mes, Rotación de inventario, Insumos bajo mínimo (v_inventario), Merma de producción %, Cumplimiento de órdenes, Precisión del pronóstico (MAPE; ver forecast_output.json), Valor del inventario (stock×costo_unitario). Separar en dos tablas: "Negocio/producción" y "Inventario", y "Técnicos del sistema" (disponibilidad, p95 de latencia, tiempo de carga, cobertura de pruebas).
SLA/SLO: disponibilidad 99.0 % mensual (plan gratuito: objetivo de demostración, el SLA contractual futuro 99.5 %), tiempo de respuesta p95 < 500 ms API, recuperación RPO ≤ 24 h / RTO ≤ 2 h con respaldo diario, etc. Marcar como objetivos propuestos y vincular lo medido realmente (evidencias/wpo, monitoreo).

## Tecnología (hechos del sistema construido)
Backend Flask 3 + gunicorn; PostgreSQL 16 (psycopg2, pool); patrón Repository (BaseRepository + Inventario/Produccion/Usuarios/AnaliticaRepository, `transaction()` unit of work); frontend React 19 + esbuild, SPA servida por Flask (mismo origen); ML en ml-service/forecast.py; Dockerfile multi-stage; render.yaml Blueprint (PostgreSQL gestionado + web service Docker); GitHub Actions CI; 24 pruebas pytest pasando (evidencias/04_pytest.txt).
WPO real (evidencias/wpo/wpo_metricas.json): antes FCP 2812 ms, carga 2780 ms, 1,269,679 B; después FCP 480 ms, carga 449 ms, 82,266 B (con red limitada vía CDP); gzip del bundle 243,725→74,627 B.
Seguridad (ver cap.9 y evidencias/seguridad/*): bcrypt cost 12, JWT 15 min + refresh opaco rotatorio en cookie HttpOnly/SameSite=Strict, bloqueo 5 intentos, rate limiting, RBAC, AES-256-GCM (teléfono), auditoría append-only (trigger), cabeceras CSP/HSTS/etc., SCRAM-SHA-256, límite de body, errores genéricos.
BD admin (evidencias/01–03): replicación streaming asíncrona primario(5433)→réplica(5434), slot replica1_slot, lag 0 bytes; respaldo pg_dump/pg_restore con verificación de conteos (5 tablas OK); monitoreo SQL (cache hit 99.92 %, 0 deadlocks).

## PENDIENTES honestos (declararlos en el informe con nota visible; el usuario los completa)
1. **URL del despliegue en Render y capturas del sistema en la nube**: el sandbox no puede desplegar en la cuenta de Render del equipo. El informe incluye el manual paso a paso, los artefactos listos (Dockerfile, render.yaml) y un espacio rotulado "[PENDIENTE: pegar URL Render]" / "[PENDIENTE: captura en Render]" en el cap. 11. Las pruebas de validación local (contra el mismo contenedor/gunicorn en modo producción) sí están hechas y se presentan como tales.
2. **Enlace del diseño de prototipos (Figma u otro)**: marcador "[PENDIENTE: pegar enlace del diseño]". Los wireframes (assets/wire/*.png) y los mockups hi-fi (assets/hifi/*.png, capturas reales de la app React) están en el repo.
3. La imagen Docker NO se pudo construir en el sandbox (Docker Hub bloqueado); se validó la lógica de arranque de producción con gunicorn sin Docker. Decirlo tal cual.
4. Kali Linux: se usaron las herramientas de Kali (nmap, nikto, sqlmap) instaladas en Linux (no una VM Kali completa). Decirlo con precisión.

## Convenciones del documento (gen.js)
- Cada módulo `capN.js` exporta `module.exports = (g) => [...]` (array de Paragraph/Table). Usar helpers de `g` (ver gen.js): H1 (solo UNA vez por capítulo, texto "N. Título"), H2 ("N.x Título"), H3, P, bullets([..]), numbered([..]), fig(file, título, {id, desc, source, width}), table(headers, rows, {id, title, source, widths, size, align}), code(text, {title, id}), note(text, {fill, bar}), spacer, R("fig:id") o dentro de texto `{fig:id}` `{tab:id}` `{cod:id}`.
- **Toda figura y tabla debe tener: número automático (lo da fig/table), título, descripción breve (fig: desc; tabla: un párrafo antes que la presente) y fuente.** Observación explícita del docente. Nunca poner "Figura 3" a mano: usa `{fig:id}`.
- Rutas de imágenes relativas a docs/build (p. ej. "assets/gantt.png", "../../evidencias/capturas/admin_Dashboard.png").
- Numeración de secciones manual en los títulos, siguiendo el anexo de estructura del informe EXACTAMENTE (ver ESTRUCTURA.txt).
- No usar saltos de página manuales (H1 ya lo hace). No usar `\n` en TextRun. Backticks `código` para identificadores. **negrita**, __cursiva__.
- Tablas anchas: máx. 5–6 columnas, tamaño 18–19; textos largos en párrafos, no en celdas diminutas. Ancho útil 9298 DXA (≈16.4 cm).
- Imágenes: ancho máx. 600 px (el helper limita a 610).
- Probar tu capítulo: `cd /home/claude/vastago-sistema/docs/build && ONLY=capN NODE_PATH=/home/claude/.npm-global/lib/node_modules node main.js out/test_capN.docx && python3 $(ls -d /root/.claude/skills/synced/*/docx | head -1)/scripts/office/soffice.py --headless --convert-to pdf --outdir out out/test_capN.docx && pdftoppm -jpeg -r 60 out/test_capN.pdf out/test_capN` y revisa las imágenes (Read). Cuidado: el índice no se genera con ONLY. NO ejecutes build.sh ni main.js sin ONLY (lo ejecuta el coordinador).
- No toques gen.js, main.js ni archivos de otros capítulos. Si necesitas un helper nuevo, defínelo dentro de tu módulo.

## Requerimientos (IDs fijos; los usa el Plan de pruebas cap.10 y el backlog cap.2)
RF01 Registrar movimientos de inventario INGRESO/SALIDA/AJUSTE (HU01); RF02 Consultar stock con semáforo e historial (HU02, HU03); RF03 Alertas de stock mínimo en el sistema (HU04); RF04 Crear y completar órdenes de producción con BOM y descuento de insumos (HU05–HU07); RF05 Autenticación segura (HU08); RF06 Autorización por roles (HU09); RF07 Gestión de usuarios (HU10); RF08 Bitácora de auditoría (HU11); RF09 Pronóstico de demanda con IA (HU12, HU13); RF10 Dashboard de KPIs por rol (HU16); RF11 Exportar reportes (HU17) — planificado S4, NO implementado aún; RF12 Alertas por WhatsApp/correo (HU14, HU15) — planificado S4, NO implementado aún (v1 solo muestra alertas dentro del sistema).
RNF01 Seguridad (OWASP/ISO 27001); RNF02 Rendimiento (carga inicial < 1 s en red lenta simulada; API p95 < 500 ms); RNF03 Disponibilidad y respaldo (replicación + backup); RNF04 Usabilidad (menú por rol, semáforo, mensajes claros); RNF05 Mantenibilidad (patrón Repository, pruebas automáticas, CI); RNF06 Portabilidad/despliegue (Docker + render.yaml).
Implementados en v1 (APF2): RF01–RF10 y RNF01–RNF06. Planificados: RF11, RF12.
