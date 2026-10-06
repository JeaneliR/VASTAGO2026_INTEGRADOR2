// Capítulo 3 — Selección y Configuración de Herramientas de desarrollo
const fs = require("fs");
const path = require("path");

module.exports = (g) => {
  const { H1, H2, H3, P, bullets, numbered, table, code, note, spacer, AlignmentType } = g;
  const REPO = path.join(__dirname, "..", "..");
  const read = (rel, fallback = "") => { try { return fs.readFileSync(path.join(REPO, rel), "utf8"); } catch (e) { return fallback; } };
  const tree = fs.readFileSync(path.join(__dirname, "assets", "tree_repo.txt"), "utf8").trimEnd();
  const readmeLines = read("README.md").split("\n");
  const sect = (title) => { const i = readmeLines.findIndex((l) => l.startsWith("## " + title)); if (i < 0) return ""; let j = readmeLines.findIndex((l, k) => k > i && l.startsWith("## ")); if (j < 0) j = readmeLines.length; return readmeLines.slice(i, j).join("\n").trimEnd(); };
  const readmeExtract = readmeLines.slice(0, 1).join("\n") + "\n\n" + sect("Instalación local").slice(0, sect("Instalación local").lastIndexOf("```") + 3).replace(/```bash\n?|```/g, "").replace(/\n{3,}/g, "\n\n").trim();
  const L = AlignmentType.LEFT, C = AlignmentType.CENTER;

  return [
    H1("3. Selección y Configuración de Herramientas de desarrollo"),
    P("Este capítulo documenta las herramientas con las que se construye, prueba, asegura y despliega el sistema de Vástago & Co, y responde a la observación del docente sobre el APF1: la selección de herramientas fue considerada acertada, pero quedaba pendiente mostrar su **configuración**. Por ello, además de justificar cada elección frente a alternativas descartadas (sección 3.1), se presentan evidencias reales de la configuración de cada pieza (sección 3.2): versiones obtenidas ejecutando los propios comandos en el entorno de desarrollo, fragmentos de los archivos de configuración del repositorio y salidas de pruebas. Finalmente se describe la estructura del repositorio GitHub, las convenciones de ramas y commits y el archivo README.md (sección 3.3)."),
    P("Las versiones consignadas corresponden a las instaladas el 06-oct-2026 en el entorno de desarrollo del equipo y coinciden con los archivos de dependencias versionados (`backend/requirements.txt`, `frontend/package.json`). En ningún fragmento se reproducen secretos: las claves y contraseñas de ejemplo se omiten o se indican con marcadores del tipo `<clave>`."),

    // ------------------------------------------------------------------ 3.1
    H2("3.1 Selección de herramientas"),
    P("La selección se hizo con cinco criterios comunes a todas las herramientas: (1) costo de licencia nulo o gratuito para fines académicos, dado que el proyecto no cuenta con presupuesto; (2) curva de aprendizaje compatible con un equipo de tres estudiantes y 10 horas semanales por integrante; (3) madurez y soporte del ecosistema; (4) compatibilidad con el despliegue previsto en Render, que ofrece plan gratuito para servicios web y PostgreSQL; y (5) aporte directo a los requerimientos no funcionales de seguridad (RNF01), rendimiento (RNF02), mantenibilidad (RNF05) y portabilidad (RNF06). {tab:herr_dev} agrupa las herramientas de plataforma y desarrollo, y {tab:herr_cal} las de calidad, seguridad, análisis y operación."),
    ...table(["Herramienta y versión", "Propósito en el proyecto", "Alternativa descartada", "Motivo del descarte"], [
      ["**Git** 2.43.0 y **GitHub**", "Control de versiones, Pull Requests, trazabilidad por historia de usuario y alojamiento del repositorio.", "GitLab, Bitbucket, SVN", "Actions es gratuito, Render se conecta nativamente y el equipo ya lo usa. SVN carece de ramas ligeras."],
      ["**Python** 3.13.16 con pip 24.0", "Lenguaje del backend y del módulo de analítica (scikit-learn); un solo lenguaje para API y ML.", "Node.js/Express, Java Spring Boot", "Separar API y ML en lenguajes distintos duplicaba el aprendizaje; Spring exige más recursos que el plan gratuito."],
      ["**Flask** 3.1.3, Werkzeug 3.1.8 y **gunicorn** 26.2.0", "Framework web y servidor WSGI de producción (2 workers por defecto).", "Django, FastAPI", "Django impone su ORM y oculta el patrón Repository que se debe evidenciar; FastAPI añade ASGI innecesario en una API síncrona pequeña."],
      ["**PostgreSQL** 16.15 y psycopg2-binary 2.9.13", "Base de datos relacional con triggers, CHECK, JSONB, roles, SCRAM y replicación streaming; pool de conexiones.", "MySQL/MariaDB, SQLite", "SQLite no tiene roles ni escritura concurrente; MySQL ofrece menos control de replicación física y Render no lo gestiona gratis."],
      ["**Node.js** v22.22.0, npm 10.9.4, **React** 19.3.0 y **esbuild** 0.28.2", "Construcción de la SPA: React para la interfaz y esbuild para empaquetar y minificar el bundle.", "Vite, Angular, Vue; Create React App", "esbuild es la única dependencia de desarrollo (sin plugins), lo que simplifica la auditoría (`npm audit`: 0 vulnerabilidades). Create React App está obsoleto."],
      ["**scikit-learn** 1.9.1, pandas 3.0.5 y numpy 2.5.3", "Entrenamiento del pronóstico de demanda (regresión lineal con estacionalidad mensual) en `ml-service/forecast.py`.", "Prophet, statsmodels (ARIMA), redes LSTM", "Con 24 meses de historia, un modelo lineal con variables de mes es explicable y evaluable con MAPE; los profundos sobreajustarían."],
    ], { id: "herr_dev", title: "Herramientas de plataforma y desarrollo seleccionadas", widths: [24, 30, 17, 29], size: 18, align: [L, L, L, L], source: "Elaboración propia a partir de las versiones instaladas (comandos de la sección 3.2) y de los archivos backend/requirements.txt y frontend/package.json." }),
    ...table(["Herramienta y versión", "Propósito en el proyecto", "Alternativa descartada", "Motivo del descarte"], [
      ["**pytest** 9.1.1 y pytest-cov 7.1.0", "24 pruebas automatizadas de negocio y seguridad; medición de cobertura.", "unittest, Postman manual", "pytest ofrece fixtures (cliente, tokens por rol); lo manual no es repetible en CI."],
      ["**GitHub Actions** (`ci.yml`)", "Integración continua: PostgreSQL 16 como servicio, pytest, bandit y pip-audit en cada push y Pull Request.", "Jenkins, GitLab CI", "Jenkins requiere servidor propio; Actions no necesita infraestructura."],
      ["**Docker** 29.8.2 (Dockerfile multi-stage)", "Imagen reproducible: etapa Node para compilar React y etapa Python para ejecutar Flask con usuario no root.", "Despliegue sin contenedor (runtime Python nativo de Render)", "El contenedor garantiza el mismo entorno en desarrollo y producción (RNF06) y empaqueta el frontend compilado."],
      ["**Render** (Blueprint `render.yaml`)", "Hosting en la nube del servicio web y de PostgreSQL gestionado, con TLS y variables secretas.", "Heroku, AWS, Azure, Railway", "Heroku no tiene plan gratuito; AWS y Azure exigen administrar red y tarjeta. Render crea base y servicio con un solo archivo."],
      ["**Playwright** 1.56.0 (Chromium + CDP)", "Medición de WPO: FCP, tiempo de carga y bytes con red limitada a 4 Mbps y 100 ms.", "Lighthouse manual, WebPageTest", "Playwright repite 12 corridas y obtiene la mediana por script (reproducible)."],
      ["**bandit** 1.9.4, **pip-audit** 2.10.1, `npm audit`, **nmap** 7.94, **nikto** 2.1.5 y **sqlmap** 1.10", "Análisis estático del código, auditoría de dependencias y pruebas de seguridad web (cap. 9).", "OWASP ZAP, Burp Suite", "Las elegidas son de línea de comandos y producen texto archivable como evidencia; ZAP y Burp son más pesadas."],
    ], { id: "herr_cal", title: "Herramientas de calidad, seguridad, análisis y operación seleccionadas", widths: [24, 30, 17, 29], size: 18, align: [L, L, L, L], source: "Elaboración propia a partir de las versiones instaladas y de los archivos .github/workflows/ci.yml, Dockerfile y render.yaml." }),
    P("Dos aclaraciones sobre alcance. Primero, scikit-learn, pandas y numpy se usan para entrenar el modelo fuera de línea; la imagen Docker de producción solo incluye el resultado (`ml-service/forecast_output.json`), por lo que su `requirements.txt` no los contiene y la imagen es más ligera. Segundo, las herramientas de Kali Linux (nmap, nikto, sqlmap) se emplearon instaladas directamente en el entorno Linux de desarrollo, no desde una máquina virtual Kali completa."),

    // ------------------------------------------------------------------ 3.2
    H2("3.2 Evidencias de configuración de herramientas"),
    P("Cada subsección sigue el mismo esquema: qué se configuró, el procedimiento con sus comandos, el fragmento real del archivo de configuración y la salida real que verifica el resultado. Los bloques de código se numeran y se citan en el texto. Se declaran explícitamente las verificaciones que aún no pueden hacerse desde el entorno de desarrollo (primer push a GitHub, construcción de la imagen Docker y despliegue en Render)."),

    H3("3.2.1 Git y GitHub"),
    P("El control de versiones se configura una sola vez por integrante (identidad) y una vez por repositorio (rama principal y remoto). El repositorio remoto del equipo es `https://github.com/JeaneliR/VASTAGO2026_INTEGRADOR2`. Se incluye un `.gitignore` que impide subir secretos (`.env`, volcados `*.dump`), dependencias (`node_modules/`) y artefactos generados (`backend/static/`, caches), de modo que el repositorio contenga solo fuente y documentación reproducible."),
    ...code(String.raw`$ git --version
git version 2.43.0

# Identidad de cada integrante (una vez por equipo de trabajo)
$ git config --global user.name  "<Nombre Apellido>"
$ git config --global user.email "<correo>"

# Inicialización del repositorio y vinculación con GitHub
$ cd vastago-sistema
$ git init -b main
$ git remote add origin https://github.com/JeaneliR/VASTAGO2026_INTEGRADOR2.git
$ git add .
$ git commit -m "chore: estructura inicial del sistema Vástago & Co (Sprint 3)"
$ git push -u origin main`, { title: "Configuración de Git y vinculación con el repositorio remoto", id: "git" }),
    ...code(read(".gitignore", "(archivo .gitignore)").trimEnd(), { title: "Archivo .gitignore del repositorio (contenido real)", id: "gitignore" }),
    note("**Pendiente de verificación (lo completa el equipo):** el sistema se desarrolló en un entorno sin credenciales de GitHub, por lo que el primer `git push` lo realiza el equipo. Una vez publicado, se adjuntará la captura del historial de commits (`git log --oneline`) y la protección de la rama `main` (Settings → Branches: exigir Pull Request y CI en verde). Hasta entonces, el historial de versiones no se presenta como evidencia."),

    H3("3.2.2 Entorno Python: venv y requirements.txt"),
    P("El backend se ejecuta en un entorno virtual aislado para no mezclar dependencias del sistema. Las versiones están fijadas con `==` en `requirements.txt` para que el entorno de desarrollo, la integración continua y la imagen Docker instalen exactamente lo mismo (reproducibilidad, RNF06). Se separan las dependencias de ejecución (archivo versionado) de las de prueba y análisis (`pytest`, `bandit`, `pip-audit`), que se instalan solo en CI y en desarrollo."),
    ...code(String.raw`$ python3 --version
Python 3.13.16
$ pip --version
pip 24.0 from /usr/lib/python3/dist-packages/pip (python 3.13)

$ python3 -m venv .venv
$ source .venv/bin/activate
$ pip install -r backend/requirements.txt`, { title: "Creación del entorno virtual e instalación de dependencias", id: "venv" }),
    ...code(read("backend/requirements.txt").trimEnd(), { title: "backend/requirements.txt (dependencias de ejecución con versión fija)", id: "req" }),
    ...code(String.raw`$ pip freeze | grep -iE "flask|werkzeug|gunicorn|psycopg|bcrypt|jwt|cryptography|brotli|pytest|cov|bandit"
bandit==1.9.4
bcrypt==5.0.0
Brotli==1.2.0
coverage==7.16.2
cryptography==50.0.1
Flask==3.1.3
Flask-Compress==1.25
Flask-Limiter==4.1.1
gunicorn==26.2.0
psycopg2-binary==2.9.13
PyJWT==2.15.1
pytest==9.1.1
pytest-cov==7.1.0
Werkzeug==3.1.8`, { title: "Verificación de las versiones instaladas (salida real de pip freeze, filtrada)", id: "freeze" }),
    P("La configuración del servidor de aplicaciones vive en `backend/gunicorn.conf.py`: enlaza al puerto indicado por la variable `PORT` (requisito de Render), usa 2 workers por defecto (`WEB_CONCURRENCY`), limita el tamaño de línea y de cabeceras de la petición, escribe el registro de accesos en la salida estándar (donde Render lo recoge) y oculta el nombre y la versión del servidor, hallazgo corregido durante las pruebas de seguridad del capítulo 9."),

    H3("3.2.3 Node.js y esbuild"),
    P("El frontend tiene solo dos dependencias de ejecución (React y React DOM) y una de desarrollo (esbuild). El comando `npm run build` ejecuta `build.mjs`, que empaqueta `src/main.jsx` en un único `bundle.js` minificado y copia `index.html` y la hoja de estilos hacia `backend/static/`, desde donde Flask los sirve en el mismo origen que la API. El bundle resultante pesa 243,725 bytes sin comprimir y 74,627 bytes con gzip (cap. 7)."),
    ...code(String.raw`$ node -v
v22.22.0
$ npm -v
10.9.4
$ cd frontend && npm ci && npm run build
Frontend compilado en backend/static/
$ npm ls --depth=0
vastago-frontend@2.0.0 /home/claude/vastago-sistema/frontend
+-- esbuild@0.28.2
+-- react-dom@19.3.0
+-- react@19.3.0`, { title: "Instalación y compilación del frontend (versiones reales)", id: "node" }),
    ...code(read("frontend/package.json").trimEnd(), { title: "frontend/package.json (dependencias y script de compilación)", id: "esbuild" }),

    H3("3.2.4 PostgreSQL 16: instancia, roles y autenticación SCRAM"),
    P("La base de datos se configuró con el principio de mínimo privilegio. La aplicación se conecta con el rol `vastago_app`, que no es superusuario ni puede crear bases o roles; un rol distinto, `replicator`, solo tiene el atributo de replicación. El cifrado de contraseñas del servidor es SCRAM-SHA-256 y el archivo `pg_hba.conf` exige ese método en todas las conexiones, incluida la replicación. El esquema completo (`db/schema.sql`) lo crea el script de semilla de la aplicación; el detalle del modelo físico está en el capítulo 8."),
    ...code(String.raw`-- Roles (ejecutar como superusuario del servidor)
CREATE ROLE vastago_app LOGIN PASSWORD '<clave>' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE DATABASE vastago OWNER vastago_app;
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD '<clave>';

-- postgresql.conf del servidor primario (líneas activas, instancia de desarrollo)
port = 5433
listen_addresses = 'localhost'
wal_level = replica
max_wal_senders = 5
hot_standby = on
password_encryption = scram-sha-256
log_connections = on

-- pg_hba.conf (líneas activas)
local   all          all                       scram-sha-256
host    all          all     127.0.0.1/32      scram-sha-256
host    replication  replicator 127.0.0.1/32   scram-sha-256`, { title: "Configuración de roles, postgresql.conf y pg_hba.conf del servidor primario", id: "pgconf" }),
    ...code(String.raw`$ psql --version
psql (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

vastago=> SELECT version();
 PostgreSQL 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1) on x86_64-pc-linux-gnu, compiled by gcc (Ubuntu 13.3.0-6ubuntu2~24.04.1) 13.3.0, 64-bit

vastago=> SELECT rolname, rolsuper, rolcreatedb, rolreplication, rolcanlogin FROM pg_roles WHERE rolname !~ '^pg_';
   rolname   | rolsuper | rolcreatedb | rolreplication | rolcanlogin
-------------+----------+-------------+----------------+-------------
 postgres    | t        | t           | t              | t
 replicator  | f        | f           | t              | t
 vastago_app | f        | f           | f              | t

vastago=> SHOW password_encryption;
 scram-sha-256`, { title: "Verificación de la instancia, los roles y el cifrado SCRAM (salida real; evidencias/03_monitoreo_bd.txt)", id: "pgver" }),
    P("La replicación, el respaldo y el monitoreo de esta misma instancia se presentan en la sección 8.2. En despliegue, Render provee su propia instancia PostgreSQL 16 y entrega la cadena de conexión en la variable `DATABASE_URL`; allí la creación de roles la realiza la plataforma (`render.yaml` declara el usuario `vastago_app`)."),

    H3("3.2.5 pytest y cobertura"),
    P("Las pruebas automatizadas se ejecutan con `python -m pytest` (se usa `python -m` para garantizar que se emplee el intérprete donde están instaladas las dependencias del proyecto). El archivo `backend/tests/conftest.py` define tres decisiones de configuración: un fixture de sesión que reconstruye el esquema y los datos demo antes de la corrida, un costo de bcrypt reducido a 4 rondas solo durante las pruebas y la desactivación del rate limiting para no bloquear los casos repetidos. Por esa reconstrucción, **las pruebas deben apuntar a una base exclusiva de pruebas** y nunca a una con datos reales, advertencia que también figura en el README."),
    ...code(String.raw`$ cd backend && python3 -m pytest tests -q --cov=app
........................                                                 [100%]
TOTAL                              596     60    90%
24 passed in 2.26s

$ python3 -m pytest tests -v        # extracto de evidencias/04_pytest.txt
tests/test_negocio.py::test_ingreso_actualiza_stock_via_trigger PASSED   [  8%]
tests/test_negocio.py::test_salida_mayor_al_stock_rechazada PASSED       [ 12%]
tests/test_negocio.py::test_crear_orden_y_completar_descuenta_bom PASSED [ 20%]
tests/test_seguridad.py::test_bloqueo_por_intentos_fallidos PASSED       [ 62%]
tests/test_seguridad.py::test_auditoria_registra_y_es_inmutable PASSED   [100%]
============================== 24 passed in 1.32s ==============================`, { title: "Ejecución de pytest y cobertura (salidas reales; evidencias/04_pytest.txt y 05_cobertura.txt)", id: "pytest" }),
    P("La suite contiene 8 pruebas de negocio (inventario, órdenes, BOM, KPIs, pronóstico) y 16 de seguridad (autenticación, tokens manipulados o expirados, escalada de privilegios, rotación de refresh, cifrado, inyección SQL, cabeceras, auditoría inmutable). La cobertura de líneas del paquete `app` es 90 % (596 sentencias, 60 sin cubrir); las líneas no cubiertas son sobre todo ramas de error de configuración y de gestión de usuarios. El análisis completo de las pruebas se presenta en el capítulo 10."),

    H3("3.2.6 GitHub Actions (integración continua)"),
    P("El flujo `ci.yml` se dispara en cada `push` y `pull_request`. Levanta un contenedor PostgreSQL 16 como servicio auxiliar (con verificación de salud `pg_isready`), instala Python 3.13 y las dependencias, ejecuta la suite pytest y, en un paso final, el análisis estático (`bandit`) y la auditoría de dependencias (`pip-audit`). Si cualquiera falla, el Pull Request queda en rojo y no debería integrarse a `main`. La conexión por defecto de la aplicación (`127.0.0.1:5433`) coincide con el puerto publicado por el servicio de CI, por lo que no se necesita configuración adicional. Los valores de contraseña de la base efímera de CI se omiten en el fragmento."),
    ...code(read(".github/workflows/ci.yml").replace(/app-secret/g, "<clave-ci>").trimEnd(), { title: ".github/workflows/ci.yml (flujo de integración continua; valores de contraseña omitidos)", id: "ci" }),
    note("**Pendiente de verificación:** el flujo está definido y validado sintácticamente, pero su primera ejecución ocurrirá cuando el equipo suba el repositorio a GitHub. La captura de la pestaña Actions con la corrida en verde se añadirá entonces. Mientras tanto, la evidencia equivalente es la ejecución local de los mismos comandos ({cod:pytest}, `bandit`: 0 incidencias; `pip-audit`: sin vulnerabilidades conocidas)."),

    H3("3.2.7 Docker"),
    P("El `Dockerfile` usa una construcción de dos etapas. La primera, basada en `node:22-alpine`, instala las dependencias con `npm ci` y compila el frontend; la segunda, basada en `python:3.13-slim`, instala las dependencias Python sin caché, copia el backend, los scripts SQL, el pronóstico precalculado y el bundle compilado, crea un usuario sin privilegios (`appuser`, uid 10001) y arranca. El comando de inicio ejecuta primero `python -m app.seed --if-empty`, que crea el esquema y los datos demo únicamente si la base está vacía (nunca borra datos existentes) y luego inicia gunicorn. El archivo `.dockerignore` excluye `node_modules`, `.git`, `evidencias`, `docs`, volcados y `.env` para reducir el contexto y evitar filtrar secretos a la imagen."),
    ...code(read("Dockerfile").trimEnd(), { title: "Dockerfile multi-stage del sistema (contenido real)", id: "docker" }),
    ...code(String.raw`$ docker --version
Docker version 29.8.2, build 7fc2dff

# Construcción y ejecución local previstas (requieren acceso a Docker Hub)
$ docker build -t vastago-sistema .
$ docker run --rm -p 8000:8000 \
    -e DATABASE_URL="postgresql://vastago_app:<clave>@host.docker.internal:5433/vastago" \
    -e JWT_SECRET="<valor>" -e FIELD_ENCRYPTION_KEY="<valor>" -e APP_ENV=production \
    -e DEMO_PASSWORD="<valor>" vastago-sistema`, { title: "Versión de Docker y comandos de construcción/ejecución de la imagen", id: "dockerrun" }),
    note("**Limitación declarada:** en el entorno donde se desarrolló el sistema el cliente Docker está instalado, pero el acceso a Docker Hub está bloqueado, de modo que **la imagen no pudo construirse** allí. En su lugar se validó la lógica de arranque de producción ejecutando el mismo comando de inicio con gunicorn y `APP_ENV=production` (pruebas del capítulo 11). La construcción real de la imagen ocurrirá en Render durante el primer despliegue."),

    H3("3.2.8 Render (Blueprint)"),
    P("`render.yaml` es un Blueprint de infraestructura como código: describe en un solo archivo la base PostgreSQL 16 (`vastago-db`, usuario `vastago_app`) y el servicio web Docker (`vastago-sistema`), la ruta de verificación de salud `/api/health` y las variables de entorno. Los secretos `JWT_SECRET` y `FIELD_ENCRYPTION_KEY` se generan aleatoriamente por Render (`generateValue: true`) y `DATABASE_URL` se inyecta desde la base; `DEMO_PASSWORD` se marca `sync: false`, lo que obliga a escribirla manualmente en el panel y garantiza que nunca se guarde en Git."),
    ...code(read("render.yaml").trimEnd(), { title: "render.yaml (Blueprint de despliegue, contenido real)", id: "render" }),
    P("Según la documentación oficial de Render consultada el 06-oct-2026, el plan gratuito impone límites que se consideran en la gestión de riesgos (R8, capítulo 5) y en los niveles de servicio (capítulo 6): los servicios web se suspenden tras 15 minutos sin tráfico y tardan cerca de un minuto en reiniciarse; cada espacio de trabajo dispone de 750 horas de instancia al mes; y las bases PostgreSQL gratuitas tienen 1 GB, expiran a los 30 días de creadas (con 14 días de gracia) y no incluyen respaldos automáticos."),
    note("**[PENDIENTE: pegar URL Render]** — El despliegue en la cuenta de Render del equipo no pudo ejecutarse desde el entorno de desarrollo. Los artefactos (`Dockerfile`, `render.yaml`) están listos y el procedimiento paso a paso se documenta en el capítulo 11; la URL pública y las capturas del sistema en la nube las completa el equipo al desplegar.", { fill: "FFF4CC" }),

    H3("3.2.9 Variables de entorno"),
    P("Toda la configuración sensible se externaliza a variables de entorno (principio 12-factor). La clase `Config` de `backend/app/config.py` lee cada variable con un valor por defecto solo para desarrollo, y su método `validate()` impide arrancar en producción con los secretos de desarrollo. El archivo `.env.example` sirve de plantilla: cada integrante lo copia a `.env` (excluido por `.gitignore`) y define sus propios valores. {tab:vars} lista las variables."),
    ...code(String.raw`# Copiar a .env (NO subir .env al repositorio)
DATABASE_URL=postgresql://vastago_app:<clave>@127.0.0.1:5433/vastago
JWT_SECRET=genera-con-openssl-rand-hex-32
FIELD_ENCRYPTION_KEY=genera-con-openssl-rand-base64-32
APP_ENV=development
DEMO_PASSWORD=<contraseña-demo>

# Generación de secretos fuertes
$ openssl rand -hex 32        # JWT_SECRET (64 caracteres hexadecimales)
$ openssl rand -base64 32     # FIELD_ENCRYPTION_KEY (32 bytes en base64 = AES-256)`, { title: ".env.example (plantilla real; valores de ejemplo omitidos) y generación de secretos", id: "env" }),
    ...table(["Variable", "Uso", "Local", "Render", "¿Secreto?"], [
      ["`DATABASE_URL`", "Cadena de conexión a PostgreSQL (pool psycopg2).", "`.env`", "Inyectada desde `vastago-db`", "Sí"],
      ["`JWT_SECRET`", "Firma HS256 de los access tokens (≥ 32 caracteres).", "`.env`", "`generateValue`", "Sí"],
      ["`FIELD_ENCRYPTION_KEY`", "Clave AES-256-GCM para el teléfono cifrado.", "`.env`", "`generateValue`", "Sí"],
      ["`DEMO_PASSWORD`", "Contraseña de los usuarios demo creados por `seed.py`.", "`.env`", "Panel (`sync: false`)", "Sí"],
      ["`APP_ENV`", "`production` activa cookie Secure, HSTS y `Config.validate()`.", "`development`", "`production`", "No"],
      ["`ACCESS_TOKEN_MINUTES`, `REFRESH_TOKEN_DAYS`", "Vida de los tokens (por defecto 15 min y 7 días).", "Opcional", "Opcional", "No"],
      ["`MAX_LOGIN_ATTEMPTS`, `LOCKOUT_MINUTES`, `BCRYPT_ROUNDS`", "Bloqueo por intentos (5 y 15 min) y costo bcrypt (12).", "Opcional", "Opcional", "No"],
      ["`PORT`, `WEB_CONCURRENCY`", "Puerto y número de workers de gunicorn.", "8000 y 2", "`PORT` la fija Render", "No"],
    ], { id: "vars", title: "Variables de entorno del sistema", widths: [26, 34, 11, 18, 11], size: 18, align: [L, L, L, L, C], source: "Elaboración propia a partir de backend/app/config.py, backend/gunicorn.conf.py, .env.example y render.yaml." }),
    note("**Observación para el equipo:** la plantilla `.env.example` y `seed.py` incluyen una contraseña demo por defecto (útil solo en desarrollo). Antes de publicar el repositorio se recomienda reemplazarla por un marcador y exigir `DEMO_PASSWORD` explícita en el despliegue, que es lo que ya hace Render por `sync: false`.", { fill: "EAF2FB", bar: "3B6EA8" }),

    // ------------------------------------------------------------------ 3.3
    H2("3.3 Repositorio GitHub"),
    P("El código, los scripts de base de datos, las evidencias de prueba y las fuentes de la documentación se mantienen en un único repositorio (monorepo): `https://github.com/JeaneliR/VASTAGO2026_INTEGRADOR2`. Un monorepo es adecuado para un equipo de tres personas porque un mismo Pull Request puede modificar el esquema SQL, el backend y la interfaz de una historia de usuario, y la integración continua valida todo junto. El repositorio contiene aproximadamente 870 líneas de código Python de aplicación, 285 de pruebas, 345 de frontend (JSX, JS y CSS), 239 de SQL y 47 del módulo de pronóstico."),

    H3("3.3.1 Estructura del repositorio"),
    P("{cod:arbol_dir} muestra el árbol real de carpetas, obtenido recorriendo el directorio del proyecto y excluyendo `node_modules`, `__pycache__`, `.pytest_cache` y las salidas de compilación (`out`). Para legibilidad, las carpetas de capturas, de salidas de seguridad y del generador del informe se resumen en una línea. {tab:carpetas} explica la responsabilidad de cada carpeta."),
    ...code(tree, { title: "Árbol de carpetas del repositorio (generado del directorio real del proyecto)", id: "arbol_dir", size: 14 }),
    ...table(["Carpeta o archivo", "Contenido", "Responsabilidad"], [
      ["`backend/app/`", "`__init__.py` (fábrica de la app), `config.py`, `db.py`, `security.py`, `extensions.py`, `seed.py`; subcarpetas `routes/`, `services/`, `repositories/`.", "Lógica de la API. Las rutas validan y autorizan; los servicios implementan casos de uso (login, refresh); los repositorios contienen todo el SQL (patrón Repository)."],
      ["`backend/tests/`", "`conftest.py`, `test_negocio.py`, `test_seguridad.py`, `pentest_manual.py`.", "Pruebas automatizadas (24) y verificaciones manuales OWASP contra una instancia en ejecución."],
      ["`frontend/`", "`src/` (App, api.js, componentes por pantalla, estilos), `public/index.html`, `build.mjs`.", "Interfaz React; el token de acceso vive solo en memoria y el cliente HTTP renueva la sesión automáticamente."],
      ["`db/`", "`schema.sql`, `seed_catalogo.sql`, `admin/` (respaldo y monitoreo), `replication/` (primario y réplica).", "Modelo físico, datos maestros, operación y alta disponibilidad de la base de datos."],
      ["`ml-service/`", "`forecast.py`, `historico_demanda.csv`, `forecast_output.json`.", "Entrenamiento del pronóstico (fuera de línea) y su resultado, que carga `seed.py` en la tabla `pronosticos`."],
      ["`evidencias/`", "Salidas de pytest, cobertura, latencia, replicación, respaldo, monitoreo, seguridad y WPO; capturas por rol.", "Evidencia reproducible citada en los capítulos 6 a 10 del informe."],
      ["`.github/workflows/`", "`ci.yml`.", "Integración continua."],
      ["`Dockerfile`, `render.yaml`, `.dockerignore`", "Empaquetado y despliegue.", "Portabilidad (RNF06) y despliegue en Render."],
      ["`docs/build/`", "Generador del informe y `assets/` (diagramas, wireframes, mockups).", "Documentación como código; reproducible con un script."],
    ], { id: "carpetas", title: "Responsabilidad de cada carpeta del repositorio", widths: [22, 40, 38], size: 18, align: [L, L, L], source: "Elaboración propia a partir del árbol del repositorio (" + g.R("cod:arbol") + ")." }),
    P("La carpeta `deploy/` existe en el directorio de trabajo pero está vacía y, como Git no versiona directorios vacíos, no aparecerá en GitHub; se reservó para scripts de despliegue manual que finalmente no fueron necesarios gracias al Blueprint de Render."),
    P("**Convención de ramas.** Se adopta un flujo basado en ramas cortas (GitHub Flow simplificado, adecuado para tres personas): la rama `main` siempre es desplegable y está protegida; cada historia de usuario o corrección se desarrolla en una rama propia y se integra mediante Pull Request revisado por al menos otro integrante y con la integración continua en verde. {tab:ramas} resume las convenciones."),
    ...table(["Elemento", "Convención", "Ejemplo"], [
      ["Rama estable", "`main`: siempre desplegable; sin commits directos.", "`main`"],
      ["Ramas de trabajo", "`feature/HUxx-descripcion`, `fix/descripcion`, `docs/descripcion`, `test/descripcion`; una por historia de usuario.", "`feature/HU05-orden-produccion`"],
      ["Mensajes de commit", "Conventional Commits: `tipo(ámbito): resumen en imperativo (HUxx)`. Tipos: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`.", "`feat(produccion): vista previa de BOM (HU05)`"],
      ["Pull Request", "Descripción con la HU, criterios de aceptación cubiertos y evidencia (captura o salida de prueba); revisión cruzada; fusión con *squash*.", "PR #n: «HU06 completar orden y descontar insumos»"],
      ["Etiquetas (tags)", "Una por hito del cronograma.", "`v0.3-sprint3`, `apf2`"],
      ["Prohibido versionar", "Secretos, `.env`, volcados `*.dump`, `node_modules`, bundles compilados.", "Ver {cod:gitignore}"],
    ], { id: "ramas", title: "Convención de ramas, commits y Pull Requests del equipo", widths: [20, 50, 30], size: 18, align: [L, L, L], source: "Elaboración propia; se basa en GitHub Flow y en la especificación Conventional Commits 1.0." }),

    H3("3.3.2 Archivo README.md"),
    P("En APF1 el repositorio carecía de un README completo. Como parte de este avance se redactó el archivo `README.md` de la raíz (`/README.md` en el repositorio), pensado para que cualquier evaluador o nuevo integrante pueda instalar, probar y desplegar el sistema sin consultar otros documentos. {tab:readme_secc} resume sus secciones y {cod:readme} reproduce el título y la sección de instalación local."),
    ...table(["Sección del README", "Contenido"], [
      ["Descripción, equipo y alcance", "Contexto de Vástago & Co, integrantes con rol Scrum, tabla de funcionalidades de la v1 (implementado frente a planificado: RF11 y RF12 en el Sprint 4)."],
      ["Arquitectura y estructura", "Diagrama de capas (navegador, Flask, PostgreSQL con réplica, módulo de pronóstico) y árbol de carpetas comentado."],
      ["Instalación local y variables", "Cinco pasos: base de datos, entorno virtual, semilla, compilación del frontend y ejecución; tabla de variables de entorno."],
      ["Usuarios demo por rol", "Un correo por rol (Administrador, Jefe de Producción, Almacenero, Gerente) y los módulos a los que accede; la contraseña no se imprime."],
      ["Pruebas, CI y despliegue", "Comandos de pytest, cobertura, bandit, pip-audit y pentest manual; pasos del Blueprint de Render y límites del plan gratuito."],
      ["Convenciones y documentación", "Ramas, commits y etiquetas; enlace a las fuentes del informe y a las evidencias."],
    ], { id: "readme_secc", title: "Contenido del archivo README.md del repositorio", widths: [28, 72], size: 18, align: [L, L], source: "Elaboración propia a partir del archivo README.md del repositorio." }),
    ...code(readmeExtract, { title: "Extracto del README.md raíz (título y sección «Instalación local»)", id: "readme", size: 14 }),
    P("El README declara de forma explícita dos advertencias derivadas de la experiencia de desarrollo: que el backend lee variables de entorno pero no carga el archivo `.env` por sí mismo (por eso se indica `set -a; source .env; set +a`) y que las pruebas recrean el esquema de la base apuntada por `DATABASE_URL`, por lo que deben ejecutarse contra una base de pruebas. Las contraseñas de los usuarios demo no se imprimen: se indica que equivalen al valor de `DEMO_PASSWORD`."),
    note("**Mejora respecto al APF1:** la observación del docente señalaba que las herramientas estaban bien seleccionadas pero sin configuración. Este capítulo la resuelve con (a) versiones obtenidas de comandos reales, (b) cada archivo de configuración mostrado tal como está en el repositorio, (c) salidas reales de pruebas y de PostgreSQL y (d) la declaración honesta de lo que todavía depende de la cuenta de GitHub y de Render del equipo: historial de commits, primera corrida de CI, imagen Docker construida y URL pública.", { fill: "E4F3E9", bar: "2E7D4F" }),
  ];
};
