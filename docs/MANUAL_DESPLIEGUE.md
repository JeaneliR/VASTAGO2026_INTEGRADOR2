# Manual de despliegue en Render

Sistema Web Inteligente para la Gestión de Producción e Inventarios — Vástago & Co (UTP, Integrador 2).
Este manual es la versión para el repositorio de la sección 11.1 del informe APF2. Los datos de Render se verificaron en su documentación oficial el 6 de octubre de 2026; los planes y límites de una plataforma cambian, por lo que deben confirmarse en las páginas de la sección "Referencias" antes de contratar.

> **Estado real del despliegue (06-oct-2026).** El sistema **no está desplegado en la cuenta de Render del equipo**: el entorno de desarrollo no puede crear recursos en esa cuenta. Tampoco se pudo **construir la imagen Docker**: Docker Hub respondió "Forbidden" al resolver las imágenes base (`evidencias/11_docker_build_intento.txt`). Lo que sí se probó es el mismo código, con la misma configuración de gunicorn y el mismo comando de arranque del `Dockerfile`, en modo producción local contra PostgreSQL 16 (28 de 28 pruebas de humo, `evidencias/08_smoke_produccion_local.txt`). La URL pública y las capturas en la nube quedan como **[PENDIENTE: URL Render]** y **[PENDIENTE: captura en Render]**.

## 1. Por qué Render

Render cubre con un solo archivo lo que el proyecto necesita: un servicio web a partir de un `Dockerfile`, una base PostgreSQL gestionada, HTTPS y un plan gratuito suficiente para la demostración académica. No se hizo una comparación de precios con otros proveedores; el criterio fue la simplicidad para un equipo de tres personas y el costo cero en la fase de demostración.

| Necesidad del proyecto | Característica de Render | Dónde se usa |
|---|---|---|
| Infraestructura reproducible, sin pasos manuales en el panel | Blueprint: `render.yaml` declara la base y el servicio y Render los crea desde el repositorio (Render, s. f.-b) | `render.yaml` en la raíz |
| Base PostgreSQL 16 gestionada | Render Postgres con versiones 13 a 18 y URL interna para los servicios de la misma región (Render, s. f.-c) | Recurso `vastago-db`; `DATABASE_URL` por `fromDatabase` |
| Ejecutar el contenedor del proyecto | Servicio web con `runtime: docker` (Render, s. f.-b) | `Dockerfile` multi-etapa |
| HTTPS sin administrar certificados | Certificados TLS gestionados; el balanceador termina TLS y reenvía por HTTP (Render, s. f.-f) | Subdominio `onrender.com`; HSTS emitido por la aplicación |
| No recibir tráfico hasta que el servicio responda | Health check con `healthCheckPath` (Render, s. f.-d) | `/api/health` |
| Costo cero para la demostración | Plan gratuito para servicio web y base, con límites (Render, s. f.-a) | `plan: free` en ambos recursos |

Flujo: el equipo sube el código a GitHub; Render lee el Blueprint, crea la base y el servicio, construye la imagen, arranca el contenedor y solo enruta tráfico cuando el health check responde 200. El contenedor se conecta a la base por la red interna de Render. (Diagrama: `docs/build/assets/despliegue_flujo.png`.)

## 2. Herramientas y requisitos previos

| Herramienta o cuenta | Versión usada | Para qué |
|---|---|---|
| Cuenta de GitHub con el repositorio `JeaneliR/VASTAGO2026_INTEGRADOR2` | — | Origen del código |
| Cuenta de Render con GitHub autorizado | — | Crea la base y el servicio (confirmar en el panel si el plan gratuito pide algún dato adicional) |
| Git | 2.x | Subir el código a la rama `main` |
| Navegador moderno | Chromium 1194 (pruebas) | Panel de Render y la aplicación |
| Python 3 con `requests` | 3.13.16 | Ejecutar `evidencias/smoke_test.py` |
| curl | cualquiera | Comprobar `/api/health` |
| Opcional: PostgreSQL 16 (`pg_dump`, `pg_restore`), Docker, Node 22 | 16.15; 29.8.2; 22.22 | Respaldos manuales; probar la imagen; compilar el frontend |

## 3. Archivos de configuración

