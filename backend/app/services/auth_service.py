"""Caso de uso de autenticación: login con bloqueo, refresh con rotación y logout."""
from datetime import datetime, timedelta, timezone
from flask import current_app
from app.db import transaction
from app.repositories.usuarios import UsuarioRepository, SesionRepository
from app.repositories.analitica import AuditoriaRepository
from app import security as sec

# Hash ficticio para igualar el tiempo de respuesta cuando el usuario no existe (anti-enumeración)
import bcrypt as _bcrypt
_DUMMY = _bcrypt.hashpw(b"dummy-password", _bcrypt.gensalt(12)).decode()


class AuthError(Exception):
    def __init__(self, msg, status=401):
        super().__init__(msg); self.status = status


def login(email, password, ip, user_agent):
    """Los fallos se registran (contador + auditoría) y se confirman ANTES de lanzar el error,
    de lo contrario el rollback de la transacción borraría la evidencia del intento."""
    cfg = current_app.config
    error = None
    with transaction() as cur:
        users, sess, aud = UsuarioRepository(cur), SesionRepository(cur), AuditoriaRepository(cur)
        u = users.find_by_email(email)
        if not u:
            sec.verify_password(password, _DUMMY)
            aud.registrar("LOGIN_FALLIDO", email=email, ip=ip, exito=False, detalle={"motivo": "usuario"})
            error = AuthError("Credenciales inválidas")
        elif u["bloqueado_hasta"] and u["bloqueado_hasta"] > datetime.now(timezone.utc):
            aud.registrar("LOGIN_BLOQUEADO", u["id"], email, ip=ip, exito=False)
            error = AuthError("Cuenta bloqueada temporalmente por intentos fallidos", 423)
        elif not u["activo"] or not sec.verify_password(password, u["password_hash"]):
            r = users.registrar_fallo(u["id"], cfg["MAX_LOGIN_ATTEMPTS"], cfg["LOCKOUT_MINUTES"])
            aud.registrar("LOGIN_FALLIDO", u["id"], email, ip=ip, exito=False, detalle={"intentos": r["intentos_fallidos"]})
            error = AuthError("Credenciales inválidas")
        else:
            users.registrar_acceso(u["id"])
            token, token_hash = sec.nuevo_refresh_token()
            sess.crear(u["id"], token_hash, datetime.now(timezone.utc) + timedelta(days=cfg["REFRESH_TOKEN_DAYS"]), ip, user_agent)
            aud.registrar("LOGIN_OK", u["id"], email, ip=ip)
    if error:
        raise error
    usuario = {"id": u["id"], "nombre": u["nombre"], "email": u["email"], "rol": u["rol"]}
    return usuario, sec.crear_access_token(usuario), token


def refresh(refresh_token, ip, user_agent):
    """Rotación: el refresh token usado se revoca y se emite uno nuevo (detecta reutilización)."""
    cfg = current_app.config
    with transaction() as cur:
        users, sess, aud = UsuarioRepository(cur), SesionRepository(cur), AuditoriaRepository(cur)
        h = sec.hash_token(refresh_token)
        s = sess.buscar_valida(h)
        if not s:
            raise AuthError("Sesión inválida o expirada")
        u = users.get_con_rol(s["usuario_id"])
        if not u or not u["activo"]:
            raise AuthError("Usuario inactivo")
        sess.revocar(h)
        nuevo, nuevo_hash = sec.nuevo_refresh_token()
        sess.crear(u["id"], nuevo_hash, datetime.now(timezone.utc) + timedelta(days=cfg["REFRESH_TOKEN_DAYS"]), ip, user_agent)
        aud.registrar("TOKEN_REFRESCADO", u["id"], u["email"], ip=ip)
    usuario = {"id": u["id"], "nombre": u["nombre"], "email": u["email"], "rol": u["rol"]}
    return usuario, sec.crear_access_token(usuario), nuevo


def logout(refresh_token, usuario_id, ip):
    if refresh_token:
        SesionRepository().revocar(sec.hash_token(refresh_token))
    AuditoriaRepository().registrar("LOGOUT", usuario_id, ip=ip)
