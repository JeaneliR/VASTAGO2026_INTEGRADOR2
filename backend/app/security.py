"""Controles de seguridad transversales: hashing, JWT, cifrado de campos, RBAC y cabeceras HTTP."""
import base64, hashlib, os, secrets
from datetime import datetime, timedelta, timezone
from functools import wraps

import bcrypt, jwt
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from flask import current_app, g, jsonify, request

# ------------------------------------------------------------------ Contraseñas (bcrypt)
def hash_password(password: str) -> str:
    rounds = current_app.config["BCRYPT_ROUNDS"]
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds)).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


def validar_politica_password(p: str):
    """OWASP ASVS 2.1: longitud >= 10, mayúscula, minúscula, número y símbolo."""
    errores = []
    if len(p) < 10: errores.append("mínimo 10 caracteres")
    if not any(c.islower() for c in p): errores.append("una minúscula")
    if not any(c.isupper() for c in p): errores.append("una mayúscula")
    if not any(c.isdigit() for c in p): errores.append("un número")
    if not any(not c.isalnum() for c in p): errores.append("un símbolo")
    return errores


# ------------------------------------------------------------------ Tokens
def crear_access_token(usuario: dict) -> str:
    ahora = datetime.now(timezone.utc)
    payload = {"sub": str(usuario["id"]), "rol": usuario["rol"], "nombre": usuario["nombre"],
               "iat": ahora, "exp": ahora + timedelta(minutes=current_app.config["ACCESS_TOKEN_MINUTES"]),
               "jti": secrets.token_hex(8)}
    return jwt.encode(payload, current_app.config["JWT_SECRET"], algorithm="HS256")


def decodificar_access_token(token: str) -> dict:
    # algorithms fijo => rechaza "alg: none" y confusión de algoritmos
    return jwt.decode(token, current_app.config["JWT_SECRET"], algorithms=["HS256"],
                      options={"require": ["exp", "sub", "rol"]})


def nuevo_refresh_token():
    token = secrets.token_urlsafe(48)
    return token, hash_token(token)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


# ------------------------------------------------------------------ Cifrado de campos (AES-256-GCM)
def _aes():
    key = base64.b64decode(current_app.config["FIELD_ENCRYPTION_KEY"])
    if len(key) != 32:
        raise RuntimeError("FIELD_ENCRYPTION_KEY debe decodificar a 32 bytes (AES-256)")
    return AESGCM(key)


def cifrar(texto: str) -> bytes:
    nonce = os.urandom(12)
    return nonce + _aes().encrypt(nonce, texto.encode(), b"vastago-v1")


def descifrar(blob) -> str:
    blob = bytes(blob)
    return _aes().decrypt(blob[:12], blob[12:], b"vastago-v1").decode()


# ------------------------------------------------------------------ Autorización (RBAC)
PERMISOS = {
    "dashboard:ver": {"Administrador", "Jefe de Producción", "Almacenero", "Gerente"},
    "inventario:ver": {"Administrador", "Jefe de Producción", "Almacenero", "Operario"},
    "inventario:escribir": {"Administrador", "Almacenero"},
    "produccion:ver": {"Administrador", "Jefe de Producción", "Almacenero", "Gerente", "Operario"},
    "produccion:escribir": {"Administrador", "Jefe de Producción"},          # crear órdenes
    "produccion:etapas": {"Administrador", "Jefe de Producción", "Operario"},  # iniciar etapas, consumir lotes, cerrar etapas
    "pt:ver": {"Administrador", "Jefe de Producción", "Almacenero", "Gerente"},
    "pt:escribir": {"Administrador", "Almacenero"},                            # despachos de producto terminado
    "trazabilidad:ver": {"Administrador", "Jefe de Producción", "Almacenero", "Gerente", "Operario"},
    "analitica:ver": {"Administrador", "Jefe de Producción", "Gerente"},
    "usuarios:gestionar": {"Administrador"},
    "auditoria:ver": {"Administrador"},
}


def login_required(permiso=None):
    def deco(fn):
        @wraps(fn)
        def wrapper(*a, **kw):
            auth = request.headers.get("Authorization", "")
            if not auth.startswith("Bearer "):
                return jsonify(error="No autenticado"), 401
            try:
                claims = decodificar_access_token(auth[7:])
            except jwt.ExpiredSignatureError:
                return jsonify(error="Token expirado"), 401
            except jwt.InvalidTokenError:
                return jsonify(error="Token inválido"), 401
            g.usuario = {"id": int(claims["sub"]), "rol": claims["rol"], "nombre": claims.get("nombre")}
            if permiso and g.usuario["rol"] not in PERMISOS[permiso]:
                from app.repositories.analitica import AuditoriaRepository
                AuditoriaRepository().registrar("ACCESO_DENEGADO", g.usuario["id"], entidad=permiso,
                                                ip=request.remote_addr, exito=False)
                return jsonify(error="No tienes permisos para esta acción"), 403
            return fn(*a, **kw)
        return wrapper
    return deco


# ------------------------------------------------------------------ Cabeceras de seguridad
def aplicar_cabeceras(resp):
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    resp.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    resp.headers["Content-Security-Policy"] = ("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
                                               "img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; "
                                               "base-uri 'self'; form-action 'self'")
    if current_app.config["COOKIE_SECURE"]:
        resp.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    if request.path.startswith("/api/"):
        resp.headers["Cache-Control"] = "no-store"
    resp.headers.pop("Server", None)
    return resp