### 3.1 `render.yaml` (Blueprint)

```yaml
databases:
  - name: vastago-db
    plan: free
    databaseName: vastago
    user: vastago_app
    postgresMajorVersion: "16"

services:
  - type: web
    name: vastago-sistema
    runtime: docker
    plan: free
    healthCheckPath: /api/health
    envVars:
      - key: APP_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase: { name: vastago-db, property: connectionString }
      - key: JWT_SECRET
        generateValue: true     # secreto aleatorio, nunca está en el repositorio
      - key: FIELD_ENCRYPTION_KEY
        generateValue: true     # clave AES-256 (256 bits en base64)
      - key: DEMO_PASSWORD
        sync: false             # la defines tú en el panel (no se guarda en Git)
```

| Campo | Valor | Motivo |
|---|---|---|
| `databases[0]` | `vastago-db`, plan `free`, PostgreSQL 16, base `vastago`, usuario `vastago_app` | Misma versión mayor que el desarrollo y las pruebas; el usuario no es superusuario |
| `services[0]` | `vastago-sistema`, `runtime: docker`, plan `free` | Construye el `Dockerfile`; sin disco persistente, porque todo el estado está en la base |
| `healthCheckPath` | `/api/health` | Responde `{"status":"ok"}`; Render lo consulta antes de enrutar tráfico (Render, s. f.-d) |
| `APP_ENV` | `production` | Activa cookie `Secure`, HSTS y el rechazo de secretos de desarrollo |
| `DATABASE_URL` | `fromDatabase` / `connectionString` | Render inyecta la cadena; nunca se escribe en el repositorio |
| `JWT_SECRET` | `generateValue: true` | Valor aleatorio de 256 bits; supera el mínimo de 32 caracteres |
| `FIELD_ENCRYPTION_KEY` | `generateValue: true` | 256 bits en base64 decodifican a 32 bytes, la longitud que exige AES-256 |
| `DEMO_PASSWORD` | `sync: false` | Render pide el valor en el panel solo al crear el Blueprint y no lo guarda en Git |

### 3.2 `Dockerfile` (multi-etapa)

| Etapa | Imagen base | Qué hace | Resultado |
|---|---|---|---|
| 1 — frontend | `node:22-alpine` | `npm ci` y `npm run build` (esbuild) | `backend/static` con `bundle.js` (243,725 B), `bundle.css`, `index.html` |
| 2 — backend | `python:3.13-slim` | `pip install -r requirements.txt`; copia `backend/`, `db/`, `forecast_output.json` y el frontend; crea el usuario `appuser` (UID 10001) | Imagen ejecutable sin privilegios de administrador |
| Arranque (`CMD`) | — | `python -m app.seed --if-empty && gunicorn -c gunicorn.conf.py wsgi:app` | Crea esquema y datos solo si la base está vacía; luego atiende solicitudes |

La etapa 1 se emuló sin Docker (`evidencias/12_etapas_dockerfile_sin_docker.txt`); la imagen completa no pudo construirse por el bloqueo de Docker Hub.

### 3.3 `backend/gunicorn.conf.py`

El servidor escucha en `0.0.0.0` y en el puerto de la variable `PORT` (Render usa 10000 por defecto; el desarrollo local usa 8000), con 2 workers por defecto (`WEB_CONCURRENCY`). Oculta el nombre y la versión del servidor en la cabecera `Server`.

## 4. Variables de entorno

Solo hay que escribir una a mano: `DEMO_PASSWORD`. El archivo `.env.example` sirve únicamente para el trabajo local; su contenido **no debe usarse en la nube**.

