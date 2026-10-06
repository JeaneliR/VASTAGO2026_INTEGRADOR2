-- ============================================================================
-- Vástago & Co — Modelo físico de base de datos (PostgreSQL 16)
-- Sistema Web Inteligente de Gestión de Producción e Inventarios
-- Ejecutar: psql -d vastago -f db/schema.sql
-- ============================================================================

DROP TABLE IF EXISTS auditoria, sesiones, pronosticos, demanda_historica, alertas,
    movimientos_inventario, ordenes_produccion, bom, productos, insumos, usuarios, roles CASCADE;
DROP FUNCTION IF EXISTS fn_aplicar_movimiento() CASCADE;
DROP FUNCTION IF EXISTS fn_bloquear_auditoria() CASCADE;

-- ---------------------------------------------------------------- Seguridad
CREATE TABLE roles (
    id          SMALLINT PRIMARY KEY,
    nombre      VARCHAR(40) NOT NULL UNIQUE,
    descripcion VARCHAR(200) NOT NULL
);

CREATE TABLE usuarios (
    id                 SERIAL PRIMARY KEY,
    nombre             VARCHAR(100) NOT NULL,
    email              VARCHAR(120) NOT NULL UNIQUE,
    password_hash      VARCHAR(100) NOT NULL,          -- bcrypt (cost 12)
    rol_id             SMALLINT NOT NULL REFERENCES roles(id),
    telefono_cifrado   BYTEA,                          -- AES-256-GCM (nonce||ciphertext||tag)
    activo             BOOLEAN NOT NULL DEFAULT TRUE,
    intentos_fallidos  SMALLINT NOT NULL DEFAULT 0,
    bloqueado_hasta    TIMESTAMPTZ,
    ultimo_acceso      TIMESTAMPTZ,
    creado_en          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_usuarios_email CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);
CREATE INDEX ix_usuarios_rol ON usuarios(rol_id);

