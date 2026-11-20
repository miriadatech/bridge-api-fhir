// src/modules/auth/auth.service.ts
// Gestión de clientes (IPS) sobre la tabla `clientes`, la misma que usan el
// middleware de autenticación y el worker. (Antes escribía en `tenants`, por lo
// que un cliente registrado nunca podía autenticarse.)
import { pool } from '../../db';
import crypto from 'crypto';

export interface MinistryCredentialsInput {
    client_id: string;
    client_secret: string;
    tenant_id: string;          // tenant de Azure AD (login.microsoftonline.com/{tenant_id})
    scope: string;
    api_url: string;            // URL base IHCE, ej. https://sandbox.ihcecol.gov.co/ihce
    subscription_key?: string;  // Ocp-Apim-Subscription-Key
    auth_url?: string;
    mode?: 'sandbox' | 'strict' | 'disabled';
}

export class AuthService {

    private generateApiKey(): string {
        return 'baf_' + crypto.randomBytes(28).toString('hex');
    }

    async register(data: {
        name: string;
        email: string;
        phone?: string;
        nit?: string;
        institution_code?: string;
        plan?: string;
    }) {
        const exists = await pool.query('SELECT id FROM clientes WHERE email = $1', [data.email]);
        if (exists.rows.length > 0) throw new Error('EMAIL_EXISTS');

        const apiKey = this.generateApiKey();
        const result = await pool.query(
            `INSERT INTO clientes (nombre, email, telefono, nit, codigo_habilitacion, api_key, plan,
                                   is_active, estado, ministry_mode, api_key_created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7, true, 'Activo', 'sandbox', NOW())
             RETURNING id, nombre AS name, email, telefono AS phone, nit, codigo_habilitacion,
                       api_key, api_key_created_at, plan, ministry_mode, is_active, created_at`,
            [data.name, data.email, data.phone ?? null, data.nit ?? null,
             data.institution_code ?? null, apiKey, data.plan ?? 'starter'],
        );
        return result.rows[0];
    }

    async regenerateKey(clienteId: string) {
        const result = await pool.query(
            `UPDATE clientes
                SET api_key = $1, api_key_created_at = NOW(), updated_at = NOW()
              WHERE id = $2 AND is_active = true
          RETURNING id, nombre AS name, email, api_key, api_key_created_at`,
            [this.generateApiKey(), clienteId],
        );
        if (result.rows.length === 0) throw new Error('TENANT_NOT_FOUND');
        return result.rows[0];
    }

    async saveMinistryCredentials(clienteId: string, d: MinistryCredentialsInput) {
        const result = await pool.query(
            `UPDATE clientes SET
                 ministry_client_id     = $1,
                 ministry_client_secret = $2,
                 ministry_tenant_id     = $3,
                 ministry_scope         = $4,
                 ministry_api_murl      = $5,
                 ministry_api_url       = COALESCE(ministry_api_url, $5),
                 ministry_api_msubs_key = $6,
                 ministry_auth_url      = $7,
                 ministry_mode          = $8,
                 updated_at             = NOW()
              WHERE id = $9
          RETURNING id, nombre AS name, ministry_mode, ministry_tenant_id, ministry_scope,
                    ministry_api_murl, ministry_client_id, updated_at`,
            [
                d.client_id, d.client_secret, d.tenant_id, d.scope, d.api_url.replace(/\/$/, ''),
                d.subscription_key ?? null,
                d.auth_url ?? `https://login.microsoftonline.com/${d.tenant_id}/oauth2/v2.0/token`,
                d.mode ?? 'sandbox', clienteId,
            ],
        );
        if (result.rows.length === 0) throw new Error('TENANT_NOT_FOUND');
        return result.rows[0];
    }

    async getProfile(clienteId: string) {
        // Nunca se exponen client_secret ni subscription key
        const result = await pool.query(
            `SELECT id, nombre AS name, email, telefono AS phone, nit, codigo_habilitacion, plan,
                    ministry_mode, ministry_scope, ministry_tenant_id, ministry_api_murl,
                    ministry_client_id,
                    (ministry_client_secret IS NOT NULL)  AS has_client_secret,
                    (ministry_api_msubs_key IS NOT NULL)  AS has_subscription_key,
                    is_active, estado, created_at, updated_at, api_key_created_at
               FROM clientes WHERE id = $1`,
            [clienteId],
        );
        if (result.rows.length === 0) throw new Error('TENANT_NOT_FOUND');
        return result.rows[0];
    }
}
