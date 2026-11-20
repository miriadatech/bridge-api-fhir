-- =============================================================================
-- 002_interoperabilidad_rda.sql
-- Tablas usadas por la API (autenticación por x-api-key) y el worker de envío.
-- Es idempotente: se puede ejecutar sobre una base existente sin perder datos.
--   psql -h HOST -U USER -d DB -f database/migrations/002_interoperabilidad_rda.sql
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Clientes (IPS / prestadores) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre                  VARCHAR(255) NOT NULL,
    nit                     VARCHAR(30),
    plan                    VARCHAR(30)  DEFAULT 'starter',
    api_key                 VARCHAR(100) UNIQUE,
    is_active               BOOLEAN      DEFAULT true,
    estado                  VARCHAR(20)  DEFAULT 'Activo',
    -- Credenciales del Ministerio (Manual de Gestión de Credenciales IHCE)
    ministry_mode           VARCHAR(20)  DEFAULT 'sandbox',   -- sandbox | strict | disabled
    ministry_client_id      VARCHAR(255),
    ministry_client_secret  TEXT,
    ministry_tenant_id      VARCHAR(255),                     -- tenant de Azure AD
    ministry_scope          VARCHAR(500),
    ministry_auth_url       VARCHAR(500),
    ministry_api_url        VARCHAR(500),
    ministry_api_murl       VARCHAR(500),                     -- URL base IHCE, ej. https://sandbox.ihcecol.gov.co/ihce
    ministry_api_msubs_key  VARCHAR(255),                     -- Ocp-Apim-Subscription-Key
    created_at              TIMESTAMPTZ  DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  DEFAULT NOW()
);

-- Columnas nuevas (si la tabla ya existía)
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS codigo_habilitacion VARCHAR(20);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email               VARCHAR(255);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telefono            VARCHAR(50);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS api_key_created_at  TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ministry_tenant_id  VARCHAR(255);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ministry_api_murl   VARCHAR(500);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ministry_api_msubs_key VARCHAR(255);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS created_at          TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN clientes.codigo_habilitacion IS
  'Código de habilitación REPS de la IPS dueña de las credenciales. Si se define, la API '
  'lo usa como Organization/custodian del RDA e ignora el tenant.institution_code del body '
  '(evita el error del Ministerio: "Custodian.reference no corresponde con el usuario del token").';

CREATE UNIQUE INDEX IF NOT EXISTS ux_clientes_email ON clientes(email) WHERE email IS NOT NULL;

-- ─── Cola de RDA recibidos ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interoperabilidad_recibida (
    id                    BIGSERIAL PRIMARY KEY,
    uuid_evento           VARCHAR(100) NOT NULL,
    ips_id                UUID         NOT NULL REFERENCES clientes(id),
    historia_id           VARCHAR(100),
    tipo_evento           VARCHAR(50)  NOT NULL,      -- paciente | consulta | urgencias | hospitalizacion
    payload_original      JSONB        NOT NULL,
    payload_fhir          JSONB        NOT NULL,
    estado                VARCHAR(20)  NOT NULL DEFAULT 'RECIBIDO', -- RECIBIDO | ENVIANDO | ENVIADO | REINTENTANDO | ERROR
    ministerio_id         VARCHAR(255),
    respuesta_ministerio  JSONB,
    intentos              INTEGER      NOT NULL DEFAULT 0,
    ultimo_error          TEXT,
    fecha_ultimo_intento  TIMESTAMPTZ,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE interoperabilidad_recibida ALTER COLUMN estado SET DEFAULT 'RECIBIDO';
ALTER TABLE interoperabilidad_recibida ALTER COLUMN intentos SET DEFAULT 0;
ALTER TABLE interoperabilidad_recibida ADD COLUMN IF NOT EXISTS http_status INTEGER;

-- Idempotencia: un mismo evento del HIS no se encola dos veces para la misma IPS
CREATE UNIQUE INDEX IF NOT EXISTS ux_interop_ips_evento ON interoperabilidad_recibida(ips_id, uuid_evento);
-- Consulta del worker (pendientes en orden de llegada)
CREATE INDEX IF NOT EXISTS ix_interop_estado_fecha ON interoperabilidad_recibida(estado, created_at);
-- Consultas de la API por cliente
CREATE INDEX IF NOT EXISTS ix_interop_ips_fecha ON interoperabilidad_recibida(ips_id, created_at DESC);
