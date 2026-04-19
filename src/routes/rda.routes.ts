// src/routes/rda.routes.ts
import { Router } from 'express';
import { RDAController } from '../controllers/RDAController';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new RDAController();

// Aplicar auth a todas las rutas RDA
router.use(authMiddleware);

// ── GET /api/ehr/rda/consultations/:consultationId/bundle ─────────────────────
// Genera y retorna el FHIR Bundle sin persistir ni enviar a MinSalud
router.get(
    '/consultations/:consultationId/bundle',
    controller.getPatientStatement.bind(controller),
);

// ── POST /api/ehr/rda/consultations/:consultationId/sync ──────────────────────
// Sincroniza con MinSalud (mode: sandbox | strict)
router.post(
    '/consultations/:consultationId/sync',
    controller.syncConsultation.bind(controller),
);

// ── POST /api/ehr/rda/translate ───────────────────────────────────────────────
// Traducción directa sin base de datos
router.post(
    '/translate',
    controller.translateDirect.bind(controller),
);

export default router;

