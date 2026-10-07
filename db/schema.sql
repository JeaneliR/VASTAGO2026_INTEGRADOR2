-- ============================================================================
-- Vástago & Co — Modelo físico de base de datos (PostgreSQL 16)
-- Sistema Web Inteligente de Gestión de Producción e Inventarios
-- Ejecutar: psql -d vastago -f db/schema.sql
-- ============================================================================

DROP TABLE IF EXISTS auditoria, sesiones, pronosticos, demanda_historica, alertas,
    movimientos_pt, lotes_pt, etapa_consumos, orden_etapas, ruta_etapas, equipos, lotes_insumo,
    movimientos_inventario, ordenes_produccion, bom, productos, insumos, usuarios, roles CASCADE;
DROP VIEW IF EXISTS v_stock_pt CASCADE;
DROP FUNCTION IF EXISTS fn_aplicar_movimiento() CASCADE;
DROP FUNCTION IF EXISTS fn_aplicar_movimiento_pt() CASCADE;
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
    categoria      VARCHAR(20)  NOT NULL DEFAULT 'Materia prima'
                   CHECK (categoria IN ('Materia prima','Centro','Insumo auxiliar','Empaque')),
    unidad         VARCHAR(10)  NOT NULL,
    stock_actual   NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    stock_minimo   NUMERIC(12,3) NOT NULL CHECK (stock_minimo >= 0),
    costo_unitario NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (costo_unitario >= 0),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un lote de insumo es la unidad de trazabilidad de la materia prima (código del proveedor / de recepción).
CREATE TABLE lotes_insumo (
    id                  SERIAL PRIMARY KEY,
    insumo_id           INT NOT NULL REFERENCES insumos(id),
    codigo              VARCHAR(30) NOT NULL,
    proveedor           VARCHAR(100),
    fecha_ingreso       DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento   DATE,
    cantidad_disponible NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (cantidad_disponible >= 0),
    UNIQUE (insumo_id, codigo)
);
CREATE INDEX ix_lotes_insumo_insumo ON lotes_insumo(insumo_id, fecha_ingreso);

