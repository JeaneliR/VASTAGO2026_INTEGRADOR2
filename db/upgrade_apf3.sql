ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_email_ci ON usuarios(lower(email));
CREATE TABLE IF NOT EXISTS correo_config (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    destinatario VARCHAR(120) NOT NULL DEFAULT '',
    habilitado BOOLEAN NOT NULL DEFAULT FALSE,
    alertas_inmediatas BOOLEAN NOT NULL DEFAULT FALSE,
    hora SMALLINT NOT NULL DEFAULT 8 CHECK (hora BETWEEN 0 AND 23),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO correo_config (id) VALUES (1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS correo_envios (
    id BIGSERIAL PRIMARY KEY,
    clave VARCHAR(120) NOT NULL UNIQUE,
    destinatario VARCHAR(120) NOT NULL,
    asunto VARCHAR(150) NOT NULL,
    contenido TEXT NOT NULL,
    origen VARCHAR(20) NOT NULL CHECK (origen IN ('manual','diario','stock')),
    estado VARCHAR(20) NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente','Procesando','Aceptado','Fallido')),
    proveedor_id VARCHAR(100),
    error VARCHAR(250),
    intentos SMALLINT NOT NULL DEFAULT 0,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_correo_pendiente ON correo_envios (estado, creado_en);
CREATE TABLE IF NOT EXISTS app_migraciones (
    version VARCHAR(80) PRIMARY KEY,
    aplicada_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