| Variable | Quién la define | Valor o formato | Obligatoria | Uso |
|---|---|---|---|---|
| `APP_ENV` | Blueprint | `production` | Sí | Cookie Secure, HSTS y validación de secretos |
| `DATABASE_URL` | Render (`fromDatabase`) | `postgresql://usuario:clave@host:5432/vastago` | Sí | Conexión a PostgreSQL (pool de 1 a 10 conexiones) |
| `JWT_SECRET` | Render (`generateValue`) | 32 caracteres o más | Sí | Firma de los tokens de acceso (HS256) |
| `FIELD_ENCRYPTION_KEY` | Render (`generateValue`) | Base64 de 32 bytes | Sí | Cifrado AES-256-GCM del teléfono. **Guardar una copia: si cambia, los teléfonos ya cifrados no se pueden descifrar** |
| `DEMO_PASSWORD` | El equipo (panel, `sync: false`) | 10 caracteres o más, con mayúscula, minúscula, número y símbolo | Sí | Contraseña de los 4 usuarios demo que crea el seed. Si falta, el seed usa un valor público: **no dejarla vacía** (HAL-04) |
| `PORT` | Render | 10000 por defecto | No | Puerto de gunicorn |
| `WEB_CONCURRENCY` | Opcional | 2 por defecto | No | Número de workers |
| `ACCESS_TOKEN_MINUTES`, `REFRESH_TOKEN_DAYS` | Opcional | 15 y 7 | No | Duración de los tokens |
| `MAX_LOGIN_ATTEMPTS`, `LOCKOUT_MINUTES` | Opcional | 5 y 15 | No | Bloqueo por intentos fallidos |
| `BCRYPT_ROUNDS` | Opcional | 12 | No | Costo del hash de contraseñas |
| `ENABLE_COMPRESSION`, `RATELIMIT_ENABLED` | Opcional | `true` y `true` | No | Compresión gzip/Brotli y limitación de tasa |

## 5. Procedimiento paso a paso

1. **Subir el código a GitHub.** Verificar que la rama `main` contiene `render.yaml`, `Dockerfile` y `.env.example`, y que `.env` no está versionado: `git ls-files | grep -E "^\.env$"` no debe devolver nada.
2. **Conectar GitHub con Render.** Autorizar el acceso a GitHub y permitir el repositorio `VASTAGO2026_INTEGRADOR2`.
3. **Crear el Blueprint.** En el panel: **New → Blueprint**, elegir el repositorio y la rama `main`. Render lee `render.yaml` y muestra los dos recursos: la base `vastago-db` y el servicio `vastago-sistema`.
4. **Completar `DEMO_PASSWORD`.** Render pide el valor porque el Blueprint lo marca con `sync: false`. Escribir una clave propia que cumpla la política y guardarla en un gestor de contraseñas. No usar la clave de ejemplo de `.env.example`.
5. **Aplicar el Blueprint.** Render crea primero la base y luego construye la imagen; la construcción tarda varios minutos (compila el frontend e instala dependencias).
6. **Seguir los registros (logs).** Se ven las dos etapas del `Dockerfile`. Al arrancar, el registro muestra `Base de datos inicializada. Usuarios demo (contraseña: …)` la primera vez y luego `Listening at: http://0.0.0.0:10000`. En los reinicios aparece `La base de datos ya contiene datos: no se modifica.`
7. **Esperar el estado Live.** Render marca el servicio como activo cuando `/api/health` responde con 2xx o 3xx en menos de 5 segundos (Render, s. f.-d). Anotar la URL pública `https://<servicio>.onrender.com` (**[PENDIENTE: URL Render]**).
8. **Probar la salud.** `curl -s https://<servicio>.onrender.com/api/health` debe devolver `{"status":"ok"}`. La primera petición tras un periodo de inactividad puede tardar cerca de un minuto (Render, s. f.-a).
9. **Iniciar sesión.** Abrir la URL e ingresar con `admin@vastagoyco.pe` y el valor de `DEMO_PASSWORD`. Esperado: dashboard con el menú del Administrador (seis módulos).
10. **Cambiar las credenciales demo.** Los cuatro usuarios demo comparten `DEMO_PASSWORD`. En Usuarios, crear las cuentas reales con claves propias y, entrando con un Administrador nuevo, desactivar los usuarios demo (un administrador no puede desactivarse a sí mismo). La versión 1 **no incluye** cambio de contraseña (HAL-04, previsto para el Sprint 4).
11. **Ejecutar las pruebas de humo.** Desde el repositorio:
    ```
    python evidencias/smoke_test.py https://<servicio>.onrender.com '<DEMO_PASSWORD>'
    ```
    La opción `--escritura` agrega un ingreso y una salida de insumo y una orden de producción (modifica datos de demostración). Esperado: 28 de 28 verificaciones. Para recorrer la interfaz por rol existe `evidencias/uat_ui.py <URL> <CLAVE> [carpeta_capturas]` (requiere Playwright; modifica datos).
