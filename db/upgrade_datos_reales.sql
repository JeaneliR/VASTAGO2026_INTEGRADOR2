-- Actualización aditiva: datos reales de planta (histórico de grageado, pronóstico y kardex de insumos).
-- Se ejecuta una sola vez (app_migraciones). No toca usuarios, insumos, lotes ni órdenes.

-- El pronóstico anterior (producto_id, datos simulados) se reemplaza por series reales; solo se borra si aún tiene la forma antigua.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'pronosticos' AND column_name = 'producto_id') THEN
        DROP TABLE pronosticos;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'demanda_historica' AND column_name = 'producto_id') THEN
        DROP TABLE demanda_historica;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS series_demanda (
    id     SERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    unidad VARCHAR(10) NOT NULL DEFAULT 'kg'
);

CREATE TABLE IF NOT EXISTS demanda_historica (
    serie_id INT NOT NULL REFERENCES series_demanda(id) ON DELETE CASCADE,
    mes      DATE NOT NULL,
    kg       NUMERIC(10,2) NOT NULL,
    imputado BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (serie_id, mes)
);

CREATE TABLE IF NOT EXISTS pronosticos (
    serie_id INT NOT NULL REFERENCES series_demanda(id) ON DELETE CASCADE,
    mes      DATE NOT NULL,
    kg       NUMERIC(10,2) NOT NULL,
    mape     NUMERIC(6,2) NOT NULL,
    wape     NUMERIC(6,2) NOT NULL,
    modelo   VARCHAR(60) NOT NULL,
    PRIMARY KEY (serie_id, mes)
);

CREATE TABLE IF NOT EXISTS produccion_historica (
    id           SERIAL PRIMARY KEY,
    mes          DATE NOT NULL,
    fecha        DATE,
    operador     VARCHAR(30) NOT NULL,
    centro       VARCHAR(30) NOT NULL,
    variante     VARCHAR(20) NOT NULL DEFAULT 'Estándar',
    centro_kg    NUMERIC(10,3) CHECK (centro_kg >= 0),
    chocolate_kg NUMERIC(10,3) CHECK (chocolate_kg >= 0),
    bruto_kg     NUMERIC(10,3) NOT NULL CHECK (bruto_kg > 0),
    reproceso_kg NUMERIC(10,3) CHECK (reproceso_kg >= 0),
    lote         VARCHAR(20)
);
CREATE INDEX IF NOT EXISTS ix_prod_hist_mes ON produccion_historica(mes, centro);

CREATE TABLE IF NOT EXISTS kardex_insumos (
    codigo       VARCHAR(20) PRIMARY KEY,
    nombre       VARCHAR(80) NOT NULL,
    familia      VARCHAR(40) NOT NULL,
    unidad       VARCHAR(10) NOT NULL DEFAULT 'kg',
    stock_minimo NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
    stock_actual NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (stock_actual >= 0)
);

CREATE TABLE IF NOT EXISTS kardex_movimientos (
    id          SERIAL PRIMARY KEY,
    codigo      VARCHAR(20) NOT NULL REFERENCES kardex_insumos(codigo),
    fecha       DATE NOT NULL,
    tipo        VARCHAR(14) NOT NULL CHECK (tipo IN ('saldo_inicial','ingreso','salida')),
    cantidad_kg NUMERIC(10,3) NOT NULL CHECK (cantidad_kg > 0),
    fuente      VARCHAR(20) NOT NULL CHECK (fuente IN ('kardex_sep','kardex_may_ago'))
);
CREATE INDEX IF NOT EXISTS ix_kardex_mov ON kardex_movimientos(codigo, fecha);
