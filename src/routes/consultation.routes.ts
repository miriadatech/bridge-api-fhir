// src/routes/consultation.routes.ts
import { Router } from 'express';
import { consultationController } from '../controllers/consultation.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

// ── Rutas estáticas PRIMERO (antes de las dinámicas con :id) ────────────────
router.get('/patient/:patientId', (req, res) => consultationController.findByPatient(req, res));
router.put('/lab-orders/:labOrderId/result', (req, res) => consultationController.updateLabOrderResult(req, res));

// ── CRUD principal ───────────────────────────────────────────────────────────
router.post('/', (req, res) => consultationController.create(req, res));
router.get('/', (req, res) => consultationController.findAll(req, res));
router.get('/:id', (req, res) => consultationController.findById(req, res));
router.put('/:id', (req, res) => consultationController.update(req, res));
router.delete('/:id', (req, res) => consultationController.delete(req, res));

// ── Sub-recursos ─────────────────────────────────────────────────────────────
router.post('/:id/prescriptions', (req, res) => consultationController.addPrescription(req, res));
router.post('/:id/lab-orders', (req, res) => consultationController.addLabOrder(req, res));
router.post('/:id/sync', (req, res) => consultationController.syncToMinistry(req, res));

export default router;
