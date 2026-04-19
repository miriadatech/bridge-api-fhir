// src/routes/patient.routes.ts
import { Router } from 'express';
import { PatientController } from '../controllers/patient.controller';

const router = Router();
const controller = new PatientController();

/**
 * ORDEN CRÍTICO: Las rutas estáticas ANTES que las dinámicas
 * ❌ MAL:  /:id  antes de  /identifier/:type/:value
 * ✅ BIEN: /identifier/:type/:value  antes de  /:id
 *
 * Endpoints:
 * GET    /api/ehr/patients                          → Listar con paginación
 * POST   /api/ehr/patients                          → Crear paciente
 * GET    /api/ehr/patients/identifier/:type/:value  → Buscar por documento
 * GET    /api/ehr/patients/:id                      → Obtener por UUID
 * PUT    /api/ehr/patients/:id                      → Actualizar
 * DELETE /api/ehr/patients/:id                      → Soft delete
 * POST   /api/ehr/patients/:id/sync                 → Sincronizar con Ministerio
 */

// ─── Rutas estáticas primero ──────────────────────────────────────────────
router.get(
    '/identifier/:type/:value',
    (req, res) => controller.getByIdentifier(req, res)
);

// ─── Rutas dinámicas después ──────────────────────────────────────────────
router.get('/', (req, res) => controller.list(req, res));
router.post('/', (req, res) => controller.create(req, res));
router.get('/:id', (req, res) => controller.getById(req, res));
router.put('/:id', (req, res) => controller.update(req, res));
router.delete('/:id', (req, res) => controller.delete(req, res));
router.post('/:id/sync', (req, res) => controller.sync(req, res));

export default router;
