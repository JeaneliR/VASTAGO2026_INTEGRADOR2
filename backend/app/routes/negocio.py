import re
from flask import Blueprint, g, jsonify, request
from app.db import transaction
from app.security import login_required
from app.repositories.inventario import InsumoRepository, LoteInsumoRepository, MovimientoRepository
from app.repositories.produccion import OrdenRepository
from app.services import planta_service
from app.services.planta_service import ReglaNegocio
from app.repositories.analitica import AlertaRepository, PronosticoRepository, AuditoriaRepository

bp = Blueprint("negocio", __name__, url_prefix="/api")


def _num(valor, maximo):
    try:
        n = float(valor)
    except (TypeError, ValueError):
        return None
    return n if 0 < n <= maximo else None


@bp.get("/health")
def health():
    return jsonify(status="ok")


# ---------------------------------------------------------------- Inventario
@bp.get("/inventario")
@login_required("inventario:ver")
def inventario():
    return jsonify(InsumoRepository().listar())


@bp.post("/inventario/<int:insumo_id>/movimientos")
@login_required("inventario:escribir")
def movimiento(insumo_id):
    """Ingreso (con lote de proveedor y vencimiento) o salida manual (del lote indicado o por FEFO)."""
    d = request.get_json(silent=True) or {}
    tipo, cantidad = d.get("tipo", "INGRESO"), _num(d.get("cantidad"), 1_000_000)
    if tipo not in ("INGRESO", "SALIDA") or cantidad is None:
        return jsonify(error="Datos inválidos"), 400
    codigo = str(d.get("lote", "") or "")[:30].strip()
    proveedor = str(d.get("proveedor", "") or "")[:100].strip() or None
    vencimiento = str(d.get("vencimiento", "") or "")[:10] or None
    if vencimiento and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", vencimiento):
        return jsonify(error="Fecha de vencimiento inválida (AAAA-MM-DD)"), 400
    lote_id = d.get("lote_id")
    if lote_id is not None and not isinstance(lote_id, int):
        return jsonify(error="Datos inválidos"), 400
    motivo = str(d.get("motivo", ""))[:120] or None
    try:
        with transaction() as cur:
            insumos = InsumoRepository(cur)
            ins = insumos.bloquear_para_actualizar(insumo_id)        # SELECT ... FOR UPDATE (evita carreras)
            if not ins:
                return jsonify(error="Insumo no encontrado"), 404
            if tipo == "SALIDA" and float(ins["stock_actual"]) < cantidad:
                return jsonify(error="Stock insuficiente"), 409
            if tipo == "INGRESO":
                r = planta_service.ingresar_insumo(cur, insumo_id, cantidad, codigo, proveedor, vencimiento, motivo, g.usuario)
            else:
                planta_service.salir_insumo(cur, insumo_id, cantidad, lote_id, motivo, g.usuario)
                r = {}
            AuditoriaRepository(cur).registrar("MOVIMIENTO_" + tipo, g.usuario["id"], entidad="insumos",
                                               detalle={"insumo_id": insumo_id, "cantidad": cantidad, **r}, ip=request.remote_addr)
            return jsonify({**insumos.obtener(insumo_id), **r})
    except ReglaNegocio as e:
        return jsonify(error=str(e)), e.status


@bp.get("/inventario/<int:insumo_id>/lotes")
@login_required("inventario:ver")
def lotes_de_insumo(insumo_id):
    return jsonify(LoteInsumoRepository().listar(insumo_id))


@bp.get("/lotes-insumo")
@login_required("inventario:ver")
def lotes_insumo():
    return jsonify(LoteInsumoRepository().listar(solo_con_saldo=True))


@bp.get("/inventario/<int:insumo_id>/movimientos")
@login_required("inventario:ver")
def historial(insumo_id):
    return jsonify(MovimientoRepository().ultimos(insumo_id))


# ---------------------------------------------------------------- Dashboard / analítica
@bp.get("/alertas")
@login_required("dashboard:ver")
def alertas():
    return jsonify(AlertaRepository().listar())


@bp.get("/kpis")
@login_required("dashboard:ver")
def kpis():
    q = InsumoRepository().contar_quiebres()
    o = OrdenRepository().contar_activas()
    mape = round(PronosticoRepository().mape_promedio(), 1)
    return jsonify(quiebresStock={"valor": str(q), "delta": "Insumos bajo el mínimo", "tipo": "neutral"},
                   mermaMes={"valor": "2.3%", "delta": "-1.1 pp vs. mes anterior", "tipo": "up"},
                   ordenesActivas={"valor": str(o["en_proceso"] + o["planificadas"]),
                                   "delta": f"{o['en_proceso']} en proceso, {o['planificadas']} planificadas", "tipo": "neutral"},
                   precisionModelo={"valor": f"{round(100 - mape, 1)}%", "delta": f"MAPE promedio {mape}%", "tipo": "up"})


@bp.get("/forecast")
@login_required("analitica:ver")
def forecast():
    return jsonify(PronosticoRepository().serie())
