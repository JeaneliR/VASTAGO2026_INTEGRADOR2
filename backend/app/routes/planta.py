"""API de planta: productos y rutas, órdenes con etapas, producto terminado y trazabilidad."""
from flask import Blueprint, g, jsonify, request
from app.db import transaction
from app.security import login_required
from app.repositories.produccion import EquipoRepository, OrdenRepository, ProductoRepository
from app.repositories.planta import (ConsumoRepository, EtapaRepository, LotePTRepository, MovimientoPTRepository,
                                     TrazabilidadRepository)
from app.repositories.inventario import InsumoRepository, LoteInsumoRepository
from app.services import planta_service
from app.services.planta_service import ReglaNegocio

bp = Blueprint("planta", __name__, url_prefix="/api")


def _num(valor, maximo, entero=False, minimo_exclusivo=True):
    try:
        n = float(valor)
    except (TypeError, ValueError):
        return None
    ok = (n > 0 if minimo_exclusivo else n >= 0) and n <= maximo
    if not ok or (entero and n != int(n)):
        return None
    return int(n) if entero else n


def _int(valor):
    try:
        return int(valor)
    except (TypeError, ValueError):
        return None


@bp.errorhandler(ReglaNegocio)
def _regla(e):
    return jsonify(error=str(e)), e.status


# ---------------------------------------------------------------- Catálogo y rutas
@bp.get("/productos")
@login_required("produccion:ver")
def productos():
    return jsonify(ProductoRepository().listar())


@bp.get("/productos/<int:pid>/bom")
@login_required("produccion:ver")
def bom(pid):
    return jsonify(ProductoRepository().bom(pid))


@bp.get("/productos/<int:pid>/ruta")
@login_required("produccion:ver")
def ruta(pid):
    repo = ProductoRepository()
    if not repo.find_by_id(pid):
        return jsonify(error="Producto no encontrado"), 404
    return jsonify(etapas=repo.ruta(pid), bom=repo.bom(pid))


@bp.get("/centros")
@login_required("produccion:ver")
def centros():
    return jsonify(InsumoRepository().centros())


@bp.get("/equipos")
@login_required("produccion:ver")
def equipos():
    return jsonify(EquipoRepository().listar())


@bp.get("/responsables")
@login_required("produccion:etapas")
def responsables():
    return jsonify(EtapaRepository().usuarios_responsables())


# ---------------------------------------------------------------- Órdenes
@bp.get("/produccion")
@login_required("produccion:ver")
def ordenes():
    return jsonify(OrdenRepository().listar())


@bp.post("/produccion")
@login_required("produccion:escribir")
def crear_orden():
    d = request.get_json(silent=True) or {}
    cantidad = _num(d.get("cantidad"), 100_000, entero=True)
    pid, centro = _int(d.get("producto_id")), _int(d.get("centro_id")) if d.get("centro_id") not in (None, "") else None
    if cantidad is None or pid is None:
        return jsonify(error="Datos inválidos"), 400
    with transaction() as cur:
        o = planta_service.crear_orden(cur, pid, cantidad, centro, g.usuario, request.remote_addr)
    return jsonify(o), 201


@bp.get("/produccion/<int:oid>")
@login_required("produccion:ver")
def detalle_orden(oid):
    """Orden con sus etapas (responsable, equipo, horas reales vs. estándar), insumos planificados vs. consumidos y lotes disponibles."""
    with transaction() as cur:
        orden = OrdenRepository(cur).obtener(oid)
        if not orden:
            return jsonify(error="Orden no encontrada"), 404
        etapas_repo = EtapaRepository(cur)
        etapas = etapas_repo.detalle(oid)
        plan = etapas_repo.insumos_planificados(oid)
        cons = ConsumoRepository(cur).de_orden(oid)
        lotes = LoteInsumoRepository(cur).listar(solo_con_saldo=True)
        cur.execute("SELECT codigo, cantidad_producida AS producido, cantidad_disponible AS disponible FROM lotes_pt WHERE orden_id = %s", (oid,))
        lote_pt = cur.fetchone()
        centro = orden["centro"]
    for e in etapas:
        e["insumos"] = []
        for p in (x for x in plan if x["secuencia"] == e["secuencia"]):
            usados = [c for c in cons if c["secuencia"] == e["secuencia"] and c["insumo_id"] == p["insumo_id"]]
            e["insumos"].append({"insumo_id": p["insumo_id"], "insumo": p["insumo"], "categoria": p["categoria"], "unidad": p["unidad"],
                                 "planificado": p["planificado"], "consumido": round(sum(c["cantidad"] for c in usados), 3),
                                 "lotes": [{k: c[k] for k in ("lote", "cantidad", "vencimiento", "proveedor")} for c in usados],
                                 "disponibles": [l for l in lotes if l["insumo_id"] == p["insumo_id"]] if e["estado"] == "En curso" else []})
    return jsonify(id=orden["id"], lote=orden["lote"], producto=orden["producto"], centro=centro, cantidad=orden["cantidad"],
                   estado=orden["estado"], cantidadProducida=orden["cantidad_producida"], lotePT=lote_pt, etapas=etapas)


