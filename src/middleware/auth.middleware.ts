// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { pool } from '../db';

// Extender Request para incluir tenant
export interface TenantRequest extends Request {
    tenant: {
        id: string;
        name: string;
        plan: string;
        ministry_mode: string;
        ministry_client_id: string | null;
        ministry_client_secret: string | null;
        ministry_auth_url: string | null;
        ministry_scope: string;
    };
}

export async function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {

    const apiKey = req.headers['x-api-key'] as string;

    // 1. Validar que venga el header
    if (!apiKey) {
        res.status(401).json({
            success: false,
            error: 'API Key requerida',
            hint: 'Incluye el header: x-api-key: TU_API_KEY'
        });
        return;
    }

    try {
        // 2. Buscar tenant por api_key
        const result = await pool.query(
            `SELECT
         id, name, plan,
         ministry_mode,
         ministry_client_id,
         ministry_client_secret,
         ministry_auth_url,
         ministry_scope,
         is_active
       FROM tenants
       WHERE api_key = $1
       LIMIT 1`,
            [apiKey]
        );

        if (result.rows.length === 0) {
            res.status(401).json({
                success: false,
                error: 'API Key inválida'
            });
            return;
        }

        const tenant = result.rows[0];

        // 3. Validar que esté activo
        if (!tenant.is_active) {
            res.status(403).json({
                success: false,
                error: 'Tenant inactivo. Contacta soporte.'
            });
            return;
        }

        // 4. Inyectar tenant en request
        (req as TenantRequest).tenant = {
            id: tenant.id,
            name: tenant.name,
            plan: tenant.plan,
            ministry_mode: tenant.ministry_mode,
            ministry_client_id: tenant.ministry_client_id,
            ministry_client_secret: tenant.ministry_client_secret,
            ministry_auth_url: tenant.ministry_auth_url,
            ministry_scope: tenant.ministry_scope || 'openid',
        };

        next();

    } catch (error) {
        console.error('❌ Auth middleware error:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno de autenticación'
        });
    }
}
