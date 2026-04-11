import { Router } from 'express';
import { ConsultationController } from '../controllers/consultation.controller';

const router = Router();
const controller = new ConsultationController();

// =============================================
// RUTAS — CONSULTAS MÉDICAS
// =============================================

/**
 * @route   POST /api/consultations
 * @desc    Crear nueva consulta médica (con prescripciones y exámenes opcionales)
 * @body    CreateConsultationDTO
 */
router.post('/', (req, res) => controller.createConsultation(req, res));

/**
 * @route   GET /api/consultations/patient/:patientId
 * @desc    Obtener todas las consultas de un paciente
 * @note    DEBE ir ANTES de /:id para evitar colisión de rutas
 */
router.get('/patient/:patientId', (req, res) => controller.getPatientConsultations(req, res));

/**
 * @route   GET /api/consultations/:id
 * @desc    Obtener una consulta por su ID
 */
router.get('/:id', (req, res) => controller.getConsultation(req, res));

/**
 * @route   PUT /api/consultations/:id
 * @desc    Actualizar consulta médica
 * @body    UpdateConsultationDTO
 */
router.put('/:id', (req, res) => controller.updateConsultation(req, res));

/**
 * @route   DELETE /api/consultations/:id
 * @desc    Eliminar consulta médica (soft delete)
 */
router.delete('/:id', (req, res) => controller.deleteConsultation(req, res));

// =============================================
// SUB-RUTAS — PRESCRIPCIONES
// =============================================

/**
 * @route   POST /api/consultations/:id/prescriptions
 * @desc    Agregar medicamento a consulta existente
 * @body    CreatePrescriptionDTO
 */
router.post('/:id/prescriptions', (req, res) => controller.addPrescription(req, res));

// =============================================
// SUB-RUTAS — ÓRDENES DE EXAMEN
// =============================================

/**
 * @route   POST /api/consultations/:id/lab-orders
 * @desc    Agregar orden de examen a consulta existente
 * @body    CreateLabOrderDTO
 */
router.post('/:id/lab-orders', (req, res) => controller.addLabOrder(req, res));

/**
 * @route   PATCH /api/consultations/:id/lab-orders/:labOrderId/result
 * @desc    Registrar resultado de un examen
 * @body    UpdateLabOrderResultDTO
 */
router.patch(
    '/:id/lab-orders/:labOrderId/result',
    (req, res) => controller.updateLabOrderResult(req, res)
);

export default router;