12. **Registrar la evidencia.** Completar el registro de la sección 11.2 (parte b) del informe y la lista de verificación de la sección 10.

**Orden de arranque y datos.** El arranque ejecuta `python -m app.seed --if-empty` antes de gunicorn. Con `--if-empty` el script no toca una base que ya tiene usuarios; sin esa opción ejecutaría `schema.sql`, que borra las tablas. Por eso el servicio puede reiniciarse sin perder datos. Si `DEMO_PASSWORD` se cambia después del primer arranque, **no** cambia las contraseñas existentes.

## 6. Replicación del despliegue

La base gratuita de Render expira 30 días después de su creación y no tiene respaldos (Render, s. f.-a); la renovación con respaldo manual es parte del procedimiento normal.

| Caso | Qué hacer | Qué no olvidar |
|---|---|---|
| Otra cuenta o entorno nuevo | Clonar o bifurcar el repositorio, crear un Blueprint nuevo y repetir los pasos 3 a 12. Si hay dos entornos en la misma cuenta, cambiar los nombres `vastago-db` y `vastago-sistema` | Solo se permite una base gratuita activa por espacio de trabajo (Render, s. f.-a) |
| Renovar la base gratuita antes de que expire | 1) `pg_dump -Fc "$URL_EXTERNA" -f vastago.dump`. 2) Crear la base nueva. 3) `pg_restore --no-owner --clean --if-exists -d "$URL_NUEVA" vastago.dump`. 4) Apuntar `DATABASE_URL` a la nueva y redesplegar | `pg_dump` de versión 16 o superior. Conservar `FIELD_ENCRYPTION_KEY`. Registrar la fecha de creación |
| Pasar a un plan de pago | Cambiar `plan` del servicio y de la base en `render.yaml` y sincronizar el Blueprint | Con plan de pago desaparecen la suspensión por inactividad y la expiración; consultar precios vigentes |
| Otro proveedor | El contenedor solo necesita `DATABASE_URL`, `JWT_SECRET`, `FIELD_ENCRYPTION_KEY`, `APP_ENV=production`, `DEMO_PASSWORD` y exponer el puerto de `PORT` | Detrás de otro balanceador revisar `forwarded_allow_ips` y la IP del cliente (HAL-03) |

Como referencia de respaldo y restauración: `db/admin/backup_restore.sh`.

## 7. Reversión y recuperación

Una reversión de Render reutiliza el artefacto de una compilación anterior, desactiva el despliegue automático del servicio para que un nuevo `push` no reintroduzca el defecto, y **no revierte la base de datos** (Render, s. f.-e). Aquí es menos grave porque no hay migraciones automáticas.

| Escenario | Acción | Verificación |
|---|---|---|
| Un despliegue nuevo falla el health check | Render cancela el despliegue si las instancias no pasan el health check en 15 minutos y mantiene la versión anterior (Render, s. f.-d). Revisar los registros y corregir | El servicio sigue con la versión anterior |
| Un despliegue exitoso introduce un error | Panel → servicio → **Deploys** → compilación anterior exitosa → **Rollback** (Render, s. f.-e). Corregir en una rama y reactivar el despliegue automático | `/api/health` y pruebas de humo |
| Variable de entorno mal escrita | Corregirla en **Environment** y redesplegar | El registro de arranque no muestra `RuntimeError` |
| Pérdida o expiración de la base | Crear una base nueva y restaurar el último `.dump` | Conteos por tabla iguales al respaldo |
| Sospecha de secretos expuestos | Cambiar `JWT_SECRET` (cierra todas las sesiones). La clave AES exige recifrar los teléfonos antes de cambiarla | Los usuarios inician sesión de nuevo |

