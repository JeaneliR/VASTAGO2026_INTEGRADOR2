from datetime import date, datetime, timedelta, timezone
import re
from flask import Blueprint, g, jsonify, request
from app.security import login_required
from app.repositories.analitica import DashboardRepository, AlertaRepository

bp = Blueprint("panel", __name__, url_prefix="/api")
LIMA = timezone(timedelta(hours=-5))


def periodo(value=None):
    value = value or datetime.now(LIMA).strftime("%Y-%m")
    if not re.fullmatch(r"\d{4}-\d{2}", value):
        raise ValueError("Selecciona un mes válido")
    start = date.fromisoformat(value + "-01")
    if not 2000 <= start.year <= 2100:
        raise ValueError("Selecciona un mes entre 2000 y 2100")
    end = date(start.year + (start.month == 12), start.month % 12 + 1, 1)
    return value, start, end


@bp.get("/dashboard")
@login_required("dashboard:ver")
def dashboard():
    try:
        month, start, end = periodo(request.args.get("mes"))
    except ValueError as exc:
        return jsonify(error=str(exc)), 400
    repo = DashboardRepository()
    m = repo.metricas(start, end)
    inventario = repo.inventario_actual()
    cards = [dict(id="criticos", titulo="Insumos bajo el mínimo", valor=str(m["criticos"]), detalle="Estado actual del inventario"),
             dict(id="bajos", titulo="Insumos cerca del mínimo", valor=str(m["bajos"]), detalle="Stock entre el mínimo y el 120 %")]
    optimos, total = inventario["optimos"], inventario["total"]
    cards.append(dict(id="optimos", titulo="Insumos en estado óptimo",
                      valor=f"{100 * optimos / total:.2f}%" if total else "Sin datos",
                      detalle=f"{optimos} de {total} insumos · Meta ≥ 80 %"))
    sin_costo = inventario["sin_costo"]
    valor = f"S/ {inventario['valor']:,.2f}"
    detalle_valor = "Stock actual por costo unitario registrado"
    if sin_costo:
        detalle_valor = f"Valor parcial · {sin_costo} insumos con stock y sin costo registrado"
        if not inventario["valorados"]:
            valor = "Sin datos"
            detalle_valor = "Los insumos con stock carecen de costo registrado"
    cards.append(dict(id="valor_inventario", titulo="Valor actual del inventario",
                      valor=valor if total else "Sin datos", detalle=detalle_valor))
    if g.usuario["rol"] == "Almacenero":
        cards += [dict(id="ingresos", titulo="Ingresos del mes", valor=str(m["ingresos"]), detalle="Movimientos registrados"),
                  dict(id="salidas", titulo="Salidas del mes", valor=str(m["salidas"]), detalle="Movimientos registrados")]
    else:
        cumplimiento = repo.cumplimiento(start, end)
        iniciadas, completadas = cumplimiento["iniciadas"], cumplimiento["completadas"]
        cards.append(dict(id="cumplimiento", titulo="Cumplimiento de órdenes",
                          valor=f"{100 * completadas / iniciadas:.2f}%" if iniciadas else "Sin datos",
                          detalle=f"{completadas} de {iniciadas} iniciadas y completadas en el mes · Meta ≥ 90 %"))
        ratio = round(100*m["merma"]/m["consumido"], 2) if m["consumido"] else None
        cards += [dict(id="activas", titulo="Órdenes activas", valor=str(m["activas"]), detalle="Planificadas y en proceso"),
                  dict(id="producidas", titulo="Unidades producidas", valor=str(m["producidas"]), detalle="Órdenes finalizadas en el mes"),
                  dict(id="merma", titulo="Merma del mes", valor=f"{ratio:g}%" if ratio is not None else "Sin datos",
                       detalle=f"{m['merma']:g} kg de merma / {m['consumido']:g} kg consumidos en etapas cerradas")]
    return jsonify(periodo=month, actualizado_en=datetime.now(LIMA).isoformat(), indicadores=cards,
                   produccion=repo.estados() if g.usuario["rol"] != "Almacenero" else [],
                   serie=repo.serie(start,end) if g.usuario["rol"] != "Almacenero" else [],
                   alertas=AlertaRepository().listar())
