// src/controllers/RDAController.ts
// Corrección TS2554: generatePatientStatement recibe (tenantId, consultationId)

import { Request, Response } from 'express';
import { RDAService } from '../services/RDAService';
import {
    RDAPatientStatementTranslator,
    RDAPatientStatementInput,
} from '../translators/RDAPatientStatementTranslator';

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
                res.status(401).json({ error: 'Tenant no autenticado' });
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

    // ─── POST /api/rda/translate ──────────────────────────────────────────────
    translateDirect = async (req: Request, res: Response): Promise<void> => {
        try {
            const input = req.body as RDAPatientStatementInput;

            // Validaciones mínimas
            if (!input?.patient?.identifier_value) {
                res.status(400).json({
                    error: 'Campo requerido: patient.identifier_value',
                });
                return;
            }
            if (!input?.patient?.given_name) {
                res.status(400).json({
                    error: 'Campo requerido: patient.given_name',
                });
                return;
            }
            if (!input?.tenant?.institution_code) {
                res.status(400).json({
                    error: 'Campo requerido: tenant.institution_code',
                });
                return;
            }
            if (!input?.practitioner?.doctor_name) {
                res.status(400).json({
                    error: 'Campo requerido: practitioner.doctor_name',
                });
                return;
            }

            // Arrays clínicos opcionales
            input.conditions = input.conditions ?? [];
            input.allergies = input.allergies ?? [];
            input.familyHistory = input.familyHistory ?? [];
            input.medications = input.medications ?? [];

            // Método ESTÁTICO — correcto
            const bundle = RDAPatientStatementTranslator.translate(input);

            res.status(200).json(bundle);

        } catch (error: any) {
            console.error('[RDAController.translateDirect]', error);
            res.status(500).json({
                error: 'Error traduciendo RDA',
                detail: error.message,
            });
        }
    };
}
