from datetime import date, datetime, timedelta, timezone
from io import BytesIO
from html import escape
from flask import Blueprint, g, jsonify, request, send_file
from app.security import login_required
from app.repositories.reportes import ReporteRepository
from app.repositories.analitica import AuditoriaRepository

bp = Blueprint("reportes", __name__, url_prefix="/api/reportes")


def datos():
    tipo = request.args.get("tipo", "inventario")
    q, estado = request.args.get("q", "").strip()[:80], request.args.get("estado", "")
    desde, hasta = request.args.get("desde") or None, request.args.get("hasta") or None
    categoria = request.args.get("categoria", "")
    if tipo not in ("inventario", "produccion"):
        raise ValueError("Tipo de reporte inválido")
    for value in (desde,hasta):
        if value and date.fromisoformat(value).isoformat() != value:
            raise ValueError("Fecha inválida")
    if desde and hasta and desde > hasta:
        raise ValueError("La fecha inicial no puede ser posterior a la final")
    if tipo == "inventario":
        if estado not in ("", "ok", "warn", "crit") or categoria not in ("", "Materia prima", "Centro", "Insumo auxiliar", "Empaque"):
            raise ValueError("Filtro de inventario inválido")
        rows = ReporteRepository().inventario(q,estado,categoria)
        columns = [("insumo","Insumo"),("categoria","Categoría"),("unidad","Unidad"),("stock","Stock actual"),("minimo","Stock mínimo"),("estado","Estado")]
        title = "Reporte de inventario"
        filters = dict(q=q,estado=estado,categoria=categoria)
    else:
        if estado not in ("", "Planificada", "En proceso", "Completada"):
            raise ValueError("Estado de producción inválido")
        rows = ReporteRepository().produccion(q,estado,desde,hasta)
        columns = [("lote","Lote"),("producto","Producto"),("cantidad","Planificadas"),("producidas","Producidas"),("fecha","Inicio"),("estado","Estado"),("responsable","Responsable"),("merma_kg","Merma kg")]
        title = "Reporte de producción"
        filters = dict(q=q,estado=estado,desde=desde,hasta=hasta)
    if len(rows)>5000:
        raise ValueError("El reporte supera 5000 filas; reduce el rango o aplica filtros")
    return dict(tipo=tipo,titulo=title,columnas=[dict(clave=k,titulo=v) for k,v in columns],filas=rows,
                filtros=filters,generado_en=datetime.now(timezone(timedelta(hours=-5))).isoformat(),total=len(rows))


@bp.get("")
@login_required("reportes:ver")
def consultar():
    try:
        return jsonify(datos())
    except ValueError as exc:
        return jsonify(error=str(exc)),400


def exportar_excel(data):
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter
    book = Workbook()
    sheet = book.active
    sheet.title = "Reporte"
    sheet.append(["Vástago y Co",data["titulo"]])
    sheet.append(["Generado",data["generado_en"]])
    sheet.append(["Filtros",", ".join(f"{k}: {v}" for k,v in data["filtros"].items() if v) or "Sin filtros"])
    sheet.append([])
    sheet.append([c["titulo"] for c in data["columnas"]])
    def safe(value):
        # El contenido del usuario se exporta como texto, nunca como fórmula.
        if isinstance(value,str) and value.startswith(("=","+","-","@","\t","\r")):
            return "'"+value
        return value
    for row in data["filas"]:
        sheet.append([safe(row.get(c["clave"])) for c in data["columnas"]])
    sheet.freeze_panes="A6"
    sheet.auto_filter.ref=f"A5:{get_column_letter(len(data['columnas']))}{max(5,sheet.max_row)}"
    for cell in sheet[5]:
        cell.font=Font(bold=True,color="FFFFFF");cell.fill=PatternFill("solid",fgColor="4A2C1F")
    for index,column in enumerate(data["columnas"],1):
        letter=get_column_letter(index)
        sheet.column_dimensions[letter].width=34 if column["clave"] in ("insumo","producto","responsable") else 19
    sheet.column_dimensions['B'].width=42
    stream=BytesIO();book.save(stream);stream.seek(0)
    return stream


def exportar_pdf(data):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    stream=BytesIO();styles=getSampleStyleSheet()
    styles['Normal'].fontSize=8;styles['Normal'].leading=11
    story=[Paragraph("Vástago y Co",styles['Title']),Paragraph(data['titulo'],styles['Heading2']),
           Paragraph("Generado: "+escape(data['generado_en']),styles['Normal']),
           Paragraph("Filtros: "+escape(", ".join(f"{k}: {v}" for k,v in data['filtros'].items() if v) or "Sin filtros"),styles['Normal']),Spacer(1,12)]
    values=[[Paragraph(escape(c['titulo']),styles['Normal']) for c in data['columnas']]]
    for row in data['filas']:
        values.append([Paragraph(escape(str(row.get(c['clave']) if row.get(c['clave']) is not None else '—')),styles['Normal']) for c in data['columnas']])
    if len(values)==1:
        story.append(Paragraph("No se encontraron registros para los filtros seleccionados.",styles['Normal']))
    else:
        widths=[770/len(data['columnas'])]*len(data['columnas'])
        table=Table(values,colWidths=widths,repeatRows=1,hAlign='LEFT')
        table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#F3E4C4')),('GRID',(0,0),(-1,-1),.4,colors.lightgrey),('VALIGN',(0,0),(-1,-1),'TOP'),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
        story.append(table)
    story.append(Spacer(1,10));story.append(Paragraph(f"Total de registros: {data['total']}",styles['Normal']))
    def footer(canvas,document):
        canvas.setFont('Helvetica',8);canvas.drawRightString(805,18,f"Página {document.page}")
    SimpleDocTemplate(stream,pagesize=landscape(A4),leftMargin=35,rightMargin=35,topMargin=30,bottomMargin=32).build(story,onFirstPage=footer,onLaterPages=footer)
    stream.seek(0);return stream


@bp.get("/exportar")
@login_required("reportes:ver")
def exportar():
    formato=request.args.get('formato','xlsx')
    if formato not in ('xlsx','pdf'):
        return jsonify(error="Formato inválido"),400
    try:
        data=datos()
    except ValueError as exc:
        return jsonify(error=str(exc)),400
    stream=exportar_excel(data) if formato=='xlsx' else exportar_pdf(data)
    AuditoriaRepository().registrar('REPORTE_EXPORTADO',g.usuario['id'],entidad='reportes',
        detalle=dict(tipo=data['tipo'],formato=formato,total=data['total'],filtros=data['filtros']),ip=request.remote_addr)
    mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' if formato=='xlsx' else 'application/pdf'
    return send_file(stream,mimetype=mime,as_attachment=True,download_name=f"vastago_{data['tipo']}_{date.today().isoformat()}.{formato}",max_age=0)
