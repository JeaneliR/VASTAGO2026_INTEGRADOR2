from datetime import date
from flask import Blueprint, g, jsonify, request
from app.db import transaction
from app.security import login_required
from app.repositories.inventario import InsumoRepository, MovimientoRepository
from app.repositories.produccion import ProductoRepository, OrdenRepository
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
    d = request.get_json(silent=True) or {}
    tipo, cantidad = d.get("tipo", "INGRESO"), _num(d.get("cantidad"), 1_000_000)
    if tipo not in ("INGRESO", "SALIDA") or cantidad is None:
        return jsonify(error="Datos inválidos"), 400
    with transaction() as cur:
        insumos = InsumoRepository(cur)
        ins = insumos.bloquear_para_actualizar(insumo_id)        # SELECT ... FOR UPDATE (evita carreras)
        if not ins:
            return jsonify(error="Insumo no encontrado"), 404
        if tipo == "SALIDA" and float(ins["stock_actual"]) < cantidad:
            return jsonify(error="Stock insuficiente"), 409
        MovimientoRepository(cur).registrar(insumo_id, tipo, cantidad, str(d.get("motivo", ""))[:120] or None, g.usuario["id"])
        AuditoriaRepository(cur).registrar("MOVIMIENTO_" + tipo, g.usuario["id"], entidad="insumos",
                                           detalle={"insumo_id": insumo_id, "cantidad": cantidad}, ip=request.remote_addr)
        return jsonify(insumos.obtener(insumo_id))


@bp.get("/inventario/<int:insumo_id>/movimientos")
@login_required("inventario:ver")
def historial(insumo_id):
    return jsonify(MovimientoRepository().ultimos(insumo_id))


# ---------------------------------------------------------------- Producción
@bp.get("/productos")
@login_required("produccion:ver")
def productos():
    return jsonify(ProductoRepository().listar())


@bp.get("/productos/<int:pid>/bom")
@login_required("produccion:ver")
def bom(pid):
    return jsonify(ProductoRepository().bom(pid))


@bp.get("/produccion")
@login_required("produccion:ver")
def ordenes():
    return jsonify(OrdenRepository().listar())


@bp.post("/produccion")
@login_required("produccion:escribir")
def crear_orden():
    d = request.get_json(silent=True) or {}
    cantidad = _num(d.get("cantidad"), 100_000)
    try:
        pid = int(d.get("producto_id"))
    except (TypeError, ValueError):
        pid = None
    if cantidad is None or pid is None or cantidad != int(cantidad):
        return jsonify(error="Datos inválidos"), 400
    with transaction() as cur:
        if not ProductoRepository(cur).find_by_id(pid):
            return jsonify(error="Producto no encontrado"), 404
        repo = OrdenRepository(cur)
        o = repo.crear(repo.siguiente_lote(), pid, int(cantidad), date.today(), g.usuario["id"])
        AuditoriaRepository(cur).registrar("ORDEN_CREADA", g.usuario["id"], entidad="ordenes_produccion",
                                           detalle={"lote": o["lote"], "cantidad": int(cantidad)}, ip=request.remote_addr)
    return jsonify(o), 201


@bp.patch("/produccion/<int:oid>/estado")
@login_required("produccion:escribir")
def estado_orden(oid):
    """Al completar una orden se descuentan los insumos según la receta (BOM), en una sola transacción."""
    nuevo = (request.get_json(silent=True) or {}).get("estado")
    if nuevo not in ("En proceso", "Completada"):
        return jsonify(error="Estado inválido"), 400
    with transaction() as cur:
        o = OrdenRepository(cur).cambiar_estado(oid, nuevo)
        if not o:
            return jsonify(error="Orden no encontrada"), 404
        if nuevo == "Completada":
            for linea in ProductoRepository(cur).bom(o["producto_id"]):
                InsumoRepository(cur).bloquear_para_actualizar(linea["insumo_id"])
                MovimientoRepository(cur).registrar(linea["insumo_id"], "SALIDA", round(linea["cantidadPorUnidad"] * o["cantidad"], 3),
                                                    "Consumo " + o["lote"], g.usuario["id"], o["id"])
        AuditoriaRepository(cur).registrar("ORDEN_ESTADO", g.usuario["id"], entidad="ordenes_produccion",
                                           detalle={"lote": o["lote"], "estado": nuevo}, ip=request.remote_addr)
    return jsonify(id=o["id"], lote=o["lote"], estado=o["estado"])


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
