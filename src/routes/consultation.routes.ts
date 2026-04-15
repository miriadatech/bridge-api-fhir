import { Router, Request, Response, NextFunction } from 'express';
import { ConsultationController } from '../controllers/consultation.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new ConsultationController();

// ─── Auth en todas las rutas ───────────────────────────────────────────────
router.use(authMiddleware);

// ─── Consultas ─────────────────────────────────────────────────────────────
router.post('/', (req, res) => controller.createConsultation(req, res));
router.get('/patient/:patientId', (req, res) => controller.getPatientConsultations(req, res));
router.get('/:id', (req, res) => controller.getConsultation(req, res));
router.put('/:id', (req, res) => controller.updateConsultation(req, res));
router.delete('/:id', (req, res) => controller.deleteConsultation(req, res));

// ─── Prescripciones ────────────────────────────────────────────────────────
router.post('/:id/prescriptions', (req, res) => controller.addPrescription(req, res));

// ─── Órdenes de laboratorio ────────────────────────────────────────────────
router.post('/:id/lab-orders', (req, res) => controller.addLabOrder(req, res));
router.patch('/:id/lab-orders/:labOrderId/result', (req, res) => controller.updateLabOrderResult(req, res));

export default router;
