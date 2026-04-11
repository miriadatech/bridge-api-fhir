import { pool } from '../../db';
import crypto from 'crypto';

export class AuthService {

    // ─── Generar API Key segura ───────────────────────────────
    private generateApiKey(): string {
        return 'baf_' + crypto.randomBytes(28).toString('hex'); // 64 chars total
    }

    // ─── Registrar nuevo tenant ───────────────────────────────
    async register(data: {
        name: string;
        email: string;
        phone?: string;
        nit?: string;
        institution_type?: string;
        institution_code?: string;
        plan?: string;
    }) {

        // Verificar email único
        const exists = await pool.query(
            'SELECT id FROM tenants WHERE email = $1',
            [data.email]
        );

        if (exists.rows.length > 0) {
            throw new Error('EMAIL_EXISTS');
        }

        const apiKey = this.generateApiKey();

        const result = await pool.query(
            `INSERT INTO tenants (
         name, email, phone, nit,
         institution_type, institution_code,
         api_key, plan
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING
         id, name, email, phone, nit,
         institution_type, institution_code,
         api_key, api_key_created_at,
         plan, ministry_mode, is_active, created_at`,
            [
                data.name,
                data.email,
                data.phone || null,
                data.nit || null,
                data.institution_type || null,
                data.institution_code || null,
                apiKey,
                data.plan || 'starter',
            ]
        );

        return result.rows[0];
    }

    // ─── Regenerar API Key ────────────────────────────────────
    async regenerateKey(tenantId: string) {
        const newKey = this.generateApiKey();

        const result = await pool.query(
            `UPDATE tenants
       SET api_key = $1, api_key_created_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND is_active = true
       RETURNING id, name, email, api_key, api_key_created_at`,
            [newKey, tenantId]
        );

        if (result.rows.length === 0) {
            throw new Error('TENANT_NOT_FOUND');
        }

        return result.rows[0];
    }

    // ─── Guardar credenciales del Ministerio ──────────────────
    async saveMinistryCredentials(tenantId: string, data: {
        client_id: string;
        client_secret: string;
        auth_url: string;
        scope?: string;
        mode?: 'sandbox' | 'strict' | 'disabled';
    }) {

        const result = await pool.query(
            `UPDATE tenants
       SET
         ministry_client_id     = $1,
         ministry_client_secret = $2,
         ministry_auth_url      = $3,
         ministry_scope         = $4,
         ministry_mode          = $5,
         updated_at             = NOW()
       WHERE id = $6
       RETURNING
         id, name, ministry_mode,
         ministry_auth_url, ministry_scope,
         ministry_client_id, updated_at`,
            [
                data.client_id,
                data.client_secret,
                data.auth_url,
                data.scope || 'openid',
                data.mode || 'sandbox',
                tenantId,
            ]
        );

        if (result.rows.length === 0) {
            throw new Error('TENANT_NOT_FOUND');
        }

        return result.rows[0];
    }

    // ─── Obtener info del tenant ──────────────────────────────
    async getProfile(tenantId: string) {
        const result = await pool.query(
            `SELECT
         id, name, email, phone, nit,
         institution_type, institution_code,
         plan, ministry_mode, ministry_scope,
         ministry_auth_url, ministry_client_id,
         is_active, created_at, updated_at,
         api_key_created_at
       FROM tenants
       WHERE id = $1`,
            [tenantId]
        );

        if (result.rows.length === 0) {
            throw new Error('TENANT_NOT_FOUND');
        }

        return result.rows[0]; // Nunca exponer client_secret
    }
}
