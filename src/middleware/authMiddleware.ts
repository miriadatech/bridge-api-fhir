import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';

export interface TenantRequest extends Request {
    tenant: {
        id: string;
        name: string;
        institution_code: string | null;
        nit: string | null;
        ministry_mode: string;
        ministry_client_id: string | null;
        ministry_client_secret: string | null;
        ministry_auth_url: string | null;
        ministry_api_url: string | null;
        ministry_scope: string;
        plan: string;
    };
}

export async function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const apiKey = req.headers['x-api-key'] as string | undefined;

    if (!apiKey) {
        res.status(401).json({
            success: false,
            error: 'Missing x-api-key header',
        });
        return;
    }

    if (!apiKey.startsWith('baf_') || apiKey.length !== 68) {
        res.status(401).json({
            success: false,
            error: 'Invalid API key format',
        });
        return;
    }

    try {
        const result = await pool.query(
            `SELECT
         id, name, institution_code, nit,
         ministry_mode, ministry_client_id, ministry_client_secret,
         ministry_auth_url, ministry_api_url, ministry_scope, plan
       FROM tenants
       WHERE api_key = $1 AND is_active = true`,
            [apiKey]
        );

        if (result.rows.length === 0) {
            res.status(401).json({
                success: false,
                error: 'Invalid or inactive API key',
            });
            return;
        }

        const tenant = result.rows[0];
        (req as any).tenant = {
            id: tenant.id,
            name: tenant.name,
            institution_code: tenant.institution_code,
            nit: tenant.nit,
            ministry_mode: tenant.ministry_mode ?? 'sandbox',
            ministry_client_id: tenant.ministry_client_id,
            ministry_client_secret: tenant.ministry_client_secret,
            ministry_auth_url: tenant.ministry_auth_url,
            ministry_api_url: tenant.ministry_api_url,
            ministry_scope: tenant.ministry_scope ?? 'openid',
            plan: tenant.plan ?? 'starter',
        };

        next();
    } catch (err) {
        console.error('[AuthMiddleware] DB error:', err);
        res.status(500).json({
            success: false,
            error: 'Authentication service error',
        });
    }
}
