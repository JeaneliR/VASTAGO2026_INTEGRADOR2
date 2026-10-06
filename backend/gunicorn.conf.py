"""Configuración de gunicorn (producción)."""
import gunicorn, os
gunicorn.SERVER = "webserver"          # oculta nombre y versión del servidor (A05: Security Misconfiguration)
gunicorn.SERVER_SOFTWARE = "webserver"
bind = f"0.0.0.0:{os.environ.get('PORT', '8000')}"
workers = int(os.environ.get("WEB_CONCURRENCY", "2"))
timeout = 30
limit_request_line = 4094
limit_request_fields = 50
accesslog = "-"
forwarded_allow_ips = "*"              # detrás del balanceador de Render (TLS termina allí)
