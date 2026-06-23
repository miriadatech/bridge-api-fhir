// src/routes/rdaAmbulatory.routes.ts
// Rutas para el RDA de Consulta Externa (Ambulatorio)

import { Router } from 'express';
import { RDAAmbulatoryController } from '../controllers/RDAAmbulatoryController';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new RDAAmbulatoryController();

// Autenticación en todas las rutas
router.use(authMiddleware);

// ── POST /api/ehr/rda/ambulatory/translate ────────────────────────────────────
// Traducción directa sin base de datos: recibe JSON "normal", devuelve FHIR Bundle
router.post(
    '/translate',
    controller.translateDirect.bind(controller),
);

export default router;
