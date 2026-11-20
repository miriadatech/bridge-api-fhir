// src/middleware/auth.middleware.ts
// Autenticación por API Key (header x-api-key) contra la tabla clientes.
import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';

export interface AuthTenant {
    id: string;
    name: string;
    nit: string | null;
    plan: string;
    /** Código de habilitación REPS registrado para el cliente (si existe la columna/valor) */
    codigo_habilitacion: string | null;
    ministry_mode: string;
    ministry_client_id: string | null;
    ministry_client_secret: string | null;
    ministry_auth_url: string | null;
    ministry_scope: string;
}

export interface TenantRequest extends Request {
    tenant: AuthTenant;
}

export function getTenant(req: Request): AuthTenant {
    return (req as TenantRequest).tenant;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    const apiKey = req.headers['x-api-key'] as string | undefined;

    if (!apiKey) {
        res.status(401).json({
            success: false,
            error: 'API Key requerida',
            hint: 'Incluye el header: x-api-key: TU_API_KEY',
        });
        return;
    }

    try {
        // to_jsonb permite leer columnas opcionales (ej. codigo_habilitacion) sin fallar
        // si la migración 002 aún no se ha aplicado.
        const result = await pool.query(
            `SELECT to_jsonb(c) AS row FROM clientes c WHERE c.api_key = $1 LIMIT 1`,
            [apiKey],
        );

        if (result.rows.length === 0) {
            res.status(401).json({ success: false, error: 'API Key inválida' });
            return;
        }

        const t = result.rows[0].row as Record<string, any>;

        if (t.is_active === false || (t.estado && t.estado !== 'Activo')) {
            res.status(403).json({ success: false, error: 'Cliente inactivo. Contacta soporte.' });
            return;
        }

        (req as TenantRequest).tenant = {
            id: t.id,
            name: t.nombre ?? t.name,
            nit: t.nit ?? null,
            plan: t.plan ?? 'starter',
            codigo_habilitacion: t.codigo_habilitacion ?? null,
            ministry_mode: t.ministry_mode ?? 'sandbox',
            ministry_client_id: t.ministry_client_id ?? null,
            ministry_client_secret: t.ministry_client_secret ?? null,
            ministry_auth_url: t.ministry_auth_url ?? null,
            ministry_scope: t.ministry_scope || 'openid',
        };

        next();
    } catch (error) {
        console.error('❌ Auth middleware error:', error);
        res.status(500).json({ success: false, error: 'Error interno de autenticación' });
    }
}