CREATE TABLE movimientos_inventario (
    id             BIGSERIAL PRIMARY KEY,
    lote_insumo_id INT REFERENCES lotes_insumo(id),
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
CREATE TABLE productos (                               -- catálogo de producto terminado (PT)
    id                SERIAL PRIMARY KEY,
    codigo            VARCHAR(20) NOT NULL UNIQUE,
    nombre            VARCHAR(100) NOT NULL UNIQUE,
    tipo              VARCHAR(20) NOT NULL DEFAULT 'Tableta' CHECK (tipo IN ('Tableta','Bombón','Gragea')),
    unidad            VARCHAR(10) NOT NULL DEFAULT 'unid.',
    precio            NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (precio >= 0),
    stock_minimo_pt   INT NOT NULL DEFAULT 0 CHECK (stock_minimo_pt >= 0),
    dias_vida_util    SMALLINT NOT NULL DEFAULT 180 CHECK (dias_vida_util > 0),
    lleva_centro      BOOLEAN NOT NULL DEFAULT FALSE,     -- grageas: el centro (maní, pasas, almendra...) se elige en la orden
    centro_por_unidad NUMERIC(10,4),                      -- kg de centro por unidad producida
    centro_etapa      SMALLINT,                           -- etapa de la ruta donde se consume el centro
    CONSTRAINT ck_centro CHECK (NOT lleva_centro OR (centro_por_unidad > 0 AND centro_etapa IS NOT NULL))
);

-- Máquinas / equipos de planta
CREATE TABLE equipos (
    id     SERIAL PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL UNIQUE,
    nombre VARCHAR(80) NOT NULL,
    tipo   VARCHAR(30) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- Ruta de proceso configurable por producto (p. ej. gragea: refinado 8 h → grageado → abrillantado → envasado)
CREATE TABLE ruta_etapas (
    id             SERIAL PRIMARY KEY,
    producto_id    INT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    secuencia      SMALLINT NOT NULL CHECK (secuencia > 0),
    nombre         VARCHAR(60) NOT NULL,
    descripcion    VARCHAR(300),
    horas_estandar NUMERIC(5,1) NOT NULL CHECK (horas_estandar > 0),
    tipo_equipo    VARCHAR(30) NOT NULL,
    UNIQUE (producto_id, secuencia)
);

CREATE TABLE bom (                                     -- receta (Bill of Materials)
    producto_id         INT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    insumo_id           INT NOT NULL REFERENCES insumos(id),
    cantidad_por_unidad NUMERIC(10,4) NOT NULL CHECK (cantidad_por_unidad > 0),
    etapa_secuencia     SMALLINT NOT NULL DEFAULT 1,       -- etapa de la ruta donde se consume el insumo
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
    centro_insumo_id  INT REFERENCES insumos(id),          -- centro elegido (solo productos con centro)
    cantidad_producida INT CHECK (cantidad_producida >= 0),-- unidades buenas al cerrar la última etapa
    fecha_fin    TIMESTAMPTZ,
    creado_por   INT NOT NULL REFERENCES usuarios(id),
    creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_ordenes_estado ON ordenes_produccion(estado);
ALTER TABLE movimientos_inventario
    ADD CONSTRAINT fk_mov_orden FOREIGN KEY (orden_id) REFERENCES ordenes_produccion(id);

-- Ejecución de cada etapa de una orden: responsable, equipo, tiempos reales, merma y observaciones
CREATE TABLE orden_etapas (
    id             SERIAL PRIMARY KEY,
    orden_id       INT NOT NULL REFERENCES ordenes_produccion(id) ON DELETE CASCADE,
    secuencia      SMALLINT NOT NULL,
    nombre         VARCHAR(60) NOT NULL,
    horas_estandar NUMERIC(5,1) NOT NULL,
    tipo_equipo    VARCHAR(30) NOT NULL,
    estado         VARCHAR(10) NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente','En curso','Completada')),
    responsable_id INT REFERENCES usuarios(id),
    equipo_id      INT REFERENCES equipos(id),
    inicio         TIMESTAMPTZ,
    fin            TIMESTAMPTZ,
    merma_kg       NUMERIC(10,3) NOT NULL DEFAULT 0 CHECK (merma_kg >= 0),
    observaciones  VARCHAR(300),
    UNIQUE (orden_id, secuencia),
    CONSTRAINT ck_etapa_tiempos CHECK (fin IS NULL OR (inicio IS NOT NULL AND fin >= inicio))
);
CREATE INDEX ix_orden_etapas_resp ON orden_etapas(responsable_id);

-- Insumos realmente consumidos en cada etapa, indicando el LOTE de insumo (base de la trazabilidad hacia atrás)
CREATE TABLE etapa_consumos (
    id             BIGSERIAL PRIMARY KEY,
    orden_etapa_id INT NOT NULL REFERENCES orden_etapas(id) ON DELETE CASCADE,
    lote_insumo_id INT NOT NULL REFERENCES lotes_insumo(id),
    cantidad       NUMERIC(12,3) NOT NULL CHECK (cantidad > 0),
    movimiento_id  BIGINT REFERENCES movimientos_inventario(id),
    registrado_por INT NOT NULL REFERENCES usuarios(id),
    fecha          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_consumos_lote ON etapa_consumos(lote_insumo_id);
CREATE INDEX ix_consumos_etapa ON etapa_consumos(orden_etapa_id);

-- ---------------------------------------------------------------- Inventario de producto terminado (PT)
CREATE TABLE lotes_pt (
    id                  SERIAL PRIMARY KEY,
    codigo              VARCHAR(30) NOT NULL UNIQUE,        -- = lote de la orden de producción
    producto_id         INT NOT NULL REFERENCES productos(id),
    orden_id            INT NOT NULL UNIQUE REFERENCES ordenes_produccion(id),
    centro_insumo_id    INT REFERENCES insumos(id),
    cantidad_producida  INT NOT NULL CHECK (cantidad_producida > 0),
    cantidad_disponible INT NOT NULL DEFAULT 0 CHECK (cantidad_disponible >= 0),
    fecha_produccion    DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento   DATE NOT NULL
);
CREATE INDEX ix_lotes_pt_producto ON lotes_pt(producto_id, fecha_produccion);

CREATE TABLE movimientos_pt (
    id         BIGSERIAL PRIMARY KEY,
    lote_pt_id INT NOT NULL REFERENCES lotes_pt(id),
    tipo       VARCHAR(10) NOT NULL CHECK (tipo IN ('INGRESO','SALIDA')),
    cantidad   INT NOT NULL CHECK (cantidad > 0),
    destino    VARCHAR(120),                                -- cliente / tienda / canal (trazabilidad hacia adelante)
    motivo     VARCHAR(120),
    usuario_id INT NOT NULL REFERENCES usuarios(id),
    fecha      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_mov_pt_lote ON movimientos_pt(lote_pt_id, fecha DESC);

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
        IF NEW.lote_insumo_id IS NOT NULL THEN
            UPDATE lotes_insumo SET cantidad_disponible = cantidad_disponible + NEW.cantidad WHERE id = NEW.lote_insumo_id;
        END IF;
    ELSIF NEW.tipo = 'SALIDA' THEN
        UPDATE insumos SET stock_actual = stock_actual - NEW.cantidad, actualizado_en = now()
         WHERE id = NEW.insumo_id;           -- el CHECK (stock_actual >= 0) evita stock negativo
        IF NEW.lote_insumo_id IS NOT NULL THEN
            UPDATE lotes_insumo SET cantidad_disponible = cantidad_disponible - NEW.cantidad WHERE id = NEW.lote_insumo_id;
        END IF;                              -- el CHECK de lotes_insumo evita consumir más de lo que tiene el lote
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

-- Cada movimiento de producto terminado actualiza el saldo de su lote (el CHECK impide saldo negativo)
CREATE FUNCTION fn_aplicar_movimiento_pt() RETURNS trigger AS $$
BEGIN
    IF NEW.tipo = 'INGRESO' THEN
        UPDATE lotes_pt SET cantidad_disponible = cantidad_disponible + NEW.cantidad WHERE id = NEW.lote_pt_id;
    ELSE
        UPDATE lotes_pt SET cantidad_disponible = cantidad_disponible - NEW.cantidad WHERE id = NEW.lote_pt_id;
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_movimiento_pt AFTER INSERT ON movimientos_pt
    FOR EACH ROW EXECUTE FUNCTION fn_aplicar_movimiento_pt();

-- Stock de producto terminado por producto y variante (centro). El semáforo compara el stock TOTAL del producto con su mínimo.
CREATE OR REPLACE VIEW v_stock_pt AS
SELECT p.id AS producto_id, p.codigo, p.nombre AS producto, p.tipo, p.unidad,
       c.id AS centro_id, c.nombre AS centro,
       COALESCE(sum(l.cantidad_disponible), 0)::int AS stock,
       t.total AS stock_total,
       p.stock_minimo_pt AS minimo,
       CASE WHEN t.total < p.stock_minimo_pt THEN 'crit'
            WHEN t.total < p.stock_minimo_pt * 1.2 THEN 'warn'
            ELSE 'ok' END AS estado,
       count(l.id) FILTER (WHERE l.cantidad_disponible > 0) AS lotes_activos
  FROM productos p
  JOIN LATERAL (SELECT COALESCE(sum(x.cantidad_disponible), 0)::int AS total FROM lotes_pt x WHERE x.producto_id = p.id) t ON TRUE
  LEFT JOIN lotes_pt l ON l.producto_id = p.id
  LEFT JOIN insumos c ON c.id = l.centro_insumo_id
 GROUP BY p.id, p.codigo, p.nombre, p.tipo, p.unidad, c.id, c.nombre, p.stock_minimo_pt, t.total;
