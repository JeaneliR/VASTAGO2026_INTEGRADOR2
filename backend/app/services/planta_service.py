"""Reglas de negocio de planta: órdenes con ruta de etapas, consumos por lote, producto terminado y despachos.

Cada función recibe un cursor (la transacción la abre el llamador) para que todo el cambio sea atómico:
si una regla falla se lanza ReglaNegocio y la ruta hace rollback de lo ya escrito.
"""
from datetime import date

from app.repositories.analitica import AuditoriaRepository
from app.repositories.inventario import InsumoRepository, LoteInsumoRepository, MovimientoRepository
from app.repositories.planta import (ConsumoRepository, EtapaRepository, LotePTRepository, MovimientoPTRepository)
from app.repositories.produccion import OrdenRepository, ProductoRepository

ROLES_EJECUTORES = ("Operario", "Jefe de Producción", "Administrador")


class ReglaNegocio(Exception):
    def __init__(self, mensaje, status=409):
        super().__init__(mensaje)
        self.status = status


def _auditar(cur, accion, usuario, entidad, detalle, ip):
    AuditoriaRepository(cur).registrar(accion, usuario["id"], entidad=entidad, detalle=detalle, ip=ip)


# ---------------------------------------------------------------- Órdenes
def crear_orden(cur, producto_id, cantidad, centro_id, usuario, ip=None, hoy=None, lote=None):
    prod = ProductoRepository(cur).bloquear(producto_id)
    if not prod:
        raise ReglaNegocio("Producto no encontrado", 404)
    if prod["lleva_centro"]:
        if not centro_id:
            raise ReglaNegocio("Este producto requiere elegir un centro (maní, pasas, almendra…)", 400)
        centro = cur_one(cur, "SELECT id, categoria FROM insumos WHERE id = %s", (centro_id,))
        if not centro or centro["categoria"] != "Centro":
            raise ReglaNegocio("El centro elegido no es válido", 400)
    elif centro_id:
        raise ReglaNegocio("Este producto no lleva centro", 400)
    ordenes = OrdenRepository(cur)
    o = ordenes.crear(lote or ordenes.siguiente_lote(), producto_id, cantidad, hoy or date.today(), usuario["id"], centro_id or None)
    etapas = EtapaRepository(cur).copiar_ruta(o["id"], producto_id)
    if not etapas:
        raise ReglaNegocio("El producto no tiene una ruta de etapas configurada", 409)
    _auditar(cur, "ORDEN_CREADA", usuario, "ordenes_produccion",
             {"lote": o["lote"], "cantidad": cantidad, "etapas": len(etapas), "centro_id": centro_id}, ip)
    return o


def cur_one(cur, sql, params=()):
    cur.execute(sql, params)
    return cur.fetchone()


def _cargar(cur, oid, secuencia):
    orden = OrdenRepository(cur).bloquear(oid)
    if not orden:
        raise ReglaNegocio("Orden no encontrada", 404)
    etapa = EtapaRepository(cur).bloquear(oid, secuencia)
    if not etapa:
        raise ReglaNegocio("Etapa no encontrada", 404)
    return orden, etapa


def _verificar_ejecutor(usuario, etapa):
    """Un Operario solo opera las etapas que tiene asignadas; el Jefe de Producción y el Administrador pueden operar cualquiera."""
    if usuario["rol"] == "Operario" and etapa["responsable_id"] != usuario["id"]:
        raise ReglaNegocio("Solo el responsable asignado puede operar esta etapa", 403)


