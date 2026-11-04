"""API del asistente de consultas (lenguaje natural sobre el kardex real y el control de producción)."""
from flask import Blueprint, g, jsonify, request
from app.extensions import limiter
from app.repositories.analitica import AuditoriaRepository
from app.security import login_required
from app.services import asistente_service

bp = Blueprint("asistente", __name__, url_prefix="/api/asistente")
MAX_PREGUNTA = 300


@bp.post("/preguntar")
@login_required("asistente:usar")
@limiter.limit("30 per minute")
def preguntar():
    d = request.get_json(silent=True) or {}
    pregunta = d.get("pregunta")
    if not isinstance(pregunta, str) or not pregunta.strip() or len(pregunta) > MAX_PREGUNTA:
        return jsonify(error=f"Escribe una pregunta de hasta {MAX_PREGUNTA} caracteres"), 400
    pregunta = pregunta.strip()
    out = asistente_service.responder(pregunta)
    AuditoriaRepository().registrar("ASISTENTE_CONSULTA", g.usuario["id"], entidad="asistente", ip=request.remote_addr,
                                    detalle={"intencion": out["intencion"], "pregunta": pregunta[:120]})
    return jsonify(out)


@bp.get("/sugerencias")
@login_required("asistente:usar")
def sugerencias():
    return jsonify(sugerencias=asistente_service.SUGERENCIAS_BASE)
