from .base import BaseRepository


class AlertaRepository(BaseRepository):
    tabla = "alertas"

    def listar(self):
        return self._run("SELECT id, nivel, titulo, detalle, creada_en FROM alertas ORDER BY id DESC")


class PronosticoRepository(BaseRepository):
    tabla = "pronosticos"

    def serie(self):
        hist = self._run("SELECT p.nombre, to_char(d.mes,'YYYY-MM') AS mes, d.kg::float AS kg FROM demanda_historica d "
                         "JOIN productos p ON p.id = d.producto_id ORDER BY p.nombre, d.mes")
        fut = self._run("SELECT p.nombre, to_char(f.mes,'YYYY-MM') AS mes, f.kg::float AS kg, f.mape::float AS mape "
                        "FROM pronosticos f JOIN productos p ON p.id = f.producto_id ORDER BY p.nombre, f.mes")
        out = {"meses_hist": [], "series": {}}
        for r in hist:
            s = out["series"].setdefault(r["nombre"], {"historico": [], "meses_forecast": [], "forecast": [], "mape": None})
            s["historico"].append(r["kg"])
            if r["mes"] not in out["meses_hist"]:
                out["meses_hist"].append(r["mes"])
        for r in fut:
            s = out["series"][r["nombre"]]
            s["meses_forecast"].append(r["mes"]); s["forecast"].append(r["kg"]); s["mape"] = r["mape"]
        return out

    def mape_promedio(self):
        r = self._run("SELECT COALESCE(avg(m),0)::float AS v FROM (SELECT DISTINCT producto_id, mape AS m FROM pronosticos) t", one=True)
        return r["v"]


class AuditoriaRepository(BaseRepository):
    tabla = "auditoria"

    def registrar(self, accion, usuario_id=None, email=None, entidad=None, detalle=None, ip=None, exito=True):
        import json
        self._run("INSERT INTO auditoria (usuario_id, email, accion, entidad, detalle, ip, exito) "
                  "VALUES (%s,%s,%s,%s,%s::jsonb,%s,%s)",
                  (usuario_id, email, accion, entidad, json.dumps(detalle or {}, default=str), ip, exito))

    def ultimos(self, limite=100):
        return self._run("SELECT id, fecha, email, accion, entidad, detalle, ip, exito FROM auditoria "
                         "ORDER BY id DESC LIMIT %s", (limite,))