## 8. Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `JWT_SECRET de desarrollo no permitido en producción` | `APP_ENV=production` con el secreto de desarrollo: la variable no llegó al servicio | Verificar `JWT_SECRET` en **Environment**; no definir secretos con `dev-only` |
| `FIELD_ENCRYPTION_KEY debe decodificar a 32 bytes` | Clave escrita a mano con longitud incorrecta | Usar el valor generado por Render o `openssl rand -base64 32` |
| No pasa a Live; el health check falla | El servicio no escucha en `PORT` o no conecta con la base | No fijar `PORT` a mano; si hay `OperationalError`, revisar `DATABASE_URL` y que base y servicio estén en la misma región (Render, s. f.-c) |
| Error de compilación en `npm ci` | `package-lock.json` desincronizado | `npm install` local y subir el lock actualizado |
| Página en blanco o `/bundle.js` da 404 | La etapa 1 no copió el frontend a `backend/static` | Revisar el registro; `npm run build` debe imprimir "Frontend compilado" |
| Login con clave correcta devuelve 401 | `DEMO_PASSWORD` actual no es la del primer arranque: el seed solo corre con base vacía | Usar la clave del primer arranque, crear un administrador por SQL con hash bcrypt nuevo o recrear la base vacía |
| Login devuelve 423 | Bloqueo de 15 minutos tras 5 intentos fallidos | Esperar o limpiar `intentos_fallidos` y `bloqueado_hasta` del usuario |
| `429 Demasiadas solicitudes` sin motivo | El límite cuenta por la IP del par TCP; detrás del balanceador es la misma para todos (HAL-03) | Esperar un minuto. Corrección prevista: `ProxyFix` (Sprint 4) |
| Tarda cerca de un minuto tras un rato sin uso | El servicio gratuito se suspende tras 15 minutos sin tráfico (Render, s. f.-a) | Abrir la URL antes de una demostración; un plan de pago elimina la suspensión |
| La sesión no persiste o hay error de cookie | La cookie de refresh es `Secure`: no se guarda sobre HTTP | Usar siempre `https://` |
| "La base de datos ya contiene datos" y faltan datos | Comportamiento esperado de `--if-empty` | Crear una base nueva; no ejecutar `seed` sin la opción sobre datos reales |
| La base desaparece o rechaza conexiones tras semanas | Expira a los 30 días, con 14 días de gracia (Render, s. f.-a) | Restaurar el respaldo en una base nueva |
| Una función necesita enviar correo | Render bloquea los puertos SMTP 25, 465 y 587 en servicios gratuitos (Render, s. f.-a) | Usar la API HTTPS de un proveedor de correo (HAL-08, Sprint 4) |

## 9. Costos y límites del plan gratuito (verificado el 06-oct-2026)

| Límite | Valor documentado | Efecto en el proyecto |
|---|---|---|
| Servicio web: suspensión por inactividad | Tras 15 minutos sin tráfico; reactivación de cerca de 1 minuto | La primera visita tras una pausa es lenta |
| Servicio web: horas gratuitas | 750 horas por espacio de trabajo y mes; si se agotan, se suspenden los servicios gratuitos hasta el mes siguiente | Un servicio ocupa como máximo 744 h al mes: cabe con un solo servicio |
| Servicio web: disco y escalado | Sin disco persistente, sin escalado y sin SSH ni shell | Todo el estado está en la base |
| Servicio web: reinicios | Render puede reiniciar un servicio gratuito en cualquier momento | El seed con `--if-empty` hace seguro el reinicio |
| Servicio web: correo saliente | Puertos SMTP 25, 465 y 587 bloqueados | El correo de RF12 debe usar una API HTTPS |
| Base PostgreSQL: expiración | Expira 30 días después de crearse; 14 días de gracia | Renovar y restaurar el respaldo antes de ese plazo |
| Base PostgreSQL: capacidad y respaldos | 1 GB; sin respaldos; una sola base gratuita activa por espacio de trabajo | La base de demostración usa unos 9 MB; el respaldo manual es obligatorio |

Render indica que las instancias gratuitas no están pensadas para aplicaciones de producción (Render, s. f.-a). El costo directo del despliegue de demostración es de US$ 0; los costos de un entorno de pago no se cotizaron y deben consultarse en la página de precios vigente.

## 10. Lista de verificación posterior al despliegue

Marcar cada punto solo con resultados reales sobre la URL pública. La columna "Caso" remite al capítulo 10 del informe; "Humo" a `evidencias/smoke_test.py`.

