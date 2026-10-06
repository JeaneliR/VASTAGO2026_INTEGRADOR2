// Capítulo 11 — Despliegue (APF2)
// Los archivos de configuración se leen del repositorio (render.yaml, gunicorn.conf.py, .env.example) y los resultados de las
// pruebas de humo se leen de evidencias/08_smoke_produccion_local.txt, de modo que lo mostrado es lo real.
// Características del plan gratuito de Render: consultadas el 06-oct-2026 (ver Referencias).
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "..", "..");
const rd = (p) => fs.readFileSync(path.join(REPO, p), "utf8").replace(/\r/g, "");

module.exports = (g) => {
  const { H1, H2, H3, bullets, numbered, fig, code, note, spacer, AlignmentType } = g;
  // P local: gen.js P pasa bold/italics = undefined a runs() y anula **negrita** y __cursiva__; aquí no se pasan esas claves.
  const P = (text, o = {}) => new g.D.Paragraph({ children: g.runs(text, { size: o.size || 22, color: o.color }), alignment: o.align || g.AlignmentType.JUSTIFIED,
    spacing: { after: o.after ?? 120, line: 300, before: o.before || 0 }, indent: o.indent, keepNext: o.keepNext });

  const L = AlignmentType.LEFT, C = AlignmentType.CENTER;
  const T = (h, rows, o) => g.table(h.map((x) => String(x).replace(/`/g, "")), rows.map((r) => r.map((c) => Array.isArray(c) ? c.map((x) => String(x).replace(/`/g, "")) : String(c).replace(/`/g, ""))), o);
  const PU = "[PENDIENTE: URL Render]", PC = "[PENDIENTE: captura en Render]";

  // Ajusta a 95 columnas: un comentario final largo pasa a la línea anterior (mismo sangrado)
  const fit = (text) => text.replace(/\n+$/, "").split("\n").map((ln) => {
    if (ln.length <= 95) return ln;
    const m = ln.match(/^(\s*)(.*?)\s+(#\s.*)$/);
    if (!m) throw new Error("cap11: línea de código >95 sin comentario final: " + ln);
    return [m[1] + m[3], m[1] + m[2]].join("\n");
  }).join("\n");
  const cod = (text, title, id, source) => [...code(fit(text), { title, id, size: 15 }), P("Fuente: " + source, { size: 18, color: "6B5B4B", align: C, after: 160 })];

  // Resultados reales de las pruebas de humo locales
  const smoke = [];
  const raw = rd("evidencias/08_smoke_produccion_local.txt");
  const re = /\[(PASA |FALLA)\] (SM\d+)\s+(.+)\n\s+(.+)/g;
  let m;
  while ((m = re.exec(raw))) smoke.push({ ok: m[1].trim() === "PASA", id: m[2], nombre: m[3].trim(), detalle: m[4].trim() });
  const total = smoke.length, pasan = smoke.filter((s) => s.ok).length;
  if (total !== 28) throw new Error("cap11: se esperaban 28 verificaciones de humo y hay " + total);

  return [
    H1("11. Despliegue"),
    P("Este capítulo documenta cómo se publica el sistema en la nube y qué evidencia existe de que funciona. La sección 11.1 es el manual: explica por qué se eligió Render, qué archivos y variables intervienen, el procedimiento paso a paso, cómo replicar el despliegue, cómo volver atrás y cómo resolver los problemas más probables. La sección 11.2 presenta las pruebas: las ejecutadas hoy en modo producción local y el registro, listo para completar, de las pruebas sobre Render."),
    note("**Estado real del despliegue (06-oct-2026).** El sistema **no está desplegado en la cuenta de Render del equipo**: el entorno de desarrollo no puede crear recursos en esa cuenta. Tampoco se pudo **construir la imagen Docker**: Docker Hub respondió «Forbidden» al resolver las imágenes base (`evidencias/11_docker_build_intento.txt`). Lo que sí se probó es el mismo código, con la misma configuración de gunicorn y el mismo comando de arranque del `Dockerfile`, en modo producción local contra PostgreSQL 16 (sección 11.2, parte a). La URL pública y las capturas en la nube quedan como **" + PU + "** y **" + PC + "**."),

    // ===================================================================== 11.1
    H2("11.1 Manual de despliegue en Render"),
    H3("¿Por qué Render?"),
    P("Se eligió Render porque cubre con un solo archivo lo que el proyecto necesita: un servicio web a partir de un `Dockerfile`, una base PostgreSQL gestionada, HTTPS y un plan gratuito suficiente para la demostración académica. La {tab:d_por_que} relaciona cada necesidad con la característica de Render que la satisface. No se hizo una comparación de precios con otros proveedores; el criterio fue la simplicidad para un equipo de tres personas y el costo cero en la fase de demostración."),
    ...T(["Necesidad del proyecto", "Característica de Render", "Dónde se usa"], [
      ["Infraestructura reproducible, sin pasos manuales en el panel", "Blueprint: `render.yaml` declara la base y el servicio y Render los crea desde el repositorio (Render, s. f.-b).", "`render.yaml` en la raíz del repositorio."],
      ["Base de datos PostgreSQL 16 gestionada", "Render Postgres con versiones 13 a 18 y URL interna para los servicios de la misma región (Render, s. f.-c).", "Recurso `vastago-db`; `DATABASE_URL` por `fromDatabase`."],
      ["Ejecutar el contenedor del proyecto", "Servicio web con `runtime: docker` (Render, s. f.-b).", "`Dockerfile` multi-etapa."],
      ["HTTPS sin administrar certificados", "Certificados TLS gestionados; el balanceador termina TLS y reenvía por HTTP al servicio (Render, s. f.-f).", "Subdominio `onrender.com`; HSTS emitido por la aplicación."],
      ["No recibir tráfico hasta que el servicio responda", "Health check con `healthCheckPath`; el tráfico solo llega cuando la comprobación pasa (Render, s. f.-d).", "`/api/health`."],
      ["Costo cero para la demostración", "Plan gratuito para servicio web y base (con límites; ver «Costos y límites») (Render, s. f.-a).", "`plan: free` en ambos recursos."],
    ], { id: "d_por_que", title: "Necesidades del proyecto y características de Render que las cubren", widths: [2.8, 4.0, 2.2], size: 17,
      source: "Elaboración propia; documentación de Render consultada el 06-oct-2026 (Render, s. f.-a a s. f.-f)." }),

    H3("Arquitectura del despliegue"),
    P("La {fig:d_flujo} resume el recorrido desde el código hasta el usuario. El equipo sube el código a GitHub; Render lee el Blueprint, crea la base y el servicio, construye la imagen, arranca el contenedor y solo enruta tráfico cuando el health check responde 200. El contenedor se conecta a la base por la red interna de Render."),
    ...fig("assets/despliegue_flujo.png", "Flujo de despliegue en Render: de GitHub al usuario", { id: "d_flujo", width: 330,
      desc: "Los números 1 a 5 indican el orden en que Render ejecuta cada etapa. Las variables de entorno nacen del Blueprint: Render genera los secretos y entrega la cadena de conexión de la base; el equipo solo define DEMO_PASSWORD.",
      source: "Elaboración propia (Graphviz, docs/build/assets/despliegue_flujo.dot) a partir de render.yaml y Dockerfile." }),

    H3("Herramientas y requisitos previos"),
    P("Para desplegar solo se necesita un navegador, Git y las cuentas indicadas en la {tab:d_herr}. Las demás herramientas se usan para probar en local o para verificar el servicio ya desplegado."),
    ...T(["Herramienta o cuenta", "Versión usada", "Para qué"], [
      ["**Cuenta de GitHub** con el repositorio JeaneliR/VASTAGO2026_INTEGRADOR2", "—", "Origen del código; Render lo lee al crear el Blueprint."],
      ["**Cuenta de Render** con GitHub autorizado", "—", "Crea la base y el servicio. Al darse de alta, confirmar en el panel si el plan gratuito pide algún dato adicional."],
      ["**Git**", "2.x", "Subir el código a la rama `main`."],
      ["**Navegador moderno**", "Chromium 1194 (pruebas)", "Panel de Render y la aplicación."],
      ["**Python 3 con requests**", "3.13.16", "Ejecutar `evidencias/smoke_test.py` contra la URL pública."],
      ["**curl**", "cualquiera", "Comprobar `/api/health` desde la terminal."],
      ["*Opcional:* PostgreSQL 16 (`pg_dump`, `pg_restore`), Docker, Node 22", "16.15; 29.8.2; 22.22", "Respaldos manuales; pruebas locales de la imagen; compilar el frontend."],
    ], { id: "d_herr", title: "Herramientas, cuentas y versiones para el despliegue", widths: [3.6, 1.7, 3.7], size: 18, source: "Elaboración propia; versiones del entorno de pruebas del 06-oct-2026." }),

    H3("Archivos de configuración"),
    P("Tres archivos del repositorio gobiernan el despliegue. El primero es el Blueprint ({cod:d_render}); la {tab:d_campos} explica cada campo y por qué tiene ese valor."),
    ...cod(rd("render.yaml"), "Blueprint de Render (render.yaml, contenido completo)", "d_render", "render.yaml del repositorio (un comentario largo se muestra en la línea anterior)."),
    ...T(["Campo", "Valor", "Motivo"], [
      ["`databases[0]`", "`vastago-db`, plan `free`, PostgreSQL `\"16\"`, base `vastago`, usuario `vastago_app`", "Misma versión mayor que el desarrollo local y las pruebas, para evitar diferencias de comportamiento. El usuario no es superusuario."],
      ["`services[0]`", "`vastago-sistema`, `runtime: docker`, plan `free`", "Construye el `Dockerfile`; sin disco persistente, porque todo el estado está en la base."],
      ["`healthCheckPath`", "`/api/health`", "Endpoint público que responde `{\"status\":\"ok\"}`; Render lo consulta antes de enrutar tráfico (Render, s. f.-d)."],
      ["`APP_ENV`", "`production`", "Activa cookie `Secure`, HSTS y el rechazo de secretos de desarrollo (`config.py`)."],
      ["`DATABASE_URL`", "`fromDatabase` / `connectionString`", "Render inyecta la cadena de conexión; nunca se escribe en el repositorio (Render, s. f.-b)."],
      ["`JWT_SECRET`", "`generateValue: true`", "Render genera un valor aleatorio de 256 bits en base64 (Render, s. f.-b), que supera el mínimo de 32 caracteres."],
      ["`FIELD_ENCRYPTION_KEY`", "`generateValue: true`", "Un valor de 256 bits en base64 decodifica a 32 bytes, la longitud que exige AES-256 (`security.py`)."],
      ["`DEMO_PASSWORD`", "`sync: false`", "Render pide el valor en el panel solo en la creación inicial del Blueprint y no lo guarda en Git (Render, s. f.-b)."],
    ], { id: "d_campos", title: "Campos del Blueprint y su motivo", widths: [1.9, 3.1, 4.0], size: 17, source: "render.yaml, backend/app/config.py y backend/app/security.py; Render (s. f.-b, s. f.-d)." }),
    P("El segundo archivo es el `Dockerfile` ({tab:d_docker}). Es multi-etapa: la primera etapa compila el frontend con esbuild y la segunda instala solo las dependencias de Python y copia el resultado, de modo que la imagen final no contiene Node ni las dependencias de compilación (Docker, s. f.)."),
    ...T(["Etapa", "Imagen base", "Qué hace", "Resultado"], [
      ["1 — frontend", "`node:22-alpine`", "`npm ci` y `npm run build` (esbuild).", "`backend/static` con `bundle.js` (243,725 B), `bundle.css` e `index.html`."],
      ["2 — backend", "`python:3.13-slim`", "`pip install -r requirements.txt`; copia `backend/`, `db/`, `forecast_output.json` y el frontend compilado; crea el usuario `appuser` (UID 10001).", "Imagen ejecutable sin privilegios de administrador."],
      ["Arranque (`CMD`)", "—", "`python -m app.seed --if-empty && gunicorn -c gunicorn.conf.py wsgi:app`.", "Crea esquema y datos solo si la base está vacía; luego atiende solicitudes."],
    ], { id: "d_docker", title: "Etapas del Dockerfile", widths: [1.5, 1.8, 3.8, 2.7], size: 17, source: "Dockerfile del repositorio; Docker (s. f.). La etapa 1 se emuló sin Docker: evidencias/12_etapas_dockerfile_sin_docker.txt." }),
    P("El tercero es `gunicorn.conf.py` ({cod:d_gunicorn}). Lo relevante para Render es que el servidor escucha en `0.0.0.0` y en el puerto de la variable `PORT`, como exige la plataforma (Render, s. f.-f); Render usa 10000 por defecto, no 8000 como en el desarrollo local."),
    ...cod(rd("backend/gunicorn.conf.py"), "Configuración de gunicorn (gunicorn.conf.py)", "d_gunicorn", "backend/gunicorn.conf.py del repositorio (un comentario largo se muestra en la línea anterior)."),

    H3("Variables de entorno"),
    P("La {tab:d_vars} lista todas las variables que lee la aplicación (`config.py`, `gunicorn.conf.py` y `seed.py`). En el despliegue solo hay que escribir una a mano: `DEMO_PASSWORD`. Las demás las pone el Blueprint o tienen un valor por defecto seguro. El archivo `.env.example` sirve únicamente para el trabajo local y su contenido de ejemplo **no debe usarse en la nube**."),
    ...T(["Variable", "Quién la define", "Valor o formato", "Obligatoria", "Uso"], [
      ["`APP_ENV`", "Blueprint", "`production`", "Sí", "Modo producción: cookie Secure, HSTS y validación de secretos."],
      ["`DATABASE_URL`", "Render (`fromDatabase`)", "`postgresql://usuario:clave@host:5432/vastago`", "Sí", "Conexión a PostgreSQL (pool de 1 a 10 conexiones)."],
      ["`JWT_SECRET`", "Render (`generateValue`)", "≥ 32 caracteres", "Sí", "Firma de los tokens de acceso (HS256)."],
      ["`FIELD_ENCRYPTION_KEY`", "Render (`generateValue`)", "Base64 de 32 bytes", "Sí", "Cifrado AES-256-GCM del teléfono. **Guardar una copia: si cambia, los teléfonos ya cifrados no se pueden descifrar.**"],
      ["`DEMO_PASSWORD`", "El equipo (panel, `sync: false`)", "≥ 10 caracteres con mayúscula, minúscula, número y símbolo", "Sí", "Contraseña de los 4 usuarios demo que crea el seed. Si falta, el seed usa un valor público: **no dejarla vacía** (HAL-04)."],
      ["`PORT`", "Render", "10000 por defecto", "No", "Puerto donde escucha gunicorn."],
      ["`WEB_CONCURRENCY`", "Opcional", "2 por defecto", "No", "Número de workers de gunicorn."],
      ["`ACCESS_TOKEN_MINUTES`, `REFRESH_TOKEN_DAYS`", "Opcional", "15 y 7", "No", "Duración de los tokens."],
      ["`MAX_LOGIN_ATTEMPTS`, `LOCKOUT_MINUTES`", "Opcional", "5 y 15", "No", "Bloqueo por intentos fallidos."],
      ["`BCRYPT_ROUNDS`", "Opcional", "12", "No", "Costo del hash de contraseñas."],
      ["`ENABLE_COMPRESSION`, `RATELIMIT_ENABLED`", "Opcional", "`true` y `true`", "No", "Compresión gzip/Brotli y limitación de tasa."],
    ], { id: "d_vars", title: "Variables de entorno de la aplicación", widths: [1.9, 1.5, 2.0, 0.9, 3.2], size: 16, align: [L, L, L, C, L],
      source: "backend/app/config.py, backend/gunicorn.conf.py, backend/app/seed.py, render.yaml y .env.example; Render (s. f.-b, s. f.-f)." }),

    H3("Procedimiento paso a paso"),
    P("El procedimiento siguiente es el que debe ejecutar el equipo con su cuenta de Render. Cada paso indica qué se espera ver; si algo difiere, se consulta la tabla de solución de problemas más adelante. Los pasos 1 a 9 se pueden hacer en unos minutos más el tiempo de construcción de la imagen."),
    ...numbered([
      "**Subir el código a GitHub.** Verificar que la rama `main` contiene `render.yaml`, `Dockerfile` y `.env.example`, y que `.env` no está versionado (`.gitignore` lo excluye). Comprobar con `git ls-files | grep -E \"^\\.env$\"`: no debe devolver nada.",
      "**Conectar GitHub con Render.** Entrar a Render, autorizar el acceso a GitHub y permitir el repositorio `VASTAGO2026_INTEGRADOR2`.",
      "**Crear el Blueprint.** En el panel: **New → Blueprint**, elegir el repositorio y la rama `main`. Render lee `render.yaml` y muestra los dos recursos que va a crear: la base `vastago-db` y el servicio web `vastago-sistema`.",
      "**Completar DEMO_PASSWORD.** Render pide este valor porque el Blueprint lo marca con `sync: false`. Escribir una clave propia que cumpla la política (mínimo 10 caracteres con mayúscula, minúscula, número y símbolo) y guardarla en un gestor de contraseñas. No usar la clave de ejemplo de `.env.example`.",
      "**Aplicar el Blueprint.** Confirmar la creación. Render crea primero la base y luego construye la imagen del servicio; la construcción tarda varios minutos porque compila el frontend e instala las dependencias.",
      "**Seguir los registros (logs).** En la construcción se ven las dos etapas del `Dockerfile`. Al arrancar, el registro debe mostrar `Base de datos inicializada. Usuarios demo (contraseña: …)` la primera vez y luego `Listening at: http://0.0.0.0:10000`. En los reinicios posteriores aparece `La base de datos ya contiene datos: no se modifica.`",
      "**Esperar el estado Live.** Render marca el servicio como activo cuando `/api/health` responde con 2xx o 3xx en menos de 5 segundos (Render, s. f.-d). Anotar la URL pública `https://<servicio>.onrender.com` en la sección 11.2 (**" + PU + "**).",
      "**Probar la salud.** Abrir `https://<servicio>.onrender.com/api/health` o ejecutar `curl -s https://<servicio>.onrender.com/api/health`. Esperado: `{\"status\":\"ok\"}`. La primera petición tras un periodo de inactividad puede tardar cerca de un minuto (Render, s. f.-a).",
      "**Iniciar sesión.** Abrir la URL en el navegador e ingresar con `admin@vastagoyco.pe` y el valor de `DEMO_PASSWORD`. Esperado: el dashboard con el menú del Administrador (seis módulos).",
      "**Cambiar las credenciales demo.** Los cuatro usuarios demo comparten `DEMO_PASSWORD`. En la pantalla Usuarios, crear las cuentas reales con claves propias; luego, entrando con una cuenta Administrador nueva, desactivar los usuarios demo (un administrador no puede desactivarse a sí mismo). La versión 1 **no incluye** cambio de contraseña (HAL-04, previsto para el Sprint 4).",
      "**Ejecutar las pruebas de humo.** Desde el repositorio: `python evidencias/smoke_test.py https://<servicio>.onrender.com '<DEMO_PASSWORD>'`. La opción `--escritura` agrega un ingreso y una salida de insumo y una orden de producción, que modifican datos; usarla solo si todavía se trabaja con datos de demostración. Esperado: 28 de 28 verificaciones.",
      "**Registrar la evidencia.** Completar las tablas y las capturas de la sección 11.2 (parte b) y el checklist posterior al despliegue.",
    ]),
    note("**Orden de arranque y datos.** El comando de arranque ejecuta `python -m app.seed --if-empty` antes de gunicorn. Con `--if-empty` el script **no toca** una base que ya tiene usuarios; sin esa opción ejecutaría `schema.sql`, que borra las tablas. Por eso el servicio puede reiniciarse (Render puede reiniciar un servicio gratuito en cualquier momento) sin perder datos. Si `DEMO_PASSWORD` se cambia después del primer arranque, **no** cambia las contraseñas existentes: el seed ya no corre.", { fill: "E4F3E9", bar: "2E7D4F" }),

    H3("Replicación del despliegue a futuro"),
    P("El mismo procedimiento sirve para crear otro entorno (por ejemplo, una cuenta nueva del equipo, un entorno de pruebas o el despliegue final de diciembre). La {tab:d_replica} indica qué cambiar en cada caso. La base gratuita de Render **expira 30 días después de su creación** y no tiene respaldos (Render, s. f.-a), así que el procedimiento de renovación con respaldo manual es parte del manual y no un caso excepcional."),
    ...T(["Caso", "Qué hacer", "Qué no olvidar"], [
      ["**Otra cuenta o entorno nuevo**", "Clonar o bifurcar el repositorio, crear un Blueprint nuevo y repetir los pasos 3 a 12. Si hay dos entornos en la misma cuenta, cambiar los nombres `vastago-db` y `vastago-sistema` en `render.yaml`.", "Solo se permite una base gratuita activa por espacio de trabajo (Render, s. f.-a)."],
      ["**Renovar la base gratuita antes de que expire**", "1) Respaldar: `pg_dump -Fc \"$URL_EXTERNA\" -f vastago.dump`. 2) Crear la base nueva (Blueprint o panel). 3) Restaurar: `pg_restore --no-owner --clean --if-exists -d \"$URL_NUEVA\" vastago.dump`. 4) Apuntar `DATABASE_URL` a la nueva y redesplegar.", "Usar `pg_dump` de versión 16 o superior. Conservar `FIELD_ENCRYPTION_KEY`. Registrar la fecha de creación para planificar la renovación."],
      ["**Pasar a un plan de pago**", "Cambiar `plan` del servicio y de la base en `render.yaml` por uno de pago de la tabla vigente de Render y sincronizar el Blueprint.", "Con un plan de pago desaparecen la suspensión por inactividad y la expiración de la base; consultar precios vigentes en Render."],
      ["**Otro proveedor**", "El contenedor solo necesita: `DATABASE_URL`, `JWT_SECRET`, `FIELD_ENCRYPTION_KEY`, `APP_ENV=production`, `DEMO_PASSWORD` y que se exponga el puerto de `PORT`.", "Detrás de otro balanceador revisar `forwarded_allow_ips` y la IP del cliente (HAL-03)."],
    ], { id: "d_replica", title: "Replicación del despliegue: casos y precauciones", widths: [2.0, 4.6, 2.4], size: 17, source: "Elaboración propia; Render (s. f.-a); db/admin/backup_restore.sh como referencia de respaldo." }),

    H3("Reversión y recuperación"),
    P("La {tab:d_rollback} reúne las acciones ante los fallos más probables. Una reversión de Render reutiliza el artefacto de una compilación anterior, desactiva el despliegue automático del servicio para que un nuevo `push` no reintroduzca el defecto, y **no revierte la base de datos** (Render, s. f.-e). En este proyecto eso es menos grave porque no hay migraciones automáticas: el esquema solo se crea con la base vacía."),
    ...T(["Escenario", "Acción", "Verificación"], [
      ["**Un despliegue nuevo falla el health check**", "No requiere acción inmediata: Render cancela el despliegue si las instancias no pasan el health check en 15 minutos y mantiene la versión anterior (Render, s. f.-d). Revisar los registros y corregir.", "El servicio sigue respondiendo con la versión anterior."],
      ["**Un despliegue exitoso introduce un error**", "Panel → servicio → **Deploys** → elegir una compilación anterior exitosa → **Rollback** (Render, s. f.-e). Corregir en una rama, y reactivar el despliegue automático cuando el arreglo esté listo.", "`/api/health` y las pruebas de humo."],
      ["**Variable de entorno mal escrita**", "Corregirla en **Environment** del servicio y redesplegar.", "El registro de arranque no muestra `RuntimeError`."],
      ["**Pérdida o expiración de la base**", "Crear una base nueva y restaurar el último respaldo `.dump` (ver «Replicación»).", "Conteos por tabla iguales al respaldo (`db/admin/backup_restore.sh` muestra la verificación)."],
      ["**Sospecha de secretos expuestos**", "Cambiar `JWT_SECRET` en el panel (cierra todas las sesiones). La clave AES requiere recifrar los teléfonos antes de cambiarla (recomendación 3 de la sección 9.4.3).", "Los usuarios deben iniciar sesión de nuevo."],
    ], { id: "d_rollback", title: "Escenarios de reversión y recuperación", widths: [2.3, 4.7, 2.0], size: 17, source: "Elaboración propia; Render (s. f.-d, s. f.-e); capítulo 8 (respaldos)." }),

    H3("Solución de problemas"),
    P("La {tab:d_problemas} recoge los síntomas más probables, con su causa y la corrección. Los mensajes citados son los que produce el código (`config.py`, `security.py` y `seed.py`); otros dependen de la plataforma y se confirmarán en el primer despliegue real."),
    ...T(["Síntoma", "Causa probable", "Solución"], [
      ["El registro dice `JWT_SECRET de desarrollo no permitido en producción`.", "`APP_ENV=production` con el secreto de desarrollo por defecto: la variable no llegó al servicio.", "Verificar que `JWT_SECRET` existe en **Environment** (la genera el Blueprint). No definir secretos que contengan `dev-only`."],
      ["`FIELD_ENCRYPTION_KEY debe decodificar a 32 bytes`.", "Se escribió a mano una clave de longitud incorrecta.", "Usar el valor generado por Render, o `openssl rand -base64 32`."],
      ["El despliegue no pasa a Live; el health check falla.", "El servicio no escucha en `PORT`, o no conecta con la base.", "No fijar `PORT` a mano. Revisar el registro: si hay `OperationalError`, comprobar `DATABASE_URL` y que base y servicio estén en la misma región (URL interna) (Render, s. f.-c)."],
      ["Error de compilación en `npm ci`.", "`package-lock.json` desincronizado con `package.json`.", "Ejecutar `npm install` localmente y subir el `package-lock.json` actualizado."],
      ["La página carga en blanco o `/bundle.js` da 404.", "La etapa 1 del `Dockerfile` no copió el frontend a `backend/static`.", "Revisar el registro de construcción; `npm run build` debe imprimir «Frontend compilado»."],
      ["Login con la clave correcta devuelve 401 (`Credenciales inválidas`).", "`DEMO_PASSWORD` actual no es la que se usó en el primer arranque: el seed solo corre con la base vacía.", "Usar la clave del primer arranque, o crear un administrador por SQL con un hash bcrypt nuevo, o recrear la base vacía."],
      ["Login devuelve 423.", "Bloqueo de 15 minutos tras 5 intentos fallidos (`LOCKOUT_MINUTES`).", "Esperar o limpiar `intentos_fallidos` y `bloqueado_hasta` de ese usuario en la base."],
      ["`429 Demasiadas solicitudes` sin motivo aparente.", "El límite de tasa cuenta por la IP del par TCP; detrás del balanceador es la misma para todos (HAL-03).", "Esperar un minuto. Corrección prevista: `ProxyFix` en el Sprint 4."],
      ["La aplicación tarda cerca de un minuto en responder tras un rato sin uso.", "El servicio gratuito se suspende tras 15 minutos sin tráfico (Render, s. f.-a).", "Esperar el arranque; abrir la URL antes de una demostración. Pasar a un plan de pago elimina la suspensión."],
      ["El inicio de sesión no persiste o da error de cookie.", "La cookie de refresh es `Secure`: no se guarda sobre HTTP.", "Usar siempre la URL `https://`."],
      ["Aparece `La base de datos ya contiene datos: no se modifica.` y faltan datos.", "Comportamiento esperado de `--if-empty`.", "Para reiniciar los datos, crear una base nueva; no ejecutar `seed` sin la opción sobre una base con datos reales."],
      ["La base desapareció o rechaza conexiones tras unas semanas.", "La base gratuita expira a los 30 días y tiene 14 días de gracia (Render, s. f.-a).", "Restaurar el respaldo en una base nueva (ver «Replicación»)."],
      ["Una función necesita enviar correo.", "Render bloquea los puertos SMTP 25, 465 y 587 en servicios gratuitos (Render, s. f.-a).", "Enviar por la API HTTPS de un proveedor de correo (HAL-08, Sprint 4)."],
    ], { id: "d_problemas", title: "Solución de problemas de despliegue", widths: [2.8, 3.0, 3.2], size: 16, source: "Elaboración propia a partir del código del repositorio y de Render (s. f.-a, s. f.-c)." }),

    H3("Costos y límites del plan gratuito"),
    P("La {tab:d_limites} resume los límites del plan gratuito que afectan al proyecto. Se **verificaron** en la documentación oficial de Render el 06-oct-2026; los precios y límites de los planes de pago no se cotizaron, porque cambian y deben consultarse en la página de precios vigente. Render indica además que las instancias gratuitas no están pensadas para aplicaciones de producción (Render, s. f.-a), por lo que el SLO de disponibilidad del capítulo 6 es un objetivo de demostración."),
    ...T(["Límite", "Valor documentado", "Efecto en el proyecto", "Riesgo"], [
      ["Servicio web: suspensión por inactividad", "Tras 15 minutos sin tráfico entrante; reactivación de cerca de 1 minuto.", "La primera visita tras una pausa es lenta; afecta la demostración y el p95 real.", "R8"],
      ["Servicio web: horas gratuitas", "750 horas por espacio de trabajo y mes; si se agotan, se suspenden los servicios gratuitos hasta el mes siguiente.", "Un servicio ocupa como máximo 744 h en un mes de 31 días: cabe con un solo servicio.", "R8"],
      ["Servicio web: disco y escalado", "Sin disco persistente, sin escalado y sin SSH ni shell; los archivos se pierden al redesplegar.", "Todo el estado debe estar en la base: ya es así.", "R5"],
      ["Servicio web: reinicios", "Render puede reiniciar un servicio gratuito en cualquier momento.", "El seed con `--if-empty` hace seguro el reinicio.", "R8"],
      ["Servicio web: correo saliente", "Puertos SMTP 25, 465 y 587 bloqueados.", "El correo de RF12 debe usar una API HTTPS.", "R9"],
      ["Base PostgreSQL: expiración", "Expira 30 días después de crearse; 14 días de gracia para pasar a un plan de pago.", "Hay que renovarla y restaurar el respaldo antes de ese plazo.", "R5, R8"],
      ["Base PostgreSQL: capacidad y respaldos", "1 GB; sin respaldos de ninguna clase; una sola base gratuita activa por espacio de trabajo.", "La base de demostración usa unos 9 MB, pero el respaldo manual es obligatorio.", "R5"],
    ], { id: "d_limites", title: "Límites del plan gratuito de Render verificados el 06-oct-2026", widths: [2.3, 3.2, 2.9, 0.8], size: 17, align: [L, L, L, C],
      source: "Render (s. f.-a), «Deploy for Free», consultado el 06-oct-2026; tamaño de la base: capítulo 8. Riesgos: capítulo 5." }),
    P("El costo directo del despliegue de demostración es de US$ 0. Los costos de un entorno de pago (servicio web y base sin expiración) no se estiman aquí por no haberse cotizado; se incluirán en el plan de continuidad del Sprint 6 con los precios vigentes de ese momento."),

    // ===================================================================== 11.2
    H2("11.2 Evidencia de pruebas de despliegue"),
    H3("a) Pruebas locales en modo producción (ejecutadas el 06-oct-2026)"),
    P("Como el despliegue en Render no se pudo ejecutar, se reprodujo en local lo más cercano al contenedor: se creó una base PostgreSQL 16 vacía (`vastago_smoke`), se ejecutó `python -m app.seed --if-empty` y se inició `gunicorn -c gunicorn.conf.py wsgi:app` con `APP_ENV=production`, es decir, el `CMD` del `Dockerfile`. Los secretos se generaron al azar con `openssl rand -base64 32` y no se reutilizan; la contraseña demo es un valor de prueba que no se publica. La {tab:d_entorno} describe el entorno y la {tab:d_puertos} los procesos que escuchaban."),
    ...T(["Elemento", "Valor en la prueba local", "Equivalente en Render"], [
      ["Servidor", "gunicorn 26.2.0, 2 workers (`WEB_CONCURRENCY=2`), puerto 8100 (`PORT`)", "Mismo comando; puerto 10000."],
      ["Modo", "`APP_ENV=production`", "Igual."],
      ["Base de datos", "PostgreSQL 16.15, base `vastago_smoke`, puerto 5433", "Render Postgres 16 (URL interna)."],
      ["Secretos", "`JWT_SECRET` y `FIELD_ENCRYPTION_KEY` aleatorios; `DEMO_PASSWORD` de prueba", "Generados por Render; `DEMO_PASSWORD` del equipo."],
      ["Frontend", "`backend/static` compilado con esbuild (bundle.js de 243,725 B, idéntico al de la etapa 1 del `Dockerfile` emulada)", "Compilado dentro de la imagen."],
      ["Red", "HTTP en el bucle local; sin balanceador ni TLS", "HTTPS con TLS gestionado y balanceador."],
    ], { id: "d_entorno", title: "Entorno de la prueba local en modo producción", widths: [1.5, 4.7, 2.8], size: 17, source: "evidencias/08_smoke_produccion_local.txt, 12_etapas_dockerfile_sin_docker.txt." }),
    ...T(["Puerto", "Proceso (PID)", "Función", "Observación"], [
      ["5433", "postgres (437)", "PostgreSQL 16 primario", "Aloja `vastago`, `vastago_smoke` y `vastago_test`."],
      ["8100", "gunicorn (maestro y 2 workers)", "Servicio en modo producción", "El de esta prueba; `APP_ENV=production`."],
      ["8200", "gunicorn (maestro y 2 workers)", "Servicio de desarrollo", "`APP_ENV=development`; no se usó en las pruebas de humo."],
      ["8000", "—", "Puerto por defecto de desarrollo", "No estaba en uso al repetir las pruebas."],
    ], { id: "d_puertos", title: "Puertos y procesos activos durante las pruebas (lsof)", widths: [0.8, 2.4, 2.5, 3.3], size: 17, source: "evidencias/08b_observaciones_despliegue.txt (lsof -iTCP -sTCP:LISTEN, 06-oct-2026)." }),
    P("La batería de humo `evidencias/smoke_test.py` ejecuta " + total + " verificaciones: salud, SPA, compresión, cabeceras, autenticación, roles, datos, errores, latencia, escritura transaccional y limitación de tasa. El resultado fue **" + pasan + " de " + total + "**. La {tab:d_humo} lo reproduce tal como lo imprimió el script (se leyó del archivo de salida)."),
    ...T(["ID", "Verificación", "Estado", "Resultado observado"], smoke.map((s) => [s.id, s.nombre, s.ok ? "PASA" : "FALLA", s.detalle]),
      { id: "d_humo", title: "Resultados de las pruebas de humo en modo producción local", widths: [0.7, 4.0, 0.8, 3.5], size: 16, align: [C, L, C, L],
        source: "evidencias/08_smoke_produccion_local.txt (smoke_test.py --escritura, 06-oct-2026 01:1x UTC)." }),
    P("Además de la batería se verificó lo siguiente. La {tab:d_otras} resume tres comprobaciones del arranque y una observación sobre la IP del cliente que importa para Render."),
    ...T(["Comprobación", "Resultado", "Evidencia"], [
      ["Arranque sin secretos con `APP_ENV=production` (caso CP39)", "La aplicación **no arranca**: `RuntimeError: JWT_SECRET de desarrollo no permitido en producción`.", "Salida de `create_app()` registrada el 06-oct-2026 (capítulo 10)."],
      ["Seed idempotente (caso CP40)", "Primera ejecución: «Base de datos inicializada». Segunda: «La base de datos ya contiene datos: no se modifica.»", "Ejecución de `python -m app.seed --if-empty` dos veces."],
      ["Etapas del `Dockerfile` emuladas sin Docker", "`npm run build` en 0.32 s con el mismo `bundle.js` (243,725 B); las 9 versiones de `requirements.txt` coinciden con las instaladas.", "evidencias/12_etapas_dockerfile_sin_docker.txt."],
      ["IP del cliente detrás de un proxy (HAL-03)", "Un login con `X-Forwarded-For: 203.0.113.77` quedó registrado con la IP 127.0.0.1: la aplicación usa la IP del par TCP, no la cabecera.", "evidencias/08b_observaciones_despliegue.txt."],
    ], { id: "d_otras", title: "Otras comprobaciones de arranque y de configuración", widths: [2.6, 4.2, 2.2], size: 17, source: "Elaboración propia a partir de las evidencias indicadas." }),
    P("Conviene dejar claro qué demuestra esta prueba local y qué no, para no atribuirle más alcance del que tiene. La {tab:d_alcance} lo separa."),
    ...T(["Sí demuestra", "No demuestra"], [
      ["La aplicación arranca en modo producción con la configuración de `gunicorn.conf.py`, siembra la base vacía una sola vez y responde en `/api/health`.", "Que la imagen Docker se construye: no se pudo construir por el bloqueo de Docker Hub (`evidencias/11_docker_build_intento.txt`)."],
      ["Cookie `Secure`, HSTS, compresión, cabeceras, roles y limitación de tasa funcionan con `APP_ENV=production`.", "El comportamiento detrás del balanceador de Render: TLS real, IP del cliente (HAL-03) y encabezados reenviados."],
      ["La latencia propia de la aplicación es de milisegundos (p95 de 2.3 ms en `/api/health`).", "La latencia real en la nube, el arranque en frío tras 15 minutos de inactividad ni los tiempos de construcción."],
      ["Las 28 verificaciones pasan sobre PostgreSQL 16 con triggers y restricciones reales.", "La red interna entre el servicio y la base de Render, ni el efecto de la expiración de la base."],
    ], { id: "d_alcance", title: "Alcance de la prueba local en modo producción", widths: [4.5, 4.5], size: 17, zebra: false, source: "Elaboración propia." }),

    H3("b) Registro de pruebas en Render (para completar con el despliegue del equipo)"),
    note("**" + PU + " · " + PC + "** — El entorno de desarrollo no puede crear recursos en la cuenta de Render del equipo, de modo que **no hay resultados de Render en este informe**. Las tablas y los recuadros siguientes están listos para completarse después de seguir el procedimiento de la sección 11.1. Donde dice «☐» se marca el resultado; donde dice «[PENDIENTE…]» se pega el dato real. No se debe completar con valores supuestos."),
    ...T(["Dato del despliegue", "Valor"], [
      ["URL pública del servicio", "**" + PU + "**"],
      ["Fecha y hora del despliegue (hora de Lima)", "[PENDIENTE: captura en Render]"],
      ["Región del servicio y de la base (deben ser la misma)", "[PENDIENTE: captura en Render]"],
      ["Commit desplegado (hash corto)", "[PENDIENTE: captura en Render]"],
      ["Duración de la construcción y del primer arranque", "[PENDIENTE: captura en Render]"],
      ["Versión de PostgreSQL mostrada en el panel de la base", "[PENDIENTE: captura en Render]"],
      ["Tiempo de la primera petición tras 15 minutos de inactividad", "[PENDIENTE: captura en Render]"],
      ["Persona que ejecutó el despliegue", "[PENDIENTE: captura en Render]"],
    ], { id: "d_datos_render", title: "Datos del despliegue en Render (por completar)", widths: [4.3, 4.7], size: 18, source: "Por completar por el equipo tras el despliegue." }),
    ...T(["Grupo de verificaciones", "Cantidad", "Local (06-oct)", "Render"], [
      ["Salud, SPA y compresión (SM01–SM05)", "5", "5/5", "☐ ___/5"],
      ["Cabeceras y HSTS (SM06–SM09)", "4", "4/4", "☐ ___/4"],
      ["Autenticación y roles (SM10–SM15)", "6", "6/6", "☐ ___/6"],
      ["Datos sembrados (SM16–SM19)", "4", "4/4", "☐ ___/4"],
      ["Errores y latencia (SM20–SM23)", "4", "4/4", "☐ ___/4"],
      ["Escritura transaccional (SM24–SM27, con `--escritura`)", "4", "4/4", "☐ ___/4"],
      ["Limitación de tasa (SM28)", "1", "1/1", "☐ ___/1"],
      ["**Total**", "**28**", "**28/28**", "☐ ___/28"],
    ], { id: "d_humo_render", title: "Resultado de smoke_test.py sobre Render (por completar)", widths: [4.6, 1.2, 1.5, 1.7], size: 18, align: [L, C, C, C],
      source: "Local: evidencias/08_smoke_produccion_local.txt. Render: " + PU + "." }),
    ...fig("assets/pend_render_live.png", "Panel de Render con el servicio y la base en estado Live (captura pendiente)", { id: "d_cap_live", width: 440,
      desc: "Debe mostrar el servicio vastago-sistema activo, la base vastago-db y la última compilación; sin exhibir valores de variables secretas.",
      source: PC + " — se completa tras el despliegue en la cuenta de Render del equipo." }),
    ...fig("assets/pend_render_health.png", "Verificación de /api/health sobre HTTPS (captura pendiente)", { id: "d_cap_health", width: 440,
      desc: "Debe mostrar la URL pública con candado HTTPS y la respuesta {\"status\":\"ok\"}.",
      source: PC + " — se completa tras el despliegue." }),
    ...fig("assets/pend_render_app.png", "Aplicación en la nube con una cuenta de cada rol (captura pendiente)", { id: "d_cap_app", width: 440,
      desc: "Debe incluir el login y el dashboard de Administrador, Jefe de Producción, Almacenero y Gerente sobre la URL pública.",
      source: PC + " — se completa tras el despliegue." }),

    H3("c) Checklist posterior al despliegue y su relación con los casos del capítulo 10"),
    P("El checklist de la {tab:d_check} vincula cada verificación posterior al despliegue con el caso de prueba del capítulo 10 que la define, con la prueba de humo que la automatiza y con el resultado local. La última columna queda vacía hasta que el equipo ejecute el despliegue; así, el despliegue no se da por terminado hasta marcar todos los puntos."),
    ...T(["N.º", "Verificación posterior al despliegue", "Caso (cap. 10)", "Humo", "Local 06-oct", "Render"], [
      ["1", "El servicio está Live y `/api/health` responde 200", "CP36, CP51", "SM01", "PASA", "☐"],
      ["2", "La URL es HTTPS con certificado válido y se emite HSTS", "CP38, CP50", "SM08", "PASA (HSTS); TLS local", "☐"],
      ["3", "La SPA y el bundle cargan", "CP36", "SM02–SM03", "PASA", "☐"],
      ["4", "Compresión gzip o Brotli activa", "CP37", "SM04–SM05", "PASA", "☐"],
      ["5", "Cabeceras de seguridad y `Server` sin versión", "CP22, CP47", "SM06–SM07, SM09", "PASA", "☐"],
      ["6", "Login por rol y cookie con HttpOnly, Secure y SameSite", "CP09, CP35", "SM10–SM11", "PASA", "☐"],
      ["7", "Credenciales inválidas y token ausente se rechazan", "CP10, CP11", "SM12–SM13", "PASA", "☐"],
      ["8", "Un rol sin permiso recibe 403", "CP14", "SM14", "PASA", "☐"],
      ["9", "La base está conectada y sembrada", "CP36, CP40", "SM16–SM19", "PASA", "☐"],
      ["10", "Movimientos y órdenes se guardan y se auditan", "CP02, CP05, CP27", "SM24–SM27", "PASA", "☐"],
      ["11", "Limitación de tasa en el login", "CP10, CP15", "SM28", "PASA (con HAL-03)", "☐"],
      ["12", "Latencia p95 < 500 ms tras el arranque", "CP42", "SM22–SM23", "PASA (local)", "☐"],
      ["13", "Tiempo de arranque en frío registrado", "—", "SM01 (primera petición)", "No aplica en local", "☐"],
      ["14", "Credenciales demo reemplazadas por cuentas reales", "CP33", "(manual)", "No aplica", "☐"],
      ["15", "La IP registrada en auditoría es la del cliente, no la del balanceador", "—", "(manual)", "127.0.0.1 en local (HAL-03)", "☐"],
      ["16", "Pentest remoto (Nmap, Nikto, sqlmap) sobre la URL pública", "CP47, CP48", "—", "Solo local", "☐"],
      ["17", "Respaldo `pg_dump` de la base de Render y restauración verificada", "CP44", "—", "Solo local", "☐"],
    ], { id: "d_check", title: "Checklist posterior al despliegue y casos del capítulo 10 asociados", widths: [0.5, 3.6, 1.2, 1.3, 1.5, 0.9], size: 16, align: [C, L, L, L, L, C],
      source: "Elaboración propia a partir de los casos CP36–CP51 del capítulo 10 y de evidencias/smoke_test.py." }),

    H3("Conclusión del despliegue"),
    P("El sistema está **listo para desplegarse**: los artefactos existen, el arranque de producción funciona con PostgreSQL 16 y las 28 pruebas de humo pasan en local. Lo que falta es ejecutar el procedimiento en la cuenta de Render del equipo, completar la sección 11.2 (parte b) y verificar sobre la plataforma real tres puntos que en local no pueden probarse: la construcción de la imagen, la IP del cliente detrás del balanceador (HAL-03) y el arranque en frío. El manual también se entrega como `docs/MANUAL_DESPLIEGUE.md` en el repositorio, con el mismo contenido para consulta rápida."),
  ];
};