@bp.post("/produccion/<int:oid>/etapas/<int:seq>/iniciar")
@login_required("produccion:etapas")
def iniciar(oid, seq):
    d = request.get_json(silent=True) or {}
    with transaction() as cur:
        r = planta_service.iniciar_etapa(cur, oid, seq, g.usuario, _int(d.get("responsable_id")), _int(d.get("equipo_id")), request.remote_addr)
    return jsonify(r)


@bp.post("/produccion/<int:oid>/etapas/<int:seq>/consumos")
@login_required("produccion:etapas")
def consumir(oid, seq):
    d = request.get_json(silent=True) or {}
    cantidad, lote = _num(d.get("cantidad"), 1_000_000), _int(d.get("lote_insumo_id"))
    if cantidad is None or lote is None:
        return jsonify(error="Datos inválidos"), 400
    with transaction() as cur:
        r = planta_service.registrar_consumo(cur, oid, seq, lote, cantidad, g.usuario, request.remote_addr)
    return jsonify(r), 201


@bp.post("/produccion/<int:oid>/etapas/<int:seq>/finalizar")
@login_required("produccion:etapas")
def finalizar(oid, seq):
    d = request.get_json(silent=True) or {}
    merma = _num(d.get("merma_kg", 0), 100_000, minimo_exclusivo=False)
    if merma is None:
        return jsonify(error="La merma debe ser un número mayor o igual que 0"), 400
    producidas = d.get("cantidad_producida")
    producidas = _num(producidas, 1_000_000) if producidas not in (None, "") else None
    with transaction() as cur:
        r = planta_service.finalizar_etapa(cur, oid, seq, g.usuario, merma, str(d.get("observaciones", "") or "")[:300],
                                           producidas, request.remote_addr)
    return jsonify(r)


# ---------------------------------------------------------------- Producto terminado
@bp.get("/producto-terminado")
@login_required("pt:ver")
def producto_terminado():
    repo = LotePTRepository()
    return jsonify(stock=repo.stock(), lotes=repo.lotes())


@bp.get("/lotes-pt/<int:lid>/movimientos")
@login_required("pt:ver")
def movimientos_pt(lid):
    return jsonify(MovimientoPTRepository().de_lote(lid))


@bp.post("/lotes-pt/<int:lid>/despachos")
@login_required("pt:escribir")
def despachar(lid):
    d = request.get_json(silent=True) or {}
    cantidad, destino = _num(d.get("cantidad"), 1_000_000, entero=True), str(d.get("destino", "")).strip()[:120]
    if cantidad is None or not destino:
        return jsonify(error="Indica una cantidad entera y el destino (cliente, tienda o canal)"), 400
    with transaction() as cur:
        r = planta_service.despachar_pt(cur, lid, cantidad, destino, str(d.get("motivo", "") or "")[:120] or None, g.usuario, request.remote_addr)
    return jsonify(r), 201


# ---------------------------------------------------------------- Trazabilidad
@bp.get("/trazabilidad/buscar")
@login_required("trazabilidad:ver")
def buscar():
    q = str(request.args.get("q", "")).strip()[:30]
    if len(q) < 2:
        return jsonify([])
    return jsonify(TrazabilidadRepository().buscar(q))


@bp.get("/trazabilidad/lote-pt/<codigo>")
@login_required("trazabilidad:ver")
def traza_atras(codigo):
    """Hacia atrás: de un lote de producto terminado a sus etapas, responsables, equipos y lotes de insumo."""
    repo = TrazabilidadRepository()
    lp = repo.lote_pt(codigo[:30])
    if not lp:
        return jsonify(error="Lote de producto terminado no encontrado"), 404
    etapas = repo.etapas_con_consumos(lp["orden_id"])
    despachos = repo.despachos(lp["id"])
    return jsonify(direccion="atras", lote=lp, etapas=etapas, despachos=despachos,
                   resumen={"etapas": len(etapas), "lotesInsumo": len({(c["insumo"], c["lote"]) for e in etapas for c in e["consumos"]}),
                            "despachado": sum(x["cantidad"] for x in despachos)})


@bp.get("/trazabilidad/lote-insumo/<codigo>")
@login_required("trazabilidad:ver")
def traza_adelante(codigo):
    """Hacia adelante: de un lote de insumo a las órdenes que lo usaron, los lotes de producto terminado y sus destinos."""
    repo = TrazabilidadRepository()
    lotes = repo.lotes_insumo(codigo[:30])
    if not lotes:
        return jsonify(error="Lote de insumo no encontrado"), 404
    out = []
    for l in lotes:
        usos = repo.usos_de_lote_insumo(l["id"])
        vistos, pts = set(), []
        for u in usos:
            if u["lote_pt_id"] and u["lote_pt_id"] not in vistos:
                vistos.add(u["lote_pt_id"])
                pts.append({"codigo": u["lote_pt"], "producido": u["producido"], "disponible": u["disponible"],
                            "despachos": repo.despachos(u["lote_pt_id"])})
        for u in usos:
            u.pop("lote_pt_id", None)
        out.append({"lote": l, "usos": usos, "lotesPT": pts,
                    "resumen": {"ordenes": len({u["orden_id"] for u in usos}), "consumido": round(sum(u["cantidad"] for u in usos), 3),
                                "lotesPT": len(pts), "destinos": sorted({d["destino"] for p in pts for d in p["despachos"] if d["destino"]})}})
    return jsonify(direccion="adelante", resultados=out)