CREATE TABLE sesiones (                                -- refresh tokens (solo se guarda el hash SHA-256)
    id           BIGSERIAL PRIMARY KEY,
    usuario_id   INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash   CHAR(64) NOT NULL UNIQUE,
    expira_en    TIMESTAMPTZ NOT NULL,
    revocada     BOOLEAN NOT NULL DEFAULT FALSE,
    ip           VARCHAR(45),
    user_agent   VARCHAR(200),
    creada_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_sesiones_usuario ON sesiones(usuario_id) WHERE NOT revocada;

-- ---------------------------------------------------------------- Inventario
CREATE TABLE insumos (
    id             SERIAL PRIMARY KEY,
    nombre         VARCHAR(100) NOT NULL UNIQUE,
    unidad         VARCHAR(10)  NOT NULL,
    stock_actual   NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    stock_minimo   NUMERIC(12,3) NOT NULL CHECK (stock_minimo >= 0),
    costo_unitario NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (costo_unitario >= 0),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE movimientos_inventario (
    id          BIGSERIAL PRIMARY KEY,
    insumo_id   INT NOT NULL REFERENCES insumos(id),
    tipo        VARCHAR(10) NOT NULL CHECK (tipo IN ('INGRESO','SALIDA','AJUSTE')),
    cantidad    NUMERIC(12,3) NOT NULL CHECK (cantidad > 0),
    motivo      VARCHAR(120),
    orden_id    INT,
    usuario_id  INT NOT NULL REFERENCES usuarios(id),
    fecha       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_mov_insumo_fecha ON movimientos_inventario(insumo_id, fecha DESC);

-- ---------------------------------------------------------------- Producción
CREATE TABLE productos (
    id     SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    precio NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (precio >= 0)
);

CREATE TABLE bom (                                     -- receta (Bill of Materials)
    producto_id         INT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    insumo_id           INT NOT NULL REFERENCES insumos(id),
    cantidad_por_unidad NUMERIC(10,4) NOT NULL CHECK (cantidad_por_unidad > 0),
    PRIMARY KEY (producto_id, insumo_id)
);

CREATE TABLE ordenes_produccion (
    id           SERIAL PRIMARY KEY,
    lote         VARCHAR(20) NOT NULL UNIQUE,
    producto_id  INT NOT NULL REFERENCES productos(id),
    cantidad     INT NOT NULL CHECK (cantidad > 0),
    fecha_inicio DATE NOT NULL,
    estado       VARCHAR(12) NOT NULL DEFAULT 'Planificada'
                 CHECK (estado IN ('Planificada','En proceso','Completada')),
    creado_por   INT NOT NULL REFERENCES usuarios(id),
    creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_ordenes_estado ON ordenes_produccion(estado);
ALTER TABLE movimientos_inventario
    ADD CONSTRAINT fk_mov_orden FOREIGN KEY (orden_id) REFERENCES ordenes_produccion(id);

-- ---------------------------------------------------------------- Alertas y analítica
CREATE TABLE alertas (
    id         SERIAL PRIMARY KEY,
    nivel      VARCHAR(4) NOT NULL CHECK (nivel IN ('crit','warn')),
    titulo     VARCHAR(150) NOT NULL,
    detalle    VARCHAR(400) NOT NULL,
    creada_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE demanda_historica (
    producto_id INT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    mes         DATE NOT NULL,
    kg          NUMERIC(10,2) NOT NULL,
    PRIMARY KEY (producto_id, mes)
);

CREATE TABLE pronosticos (
    producto_id INT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    mes         DATE NOT NULL,
    kg          NUMERIC(10,2) NOT NULL,
    mape        NUMERIC(5,2) NOT NULL,
    modelo      VARCHAR(60) NOT NULL DEFAULT 'Regresion lineal + estacionalidad',
    PRIMARY KEY (producto_id, mes)
);

-- ---------------------------------------------------------------- Trazabilidad
CREATE TABLE auditoria (
    id          BIGSERIAL PRIMARY KEY,
    usuario_id  INT REFERENCES usuarios(id) ON DELETE SET NULL,
    email       VARCHAR(120),
    accion      VARCHAR(40) NOT NULL,
    entidad     VARCHAR(40),
    detalle     JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip          VARCHAR(45),
    exito       BOOLEAN NOT NULL DEFAULT TRUE,
    fecha       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_auditoria_fecha ON auditoria(fecha DESC);
CREATE INDEX ix_auditoria_usuario ON auditoria(usuario_id);

-- La bitácora es de solo-anexar: se impide UPDATE y DELETE (integridad / no repudio)
CREATE FUNCTION fn_bloquear_auditoria() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'La tabla auditoria es de solo lectura/anexado';
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_auditoria_inmutable BEFORE UPDATE OR DELETE ON auditoria
    FOR EACH ROW EXECUTE FUNCTION fn_bloquear_auditoria();

-- ---------------------------------------------------------------- Lógica en BD
-- Cada movimiento actualiza el stock del insumo de forma atómica.
CREATE FUNCTION fn_aplicar_movimiento() RETURNS trigger AS $$
BEGIN
    IF NEW.tipo = 'INGRESO' THEN
        UPDATE insumos SET stock_actual = stock_actual + NEW.cantidad, actualizado_en = now()
         WHERE id = NEW.insumo_id;
    ELSIF NEW.tipo = 'SALIDA' THEN
        UPDATE insumos SET stock_actual = stock_actual - NEW.cantidad, actualizado_en = now()
         WHERE id = NEW.insumo_id;           -- el CHECK (stock_actual >= 0) evita stock negativo
    ELSE
        UPDATE insumos SET stock_actual = NEW.cantidad, actualizado_en = now()
         WHERE id = NEW.insumo_id;
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_movimiento_stock AFTER INSERT ON movimientos_inventario
    FOR EACH ROW EXECUTE FUNCTION fn_aplicar_movimiento();

-- Vista de inventario con su estado de semáforo
CREATE OR REPLACE VIEW v_inventario AS
SELECT id, nombre, unidad, stock_actual, stock_minimo,
       CASE WHEN stock_actual < stock_minimo THEN 'crit'
            WHEN stock_actual < stock_minimo * 1.2 THEN 'warn'
            ELSE 'ok' END AS estado
  FROM insumos;
