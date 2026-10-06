# ---- Etapa 1: compilar el frontend React ----
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN mkdir -p /app/backend && npm run build

# ---- Etapa 2: backend Flask + frontend compilado ----
FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 APP_ENV=production
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend/ backend/
COPY db/ db/
COPY ml-service/forecast_output.json ml-service/forecast_output.json
COPY --from=frontend /app/backend/static backend/static
RUN useradd -r -u 10001 appuser && chown -R appuser /app
USER appuser
WORKDIR /app/backend
EXPOSE 8000
# Primer arranque: crea esquema y datos solo si la BD está vacía; luego inicia gunicorn
CMD ["sh", "-c", "python -m app.seed --if-empty && gunicorn -c gunicorn.conf.py wsgi:app"]