# ---------------------------------------------------------------- Etapas
def iniciar_etapa(cur, oid, secuencia, usuario, responsable_id=None, equipo_id=None, ip=None, ahora=None):
    orden, etapa = _cargar(cur, oid, secuencia)
    etapas = EtapaRepository(cur)
    if orden["estado"] == "Completada" or etapa["estado"] != "Pendiente":
        raise ReglaNegocio("La etapa no está pendiente")
    if secuencia > 1 and etapas.estado_de(oid, secuencia - 1) != "Completada":
        raise ReglaNegocio(f"Primero debe completarse la etapa {secuencia - 1}")
    responsable_id = responsable_id or usuario["id"]
    if usuario["rol"] == "Operario" and responsable_id != usuario["id"]:
        raise ReglaNegocio("Un operario solo puede iniciar etapas a su nombre", 403)
    if not etapas.responsable_valido(responsable_id):
        raise ReglaNegocio("El responsable debe ser un usuario activo de producción", 400)
    eq = etapas.equipo(equipo_id) if equipo_id else None
    if not eq or not eq["activo"]:
        raise ReglaNegocio("Debes elegir un equipo válido", 400)
    if eq["tipo"] != etapa["tipo_equipo"]:
        raise ReglaNegocio(f"Esta etapa requiere un equipo de tipo «{etapa['tipo_equipo']}»", 400)
    if etapas.equipo_ocupado(equipo_id):
        raise ReglaNegocio(f"El equipo {eq['codigo']} está en uso en otra etapa")
    etapas.iniciar(etapa["id"], responsable_id, equipo_id, ahora)
    if orden["estado"] == "Planificada":
        cur.execute("UPDATE ordenes_produccion SET estado = 'En proceso' WHERE id = %s", (oid,))
    _auditar(cur, "ETAPA_INICIADA", usuario, "orden_etapas",
             {"lote": orden["lote"], "etapa": etapa["nombre"], "responsable_id": responsable_id, "equipo": eq["codigo"]}, ip)
    return {"orden": orden["lote"], "etapa": etapa["nombre"], "estado": "En curso"}


def registrar_consumo(cur, oid, secuencia, lote_insumo_id, cantidad, usuario, ip=None, ahora=None):
    orden, etapa = _cargar(cur, oid, secuencia)
    if etapa["estado"] != "En curso":
        raise ReglaNegocio("La etapa debe estar en curso para registrar consumos")
    _verificar_ejecutor(usuario, etapa)
    lote = LoteInsumoRepository(cur).bloquear(lote_insumo_id)
    if not lote:
        raise ReglaNegocio("Lote de insumo no encontrado", 404)
    permitidos = {r["insumo_id"] for r in EtapaRepository(cur).insumos_planificados(oid) if r["secuencia"] == secuencia}
    if lote["insumo_id"] not in permitidos:
        raise ReglaNegocio(f"«{lote['insumo']}» no corresponde a la etapa {etapa['nombre']} de esta orden")
    if lote["vencimiento"] and lote["vencimiento"] < (ahora.date() if ahora else date.today()).isoformat():
        raise ReglaNegocio(f"El lote {lote['codigo']} está vencido")
    if lote["disponible"] + 1e-9 < cantidad:
        raise ReglaNegocio(f"Saldo insuficiente en el lote {lote['codigo']} (disponible {lote['disponible']:g} {lote['unidad']})")
    InsumoRepository(cur).bloquear_para_actualizar(lote["insumo_id"])
    mov = MovimientoRepository(cur).registrar(lote["insumo_id"], "SALIDA", cantidad,
                                              f"Consumo {orden['lote']} · {etapa['nombre']}", usuario["id"], oid, lote_insumo_id)
    ConsumoRepository(cur).registrar(etapa["id"], lote_insumo_id, cantidad, mov["id"], usuario["id"], ahora)
    _auditar(cur, "CONSUMO_REGISTRADO", usuario, "etapa_consumos",
             {"lote_orden": orden["lote"], "etapa": etapa["nombre"], "insumo": lote["insumo"], "lote_insumo": lote["codigo"], "cantidad": cantidad}, ip)
    return {"insumo": lote["insumo"], "lote": lote["codigo"], "cantidad": cantidad}


