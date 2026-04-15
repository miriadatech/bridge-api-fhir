// src/modules/auth/auth.controller.ts
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { TenantRequest } from '../../middleware/auth.middleware';

const authService = new AuthService();

export class AuthController {

    // POST /api/auth/register (PÚBLICO)
    async register(req: Request, res: Response): Promise<void> {
        try {
            const { name, email, phone, nit, institution_type, institution_code, plan } = req.body;

            if (!name || !email) {
                res.status(400).json({
                    success: false,
                    error: 'name y email son requeridos'
                });
                return;
            }

            const tenant = await authService.register({
                name, email, phone, nit,
                institution_type, institution_code, plan
            });

            res.status(201).json({
                success: true,
                message: 'Tenant registrado exitosamente',
                data: {
                    ...tenant,
                    warning: '⚠️ Guarda tu API Key de forma segura. No se mostrará nuevamente.'
                }
            });

        } catch (error: any) {
            if (error.message === 'EMAIL_EXISTS') {
                res.status(409).json({
                    success: false,
                    error: 'El email ya está registrado'
                });
                return;
            }
            console.error('❌ Register error:', error);
            res.status(500).json({ success: false, error: 'Error interno' });
        }
    }

    // POST /api/auth/regenerate-key (PROTEGIDO: requiere x-api-key)
    async regenerateKey(req: Request, res: Response): Promise<void> {
        try {
            const tenant = (req as TenantRequest).tenant;
            const result = await authService.regenerateKey(tenant.id);

            res.json({
                success: true,
                message: 'API Key regenerada',
                data: {
                    ...result,
                    warning: '⚠️ Tu API Key anterior quedó inválida inmediatamente.'
                }
            });

        } catch (error: any) {
            console.error('❌ Regenerate key error:', error);
            res.status(500).json({ success: false, error: 'Error interno' });
        }
    }

    // PUT /api/auth/ministry-credentials (PROTEGIDO: requiere x-api-key)
    async saveMinistryCredentials(req: Request, res: Response): Promise<void> {
        try {
            const tenant = (req as TenantRequest).tenant;
            const { client_id, client_secret, auth_url, scope, mode } = req.body;

            if (!client_id || !client_secret || !auth_url) {
                res.status(400).json({
                    success: false,
                    error: 'client_id, client_secret y auth_url son requeridos'
                });
                return;
            }

            if (mode && !['sandbox', 'strict', 'disabled'].includes(mode)) {
                res.status(400).json({
                    success: false,
                    error: 'mode debe ser: sandbox | strict | disabled'
                });
                return;
            }

            const result = await authService.saveMinistryCredentials(
                tenant.id,
                { client_id, client_secret, auth_url, scope, mode }
            );

            res.json({
                success: true,
                message: 'Credenciales del Ministerio guardadas',
                data: result
            });

        } catch (error: any) {
            console.error('❌ Ministry credentials error:', error);
            res.status(500).json({ success: false, error: 'Error interno' });
        }
    }

    // GET /api/auth/profile (PROTEGIDO: requiere x-api-key)
    async getProfile(req: Request, res: Response): Promise<void> {
        try {
            const tenant = (req as TenantRequest).tenant;
            const profile = await authService.getProfile(tenant.id);

            res.json({
                success: true,
                data: profile
            });

        } catch (error: any) {
            console.error('❌ Profile error:', error);
            res.status(500).json({ success: false, error: 'Error interno' });
        }
    }
}
