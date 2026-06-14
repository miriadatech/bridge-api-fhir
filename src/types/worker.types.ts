// src/types/worker.types.ts
// Tipos estrictos para el Worker de envío al Ministerio

// ─── Estados del registro ────────────────────────────────────────────────────
export enum EstadoRegistro {
  RECIBIDO    = 'RECIBIDO',
  ENVIANDO    = 'ENVIANDO',
  ENVIADO     = 'ENVIADO',
  ERROR       = 'ERROR',
  REINTENTANDO = 'REINTENTANDO',
}

// ─── Credenciales del cliente (tabla clientes) ───────────────────────────────
export interface ClienteCredenciales {
  id: string;
  nit: string;
  nombre: string;
  ministry_client_id: string | null;
  ministry_client_secret: string | null;
  ministry_auth_url: string | null;
  ministry_scope: string | null;
  ministry_mode: 'sandbox' | 'strict' | 'disabled';
  ministry_api_url: string | null;
  ministry_api_murl: string | null;
  ministry_api_msubs_key: string | null;
  ministry_tenant_id: string | null;
  is_active: boolean;
}

// ─── Registro FHIR pendiente (tabla interoperabilidad_recibida) ──────────────
export interface RegistroFhir {
  id: number;
  uuid_evento: string;
  ips_id: string;
  historia_id: number;
  tipo_evento: string;
  payload_original: Record<string, unknown>;
  payload_fhir: Record<string, unknown>;
  estado: EstadoRegistro;
  ministerio_id: string | null;
  respuesta_ministerio: Record<string, unknown> | null;
  intentos: number;
  ultimo_error: string | null;
  fecha_ultimo_intento: Date | null;
  created_at: Date;
  updated_at: Date;
}

// ─── Resultado de un intento de envío ────────────────────────────────────────
export interface ResultadoEnvio {
  registroId: number;
  exitoso: boolean;
  ministerioId?: string;
  respuesta?: Record<string, unknown>;
  error?: string;
  duracionMs: number;
}

// ─── Resumen de ejecución del worker ─────────────────────────────────────────
export interface ResumenEjecucion {
  total: number;
  enviados: number;
  errores: number;
  omitidos: number;
  duracionMs: number;
}

// ─── Config OAuth por cliente (Microsoft Azure AD) ──────────────────────────
export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;   // ministry_tenant_id → https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
  scope: string;
}

// ─── Token cacheado ──────────────────────────────────────────────────────────
export interface TokenCacheEntry {
  accessToken: string;
  expiresAt: number; // timestamp en ms
}
