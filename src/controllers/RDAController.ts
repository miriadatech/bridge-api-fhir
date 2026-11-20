// src/controllers/RDAController.ts
// Corrección TS2554: generatePatientStatement recibe (tenantId, consultationId)

import { Request, Response } from 'express';
import { RDAService } from '../services/RDAService';
import { getTenant } from '../middleware/auth.middleware';
import { rdaQueueService } from '../services/RdaQueueService';

const rdaService = new RDAService();



export class RDAController {

    // ─── GET /api/rda/consultations/:consultationId ───────────────────────────
    getPatientStatement = async (req: Request, res: Response): Promise<void> => {
        try {
            const { consultationId } = req.params;
            const tenantId = (req as any).tenant?.id as string;

            if (!consultationId) {
                res.status(400).json({ error: 'consultationId es requerido' });
                return;
            }
            if (!tenantId) {
                res.status(401).json({ error: 'Usuario no autenticado' });
                return;
            }

            // CORRECCIÓN TS2554: firma (tenantId, consultationId) — 2 argumentos
            const bundle = await rdaService.generatePatientStatement(
                tenantId,
                consultationId,
            );

            res.status(200).json(bundle);

        } catch (error: any) {
            if (error.message?.includes('not found')) {
                res.status(404).json({ error: error.message });
                return;
            }
            console.error('[RDAController.getPatientStatement]', error);
            res.status(500).json({
                error: 'Error generando RDA',
                detail: error.message,
            });
        }
    };

    // ─── POST /api/rda/consultations/:consultationId/sync ────────────────────
    syncConsultation = async (req: Request, res: Response): Promise<void> => {
        try {
            const { consultationId } = req.params;
            const tenantId = (req as any).tenant?.id as string;
            const mode = (req.body?.mode ?? 'sandbox') as 'sandbox' | 'strict';

            if (!consultationId) {
                res.status(400).json({ error: 'consultationId es requerido' });
                return;
            }
            if (!tenantId) {
                res.status(401).json({ error: 'Tenant no autenticado' });
                return;
            }
            if (!['sandbox', 'strict'].includes(mode)) {
                res.status(400).json({
                    error: 'mode debe ser "sandbox" o "strict"',
                });
                return;
            }

            const result = await rdaService.syncToMinistry(
                tenantId,
                consultationId,
                mode,
            );

            const statusCode = result.success ? 200 : 500;
            res.status(statusCode).json(result);

        } catch (error: any) {
            console.error('[RDAController.syncConsultation]', error);
            res.status(500).json({
                error: 'Error sincronizando con MinSalud',
                detail: error.message,
            });
        }
    };

    // ─── POST /api/ehr/rda/translate (LEGADO — usar POST /api/rda/paciente) ─────
    // Mantiene la respuesta original (el Bundle FHIR) pero ahora valida todo el JSON,
    // toma la IPS del cliente autenticado (x-api-key) y no de tenant.id del body.
    translateDirect = async (req: Request, res: Response): Promise<void> => {
        try {
            const r = await rdaQueueService.enqueue(getTenant(req), 'paciente', req.body ?? {}, { includeBundle: true });
            if (!r.ok) {
                res.status(r.status === 422 ? 400 : r.status).json({ error: 'JSON inválido', detalles: r.body.errores ?? r.body });
                return;
            }
            const envio: any = r.body.envio;
            if (envio?.id) res.setHeader('X-RDA-Envio-Id', String(envio.id));
            res.status(200).json(r.body.bundle ?? r.body);
        } catch (error: any) {
            console.error('[RDAController.translateDirect]', error);
            res.status(500).json({ error: 'Error traduciendo RDA', detail: error.message });
        }
    };
}