| N.º | Verificación | Caso | Humo | Local 06-oct | Render |
|---|---|---|---|---|---|
| 1 | El servicio está Live y `/api/health` responde 200 | CP36, CP51 | SM01 | PASA | [ ] |
| 2 | La URL es HTTPS con certificado válido y se emite HSTS | CP38, CP50 | SM08 | PASA (HSTS); TLS local | [ ] |
| 3 | La SPA y el bundle cargan | CP36 | SM02–SM03 | PASA | [ ] |
| 4 | Compresión gzip o Brotli activa | CP37 | SM04–SM05 | PASA | [ ] |
| 5 | Cabeceras de seguridad y `Server` sin versión | CP22, CP47 | SM06–SM07, SM09 | PASA | [ ] |
| 6 | Login por rol y cookie con HttpOnly, Secure y SameSite | CP09, CP35 | SM10–SM11 | PASA | [ ] |
| 7 | Credenciales inválidas y token ausente se rechazan | CP10, CP11 | SM12–SM13 | PASA | [ ] |
| 8 | Un rol sin permiso recibe 403 | CP14 | SM14 | PASA | [ ] |
| 9 | La base está conectada y sembrada | CP36, CP40 | SM16–SM19 | PASA | [ ] |
| 10 | Movimientos y órdenes se guardan y se auditan | CP02, CP05, CP27 | SM24–SM27 | PASA | [ ] |
| 11 | Limitación de tasa en el login | CP10, CP15 | SM28 | PASA (con HAL-03) | [ ] |
| 12 | Latencia p95 < 500 ms tras el arranque | CP42 | SM22–SM23 | PASA (local) | [ ] |
| 13 | Tiempo de arranque en frío registrado | — | SM01 (primera petición) | No aplica en local | [ ] |
| 14 | Credenciales demo reemplazadas por cuentas reales | CP33 | (manual) | No aplica | [ ] |
| 15 | La IP registrada en auditoría es la del cliente, no la del balanceador | — | (manual) | 127.0.0.1 en local (HAL-03) | [ ] |
| 16 | Pentest remoto (Nmap, Nikto, sqlmap) sobre la URL pública | CP47, CP48 | — | Solo local | [ ] |
| 17 | Respaldo `pg_dump` de la base de Render y restauración verificada | CP44 | — | Solo local | [ ] |

### Datos del despliegue por completar

| Dato | Valor |
|---|---|
| URL pública del servicio | [PENDIENTE: URL Render] |
| Fecha y hora del despliegue (hora de Lima) | [PENDIENTE: captura en Render] |
| Región del servicio y de la base (deben coincidir) | [PENDIENTE: captura en Render] |
| Commit desplegado (hash corto) | [PENDIENTE: captura en Render] |
| Duración de la construcción y del primer arranque | [PENDIENTE: captura en Render] |
| Versión de PostgreSQL mostrada en el panel | [PENDIENTE: captura en Render] |
| Tiempo de la primera petición tras 15 minutos de inactividad | [PENDIENTE: captura en Render] |
| Persona que ejecutó el despliegue | [PENDIENTE: captura en Render] |

Capturas pendientes: panel de Render con el servicio y la base en estado Live; `/api/health` sobre HTTPS; la aplicación con una cuenta de cada rol. Todas: **[PENDIENTE: captura en Render]**.

## Referencias

Render. (s. f.-a). *Deploy for free*. Recuperado el 6 de octubre de 2026, de https://render.com/docs/free

Render. (s. f.-b). *Blueprint specification*. Recuperado el 6 de octubre de 2026, de https://render.com/docs/blueprint-spec

Render. (s. f.-c). *Creating and connecting to Render Postgres databases*. Recuperado el 6 de octubre de 2026, de https://render.com/docs/postgresql-creating-connecting

Render. (s. f.-d). *Health checks*. Recuperado el 6 de octubre de 2026, de https://render.com/docs/health-checks

Render. (s. f.-e). *Rollbacks*. Recuperado el 6 de octubre de 2026, de https://render.com/docs/rollbacks

Render. (s. f.-f). *Web services*. Recuperado el 6 de octubre de 2026, de https://render.com/docs/web-services
