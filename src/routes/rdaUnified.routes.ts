// src/routes/rdaUnified.routes.ts
// Base: /api/rda   (todas requieren x-api-key; el middleware se aplica en app.ts)
import { Router } from 'express';
import { rdaUnifiedController as c } from '../controllers/RdaController.unified';
import { getCatalogo } from '../controllers/CatalogoController';

const router = Router();

// ── Consulta de envíos (rutas estáticas antes de /:tipo) ─────────────────────
router.get('/tipos', c.tipos);
router.get('/catalogos/:id', getCatalogo);
router.get('/envios', c.list);
router.get('/envios/resumen', c.summary);
router.get('/envios/:id', c.get);
router.put('/envios/:id', c.replace);
router.post('/envios/:id/reintentar', c.retry);

// ── RDA por tipo: paciente | consulta | urgencias | hospitalizacion ─────────
router.post('/:tipo/translate', c.translate);
router.post('/:tipo', c.enqueue);

export default router;
