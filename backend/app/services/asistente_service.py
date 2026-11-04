"""Asistente de consultas en lenguaje natural (español).

Diseño deliberado: NO usa un modelo generativo. Una pregunta se convierte en (intención + insumo/periodo) con reglas
explícitas y la respuesta se calcula con SQL y aritmética sobre el kardex real y el control de producción. Así cada cifra
es verificable, no hay costo por consulta ni se envían datos de la empresa a terceros. Lo que no entiende lo dice y
sugiere preguntas que sí sabe responder.

Convención de tiempo: el "hoy" del asistente es la fecha de corte del kardex (último movimiento cargado), no el reloj del
servidor; así una respuesta nunca presenta como actual un dato viejo.
"""
import datetime as dt
import re
import unicodedata

from app.repositories.analitica import HistoricoRepository, PronosticoRepository
from app.repositories.asistente import KardexRepository, ProduccionConsultaRepository

MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
MES_NUM = {m: i + 1 for i, m in enumerate(MESES)} | {"setiembre": 9, "sept": 9, "sep": 9}
DIAS_RECIENTES = 14                 # ventana corta para contrastar el ritmo de consumo
MAX_INSUMOS = 3                     # cuántos insumos se responden a la vez
STOP = {"de", "del", "la", "el", "los", "las", "un", "una", "y", "en", "con", "para", "por", "que", "cuanto", "cuanta", "cuantos",
        "cuantas", "hay", "tenemos", "tengo", "es", "se", "me", "nos", "mi", "su", "al", "lo", "a", "o", "como", "cual", "cuales",
        "dime", "dame", "quiero", "saber", "esta", "este", "ese", "esa", "ahora", "hoy", "ya", "mas", "menos", "muy", "si", "no"}

SUGERENCIAS_BASE = ["¿Para cuánto alcanza el suero de leche?", "¿Qué insumos se acaban primero?", "¿Qué insumos están bajo el mínimo?",
                    "¿Cuánto maní tostado entero queda?", "¿Cuánto grageado produjimos en septiembre?", "¿Cuánto vamos a producir el próximo mes?"]


