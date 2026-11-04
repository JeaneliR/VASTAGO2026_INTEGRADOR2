"""Pronóstico de demanda de grageado con datos REALES de planta (kg/mes), 2025-2026.

Entrada : db/historico_grageado.csv (control de producción de grageado, operarios anonimizados).
Salida  : ml-service/forecast_output.json (lo carga la semilla) y evidencias/14_pronostico_real.txt.

Método  : para cada serie se comparan cuatro modelos sencillos con una validación de origen móvil
          (rolling origin: se entrena con los meses anteriores y se pronostican 3 meses) y se elige el de menor MAPE.
          Con solo ~21 meses de historia no se justifica un modelo más complejo.
"""
import json, os
import numpy as np, pandas as pd

AQUI = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(AQUI)
CSV = os.path.join(ROOT, "db", "historico_grageado.csv")
HORIZONTE = 3
# Meses que NO tienen registro completo en los archivos de control (se interpolan y se marcan)
SIN_REGISTRO = ["2025-04", "2026-02"]
ULTIMO_MES_COMPLETO = "2026-09"          # octubre de 2026 está en curso


def cargar():
    df = pd.read_csv(CSV)
    meses = pd.period_range("2025-01", ULTIMO_MES_COMPLETO, freq="M")
    df["mes"] = pd.PeriodIndex(df["anio_mes"], freq="M")

    def serie(mask):
        s = df[mask].groupby("mes")["bruto_kg"].sum().reindex(meses).fillna(0.0)
        for m in SIN_REGISTRO:                      # interpola solo los meses sin registro completo
            s[pd.Period(m, "M")] = np.nan
        return s.interpolate(limit_direction="both")
    return meses, {
        "Gragea con maní": serie(df["centro"] == "Maní"),
        "Gragea con pasas": serie(df["centro"] == "Pasas"),
        "Grageado total (todos los centros)": serie(df["centro"].notna()),
    }


# ---- modelos: cada uno recibe la historia y devuelve el pronóstico de los próximos h meses
def media_movil(y, h, k=3):
    return np.repeat(np.mean(y[-k:]), h)

def tendencia_lineal(y, h):
    t = np.arange(len(y)); b, a = np.polyfit(t, y, 1)
    return np.clip(a + b * np.arange(len(y), len(y) + h), 0, None)

def holt(y, h, alpha=0.5, beta=0.2):
    nivel, tend = y[0], y[1] - y[0]
    for v in y[1:]:
        previo = nivel
        nivel = alpha * v + (1 - alpha) * (nivel + tend)
        tend = beta * (nivel - previo) + (1 - beta) * tend
    return np.clip(nivel + tend * np.arange(1, h + 1), 0, None)

def estacional_ajustado(y, h):
    """Mismo mes del año anterior, escalado por el nivel reciente (últimos 3 meses vs. los mismos 3 meses del año anterior)."""
    n = len(y)
    if n < 15:
        return media_movil(y, h)
    nivel = np.sum(y[-3:]) / max(np.sum(y[-15:-12]), 1e-9)
    nivel = float(np.clip(nivel, 0.5, 2.0))
    return np.array([y[n - 12 + i] * nivel for i in range(h)])

MODELOS = {"Media móvil 3 meses": media_movil, "Tendencia lineal": tendencia_lineal,
           "Suavizado de Holt": holt, "Estacional del año anterior ajustado": estacional_ajustado}


def mape(real, pred):
    real, pred = np.asarray(real, float), np.asarray(pred, float)
    m = real > 0
    return float(np.mean(np.abs(real[m] - pred[m]) / real[m]) * 100)


def evaluar(y, modelo, h=HORIZONTE, desde=12):
    """Devuelve (MAPE medio, WAPE, nº de orígenes). WAPE = suma|error| / suma(real): no se dispara con meses de poco volumen."""
    errs, ae, sr = [], 0.0, 0.0
    for origen in range(desde, len(y) - h + 1):
        real, pred = np.asarray(y[origen:origen + h], float), modelo(y[:origen], h)
        errs.append(mape(real, pred)); ae += float(np.abs(real - pred).sum()); sr += float(real.sum())
    return float(np.nanmean(errs)), ae / sr * 100, len(errs)


def main():
    meses, series = cargar()
    futuros = pd.period_range(meses[-1] + 1, periods=HORIZONTE, freq="M")
    out = {"meses_hist": [str(m) for m in meses], "meses_sin_registro": SIN_REGISTRO, "series": {}}
    lineas = ["PRONÓSTICO CON DATOS REALES DE GRAGEADO (kg/mes)",
              f"Historia: {meses[0]} a {meses[-1]} ({len(meses)} meses); meses interpolados por falta de registro: {', '.join(SIN_REGISTRO)}",
              f"Validación: origen móvil, entrenando con los meses previos y pronosticando {HORIZONTE} meses; se elige el modelo de menor WAPE.", ""]
    for nombre, s in series.items():
        y = s.to_numpy()
        res = {n: evaluar(y, f) for n, f in MODELOS.items()}
        mejor = min(res, key=lambda k: res[k][1])
        pred = MODELOS[mejor](y, HORIZONTE)
        out["series"][nombre] = {"historico": [round(v) for v in y], "meses_forecast": [str(m) for m in futuros],
                                 "forecast": [round(float(v)) for v in pred], "mape": round(res[mejor][0], 1),
                                 "wape": round(res[mejor][1], 1), "modelo": mejor}
        lineas.append(f"{nombre}")
        for n, (e, w, k) in res.items():
            lineas.append(f"   {n:40s} MAPE {e:6.1f} %   WAPE {w:5.1f} %  ({k} orígenes){'   <-- elegido' if n == mejor else ''}")
        lineas.append(f"   Pronóstico {futuros[0]}..{futuros[-1]}: {[round(float(v)) for v in pred]} kg")
        lineas.append("")
    json.dump(out, open(os.path.join(AQUI, "forecast_output.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    texto = "\n".join(lineas)
    print(texto)
    ev = os.path.join(ROOT, "evidencias", "14_pronostico_real.txt")
    open(ev, "w", encoding="utf-8").write(texto + "\n")


if __name__ == "__main__":
    main()