def finalizar_etapa(cur, oid, secuencia, usuario, merma=0, observaciones=None, cantidad_producida=None, ip=None, ahora=None):
    orden, etapa = _cargar(cur, oid, secuencia)
    if etapa["estado"] != "En curso":
        raise ReglaNegocio("La etapa no está en curso")
    _verificar_ejecutor(usuario, etapa)
    etapas = EtapaRepository(cur)
    consumidos = {r["insumo_id"] for r in ConsumoRepository(cur).total_por_insumo(etapa["id"])}
    faltan = [r["insumo"] for r in etapas.insumos_planificados(oid) if r["secuencia"] == secuencia and r["insumo_id"] not in consumidos]
    if faltan:
        raise ReglaNegocio("Falta registrar el consumo (con su lote) de: " + ", ".join(faltan))
    es_ultima = secuencia == etapas.maxima_secuencia(oid)
    if es_ultima:
        if cantidad_producida is None or cantidad_producida <= 0 or cantidad_producida != int(cantidad_producida):
            raise ReglaNegocio("En la última etapa debes indicar las unidades producidas (entero mayor que 0)", 400)
        if cantidad_producida > orden["cantidad"] * 1.1:
            raise ReglaNegocio("Las unidades producidas superan en más de 10 % lo planificado", 400)
        cantidad_producida = int(cantidad_producida)
    etapas.finalizar(etapa["id"], merma, (observaciones or None), ahora)
    resultado = {"orden": orden["lote"], "etapa": etapa["nombre"], "estado": "Completada", "ordenCompletada": False}
    if es_ultima:
        fecha = ahora.date() if ahora else None
        lp = LotePTRepository(cur).crear(orden["lote"], orden["producto_id"], oid, orden["centro_insumo_id"], cantidad_producida,
                                         orden["dias_vida_util"], fecha)
        MovimientoPTRepository(cur).registrar(lp["id"], "INGRESO", cantidad_producida, None, f"Producción {orden['lote']}", usuario["id"], ahora)
        cur.execute("UPDATE ordenes_produccion SET estado = 'Completada', cantidad_producida = %s, "
                    "fecha_fin = COALESCE(%s, now()) WHERE id = %s", (cantidad_producida, ahora, oid))
        resultado.update(ordenCompletada=True, lotePT=lp["codigo"], unidadesProducidas=cantidad_producida)
        _auditar(cur, "LOTE_PT_CREADO", usuario, "lotes_pt", {"lote": lp["codigo"], "unidades": cantidad_producida}, ip)
    _auditar(cur, "ETAPA_FINALIZADA", usuario, "orden_etapas",
             {"lote": orden["lote"], "etapa": etapa["nombre"], "merma_kg": merma}, ip)
    return resultado


# ---------------------------------------------------------------- Producto terminado
def despachar_pt(cur, lote_pt_id, cantidad, destino, motivo, usuario, ip=None, ahora=None):
    lote = LotePTRepository(cur).bloquear(lote_pt_id)
    if not lote:
        raise ReglaNegocio("Lote de producto terminado no encontrado", 404)
    if lote["cantidad_disponible"] < cantidad:
        raise ReglaNegocio(f"Saldo insuficiente en el lote {lote['codigo']} (disponible {lote['cantidad_disponible']})")
    MovimientoPTRepository(cur).registrar(lote_pt_id, "SALIDA", cantidad, destino, motivo, usuario["id"], ahora)
    _auditar(cur, "DESPACHO_PT", usuario, "lotes_pt", {"lote": lote["codigo"], "cantidad": cantidad, "destino": destino}, ip)
    return {"lote": lote["codigo"], "cantidad": cantidad, "destino": destino, "saldo": lote["cantidad_disponible"] - cantidad}


# ---------------------------------------------------------------- Ingreso / salida de insumos por lote
def ingresar_insumo(cur, insumo_id, cantidad, codigo_lote, proveedor, vencimiento, motivo, usuario):
    lotes = LoteInsumoRepository(cur)
    codigo = (codigo_lote or "").strip() or lotes.siguiente_codigo_auto(insumo_id)
    lote_id = lotes.obtener_o_crear(insumo_id, codigo, proveedor or None, vencimiento or None)
    MovimientoRepository(cur).registrar(insumo_id, "INGRESO", cantidad, motivo, usuario["id"], None, lote_id)
    return {"lote": codigo}


def salir_insumo(cur, insumo_id, cantidad, lote_id, motivo, usuario):
    """Salida manual: del lote indicado o, si no se indica, por FEFO (primero vence, primero sale)."""
    movs = MovimientoRepository(cur)
    if lote_id:
        lote = LoteInsumoRepository(cur).bloquear(lote_id)
        if not lote or lote["insumo_id"] != insumo_id:
            raise ReglaNegocio("Lote no encontrado para este insumo", 404)
        if lote["disponible"] + 1e-9 < cantidad:
            raise ReglaNegocio(f"Saldo insuficiente en el lote {lote['codigo']}")
        movs.registrar(insumo_id, "SALIDA", cantidad, motivo, usuario["id"], None, lote_id)
        return
    restante = round(cantidad, 3)
    for l in LoteInsumoRepository(cur).fefo(insumo_id):
        if restante <= 0:
            break
        tomar = round(min(l["disponible"], restante), 3)
        movs.registrar(insumo_id, "SALIDA", tomar, motivo, usuario["id"], None, l["id"])
        restante = round(restante - tomar, 3)
    if restante > 0:
        raise ReglaNegocio("Stock insuficiente")
