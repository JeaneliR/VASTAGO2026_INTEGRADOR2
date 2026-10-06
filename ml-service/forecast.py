import numpy as np, pandas as pd, json
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_percentage_error

rng = np.random.default_rng(42)
months = pd.date_range("2024-01-01", periods=24, freq="MS")
t = np.arange(24)

def seasonal_series(base, trend, a_madre, a_fiestas, a_navidad, noise):
    seasonal = np.zeros(24)
    for i, d in enumerate(months):
        v = 0
        if d.month == 5: v += a_madre
        if d.month == 7: v += a_fiestas
        if d.month in (11, 12): v += a_navidad
        seasonal[i] = v
    return np.clip(base + trend * t + seasonal + rng.normal(0, noise, 24), 0, None)

productos = {
    "Tableta 70% Cacao 100g": seasonal_series(850, 6, 180, 140, 260, 40),
    "Bombones Caja x6": seasonal_series(420, 4, 260, 90, 380, 30),
    "Tableta de Regalo 150g": seasonal_series(300, 3, 320, 60, 420, 25),
}
df = pd.DataFrame(productos, index=months); df.index.name = "mes"
df.to_csv("historico_demanda.csv")

def feats(idx, tt):
    X = pd.DataFrame({"t": tt})
    for m in range(1, 13): X[f"m{m}"] = (idx.month == m).astype(int)
    return X

def fit_forecast(y, periods=3):
    X = feats(months, t)
    m = LinearRegression().fit(X.iloc[:-4], y[:-4])
    mape = mean_absolute_percentage_error(y[-4:], np.clip(m.predict(X.iloc[-4:]), 1, None)) * 100
    full = LinearRegression().fit(X, y)
    fidx = pd.date_range(months[-1] + pd.offsets.MonthBegin(1), periods=periods, freq="MS")
    return mape, fidx, np.clip(full.predict(feats(fidx, np.arange(24, 24 + periods))), 0, None)

out = {"meses_hist": [d.strftime("%Y-%m") for d in months], "series": {}}
for prod, y in productos.items():
    mape, fidx, pred = fit_forecast(y)
    out["series"][prod] = {"historico": [round(v) for v in y],
        "meses_forecast": [d.strftime("%Y-%m") for d in fidx],
        "forecast": [round(v) for v in pred], "mape": round(mape, 1)}
    print(prod, round(mape, 1), [round(v) for v in pred])
json.dump(out, open("forecast_output.json", "w"), ensure_ascii=False, indent=2)
