# Vástago & Co — Sistema Web Inteligente de Producción e Inventarios

[![CI](https://github.com/JeaneliR/VASTAGO2026_INTEGRADOR2/actions/workflows/ci.yml/badge.svg)](https://github.com/JeaneliR/VASTAGO2026_INTEGRADOR2/actions/workflows/ci.yml)
![Python](https://img.shields.io/badge/Python-3.13-3776AB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Estado](https://img.shields.io/badge/estado-v1%20(APF2)-C89B3C)

Sistema web para gestionar **inventario de insumos**, **órdenes de producción con receta (BOM)**, **seguridad por roles** y
**analítica predictiva de demanda** en **Vástago & Co** (RUC 20613556240), empresa chocolatera artesanal peruana
(cacao fino de aroma, barras, bombones y cobertura).

Proyecto del curso **Integrador 2** — Universidad Tecnológica del Perú (UTP). Docente: Yovana Connie Roca Ávila.
Entrega actual: **APF2 (06-oct-2026), Sprint 3 en curso** — versión 1 (v1) del sistema.

## Equipo (Scrum)

| Integrante | Rol Scrum |
|---|---|
| Jeaneli Rosmery Caso Valenzuela | Product Owner |
| Arnold Steven Lujan Aderiano | Scrum Master |
| Luis Facundo Matamoros Ylizarbe | Desarrollador |

## Qué incluye la v1

| Área | Funcionalidad | Estado |
|---|---|---|
| Inventario | Stock con semáforo (OK / Bajo / Crítico), ingresos y salidas, historial de movimientos | Implementado |
| Producción | Órdenes con vista previa de insumos (BOM); al completar una orden se descuentan los insumos en una sola transacción | Implementado |
| Seguridad | Login con bcrypt, JWT de 15 min + refresh rotatorio (cookie HttpOnly), bloqueo por intentos, rate limiting, RBAC de 4 roles, AES-256-GCM, auditoría de solo-anexar, cabeceras CSP/HSTS | Implementado |
| Analítica | Pronóstico de demanda a 3 meses por producto con MAPE (regresión lineal + estacionalidad) | Implementado (v1) |
| Dashboard | KPIs y alertas dentro del sistema, por rol | Implementado |
| Datos | PostgreSQL 16, replicación streaming, respaldo/restauración verificada, monitoreo SQL | Implementado |
| Exportar reportes (RF11) | PDF/Excel del dashboard | Planificado — Sprint 4 |
| Alertas WhatsApp Business / correo (RF12) | Notificación fuera del sistema | Planificado — Sprint 4 |

## Arquitectura

```
Navegador ──HTTPS──▶ Flask 3 + gunicorn ──(patrón Repository, pool psycopg2)──▶ PostgreSQL 16
   React 19 (SPA)        │  Blueprints: auth / negocio                          primario ──streaming──▶ réplica
   servida por Flask     └─ seguridad.py (JWT, RBAC, AES-GCM, cabeceras)
                         ml-service/forecast.py  →  forecast_output.json  →  tabla pronosticos
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

# 4) Frontend
cd ../frontend && npm ci && npm run build      # genera backend/static/

# 5) Ejecutar
cd ../backend && gunicorn -c gunicorn.conf.py wsgi:app    # http://localhost:8000
```

`.env.example` apunta a PostgreSQL en el puerto **5433**; si tu instancia usa 5432, ajusta `DATABASE_URL`.

## Variables de entorno

| Variable | Descripción | Obligatoria en producción |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL | Sí (la provee Render) |
| `JWT_SECRET` | Clave de firma de tokens (≥ 32 caracteres). `openssl rand -hex 32` | Sí (Render la genera) |
| `FIELD_ENCRYPTION_KEY` | Clave AES-256 en base64. `openssl rand -base64 32` | Sí (Render la genera) |
| `APP_ENV` | `development` / `production` (en producción: cookie Secure, HSTS y rechazo de secretos de desarrollo) | Sí |
| `DEMO_PASSWORD` | Contraseña de los usuarios demo que crea `seed.py` | Sí (se define en el panel de Render) |
| `ACCESS_TOKEN_MINUTES`, `REFRESH_TOKEN_DAYS`, `MAX_LOGIN_ATTEMPTS`, `LOCKOUT_MINUTES`, `BCRYPT_ROUNDS` | Parámetros de seguridad (por defecto 15, 7, 5, 15, 12) | No |
| `PORT`, `WEB_CONCURRENCY` | Puerto y workers de gunicorn (por defecto 8000 y 2) | No |

Nunca se suben secretos al repositorio: `.env` está en `.gitignore`.

## Usuarios demo por rol

La contraseña de todos es el valor de `DEMO_PASSWORD` (cámbiala; no uses valores de ejemplo en la nube).

| Rol | Correo | Acceso |
|---|---|---|
| Administrador | `admin@vastagoyco.pe` | Todo, incluidos Usuarios y Auditoría |
| Jefe de Producción | `jefe.produccion@vastagoyco.pe` | Dashboard, Inventario (lectura), Producción, Analítica |
| Almacenero | `almacen@vastagoyco.pe` | Dashboard, Inventario (lectura y escritura), Producción (lectura) |
| Gerente | `gerente@vastagoyco.pe` | Dashboard, Producción (lectura), Analítica |

## Pruebas y calidad

```bash
cd backend
python -m pytest tests -q                         # 24 pruebas (negocio + seguridad)
python -m pytest tests -q --cov=app               # requiere pytest-cov; cobertura 90 % (evidencias/05_cobertura.txt)
bandit -r app -q && pip-audit -r requirements.txt # análisis estático y dependencias
python tests/pentest_manual.py http://127.0.0.1:8000   # verificaciones OWASP contra una instancia en ejecución
```

> Las pruebas recrean el esquema (`DROP TABLE ... CREATE`) en la base indicada por `DATABASE_URL`:
> usa una base exclusiva para pruebas.

GitHub Actions (`.github/workflows/ci.yml`) ejecuta pytest, bandit y pip-audit en cada `push` y `pull_request`.

## Despliegue en Render

1. Sube el repositorio a GitHub.
2. En Render: **New → Blueprint** y selecciona el repositorio; Render lee `render.yaml` y crea la base `vastago-db`
   (PostgreSQL 16) y el servicio web `vastago-sistema` (Docker).
3. Define `DEMO_PASSWORD` en el panel (marcada `sync: false`, nunca se guarda en Git). `JWT_SECRET` y
   `FIELD_ENCRYPTION_KEY` se generan solas.
4. Render construye la imagen (`Dockerfile`: compila React y empaqueta Flask); en el primer arranque
   `python -m app.seed --if-empty` crea el esquema si la base está vacía y luego inicia gunicorn.
5. Verifica `https://<tu-servicio>.onrender.com/api/health` → `{"status":"ok"}`.

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
