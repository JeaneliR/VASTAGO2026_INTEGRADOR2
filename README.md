# Vástago & Co — Sistema Web Inteligente de Producción e Inventarios

[![CI](https://github.com/JeaneliR/VASTAGO2026_INTEGRADOR2/actions/workflows/ci.yml/badge.svg)](https://github.com/JeaneliR/VASTAGO2026_INTEGRADOR2/actions/workflows/ci.yml)
![Python](https://img.shields.io/badge/Python-3.13-3776AB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Estado](https://img.shields.io/badge/estado-v2%20(Sprint%204)-C89B3C)

Sistema web para gestionar **inventario de insumos por lote**, **producto terminado**, **órdenes de producción con ruta de
etapas** (refinado → grageado → abrillantado → envasado), **trazabilidad hacia atrás y hacia adelante**, **seguridad por
roles** y **analítica predictiva de demanda** en **Vástago & Co** (RUC 20613556240), empresa chocolatera artesanal peruana
(cacao fino de aroma, barras, bombones, grageas y cobertura).

Proyecto del curso **Integrador 2** — Universidad Tecnológica del Perú (UTP). Docente: Yovana Connie Roca Ávila.
Versión del repositorio: **v2, Sprint 4 (03-nov-2026)**.

## Equipo (Scrum)

| Integrante | Rol Scrum |
|---|---|
| Jeaneli Rosmery Caso Valenzuela | Product Owner |
| Arnold Steven Lujan Aderiano | Scrum Master |
| Luis Facundo Matamoros Ylizarbe | Desarrollador |

## Funcionalidades de la v2

| Área | Funcionalidad | Estado |
|---|---|---|
| Inventario de insumos | Stock con semáforo (OK / Bajo / Crítico) por categoría (materia prima, centro, auxiliar, empaque); **cada ingreso crea o suma a un lote** (código, proveedor, vencimiento); salidas manuales FEFO | Implementado |
| Producción por etapas | La orden copia la **ruta del producto** (gragea: Refinado 8 h → Grageado → Abrillantado → Envasado). Cada etapa registra responsable, equipo, inicio/fin (horas reales vs. estándar), **lotes de insumo consumidos**, merma y observaciones; no se salta ni se cierra una etapa sin sus consumos | Implementado |
| Grageas con centro | El centro (maní, pasas, almendra… o cualquier insumo categoría «Centro») se elige al crear la orden y se consume en la etapa de grageado | Implementado |
| Producto terminado | Existencias por producto y variante (centro), lotes de PT con vencimiento, despachos con destino y semáforo contra el mínimo | Implementado |
| Trazabilidad | Hacia atrás: de un lote de PT a etapas, responsables, equipos y lotes de insumo. Hacia adelante: de un lote de insumo a órdenes, lotes de PT y destinos | Implementado |
| Seguridad | Login con bcrypt, JWT de 15 min + refresh rotatorio (cookie HttpOnly), bloqueo por intentos, rate limiting, RBAC de 5 roles (incluye Operario), AES-256-GCM, auditoría de solo-anexar, cabeceras CSP/HSTS | Implementado |
| Analítica | Pronóstico de demanda a 3 meses por producto con MAPE sobre datos de demostración | Implementado desde la v1 |
| Dashboard (RF10) | Indicadores por rol calculados desde PostgreSQL. Incluye cumplimiento mensual de órdenes, porcentaje de insumos en estado óptimo, valoración de existencias y merma registrada | Ampliado en la v2 |
| Gestión de usuarios | Edición, activación y desactivación de cuentas; cambio de contraseña propia y restablecimiento por el administrador | Ampliado en la v2 |
| Datos | PostgreSQL 16, replicación streaming, respaldo/restauración verificada, monitoreo SQL | Implementado |
| Reportes (RF11) | Consulta filtrada y exportación de inventario y producción a Excel y PDF | Implementado en la v2 |
| Correo y alertas (RF12) | Avisos por stock bajo, resumen manual y resumen diario mediante Resend | Implementado en la v2 |

El cumplimiento de órdenes cuenta las que empezaron una etapa y se completaron en el mes seleccionado, sobre el total iniciado en ese mes. El estado óptimo y la valoración usan el stock actual. Si hay existencias sin costo registrado, el dashboard señala que la valoración es parcial.

La rotación y la exactitud del inventario quedan pendientes de contar con saldos históricos fiables y registros de conteo físico. WhatsApp Business queda **por hacer, fuera del alcance de esta entrega** por los posibles cargos de mensajería.

## Arquitectura

```
Navegador ──HTTPS──▶ Flask 3 + gunicorn ──(patrón Repository, pool psycopg2)──▶ PostgreSQL 16
   React 19 (SPA)        │  Blueprints: auth / negocio / planta / panel / reportes / correo
   servida por Flask     └─ seguridad.py (JWT, RBAC, AES-GCM, cabeceras)
                         ml-service/forecast.py  →  forecast_output.json  →  tabla pronosticos
                         cola de correos en PostgreSQL ──HTTPS──▶ Resend
```

La SPA compilada con esbuild se sirve desde el mismo origen que la API (sin CORS). Toda consulta SQL vive en un
repositorio (`backend/app/repositories/`) y es parametrizada.

## Estructura del repositorio

```
.github/workflows/ci.yml   Integración continua (pytest, bandit, pip-audit con PostgreSQL 16)
backend/                   API Flask (app/, tests/, gunicorn.conf.py, wsgi.py, requirements.txt)
frontend/                  SPA React 19 + esbuild (src/, public/, build.mjs)
db/                        schema.sql, seed_catalogo.sql, admin/ (respaldo, monitoreo), replication/
ml-service/                forecast.py, historico_demanda.csv, forecast_output.json
evidencias/                Salidas reales de pruebas, replicación, respaldo, monitoreo, seguridad y WPO
docs/build/                Generador del informe APF2 y diagramas/prototipos (assets/)
Dockerfile · render.yaml   Despliegue (imagen multi-stage y Blueprint de Render)
.env.example               Plantilla de variables de entorno (copiar a .env; no subir .env)
```

## Requisitos

Python 3.13, Node.js 22 (npm 10), PostgreSQL 16, Git. Opcional: Docker.

## Instalación local

```bash
# 1) Base de datos (PostgreSQL 16)
sudo -u postgres psql -c "CREATE ROLE vastago_app LOGIN PASSWORD '<clave-local>';"
sudo -u postgres psql -c "CREATE DATABASE vastago OWNER vastago_app;"

# 2) Backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
cp .env.example .env          # editar valores (entre comillas si contienen # o !)
set -a; source .env; set +a   # el backend lee variables de entorno, no carga .env solo

# 3) Esquema y datos demo (solo en una BD de desarrollo: recrea las tablas)
cd backend && python -m app.seed
python -m app.migrate && python -m app.demo_data

# 4) Frontend
cd ../frontend && npm ci && npm run build      # genera backend/static/

# 5) Ejecutar
cd ../backend && gunicorn -c gunicorn.conf.py wsgi:app    # http://localhost:8000
```

`.env.example` apunta a PostgreSQL en el puerto **5433**; si tu instancia usa 5432, ajusta `DATABASE_URL`.

## Flujo de planta (gragea de chocolate)

1. **Jefe de Producción** crea la orden: elige el producto (Gragea de chocolate 200 g), la cantidad y el **centro** (maní, pasas, almendra…). El sistema copia la ruta de 4 etapas y calcula los insumos planificados por etapa.
2. Cada **operario** inicia su etapa eligiendo el equipo del tipo requerido (refinadora, bombo de grageado, bombo de abrillantado, envasadora). Una etapa no inicia hasta que la anterior termina, y un equipo no puede estar en dos etapas a la vez.
3. En la etapa en curso registra qué **lote** de cada insumo consumió y cuánto (se rechaza lote vencido, de otro insumo o sin saldo). La etapa solo se cierra cuando todos los insumos planificados tienen consumo; al cerrar se anota merma y observaciones.
4. Al cerrar la **última etapa** (Envasado) se indican las unidades producidas: se crea el **lote de producto terminado** (código = lote de la orden, vencimiento según vida útil) y entra al inventario de PT.
5. El **Almacenero** despacha unidades indicando el destino. Desde **Trazabilidad** se consulta cualquier lote en ambos sentidos.

Rutas, horas estándar y recetas por etapa se configuran en `db/seed_catalogo.sql` (tablas `ruta_etapas`, `bom` con `etapa_secuencia`, `equipos`).

## Variables de entorno

| Variable | Descripción | Obligatoria en producción |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL | Sí (la provee Render) |
| `JWT_SECRET` | Clave de firma de tokens (≥ 32 caracteres). `openssl rand -hex 32` | Sí (Render la genera) |
| `FIELD_ENCRYPTION_KEY` | Clave AES-256 en base64. `openssl rand -base64 32` | Sí (Render la genera) |
| `APP_ENV` | `development` / `production` (en producción: cookie Secure, HSTS y rechazo de secretos de desarrollo) | Sí |
| `DEMO_PASSWORD` | Contraseña de los usuarios demo que crea `seed.py` | Sí (se define en el panel de Render) |
| `RESEND_API_KEY` | Clave de Resend con permiso de envío | Para enviar correos |
| `EMAIL_TO` | Destinatario inicial. Para la prueba, usa el Gmail asociado a la cuenta de Resend | Para enviar correos; también se puede guardar desde la aplicación |
| `EMAIL_FROM` | Remitente. El Blueprint fija `Vastago <onboarding@resend.dev>` | Render lo configura automáticamente |
| `EMAIL_SCHEDULER_ENABLED` | Habilita el procesamiento de envíos. El Blueprint lo fija en `true` | Render lo configura automáticamente |
| `SEED_EXTRA_DEMO` | Amplía los datos de demostración una sola vez. Predeterminado: `true` | No |
| `ACCESS_TOKEN_MINUTES`, `REFRESH_TOKEN_DAYS`, `MAX_LOGIN_ATTEMPTS`, `LOCKOUT_MINUTES`, `BCRYPT_ROUNDS` | Parámetros de seguridad (por defecto 15, 7, 5, 15, 12) | No |
| `PORT`, `WEB_CONCURRENCY` | Puerto y workers de gunicorn (por defecto 8000 y 2) | No |

Nunca se suben secretos al repositorio: `.env` está en `.gitignore`.

## Usuarios demo por rol

En una base vacía se crean seis cuentas demo con la contraseña inicial `DEMO_PASSWORD`. La carga ampliada deja 20 insumos, 10 productos y 54 órdenes. Cambiar `DEMO_PASSWORD` en Render después de inicializar la base no modifica las contraseñas ya guardadas.

| Rol | Correo | Acceso |
|---|---|---|
| Administrador | `admin@vastagoyco.pe` | Todo, incluidos Usuarios y Auditoría |
| Jefe de Producción | `jefe.produccion@vastagoyco.pe` | Dashboard, Inventario (lectura), Producción (crea órdenes y opera etapas), Producto terminado (lectura), Trazabilidad, Analítica y Reportes |
| Almacenero | `almacen@vastagoyco.pe` | Dashboard, Inventario (lectura y escritura), Producción (lectura), Producto terminado (lectura y despachos), Trazabilidad y Reportes |
| Gerente | `gerente@vastagoyco.pe` | Dashboard, Producción y Producto terminado (lectura), Trazabilidad, Analítica, Reportes y Correo y alertas (consulta y envío manual) |
| Operario | `operario1@vastagoyco.pe` (refinado y envasado), `operario2@vastagoyco.pe` (grageado y abrillantado) | Inventario (lectura), Producción (inicia sus etapas, registra consumos por lote y las cierra), Trazabilidad |

## Pruebas y calidad

```bash
cd backend
python -m pytest tests -q                         # 52 pruebas en la verificación local de la v2
python -m pytest tests -q --cov=app               # requiere pytest-cov
bandit -r app -q && pip-audit -r requirements.txt # análisis estático y dependencias
python tests/pentest_manual.py http://127.0.0.1:8000   # verificaciones OWASP contra una instancia en ejecución
```

> Las pruebas recrean el esquema (`DROP TABLE ... CREATE`) en la base indicada por `DATABASE_URL`:
> usa una base local exclusiva cuyo nombre termine en `_test`, por ejemplo `vastago_test`.
> Los casos de correo simulan Resend. La recepción real se verifica desde el despliegue configurado.

GitHub Actions (`.github/workflows/ci.yml`) ejecuta pytest, bandit y pip-audit en cada `push` y `pull_request`.

## Despliegue en Render

1. Sube el repositorio a GitHub.
2. En Render: **New → Blueprint** y selecciona el repositorio; Render lee `render.yaml` y crea la base `vastago-db`
   (PostgreSQL 16) y el servicio web `vastago-sistema` (Docker).
3. En el formulario inicial, ingresa `DEMO_PASSWORD` (contraseña inicial para las cuentas demo), `RESEND_API_KEY`
   (clave de Resend) y `EMAIL_TO` (Gmail asociado a la cuenta de Resend). Render genera `JWT_SECRET` y
   `FIELD_ENCRYPTION_KEY`, y fija `EMAIL_FROM` en `Vastago <onboarding@resend.dev>` y
   `EMAIL_SCHEDULER_ENABLED` en `true`. Para un servicio existente, agrega las variables que falten desde **Environment**.
4. Render construye la imagen (`Dockerfile`: compila React y empaqueta Flask); en el primer arranque
   `python -m app.seed --if-empty` crea el esquema si la base está vacía. Después se aplican las migraciones,
   se amplían los datos demo una sola vez y se inicia Gunicorn.
5. Verifica `https://<tu-servicio>.onrender.com/api/health` → `{"status":"ok"}`.
6. Entra como administrador y abre **Correo y alertas**. Guarda el destinatario y pulsa **Enviar resumen ahora**
   cuando haya insumos críticos. Comprueba la recepción en Gmail. Con `onboarding@resend.dev`, Resend solo
   permite enviar al correo asociado a la cuenta. Los avisos inmediatos y el resumen diario se activan desde esa pantalla.
   El resumen diario se procesa mientras el servicio está activo y se retoma cuando despierta.

Limitaciones del plan gratuito: el servicio se suspende tras 15 min sin tráfico (~1 min de arranque en frío) y la base
PostgreSQL gratuita expira a los 30 días (con 14 días de gracia) y no incluye respaldos automáticos.

## Convenciones de trabajo

- Ramas: `main` (estable, protegida), `feature/HUxx-descripcion`, `fix/…`, `docs/…`; se integra por Pull Request con CI en verde.
- Commits (Conventional Commits): `feat(produccion): vista previa de BOM (HU05)`, `fix(auth): …`, `docs: …`, `test: …`, `chore: …`.
- Etiquetas por hito: `v0.3-sprint3`, `apf2`.

## Documentación

- Informe APF2 (análisis, planificación, prototipos, riesgos, métricas, arquitectura, BD, seguridad, pruebas y despliegue): `Informe_APF2.docx`; fuentes y diagramas en `docs/build/`.
- Evidencias reproducibles: carpeta `evidencias/`.

## Licencia y uso

Proyecto académico (UTP, Integrador 2). Los datos de demanda y usuarios son de demostración; no representan información real de la empresa.
