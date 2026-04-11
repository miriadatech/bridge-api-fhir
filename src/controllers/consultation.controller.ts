import { Request, Response } from 'express';
import { consultationService } from '../services/consultation.service';
import {
    CreateConsultationDTO,
    UpdateConsultationDTO,
    CreatePrescriptionDTO,
    CreateLabOrderDTO,
    UpdateLabOrderResultDTO
} from '../services/consultation.service';

export class ConsultationController {

    // =============================================
    // POST /api/consultations
    // =============================================
    async createConsultation(req: Request, res: Response): Promise<void> {
        // 👇 AGREGA ESTAS 3 LÍNEAS
        console.log('📨 Headers:', req.headers);
        console.log('📦 Body raw:', req.body);
        console.log('📦 Body tipo:', typeof req.body);
        try {
            console.log('[ConsultationController] createConsultation:', req.body);
            const {
                patient_id,
                consultation_type,
                specialty,
                doctor_name,
                doctor_license,
                institution_name,
                institution_code,
                consultation_date,
                next_appointment,
                reason,
                symptoms,
                diagnosis_code,
                diagnosis_desc,
                treatment_plan,
                notes,
                weight_kg,
                height_cm,
                temperature_c,
                blood_pressure,
                heart_rate,
                oxygen_saturation,
                status,
                prescriptions,
                lab_orders
            } = req.body;

            // ─── Validaciones requeridas ───
            if (!patient_id) {
                res.status(400).json({ success: false, error: 'patient_id es requerido' });
                return;
            }
            if (!consultation_type) {
                res.status(400).json({ success: false, error: 'consultation_type es requerido (primera_vez | control | urgencia | domiciliaria)' });
                return;
            }
            if (!specialty) {
                res.status(400).json({ success: false, error: 'specialty es requerido' });
                return;
            }
            if (!doctor_name) {
                res.status(400).json({ success: false, error: 'doctor_name es requerido' });
                return;
            }
            if (!reason) {
                res.status(400).json({ success: false, error: 'reason (motivo de consulta) es requerido' });
                return;
            }

            const dto: CreateConsultationDTO = {
                patient_id,
                consultation_type,
                specialty,
                doctor_name,
                doctor_license,
                institution_name,
                institution_code,
                consultation_date,
                next_appointment,
                reason,
                symptoms,
                diagnosis_code,
                diagnosis_desc,
                treatment_plan,
                notes,
                weight_kg,
                height_cm,
                temperature_c,
                blood_pressure,
                heart_rate,
                oxygen_saturation,
                status,
                prescriptions,
                lab_orders
            };

            const consultation = await consultationService.create(dto);

            res.status(201).json({
                success: true,
                message: 'Consulta médica creada exitosamente',
                data: consultation
            });

        } catch (error: any) {
            console.error('[ConsultationController] createConsultation:', error.message);

            if (error.message?.includes('no encontrado')) {
                res.status(404).json({ success: false, error: error.message });
                return;
            }

            res.status(500).json({
                success: false,
                error: 'Error interno al crear la consulta',
                detail: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // =============================================
    // GET /api/consultations/:id
    // =============================================
    async getConsultation(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            const consultation = await consultationService.findById(id);

            res.status(200).json({
                success: true,
                data: consultation
            });

        } catch (error: any) {
            console.error('[ConsultationController] getConsultation:', error.message);

            if (error.message?.includes('no encontrada')) {
                res.status(404).json({ success: false, error: error.message });
                return;
            }

            res.status(500).json({
                success: false,
                error: 'Error interno al obtener la consulta',
                detail: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // =============================================
    // GET /api/consultations/patient/:patientId
    // =============================================
    async getPatientConsultations(req: Request, res: Response): Promise<void> {
        try {
            const { patientId } = req.params;

            const consultations = await consultationService.findByPatient(patientId);

            res.status(200).json({
                success: true,
                data: consultations,
                pagination: {
                    total: consultations.length
                }
            });

        } catch (error: any) {
            console.error('[ConsultationController] getPatientConsultations:', error.message);

            if (error.message?.includes('no encontrado')) {
                res.status(404).json({ success: false, error: error.message });
                return;
            }

            res.status(500).json({
                success: false,
                error: 'Error interno al obtener consultas del paciente',
                detail: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // =============================================
    // PUT /api/consultations/:id
    // =============================================
    async updateConsultation(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const body = { ...req.body };

            // ─── Proteger campos inmutables ───
            delete body.id;
            delete body.patient_id;
            delete body.created_at;

            if (Object.keys(body).length === 0) {
                res.status(400).json({ success: false, error: 'No se enviaron campos para actualizar' });
                return;
            }

            const dto: UpdateConsultationDTO = body;
            const updated = await consultationService.update(id, dto);

            res.status(200).json({
                success: true,
                message: 'Consulta actualizada exitosamente',
                data: updated
            });

        } catch (error: any) {
            console.error('[ConsultationController] updateConsultation:', error.message);

            if (error.message?.includes('no encontrada')) {
                res.status(404).json({ success: false, error: error.message });
                return;
            }

            if (error.message?.includes('No hay campos')) {
                res.status(400).json({ success: false, error: error.message });
                return;
            }

            res.status(500).json({
                success: false,
                error: 'Error interno al actualizar la consulta',
                detail: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // =============================================
    // DELETE /api/consultations/:id
    // =============================================
    async deleteConsultation(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            await consultationService.delete(id);

            res.status(200).json({
                success: true,
                message: 'Consulta eliminada exitosamente'
            });

        } catch (error: any) {
            console.error('[ConsultationController] deleteConsultation:', error.message);

            if (error.message?.includes('no encontrada')) {
                res.status(404).json({ success: false, error: error.message });
                return;
            }

            res.status(500).json({
                success: false,
                error: 'Error interno al eliminar la consulta',
                detail: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // =============================================
    // POST /api/consultations/:id/prescriptions
    // =============================================
    async addPrescription(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const {
                medication_name,
                medication_code,
                dosage,
                frequency,
                duration,
                route,
                instructions
            } = req.body;

            // ─── Validaciones ───
            if (!medication_name) {
                res.status(400).json({ success: false, error: 'medication_name es requerido' });
                return;
            }
            if (!dosage) {
                res.status(400).json({ success: false, error: 'dosage es requerido' });
                return;
            }
            if (!frequency) {
                res.status(400).json({ success: false, error: 'frequency es requerido' });
                return;
            }

            const dto: CreatePrescriptionDTO = {
                medication_name,
                medication_code,
                dosage,
                frequency,
                duration,
                route,
                instructions
            };

            const prescription = await consultationService.addPrescription(id, dto);

            res.status(201).json({
                success: true,
                message: 'Medicamento agregado exitosamente',
                data: prescription
            });

        } catch (error: any) {
            console.error('[ConsultationController] addPrescription:', error.message);

            if (error.message?.includes('no encontrada')) {
                res.status(404).json({ success: false, error: error.message });
                return;
            }

            res.status(500).json({
                success: false,
                error: 'Error interno al agregar medicamento',
                detail: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // =============================================
    // POST /api/consultations/:id/lab-orders
    // =============================================
    async addLabOrder(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const {
                exam_name,
                exam_code,
                exam_type,
                priority,
                instructions
            } = req.body;

            // ─── Validaciones ───
            if (!exam_name) {
                res.status(400).json({ success: false, error: 'exam_name es requerido' });
                return;
            }
            if (!exam_code) {
                res.status(400).json({ success: false, error: 'exam_code (código CUPS) es requerido' });
                return;
            }

            const dto: CreateLabOrderDTO = {
                exam_name,
                exam_code,
                exam_type,
                priority,
                instructions
            };

            const labOrder = await consultationService.addLabOrder(id, dto);

            res.status(201).json({
                success: true,
                message: 'Orden de examen agregada exitosamente',
                data: labOrder
            });

        } catch (error: any) {
            console.error('[ConsultationController] addLabOrder:', error.message);

            if (error.message?.includes('no encontrada')) {
                res.status(404).json({ success: false, error: error.message });
                return;
            }

            res.status(500).json({
                success: false,
                error: 'Error interno al agregar orden de examen',
                detail: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // =============================================
    // PATCH /api/consultations/:id/lab-orders/:labOrderId/result
    // =============================================
    async updateLabOrderResult(req: Request, res: Response): Promise<void> {
        try {
            const { labOrderId } = req.params;
            const { result, result_date, status } = req.body;

            // ─── Validaciones ───
            if (!result) {
                res.status(400).json({ success: false, error: 'result es requerido' });
                return;
            }
            if (!status || !['completed', 'cancelled'].includes(status)) {
                res.status(400).json({ success: false, error: 'status debe ser completed o cancelled' });
                return;
            }

            const dto: UpdateLabOrderResultDTO = { result, result_date, status };
            const updated = await consultationService.updateLabOrderResult(labOrderId, dto);

            res.status(200).json({
                success: true,
                message: 'Resultado de examen actualizado',
                data: updated
            });

        } catch (error: any) {
            console.error('[ConsultationController] updateLabOrderResult:', error.message);

            if (error.message?.includes('no encontrado')) {
                res.status(404).json({ success: false, error: error.message });
                return;
            }

            res.status(500).json({
                success: false,
                error: 'Error interno al actualizar resultado de examen',
                detail: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}
