import re
from flask import Blueprint, current_app, g, jsonify, make_response, request
from app.extensions import limiter
from app.security import (login_required, hash_password, validar_politica_password, cifrar, descifrar, PERMISOS)
from app.services import auth_service
from app.repositories.usuarios import UsuarioRepository
from app.repositories.analitica import AuditoriaRepository

bp = Blueprint("auth", __name__, url_prefix="/api/auth")
COOKIE = "vastago_rt"
EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,120}\.[^@\s]{2,}$")


def _set_cookie(resp, token):
    cfg = current_app.config
    resp.set_cookie(COOKIE, token, max_age=cfg["REFRESH_TOKEN_DAYS"] * 86400, httponly=True,
                    secure=cfg["COOKIE_SECURE"], samesite="Strict", path="/api/auth")
    return resp


def _csrf_ok():
    # Defensa adicional contra CSRF: las llamadas legítimas del frontend envían esta cabecera personalizada
    return request.headers.get("X-Requested-With") == "vastago-web"


@bp.post("/login")
@limiter.limit("10 per minute")
def login():
    data = request.get_json(silent=True) or {}
    email, password = str(data.get("email", ""))[:120], str(data.get("password", ""))[:128]
    if not EMAIL_RE.match(email) or not password:
        return jsonify(error="Credenciales inválidas"), 401
    try:
        usuario, access, refresh = auth_service.login(email, password, request.remote_addr, request.user_agent.string)
    except auth_service.AuthError as e:
        return jsonify(error=str(e)), e.status
    resp = make_response(jsonify(access_token=access, usuario=usuario, permisos=_permisos(usuario["rol"])))
    return _set_cookie(resp, refresh)


@bp.post("/refresh")
@limiter.limit("30 per minute")
def refresh():
    if not _csrf_ok():
        return jsonify(error="Solicitud no permitida"), 403
    token = request.cookies.get(COOKIE)
    if not token:
        return jsonify(error="Sin sesión"), 401
    try:
        usuario, access, nuevo = auth_service.refresh(token, request.remote_addr, request.user_agent.string)
    except auth_service.AuthError as e:
        resp = make_response(jsonify(error=str(e)), e.status)
        resp.delete_cookie(COOKIE, path="/api/auth")
        return resp
    resp = make_response(jsonify(access_token=access, usuario=usuario, permisos=_permisos(usuario["rol"])))
    return _set_cookie(resp, nuevo)


@bp.post("/logout")
@login_required()
def logout():
    auth_service.logout(request.cookies.get(COOKIE), g.usuario["id"], request.remote_addr)
    resp = make_response(jsonify(ok=True))
    resp.delete_cookie(COOKIE, path="/api/auth")
    return resp


def _permisos(rol):
    return sorted(p for p, roles in PERMISOS.items() if rol in roles)


# ---------------------------------------------------------------- Gestión de usuarios (solo Administrador)
@bp.get("/usuarios")
@login_required("usuarios:gestionar")
def listar_usuarios():
    return jsonify(UsuarioRepository().listar())


@bp.post("/usuarios")
@login_required("usuarios:gestionar")
def crear_usuario():
    d = request.get_json(silent=True) or {}
    nombre, email, rol = str(d.get("nombre", "")).strip()[:100], str(d.get("email", "")).strip()[:120], d.get("rol")
    password, telefono = str(d.get("password", "")), str(d.get("telefono", ""))[:20]
    if not nombre or not EMAIL_RE.match(email) or rol not in {"Administrador", "Jefe de Producción", "Almacenero", "Gerente", "Operario"}:
        return jsonify(error="Datos inválidos"), 400
    fallos = validar_politica_password(password)
    if fallos:
        return jsonify(error="Contraseña débil: falta " + ", ".join(fallos)), 400
    repo = UsuarioRepository()
    if repo.find_by_email(email):
        return jsonify(error="El correo ya está registrado"), 409
    u = repo.crear(nombre, email, hash_password(password), rol, cifrar(telefono) if telefono else None)
    AuditoriaRepository().registrar("USUARIO_CREADO", g.usuario["id"], entidad="usuarios",
                                    detalle={"nuevo_id": u["id"], "rol": rol}, ip=request.remote_addr)
    return jsonify(u), 201


@bp.patch("/usuarios/<int:uid>")
@login_required("usuarios:gestionar")
def estado_usuario(uid):
    activo = bool((request.get_json(silent=True) or {}).get("activo"))
    if uid == g.usuario["id"] and not activo:
        return jsonify(error="No puedes desactivarte a ti mismo"), 400
    r = UsuarioRepository().cambiar_estado(uid, activo)
    if not r:
        return jsonify(error="No encontrado"), 404
    AuditoriaRepository().registrar("USUARIO_ESTADO", g.usuario["id"], entidad="usuarios",
                                    detalle={"id": uid, "activo": activo}, ip=request.remote_addr)
    return jsonify(r)


@bp.get("/auditoria")
@login_required("auditoria:ver")
def auditoria():
    return jsonify(AuditoriaRepository().ultimos(200))
