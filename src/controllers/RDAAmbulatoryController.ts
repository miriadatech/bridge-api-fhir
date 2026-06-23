// src/controllers/RDAAmbulatoryController.ts
// Controlador para RDA de Consulta Externa (Ambulatorio)

import { Request, Response } from 'express';
import {
    RDAAmbulatoryTranslator,
    RDAAmbulatoryInput,
} from '../translators/RDAAmbulatoryTranslator';
import { tenant_local } from '../types/types';
import saveRdaService from '../services/saveRDA.service';

export class RDAAmbulatoryController {

    // ─── POST /api/ehr/rda/ambulatory/translate ───────────────────────────────
    /**
     * Recibe el JSON "normal" del HIS, lo traduce a FHIR Bundle (RDA Consulta Externa)
     * y lo graba en interoperabilidad_recibida para su posterior envío al Ministerio.
     */
    translateDirect = async (req: Request, res: Response): Promise<void> => {
        try {
            const input = req.body as RDAAmbulatoryInput;
            const tenant = req.body.tenant as tenant_local | undefined;

            // ── Validaciones mínimas ──────────────────────────────────────────
            if (!input?.patient?.identifier_value) {
                res.status(400).json({ error: 'Campo requerido: patient.identifier_value' });
                return;
            }
            if (!input?.patient?.given_name) {
                res.status(400).json({ error: 'Campo requerido: patient.given_name' });
                return;
            }
            if (!input?.tenant?.institution_code) {
                res.status(400).json({ error: 'Campo requerido: tenant.institution_code' });
                return;
            }
            if (!input?.practitioner?.doctor_name) {
                res.status(400).json({ error: 'Campo requerido: practitioner.doctor_name' });
                return;
            }
            if (!input?.practitioner?.doctor_license) {
                res.status(400).json({ error: 'Campo requerido: practitioner.doctor_license' });
                return;
            }
            if (!input?.encounter?.encounter_id) {
                res.status(400).json({ error: 'Campo requerido: encounter.encounter_id' });
                return;
            }
            if (!input?.encounter?.period_start) {
                res.status(400).json({ error: 'Campo requerido: encounter.period_start' });
                return;
            }

            // ── Arrays clínicos opcionales (default vacío) ────────────────────
            input.conditions         = input.conditions         ?? [];
            input.allergies          = input.allergies          ?? [];
            input.risk_factors       = input.risk_factors       ?? [];
            input.medication_requests= input.medication_requests ?? [];
            input.service_requests   = input.service_requests   ?? [];
            input.document_references= input.document_references ?? [];

            // ── Traducción ────────────────────────────────────────────────────
            const bundle = RDAAmbulatoryTranslator.translate(input);

            // ── Persistencia (no-bloqueante en caso de error) ─────────────────
            try {
                await saveRdaService.saveRdaRecibidas(input, tenant, bundle);
            } catch (saveErr) {
                console.warn('[RDAAmbulatoryController] No se pudo persistir el RDA:', saveErr);
            }

            res.status(200).json(bundle);

        } catch (error: any) {
            console.error('[RDAAmbulatoryController.translateDirect]', error);
            res.status(500).json({
                error: 'Error traduciendo RDA Consulta Externa',
                detail: error.message,
            });
        }
    };
}