# ------------------------------------------------------------------ utilidades de texto
def norm(texto):
    t = unicodedata.normalize("NFKD", texto.lower())
    t = "".join(c for c in t if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", " ", t).strip()


def _singular(p):
    return p[:-1] if len(p) > 3 and p.endswith("s") else p


def tokens(texto):
    return [_singular(p) for p in norm(texto).split() if p not in STOP and not (p.isdigit() and len(p) < 4) and len(p) > 1]


def fmt(x, dec=2):
    s = f"{x:,.{dec}f}"
    return s.rstrip("0").rstrip(".") if "." in s else s


def fecha_es(d):
    return f"{d.day} de {MESES[d.month - 1]} de {d.year}"


def mes_es(ym):
    a, m = ym.split("-")
    return f"{MESES[int(m) - 1]} de {a}"


def _nom(ins):
    n = ins["nombre"]
    return n.capitalize() if n.isupper() else n


def _dias(n):
    return "1 día" if n == 1 else f"{n} días"


def _plural(n, uno, varios):
    return f"{n} {uno if n == 1 else varios}"


# ------------------------------------------------------------------ comprensión de la pregunta
INTENCIONES = [
    ("ayuda", [r"\bayuda\b", r"que (puedes|sabes|haces)", r"\bhola\b", r"como (te )?(uso|utilizo)", r"que te (puedo )?(pregunto|preguntar)"]),
    ("ranking", [r"(se )?(acaba|agota)n? (primero|pronto|antes)", r"proximos? a (acabarse|agotarse)", r"por (acabarse|agotarse)",
                 r"mas urgentes?", r"que insumos? (se )?(acaba|agota)n?"]),
    ("bajo_minimo", [r"bajo (el )?minimo", r"debajo (del )?minimo", r"\b(comprar|pedir|reponer|reposicion)\b", r"\bfaltan?\b", r"alertas?",
                     r"quiebres?", r"sin stock", r"agotad[oa]s?"]),
    ("cobertura", [r"alcanza", r"\bdura(r|ra|n)?\b", r"cuanto tiempo", r"cuantos dias", r"hasta cuando", r"para cuanto", r"se (acaba|agota)",
                   r"cuando (se )?(acaba|agota|nos quedamos)"]),
    ("reproceso", [r"reproceso", r"merma", r"desperdicio"]),
    ("pronostico", [r"pronostic", r"proximo mes", r"proximos meses", r"vamos a (producir|vender|necesitar)", r"demanda", r"prediccion",
                    r"proyeccion", r"se vendera"]),
    ("ingreso", [r"ultimo ingreso", r"ultimas? (compra|entrada)", r"cuando (llego|ingreso|entro|compramos|compre|repusimos)", r"ingres(o|os|aron|amos)"]),
    ("consumo", [r"consum", r"gast", r"usam", r"usad", r"salidas?\b", r"salieron", r"sacamos", r"cuanto (se )?(uso|salio|saco)"]),
    ("produccion", [r"produj", r"producc", r"producimos", r"\btandas?\b", r"grague", r"gragea"]),
    ("stock", [r"cuanto (hay|queda|tenemos|tengo)", r"\bstock\b", r"existencias?", r"inventario", r"\bqueda\b", r"cuanta? (hay|queda)"]),
]


def detectar_intencion(t):
    for nombre, patrones in INTENCIONES:
        if any(re.search(p, t) for p in patrones):
            return nombre
    return None


def buscar_insumos(pregunta, insumos):
    """Devuelve (coincidencias, ambiguo). Pondera cada palabra por su rareza: 'suero' pesa más que 'leche'."""
    m = re.findall(r"\b[a-z]{3}-[a-z]{3}-\d{2}\b", pregunta.lower())
    if m:
        por_codigo = [i for i in insumos if i["codigo"].lower() in m]
        if por_codigo:
            return por_codigo[:MAX_INSUMOS], False
    q = set(tokens(pregunta))
    if not q:
        return [], False
    toks = {i["codigo"]: set(tokens(i["nombre"])) for i in insumos}
    df = {}
    for ts in toks.values():
        for t in ts:
            df[t] = df.get(t, 0) + 1
    puntaje = {c: sum(1 / df[t] for t in (q & ts)) for c, ts in toks.items()}
    mejor = max(puntaje.values(), default=0)
    if mejor <= 0:
        return [], False
    top = [i for i in insumos if abs(puntaje[i["codigo"]] - mejor) < 1e-9]
    return top[:6], len(top) > MAX_INSUMOS


def parsear_periodo(t, corte):
    """Devuelve ('mes', mes_num | 'actual' | 'anterior', anio|None) o ('dias', n) o None."""
    m = re.search(r"ultimos? (\d{1,3}) dias", t)
    if m:
        return ("dias", int(m.group(1)))
    if re.search(r"ultima semana|esta semana|ultimos dias", t):
        return ("dias", 7)
    if re.search(r"mes pasado|mes anterior", t):
        return ("mes", "anterior", None)
    if re.search(r"este mes|mes actual|mes en curso", t):
        return ("mes", "actual", None)
    anio = re.search(r"\b(20\d{2})\b", t)
    for palabra, num in MES_NUM.items():
        if re.search(rf"\b{palabra}\b", t):
            return ("mes", num, int(anio.group(1)) if anio else None)
    return None


def resolver_mes(periodo, corte, disponibles=None):
    """Convierte el periodo en 'YYYY-MM'. Sin año explícito, toma la ocurrencia más reciente (con datos si se indican)."""
    _, que, anio = periodo
    if que == "actual":
        return f"{corte.year}-{corte.month:02d}"
    if que == "anterior":
        y, m = (corte.year, corte.month - 1) if corte.month > 1 else (corte.year - 1, 12)
        return f"{y}-{m:02d}"
    if anio:
        return f"{anio}-{que:02d}"
    for y in (corte.year, corte.year - 1):
        ym = f"{y}-{que:02d}"
        if disponibles is None:
            if (y, que) <= (corte.year, corte.month):
                return ym
        elif ym in disponibles:
            return ym
    return None


# ------------------------------------------------------------------ cálculo de cobertura (función pura, probada aparte)
def calcular_cobertura(insumo, base, reciente, dias_base, corte):
    """Días que alcanza el stock al ritmo de la ventana base y al ritmo de las últimas semanas.

    base / reciente: filas de KardexRepository.consumo() para ese insumo (o None si no hubo salidas).
    """
    stock, minimo = insumo["stock_actual"], insumo["stock_minimo"]
    tasa = (base["kg"] / dias_base) if base else 0.0
    tasa_rec = (reciente["kg"] / DIAS_RECIENTES) if reciente else 0.0
    out = {"stock": stock, "minimo": minimo, "tasa_base": tasa, "tasa_reciente": tasa_rec,
           "kg_base": base["kg"] if base else 0.0, "salidas_base": base["salidas"] if base else 0,
           "salida_tipica": base["mediana"] if base else None, "dias_base": dias_base,
           "dias": None, "dias_reciente": None, "agotamiento": None, "dias_a_minimo": None, "fecha_minimo": None,
           "bajo_minimo": stock < minimo}
    if tasa > 0:
        out["dias"] = int(stock / tasa)
        out["agotamiento"] = corte + dt.timedelta(days=out["dias"])
        if stock > minimo:
            out["dias_a_minimo"] = int((stock - minimo) / tasa)
            out["fecha_minimo"] = corte + dt.timedelta(days=out["dias_a_minimo"])
    if tasa_rec > 0:
        out["dias_reciente"] = int(stock / tasa_rec)
    return out


# ------------------------------------------------------------------ respuestas
def _resp(intencion, texto, tarjetas=None, tabla=None, sugerencias=None, nota=None):
    return {"intencion": intencion, "respuesta": texto, "tarjetas": tarjetas or [], "tabla": tabla,
            "sugerencias": sugerencias or SUGERENCIAS_BASE[:4], "nota": nota}


def _contexto():
    kar = KardexRepository()
    inicio, corte = kar.corte()
    insumos = kar.insumos()
    dias_base = (corte - inicio).days + 1
    base = kar.consumo(inicio, corte)
    reciente = kar.consumo(corte - dt.timedelta(days=DIAS_RECIENTES - 1), corte)
    return kar, inicio, corte, insumos, dias_base, base, reciente


def _sug_insumo(nombre):
    n = nombre.lower()
    return [f"¿Cuánto {n} consumimos en septiembre?", f"¿Cuándo fue el último ingreso de {n}?", "¿Qué insumos se acaban primero?"]


def _resp_cobertura(ins, c, corte, inicio):
    nombre = _nom(ins)
    n = nombre.lower()
    base_txt = f"entre el {fecha_es(inicio)} y el {fecha_es(corte)}"
    tarjetas = [{"etiqueta": "Stock al corte", "valor": f"{fmt(c['stock'])} kg"},
                {"etiqueta": "Stock mínimo", "valor": f"{fmt(c['minimo'])} kg"}]
    if c["dias"] is None:
        return _resp("cobertura",
                     f"{nombre} ({ins['codigo']}) tiene {fmt(c['stock'])} kg al {fecha_es(corte)}, pero no registró salidas {base_txt}, "
                     f"así que no hay ritmo de consumo con qué estimar cuánto durará.",
                     tarjetas, sugerencias=_sug_insumo(ins["nombre"]), nota="Sin salidas en el periodo vigente del kardex.")
    partes = [f"Al ritmo registrado {base_txt}, {n} ({ins['codigo']}) te alcanza unos {_dias(c['dias'])}, hasta aproximadamente el {fecha_es(c['agotamiento'])}. "
              f"Hay {fmt(c['stock'])} kg y en {_dias(c['dias_base'])} salieron {fmt(c['kg_base'])} kg "
              f"({_plural(c['salidas_base'], 'salida', 'salidas')}; ≈ {fmt(c['tasa_base'])} kg por día)."]
    if c["tasa_reciente"] == 0:
        partes.append(f"En los últimos {DIAS_RECIENTES} días no hubo salidas, así que el consumo podría estar bajando.")
    elif c["dias_reciente"] is not None and abs(c["dias_reciente"] - c["dias"]) >= max(5, 0.15 * c["dias"]):
        partes.append(f"Con el ritmo de los últimos {DIAS_RECIENTES} días ({fmt(c['tasa_reciente'])} kg por día) duraría unos {_dias(c['dias_reciente'])}.")
    if c["bajo_minimo"]:
        partes.append(f"Ya está por debajo del stock mínimo ({fmt(c['minimo'])} kg): conviene reponer.")
    elif c["dias_a_minimo"] is not None and c["minimo"] > 0:
        partes.append(f"Llegaría al stock mínimo ({fmt(c['minimo'])} kg) en unos {_dias(c['dias_a_minimo'])} (≈ {fecha_es(c['fecha_minimo'])}); "
                      f"pide con la anticipación que tarde tu proveedor.")
    tarjetas += [{"etiqueta": "Consumo diario", "valor": f"{fmt(c['tasa_base'])} kg"},
                 {"etiqueta": "Días de cobertura", "valor": f"{c['dias']}" + (f" (hasta {c['dias_reciente']} al ritmo reciente)" if c["dias_reciente"] and c["dias_reciente"] != c["dias"] else "")},
                 {"etiqueta": "Se agotaría hacia", "valor": fecha_es(c["agotamiento"])}]
    if c["salida_tipica"]:
        tarjetas.append({"etiqueta": "Equivale a", "valor": f"≈ {int(c['stock'] // c['salida_tipica'])} salidas de {fmt(c['salida_tipica'])} kg"})
    return _resp("cobertura", " ".join(partes), tarjetas, sugerencias=_sug_insumo(ins["nombre"]),
                 nota="Estimación con el consumo registrado; si programas más producción, durará menos.")


def _pedir_precision(intencion, candidatos, pregunta_original):
    nombres = ", ".join(_nom(i) for i in candidatos[:6])
    return _resp(intencion, f"Encontré varios insumos que coinciden: {nombres}. ¿De cuál quieres saber? Escribe el nombre completo o su código.",
                 sugerencias=[f"¿{pregunta_original.strip('¿? ')} {i['codigo']}?" for i in candidatos[:6]])


def _resp_stock(ins, c, kar, corte):
    ing = kar.ultimos_ingresos(ins["codigo"], 1)
    estado = "por debajo del mínimo" if c["bajo_minimo"] else "sobre el mínimo"
    texto = (f"{_nom(ins)} ({ins['codigo']}): {fmt(c['stock'])} kg al {fecha_es(corte)}, "
             f"{estado} ({fmt(c['minimo'])} kg).")
    tarjetas = [{"etiqueta": "Stock al corte", "valor": f"{fmt(c['stock'])} kg"}, {"etiqueta": "Stock mínimo", "valor": f"{fmt(c['minimo'])} kg"}]
    if ing:
        texto += f" Último ingreso registrado: {fmt(ing[0]['kg'])} kg el {fecha_es(ing[0]['fecha'])}."
        tarjetas.append({"etiqueta": "Último ingreso", "valor": f"{fmt(ing[0]['kg'])} kg · {ing[0]['fecha'].isoformat()}"})
    if c["dias"] is not None:
        texto += f" Al ritmo actual alcanza ≈ {_dias(c['dias'])}."
        tarjetas.append({"etiqueta": "Días de cobertura", "valor": str(c["dias"])})
    return _resp("stock", texto, tarjetas, sugerencias=_sug_insumo(ins["nombre"]))


def _resp_ingreso(ins, kar):
    filas = kar.ultimos_ingresos(ins["codigo"], 3)
    nombre = _nom(ins)
    if not filas:
        return _resp("ingreso", f"No hay ingresos con fecha registrados de {nombre.lower()} ({ins['codigo']}) en el kardex cargado.",
                     sugerencias=_sug_insumo(ins["nombre"]))
    tabla = {"columnas": ["Fecha", "Cantidad"], "filas": [[f["fecha"].isoformat(), f"{fmt(f['kg'])} kg"] for f in filas]}
    return _resp("ingreso", f"El último ingreso de {nombre.lower()} fue de {fmt(filas[0]['kg'])} kg el {fecha_es(filas[0]['fecha'])}.",
                 tabla=tabla, sugerencias=_sug_insumo(ins["nombre"]))


def _resp_consumo(ins, kar, corte, inicio, periodo, t):
    nombre = _nom(ins)
    por_mes = kar.consumo_por_mes(ins["codigo"])
    if periodo and periodo[0] == "mes":
        ym = resolver_mes(periodo, corte)
        fila = next((m for m in por_mes if m["mes"] == ym), None)
        if not fila:
            return _resp("consumo", f"No hay salidas registradas de {nombre.lower()} en {mes_es(ym)}.", sugerencias=_sug_insumo(ins["nombre"]))
        txt = f"En {mes_es(ym)} salieron {fmt(fila['kg'])} kg de {nombre.lower()} ({_plural(fila['salidas'], 'salida', 'salidas')})."
        nota = None
        if fila["parcial"]:
            nota = "Mayo–agosto de 2026 viene del kardex antiguo, que puede omitir salidas: tómalo como mínimo."
        if ym == f"{corte.year}-{corte.month:02d}":
            txt += f" El mes está incompleto: el kardex llega al {fecha_es(corte)}."
        return _resp("consumo", txt, [{"etiqueta": "Salidas del mes", "valor": f"{fmt(fila['kg'])} kg"}], sugerencias=_sug_insumo(ins["nombre"]), nota=nota)
    if periodo and periodo[0] == "dias":
        desde = corte - dt.timedelta(days=periodo[1] - 1)
        c = kar.consumo(desde, corte).get(ins["codigo"])
        kg, n = (c["kg"], c["salidas"]) if c else (0.0, 0)
        return _resp("consumo", f"En los últimos {periodo[1]} días (hasta el {fecha_es(corte)}) salieron {fmt(kg)} kg de {nombre.lower()} "
                                f"({_plural(n, 'salida', 'salidas')}).", [{"etiqueta": "Salidas", "valor": f"{fmt(kg)} kg"}], sugerencias=_sug_insumo(ins["nombre"]))
    tabla = {"columnas": ["Mes", "Salidas (kg)", "N.º de salidas"],
             "filas": [[m["mes"] + (" *" if m["parcial"] else ""), fmt(m["kg"]), str(m["salidas"])] for m in por_mes[-6:]]}
    total = kar.consumo(inicio, corte).get(ins["codigo"])
    kg = total["kg"] if total else 0.0
    return _resp("consumo", f"Del {fecha_es(inicio)} al {fecha_es(corte)} salieron {fmt(kg)} kg de {nombre.lower()}. Abajo ves el consumo mes a mes.",
                 [{"etiqueta": "Salidas en el periodo vigente", "valor": f"{fmt(kg)} kg"}], tabla, _sug_insumo(ins["nombre"]),
                 nota="* mayo–agosto viene del kardex antiguo y puede estar incompleto." if any(m["parcial"] for m in por_mes[-6:]) else None)


def _filas_cobertura(insumos, dias_base, base, reciente, corte):
    out = []
    for i in insumos:
        c = calcular_cobertura(i, base.get(i["codigo"]), reciente.get(i["codigo"]), dias_base, corte)
        out.append((i, c))
    return out


def _resp_ranking(insumos, dias_base, base, reciente, corte):
    cal = [(i, c) for i, c in _filas_cobertura(insumos, dias_base, base, reciente, corte) if c["dias"] is not None]
    cal.sort(key=lambda x: x[1]["dias"])
    top = cal[:8]
    tabla = {"columnas": ["Insumo", "Stock (kg)", "Consumo diario (kg)", "Días que alcanza", "Se agota hacia"],
             "filas": [[_nom(i), fmt(c["stock"]), fmt(c["tasa_base"]), str(c["dias"]),
                        c["agotamiento"].isoformat()] for i, c in top]}
    if not top:
        return _resp("ranking", "No hay salidas registradas en el periodo vigente para estimar cobertura.")
    p = top[0]
    return _resp("ranking", f"El insumo que se acabaría primero es {p[0]['nombre'].lower()}: alcanza ≈ {_dias(p[1]['dias'])} al ritmo registrado entre el "
                            f"{fecha_es(corte - dt.timedelta(days=dias_base - 1))} y el {fecha_es(corte)}. Abajo están los {len(top)} más cercanos.",
                 tabla=tabla, nota="Solo se listan insumos con consumo registrado; los que no tienen salidas no tienen ritmo con qué medir.")


def _resp_bajo_minimo(insumos, dias_base, base, reciente, corte):
    bajos = [(i, c) for i, c in _filas_cobertura(insumos, dias_base, base, reciente, corte) if i["stock_minimo"] > 0 and i["stock_actual"] < i["stock_minimo"]]
    bajos.sort(key=lambda x: x[0]["stock_actual"] / x[0]["stock_minimo"])
    if not bajos:
        return _resp("bajo_minimo", f"Al {fecha_es(corte)} ningún insumo está por debajo de su stock mínimo.")
    sin_stock = [i for i, _ in bajos if i["stock_actual"] == 0]
    tabla = {"columnas": ["Insumo", "Stock (kg)", "Mínimo (kg)", "Falta para el mínimo (kg)", "Consumo diario (kg)"],
             "filas": [[_nom(i), fmt(i["stock_actual"]), fmt(i["stock_minimo"]),
                        fmt(i["stock_minimo"] - i["stock_actual"]), fmt(c["tasa_base"]) if c["tasa_base"] else "sin consumo"] for i, c in bajos]}
    return _resp("bajo_minimo", f"Al {fecha_es(corte)} hay {len(bajos)} insumos por debajo de su stock mínimo, {len(sin_stock)} de ellos sin existencias. "
                                f"Los más críticos aparecen primero.",
                 [{"etiqueta": "Bajo el mínimo", "valor": str(len(bajos))}, {"etiqueta": "Sin existencias", "valor": str(len(sin_stock))}], tabla,
                 nota="'Falta para el mínimo' es la cantidad para volver al mínimo, no una recomendación de compra.")


def _centro_en(t, centros):
    for c in centros:
        n = norm(c)
        if re.search(rf"\b({re.escape(n)}|{re.escape(_singular(n))})\b", t):
            return c
    return None


def _resp_produccion(t, corte, periodo):
    rep = ProduccionConsultaRepository()
    meses = rep.meses()
    centro = _centro_en(t, rep.centros())
    pidio_mes = bool(periodo and periodo[0] == "mes")
    ym = resolver_mes(periodo, corte, meses) if pidio_mes else None
    aviso = ""
    if ym is None or ym not in meses:
        if pidio_mes:
            aviso = "Ese mes todavía no tiene tandas en el control de producción; te muestro el último mes con registro. "
        ym = meses[-1]
    r = rep.resumen_mes(ym, centro)
    prev_idx = meses.index(ym) - 1
    cmp_txt = ""
    if prev_idx >= 0:
        rp = rep.resumen_mes(meses[prev_idx], centro)
        if rp["kg"] > 0:
            cmp_txt = f" Frente a {mes_es(meses[prev_idx])} ({fmt(rp['kg'], 0)} kg) es {fmt(abs(r['kg'] / rp['kg'] - 1) * 100, 0)} % {'más' if r['kg'] >= rp['kg'] else 'menos'}."
    de = f" de grageado con {centro.lower()}" if centro else " de grageado"
    texto = f"{aviso}En {mes_es(ym)} se produjeron {fmt(r['kg'], 1)} kg{de} en {_plural(r['tandas'], 'tanda', 'tandas')}.{cmp_txt}"
    tabla = None
    if not centro:
        pc = rep.por_centro_mes(ym)
        tabla = {"columnas": ["Centro", "Tandas", "Kg"], "filas": [[p["centro"], str(p["tandas"]), fmt(p["kg"], 1)] for p in pc]}
    return _resp("produccion", texto, [{"etiqueta": "Kg del mes", "valor": f"{fmt(r['kg'], 1)} kg"}, {"etiqueta": "Tandas", "valor": str(r["tandas"])}], tabla,
                 ["¿Cuánto reproceso hubo en septiembre?", "¿Cuánto vamos a producir el próximo mes?", "¿Qué insumos se acaban primero?"],
                 nota="Fuente: control de producción real de grageado (operarios anonimizados).")


def _resp_reproceso(t, corte, periodo):
    rep = ProduccionConsultaRepository()
    meses = rep.meses()
    ym = resolver_mes(periodo, corte, meses) if periodo and periodo[0] == "mes" else None
    if ym is None or ym not in meses:
        ult = HistoricoRepository().reproceso_reciente()
        if not ult:
            return _resp("reproceso", "El control de producción no tiene reproceso registrado.")
        u = ult[0]
        txt = f"En {mes_es(u['mes'])} el reproceso fue de {fmt(u['reproceso_kg'])} kg ({fmt(u['pct'])} % de lo producido)."
        if len(ult) > 1:
            txt += f" En {mes_es(ult[1]['mes'])} fue {fmt(ult[1]['reproceso_kg'])} kg ({fmt(ult[1]['pct'])} %)."
        return _resp("reproceso", txt, [{"etiqueta": "Reproceso", "valor": f"{fmt(u['reproceso_kg'])} kg"}, {"etiqueta": "% sobre lo producido", "valor": f"{fmt(u['pct'])} %"}],
                     nota="El reproceso solo se registra desde octubre de 2025.")
    r = rep.resumen_mes(ym)
    if r["kg_con_reproceso"] == 0:
        return _resp("reproceso", f"En {mes_es(ym)} no hay reproceso registrado (solo se anota desde octubre de 2025).")
    pct = r["reproceso_kg"] / r["kg_con_reproceso"] * 100
    return _resp("reproceso", f"En {mes_es(ym)} el reproceso fue de {fmt(r['reproceso_kg'])} kg ({fmt(pct)} % de lo producido con reproceso anotado).",
                 [{"etiqueta": "Reproceso", "valor": f"{fmt(r['reproceso_kg'])} kg"}, {"etiqueta": "% sobre lo producido", "valor": f"{fmt(pct)} %"}])


def _resp_pronostico(t):
    datos = PronosticoRepository().serie()
    nombre = next((n for n in datos["series"] if "mani" in norm(n) and re.search(r"\bmani\b", t)), None) or \
        next((n for n in datos["series"] if "pasa" in norm(n) and re.search(r"\bpasas?\b", t)), None) or \
        next((n for n in datos["series"] if "total" in norm(n)), None) or next(iter(datos["series"]), None)
    if not nombre:
        return _resp("pronostico", "Todavía no hay un pronóstico calculado.")
    s = datos["series"][nombre]
    tabla = {"columnas": ["Mes", "Demanda estimada (kg)"], "filas": [[m, fmt(k, 0)] for m, k in zip(s["meses_forecast"], s["forecast"])]}
    return _resp("pronostico", f"Para {mes_es(s['meses_forecast'][0])} el modelo estima ≈ {fmt(s['forecast'][0], 0)} kg en la serie «{nombre}». "
                               f"Úsalo como referencia, no como cifra exacta: el error de validación es alto (WAPE {fmt(s['wape'], 0)} %) porque la demanda real es irregular.",
                 [{"etiqueta": "Modelo", "valor": s["modelo"]}, {"etiqueta": "Error (WAPE)", "valor": f"{fmt(s['wape'], 1)} %"}], tabla,
                 ["¿Cuánto grageado produjimos en septiembre?", "¿Qué insumos se acaban primero?"],
                 nota="Pronóstico del módulo de analítica, calculado con el histórico real.")


def _resp_ayuda():
    return _resp("ayuda", "Puedo responder con los datos del kardex real de insumos (al corte) y del control de producción de grageado. Por ejemplo: "
                          "cuánto alcanza un insumo, cuánto queda, qué se acaba primero o qué está bajo el mínimo, cuánto se consumió en un mes, "
                          "cuándo fue el último ingreso, cuánto se produjo, el reproceso y el pronóstico. Pregúntame con el nombre del insumo (o su código).",
                 sugerencias=SUGERENCIAS_BASE)


def responder(pregunta):
    """Punto de entrada: texto libre -> respuesta estructurada. No lanza errores por preguntas que no entiende."""
    t = norm(pregunta)
    if not t:
        return _resp_ayuda()
    kar, inicio, corte, insumos, dias_base, base, reciente = _contexto()
    intencion = detectar_intencion(t)
    periodo = parsear_periodo(t, corte)

    if intencion == "ayuda":
        return _resp_ayuda()
    if intencion == "ranking":
        return _resp_ranking(insumos, dias_base, base, reciente, corte)
    if intencion == "bajo_minimo":
        return _resp_bajo_minimo(insumos, dias_base, base, reciente, corte)
    if intencion == "reproceso":
        return _resp_reproceso(t, corte, periodo)
    if intencion == "pronostico":
        return _resp_pronostico(t)
    if intencion == "produccion":
        return _resp_produccion(t, corte, periodo)

    coinc, ambiguo = buscar_insumos(pregunta, insumos)
    if intencion is None and not coinc:
        return _resp("no_entendi", "No entendí esa pregunta. Puedo responder sobre insumos (stock, cuánto alcanza, consumo, ingresos), "
                                   "qué está bajo el mínimo y la producción de grageado. Prueba con alguna de estas:", sugerencias=SUGERENCIAS_BASE)
    if intencion is None and periodo and coinc:
        intencion = "consumo"
    if not coinc:
        return _resp(intencion, "¿De qué insumo? Dime el nombre (por ejemplo suero de leche, azúcar blanca, maní tostado entero) o su código, como LAC-SDL-02.",
                     sugerencias=SUGERENCIAS_BASE[:3])
    if ambiguo:
        return _pedir_precision(intencion or "stock", coinc, pregunta)

    # Una sola respuesta por insumo (hasta MAX_INSUMOS); con varios, se unen los textos
    respuestas = []
    for ins in coinc[:MAX_INSUMOS]:
        c = calcular_cobertura(ins, base.get(ins["codigo"]), reciente.get(ins["codigo"]), dias_base, corte)
        if intencion == "cobertura" or intencion is None:
            respuestas.append(_resp_cobertura(ins, c, corte, inicio))
        elif intencion == "stock":
            respuestas.append(_resp_stock(ins, c, kar, corte))
        elif intencion == "ingreso":
            respuestas.append(_resp_ingreso(ins, kar))
        else:
            respuestas.append(_resp_consumo(ins, kar, corte, inicio, periodo, t))
    if len(respuestas) == 1:
        return respuestas[0]
    unida = dict(respuestas[0])
    unida["respuesta"] = "\n\n".join(r["respuesta"] for r in respuestas)
    unida["tarjetas"] = []
    unida["tabla"] = None
    unida["nota"] = respuestas[0]["nota"]
    return unida
