import os
from flask import Flask, jsonify, send_from_directory
from app.config import Config
from app.db import init_pool
from app.extensions import limiter
from app.security import aplicar_cabeceras
from flask_compress import Compress


def create_app(overrides=None):
    app = Flask(__name__, static_folder=None)
    app.config.from_object(Config)
    app.config.update(overrides or {})
    Config.validate()
    app.config["MAX_CONTENT_LENGTH"] = 64 * 1024          # cuerpo máximo 64 KB
    app.config["RATELIMIT_ENABLED"] = app.config["RATELIMIT_ENABLED"]
    init_pool(app.config["DATABASE_URL"])
    limiter.init_app(app)
    app.config.setdefault("COMPRESS_MIMETYPES", ["text/html", "text/css", "application/javascript", "text/javascript", "application/json"])
    app.config["COMPRESS_MIN_SIZE"] = 500
    if app.config.get("ENABLE_COMPRESSION", True):
        Compress(app)                                       # gzip/brotli: estrategia WPO

    from app.routes import auth, negocio
    app.register_blueprint(auth.bp)
    app.register_blueprint(negocio.bp)
    app.after_request(aplicar_cabeceras)

    @app.errorhandler(404)
    def _404(e):
        return jsonify(error="No encontrado"), 404

    @app.errorhandler(429)
    def _429(e):
        return jsonify(error="Demasiadas solicitudes, intenta más tarde"), 429

    @app.errorhandler(Exception)
    def _500(e):                                           # nunca exponer trazas al cliente
        from werkzeug.exceptions import HTTPException
        if isinstance(e, HTTPException):
            return jsonify(error=e.description), e.code
        app.logger.exception("Error no controlado")
        return jsonify(error="Error interno del servidor"), 500

    static_dir = os.path.abspath(app.config["STATIC_DIR"])

    def _plano(resp):
        resp.direct_passthrough = False        # permite que Flask-Compress comprima el archivo estático
        resp.make_sequence()
        return resp

    @app.get("/", defaults={"path": ""})
    @app.get("/<path:path>")
    def spa(path):                                         # sirve el frontend React compilado
        if path.startswith("api/"):
            return jsonify(error="No encontrado"), 404
        full = os.path.realpath(os.path.join(static_dir, path))
        if path and full.startswith(static_dir + os.sep) and os.path.isfile(full):
            return _plano(send_from_directory(static_dir, path, etag=False, max_age=3600))
        if "." in path.rsplit("/", 1)[-1]:                 # parece un archivo que no existe → 404 (no devolver la SPA)
            return jsonify(error="No encontrado"), 404
        resp = _plano(send_from_directory(static_dir, "index.html", etag=False, max_age=0))
        resp.headers["Content-Disposition"] = "inline"
        return resp

    return app
