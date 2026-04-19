// src/controllers/consultation.controller.ts
import { Request, Response } from 'express';
import { consultationService } from '../services/consultation.service';
import {
    CreateConsultationDTO,
    UpdateConsultationDTO,
    CreatePrescriptionDTO,
    CreateLabOrderDTO,
    UpdateLabOrderDTO
} from '../types/consultation.types';

class ConsultationController {

    // =========================================================================
    // POST /api/ehr/consultations
    // =========================================================================
    async create(req: Request, res: Response): Promise<void> {
        try {
            console.log(req.body)
            const tenantId = (req as any).tenant?.id as string;
            console.log(tenantId)
            if (!tenantId) {
                res.status(401).json({ success: false, error: 'Tenant no autenticado' });
                return;
            }

            const {
                patient_id,
                consultation_type,
                specialty,
                doctor_name,
                doctor_id,
                reason,
                symptoms,
                diagnosis_code,
                diagnosis_desc,
                treatment_plan,
                notes,
                follow_up_date,
                vital_signs,
                prescriptions,
                lab_orders
            } = req.body;

            // Validaciones requeridas
            if (!patient_id) {
                res.status(400).json({ success: false, error: 'patient_id es requerido' });
                return;
            }
            if (!consultation_type) {
                res.status(400).json({ success: false, error: 'consultation_type es requerido' });
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
                res.status(400).json({ success: false, error: 'reason es requerido' });
                return;
            }

            const dto: CreateConsultationDTO = {
                patient_id,
                consultation_type,
                specialty,
                doctor_name,
                doctor_id,
                reason,
                symptoms,
                diagnosis_code,
                diagnosis_desc,
                treatment_plan,
                notes,
                follow_up_date,
                vital_signs,
                prescriptions,
                lab_orders
            };

            const consultation = await consultationService.create(dto, tenantId);

            res.status(201).json({
                success: true,
                message: 'Consulta médica creada exitosamente',
                data: consultation
            });

        } catch (error: any) {
            console.error('[ConsultationController.create]', error.message);

            if (error.message?.includes('no encontrado') ||
                error.message?.includes('no existe')) {
                res.status(404).json({ success: false, error: error.message });
                return;
            }

            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                detail: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // =========================================================================
    // GET /api/ehr/consultations
    // =========================================================================
    async findAll(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = (req as any).tenant?.id as string;

            const consultations = await consultationService.findAll(tenantId);

            res.status(200).json({
                success: true,
                data: consultations,
                total: consultations.length
            });

        } catch (error: any) {
            console.error('[ConsultationController.findAll]', error.message);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                detail: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // =========================================================================
    // GET /api/ehr/consultations/patient/:patientId
    // =========================================================================
    async findByPatient(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = (req as any).tenant?.id as string;
            const { patientId } = req.params;

            const limit = parseInt(req.query.limit as string) || 50;
            const offset = parseInt(req.query.offset as string) || 0;

            const result = await consultationService.findByPatient(
                patientId, tenantId, limit, offset
            );

            res.status(200).json({
                success: true,
                data: result.data,
                total: result.total,
                limit,
                offset
            });

        } catch (error: any) {
            console.error('[ConsultationController.findByPatient]', error.message);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                detail: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // =========================================================================
    // GET /api/ehr/consultations/:id
    // =========================================================================
    async findById(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = (req as any).tenant?.id as string;
            const { id } = req.params;

            const consultation = await consultationService.findById(id, tenantId);
            console.log(consultation);

            res.status(200).json({
                success: true,
                data: consultation
            });

        } catch (error: any) {
            console.error('[ConsultationController.findById]', error.message);

            if (error.message?.includes('no encontrada')) {
                res.status(404).json({ success: false, error: error.message });
                return;
            }

            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                detail: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // =========================================================================
    // PUT /api/ehr/consultations/:id
    // =========================================================================
    async update(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = (req as any).tenant?.id as string;
            const { id } = req.params;

            const {
                reason,
                symptoms,
                diagnosis_code,
                diagnosis_desc,
                treatment_plan,
                notes,
                follow_up_date,
                status,
                vital_signs
            } = req.body;

            const dto: UpdateConsultationDTO = {
                reason,
                symptoms,
                diagnosis_code,
                diagnosis_desc,
                treatment_plan,
                notes,
                follow_up_date,
                status,
                vital_signs
            };

            const consultation = await consultationService.update(id, dto, tenantId);

            res.status(200).json({
                success: true,
                message: 'Consulta actualizada exitosamente',
                data: consultation
            });

        } catch (error: any) {
            console.error('[ConsultationController.update]', error.message);

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
                error: 'Error interno del servidor',
                detail: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // =========================================================================
    // DELETE /api/ehr/consultations/:id
    // =========================================================================
    async delete(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = (req as any).tenant?.id as string;
            const { id } = req.params;

            await consultationService.delete(id, tenantId);

            res.status(200).json({
                success: true,
                message: 'Consulta eliminada exitosamente'
            });

        } catch (error: any) {
            console.error('[ConsultationController.delete]', error.message);

            if (error.message?.includes('no encontrada')) {
                res.status(404).json({ success: false, error: error.message });
                return;
            }

            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                detail: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // =========================================================================
    // POST /api/ehr/consultations/:id/prescriptions
    // =========================================================================
    async addPrescription(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = (req as any).tenant?.id as string;
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

            // Validaciones
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

            const prescription = await consultationService.addPrescription(id, dto, tenantId);

            res.status(201).json({
                success: true,
                message: 'Prescripción agregada exitosamente',
                data: prescription
            });

        } catch (error: any) {
            console.error('[ConsultationController.addPrescription]', error.message);

            if (error.message?.includes('no encontrada')) {
                res.status(404).json({ success: false, error: error.message });
                return;
            }

            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                detail: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // =========================================================================
    // POST /api/ehr/consultations/:id/lab-orders
    // =========================================================================
    async addLabOrder(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = (req as any).tenant?.id as string;
            const { id } = req.params;

            const {
                exam_name,
                exam_code,
                exam_type,
                priority,
                instructions
            } = req.body;

            if (!exam_name) {
                res.status(400).json({ success: false, error: 'exam_name es requerido' });
                return;
            }

            const dto: CreateLabOrderDTO = {
                exam_name,
                exam_code,
                exam_type,
                priority,
                instructions
            };

            const labOrder = await consultationService.addLabOrder(id, dto, tenantId);

            res.status(201).json({
                success: true,
                message: 'Orden de laboratorio agregada exitosamente',
                data: labOrder
            });

        } catch (error: any) {
            console.error('[ConsultationController.addLabOrder]', error.message);

            if (error.message?.includes('no encontrada')) {
                res.status(404).json({ success: false, error: error.message });
                return;
            }

            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                detail: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // =========================================================================
    // PUT /api/ehr/consultations/lab-orders/:labOrderId/result
    // =========================================================================
    async updateLabOrderResult(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = (req as any).tenant?.id as string;
            const { labOrderId } = req.params;

            const { result, result_date, status } = req.body;

            if (!result) {
                res.status(400).json({ success: false, error: 'result es requerido' });
                return;
            }

            const dto: UpdateLabOrderDTO = { result, result_date, status };

            const labOrder = await consultationService.updateLabOrderResult(
                labOrderId, dto, tenantId
            );

            res.status(200).json({
                success: true,
                message: 'Resultado de laboratorio actualizado exitosamente',
                data: labOrder
            });

        } catch (error: any) {
            console.error('[ConsultationController.updateLabOrderResult]', error.message);

            if (error.message?.includes('no encontrada')) {
                res.status(404).json({ success: false, error: error.message });
                return;
            }

            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                detail: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // =========================================================================
    // POST /api/ehr/consultations/:id/sync
    // =========================================================================
    async syncToMinistry(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = (req as any).tenant?.id as string;
            const { id } = req.params;
            const mode = (req.body.mode ?? 'sandbox') as 'sandbox' | 'strict';

            if (mode !== 'sandbox' && mode !== 'strict') {
                res.status(400).json({
                    success: false,
                    error: 'mode debe ser "sandbox" o "strict"'
                });
                return;
            }

            const result = await consultationService.syncToMinistry(id, tenantId, mode);

            res.status(200).json({
                success: true,
                message: mode === 'sandbox'
                    ? 'FHIR Bundle generado en modo sandbox'
                    : 'Consulta sincronizada con MinSalud',
                data: result
            });

        } catch (error: any) {
            console.error('[ConsultationController.syncToMinistry]', error.message);

            if (error.message?.includes('no encontrada')) {
                res.status(404).json({ success: false, error: error.message });
                return;
            }

            res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                detail: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

export const consultationController = new ConsultationController();
