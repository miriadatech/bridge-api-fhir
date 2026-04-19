// src/routes/family-history.routes.ts

import { Router } from 'express';
import { FamilyHistoryController } from '../controllers/FamilyHistoryController';

const router = Router({ mergeParams: true }); // ← mergeParams para heredar :patientId
const controller = new FamilyHistoryController();

/**
 * Base: /api/ehr/patients/:patientId/family-history
 *
 * GET    /                → Listar antecedentes del paciente
 * POST   /                → Crear antecedente
 * POST   /bulk            → Crear múltiples antecedentes
 * GET    /:id             → Obtener por ID
 * PUT    /:id             → Actualizar
 * DELETE /:id             → Soft delete
 */

// Estáticas primero
router.post('/bulk', (req, res) =>
    controller.bulkCreate(req as any, res)
);

// Dinámicas después
router.get('/', (req, res) => controller.list(req as any, res));
router.post('/', (req, res) => controller.create(req as any, res));
router.get('/:id', (req, res) => controller.getById(req as any, res));
router.put('/:id', (req, res) => controller.update(req as any, res));
router.delete('/:id', (req, res) => controller.delete(req as any, res));

export default router;
