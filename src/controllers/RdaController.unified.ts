// src/controllers/RdaController.unified.ts
// Endpoints unificados para los 4 tipos de RDA:
//   paciente | consulta | urgencias | hospitalizacion
import { Request, Response } from 'express';
import { getTenant } from '../middleware/auth.middleware';
import { RDA_TYPES, RdaTipo, resolveTipo, validateAndTranslate } from '../rda/rda.registry';
import { rdaQueueService } from '../services/RdaQueueService';

function tipoOr400(req: Request, res: Response): RdaTipo | null {
    const tipo = resolveTipo(req.params.tipo);
    if (!tipo) {
        res.status(400).json({
            success: false,
            error: `Tipo de RDA no soportado: "${req.params.tipo}"`,
            tipos_validos: Object.keys(RDA_TYPES),
        });
        return null;
    }
    return tipo;
}

function bodyOr400(req: Request, res: Response): any | null {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        res.status(400).json({ success: false, error: 'El body debe ser un objeto JSON (Content-Type: application/json)' });
        return null;
    }
    return req.body;
}

const handle = (fn: (req: Request, res: Response) => Promise<void>) =>
    async (req: Request, res: Response): Promise<void> => {
        try {
            await fn(req, res);
        } catch (err: any) {
            console.error('[RdaController]', err);
            res.status(500).json({ success: false, error: 'Error interno procesando el RDA', detalle: err?.message });
        }
    };

export const rdaUnifiedController = {

    // GET /api/rda/tipos
    tipos: handle(async (_req, res) => {
        res.json({
            success: true,
            data: Object.values(RDA_TYPES).map(t => ({
                tipo: t.tipo,
                nombre: t.nombre,
                operacion_ministerio: t.operation,
                perfil_composition: t.compositionProfile,
                endpoint_envio: `POST /api/rda/${t.tipo}`,
                endpoint_preview: `POST /api/rda/${t.tipo}/translate`,
            })),
        });
    }),

    // POST /api/rda/:tipo/translate  → valida y devuelve el Bundle FHIR, NO guarda ni envía
    translate: handle(async (req, res) => {
        const tipo = tipoOr400(req, res); if (!tipo) return;
        const input = bodyOr400(req, res); if (!input) return;
        const warnings = rdaQueueService.applyTenant(input, getTenant(req));
        const result = validateAndTranslate(tipo, input);
        if (!result.ok) {
            res.status(422).json({ success: false, tipo, errores: result.errors });
            return;
        }
        if (req.query.solo_bundle === 'true') {
            res.json(result.bundle);
            return;
        }
        res.json({
            success: true,
            tipo,
            operacion: RDA_TYPES[tipo].operation,
            ...(warnings.length > 0 && { advertencias: warnings }),
            bundle: result.bundle,
        });
    }),

    // POST /api/rda/:tipo  → valida, traduce y encola para el worker
    enqueue: handle(async (req, res) => {
        const tipo = tipoOr400(req, res); if (!tipo) return;
        const input = bodyOr400(req, res); if (!input) return;
        const r = await rdaQueueService.enqueue(getTenant(req), tipo, input, {
            includeBundle: req.query.incluir_bundle === 'true',
        });
        res.status(r.status).json(r.body);
    }),

    // GET /api/rda/envios
    list: handle(async (req, res) => {
        const q = req.query as Record<string, string | undefined>;
        const tipo = q.tipo ? resolveTipo(q.tipo) ?? q.tipo : undefined;
        const data = await rdaQueueService.list(getTenant(req).id, {
            estado: q.estado, tipo, desde: q.desde, hasta: q.hasta, historia_id: q.historia_id,
            page: q.page ? parseInt(q.page, 10) : undefined,
            pageSize: q.page_size ? parseInt(q.page_size, 10) : undefined,
        });
        res.json({ success: true, ...data });
    }),

    // GET /api/rda/envios/resumen
    summary: handle(async (req, res) => {
        res.json({ success: true, data: await rdaQueueService.summary(getTenant(req).id) });
    }),

    // GET /api/rda/envios/:id   (id numérico o uuid_evento)
    get: handle(async (req, res) => {
        const row = await rdaQueueService.get(getTenant(req).id, req.params.id, req.query.incluir_payload === 'true');
        if (!row) { res.status(404).json({ success: false, error: 'Envío no encontrado' }); return; }
        res.json({ success: true, data: row });
    }),

    // POST /api/rda/envios/:id/reintentar
    retry: handle(async (req, res) => {
        const row = await rdaQueueService.retry(getTenant(req).id, req.params.id);
        if (!row) {
            res.status(409).json({ success: false, error: 'Solo se pueden reintentar envíos en estado ERROR o REINTENTANDO (o el envío no existe)' });
            return;
        }
        res.json({ success: true, mensaje: 'Envío re-encolado', data: row });
    }),

    // PUT /api/rda/envios/:id  → corrige el JSON de un envío fallido y lo re-encola
    replace: handle(async (req, res) => {
        const input = bodyOr400(req, res); if (!input) return;
        const r = await rdaQueueService.replace(getTenant(req), req.params.id, input);
        res.status(r.status).json(r.body);
    }),
};
