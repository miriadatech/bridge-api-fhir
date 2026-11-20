// src/controllers/RDAAmbulatoryController.ts
// LEGADO — usar POST /api/rda/consulta. Se mantiene por compatibilidad: responde el Bundle FHIR.
import { Request, Response } from 'express';
import { getTenant } from '../middleware/auth.middleware';
import { rdaQueueService } from '../services/RdaQueueService';

export class RDAAmbulatoryController {

    // ─── POST /api/ehr/rda/ambulatory/translate ───────────────────────────────
    translateDirect = async (req: Request, res: Response): Promise<void> => {
        try {
            const r = await rdaQueueService.enqueue(getTenant(req), 'consulta', req.body ?? {}, { includeBundle: true });
            if (!r.ok) {
                res.status(r.status === 422 ? 400 : r.status).json({ error: 'JSON inválido', detalles: r.body.errores ?? r.body });
                return;
            }
            const envio: any = r.body.envio;
            if (envio?.id) res.setHeader('X-RDA-Envio-Id', String(envio.id));
            res.status(200).json(r.body.bundle ?? r.body);
        } catch (error: any) {
            console.error('[RDAAmbulatoryController.translateDirect]', error);
            res.status(500).json({ error: 'Error traduciendo RDA Consulta Externa', detail: error.message });
        }
    };
}
