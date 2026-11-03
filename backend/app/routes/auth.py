import re
import psycopg2
from flask import Blueprint, current_app, g, jsonify, make_response, request
from app.extensions import limiter
from app.security import (login_required, hash_password, validar_politica_password, cifrar, descifrar, PERMISOS)
from app.services import auth_service
from app.repositories.usuarios import UsuarioRepository, SesionRepository
from app.db import transaction
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
    users = UsuarioRepository().listar()
    for user in users:
        blob = user.pop("telefono_cifrado", None)
        user["telefono"] = descifrar(blob) if blob else ""
    return jsonify(users)


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
    d = request.get_json(silent=True)
    if not isinstance(d, dict) or set(d) != {"activo"} or type(d["activo"]) is not bool:
        return jsonify(error="Indica un estado activo válido"), 400
    activo = d["activo"]
    with transaction() as cur:
        repo = UsuarioRepository(cur)
        repo.bloquear_administracion()
        user = repo.get_con_rol(uid)
        if not user:
            return jsonify(error="Usuario no encontrado"), 404
        if uid == g.usuario["id"] and not activo:
            return jsonify(error="No puedes desactivarte a ti mismo"), 400
        if user["rol"] == "Administrador" and user["activo"] and not activo and repo.contar_administradores() <= 1:
            return jsonify(error="Debe permanecer al menos un administrador activo"), 400
        r = repo.cambiar_estado(uid, activo)
        SesionRepository(cur).revocar_todas(uid)
        AuditoriaRepository(cur).registrar("USUARIO_ESTADO", g.usuario["id"], entidad="usuarios",
                                          detalle={"id": uid, "activo": activo}, ip=request.remote_addr)
    return jsonify(r)


@bp.put("/usuarios/<int:uid>")
@login_required("usuarios:gestionar")
def editar_usuario(uid):
    d = request.get_json(silent=True)
    if not isinstance(d, dict) or set(d) != {"nombre", "email", "rol", "telefono"}:
        return jsonify(error="Completa nombre, correo, rol y teléfono"), 400
    if not all(isinstance(d[k], str) for k in d):
        return jsonify(error="Datos inválidos"), 400
    nombre, email, rol, telefono = d["nombre"].strip(), d["email"].strip().lower(), d["rol"], d["telefono"].strip()
    if not 1 <= len(nombre) <= 100 or len(email) > 120 or not EMAIL_RE.fullmatch(email) or rol not in {"Administrador", "Jefe de Producción", "Almacenero", "Gerente", "Operario"}:
        return jsonify(error="Nombre, correo o rol inválido"), 400
    if telefono and not re.fullmatch(r"[+\d ()-]{6,24}", telefono):
        return jsonify(error="Teléfono inválido"), 400
    try:
        with transaction() as cur:
            repo = UsuarioRepository(cur)
            repo.bloquear_administracion()
            old = repo.get_con_rol(uid)
            if not old:
                return jsonify(error="Usuario no encontrado"), 404
            if uid == g.usuario["id"] and rol != old["rol"]:
                return jsonify(error="No puedes cambiar tu propio rol"), 400
            if old["rol"] == "Administrador" and old["activo"] and rol != "Administrador" and repo.contar_administradores() <= 1:
                return jsonify(error="Debe permanecer al menos un administrador activo"), 400
            duplicate = repo.find_by_email(email)
            if duplicate and duplicate["id"] != uid:
                return jsonify(error="El correo ya está registrado"), 409
            user = repo.editar(uid, nombre, email, rol, cifrar(telefono) if telefono else None)
            SesionRepository(cur).revocar_todas(uid)
            AuditoriaRepository(cur).registrar("USUARIO_EDITADO", g.usuario["id"], entidad="usuarios",
                                              detalle={"id": uid, "rol_anterior": old["rol"], "rol": rol}, ip=request.remote_addr)
        return jsonify(user)
    except psycopg2.errors.UniqueViolation:
        return jsonify(error="El correo ya está registrado"), 409


def _guardar_password(uid, password, actual=None):
    if not isinstance(password, str):
        return jsonify(error="Contraseña inválida"), 400
    fallos = validar_politica_password(password)
    if fallos:
        return jsonify(error="Contraseña débil: " + ", ".join(fallos)), 400
    with transaction() as cur:
        repo = UsuarioRepository(cur)
        old = repo.password_actual(uid)
        if not old:
            return jsonify(error="Usuario no encontrado"), 404
        from app.security import verify_password
        if actual is not None and (not isinstance(actual, str) or not verify_password(actual, old["password_hash"])):
            return jsonify(error="La contraseña actual es incorrecta"), 400
        if verify_password(password, old["password_hash"]):
            return jsonify(error="La nueva contraseña debe ser diferente"), 400
        repo.cambiar_password(uid, hash_password(password))
        SesionRepository(cur).revocar_todas(uid)
        AuditoriaRepository(cur).registrar("PASSWORD_CAMBIADA", g.usuario["id"], entidad="usuarios",
                                          detalle={"id": uid}, ip=request.remote_addr)
    response = make_response(jsonify(ok=True))
    if uid == g.usuario["id"]:
        response.delete_cookie(COOKIE, path="/api/auth")
    return response


@bp.post("/password")
@login_required()
@limiter.limit("5 per minute")
def cambiar_mi_password():
    d = request.get_json(silent=True) or {}
    if not isinstance(d, dict) or not d.get("actual"):
        return jsonify(error="Ingresa tu contraseña actual"), 400
    return _guardar_password(g.usuario["id"], d.get("nueva"), d["actual"])


@bp.post("/usuarios/<int:uid>/password")
@login_required("usuarios:gestionar")
@limiter.limit("10 per minute")
def restablecer_password(uid):
    if uid == g.usuario["id"]:
        return jsonify(error="Para tu cuenta utiliza Cambiar mi contraseña"), 400
    d = request.get_json(silent=True) or {}
    return _guardar_password(uid, d.get("nueva") if isinstance(d, dict) else None)


@bp.get("/auditoria")
@login_required("auditoria:ver")
def auditoria():
    return jsonify(AuditoriaRepository().ultimos(200))
