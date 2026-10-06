"""Configuración centralizada: TODOS los secretos vienen de variables de entorno."""
import os


def _required(name, default=None):
    value = os.environ.get(name, default)
    if value is None:
        raise RuntimeError(f"Falta la variable de entorno obligatoria: {name}")
    return value


class Config:
    ENV = os.environ.get("APP_ENV", "development")
    DATABASE_URL = _required("DATABASE_URL", "postgresql://vastago_app:app-secret@127.0.0.1:5433/vastago")
    # Clave de firma JWT (>= 32 caracteres) y clave AES-256 (32 bytes en base64)
    JWT_SECRET = _required("JWT_SECRET", "dev-only-secret-change-me-32-chars-minimum!!")
    FIELD_ENCRYPTION_KEY = _required("FIELD_ENCRYPTION_KEY", "ZGV2LW9ubHktYWVzLWtleS0zMi1ieXRlcy1sb25nISE=")
    ACCESS_TOKEN_MINUTES = int(os.environ.get("ACCESS_TOKEN_MINUTES", "15"))
    REFRESH_TOKEN_DAYS = int(os.environ.get("REFRESH_TOKEN_DAYS", "7"))
    MAX_LOGIN_ATTEMPTS = int(os.environ.get("MAX_LOGIN_ATTEMPTS", "5"))
    LOCKOUT_MINUTES = int(os.environ.get("LOCKOUT_MINUTES", "15"))
    BCRYPT_ROUNDS = int(os.environ.get("BCRYPT_ROUNDS", "12"))
    ENABLE_COMPRESSION = os.environ.get("ENABLE_COMPRESSION", "true").lower() == "true"
    COOKIE_SECURE = ENV == "production"          # cookie solo por HTTPS en producción
    RATELIMIT_ENABLED = os.environ.get("RATELIMIT_ENABLED", "true").lower() == "true"
    STATIC_DIR = os.environ.get("STATIC_DIR", os.path.join(os.path.dirname(__file__), "..", "static"))

    @classmethod
    def validate(cls):
        if cls.ENV == "production":
            if "dev-only" in cls.JWT_SECRET or "dev-only" in cls.FIELD_ENCRYPTION_KEY[:0]:
                raise RuntimeError("JWT_SECRET de desarrollo no permitido en producción")
            if cls.FIELD_ENCRYPTION_KEY == "ZGV2LW9ubHktYWVzLWtleS0zMi1ieXRlcy1sb25nISE=":
                raise RuntimeError("FIELD_ENCRYPTION_KEY de desarrollo no permitido en producción")
