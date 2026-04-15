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

export class ConsultationController {

    // =========================================================================
    // POST /api/consultations
    // =========================================================================
    async createConsultation(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = (req as any).tenantId as string;

            const {
                patient_id, reason_for_visit, chief_complaint,
                assessment, plan, status
            } = req.body;

            if (!patient_id) {
                res.status(400).json({ success: false, error: 'patient_id es requerido' });
                return;
            }
            if (!reason_for_visit) {
                res.status(400).json({ success: false, error: 'reason_for_visit es requerido' });
                return;
            }

            const dto: CreateConsultationDTO = {
                patient_id, reason_for_visit, chief_complaint,
                assessment, plan, status
            };

            const consultation = await consultationService.create(dto, tenantId);

            res.status(201).json({
                success: true,
                message: 'Consulta creada exitosamente',
                data: consultation
            });

        } catch (error: any) {
            console.error('[createConsultation]', error.message);
            res.status(500).json({
                success: false,
                error: 'Error interno al crear la consulta',
                detail: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // =========================================================================
    // GET /api/consultations/:id
    // =========================================================================
    async getConsultation(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = (req as any).tenantId as string;
            const { id } = req.params;

            const consultation = await consultationService.findById(id, tenantId);

            res.status(200).json({ success: true, data: consultation });

        } catch (error: any) {
            console.error('[getConsultation]', error.message);

            if (error.message?.includes('no encontrada')) {
                res.status(404).json({ success: false, error: error.message });
                return;
            }

            res.status(500).json({ success: false, error: 'Error interno' });
        }
    }

    // =========================================================================
    // GET /api/consultations/patient/:patientId
    // =========================================================================
    async getPatientConsultations(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = (req as any).tenantId as string;
            const { patientId } = req.params;
            const limit = parseInt(req.query.limit as string) || 50;
            const offset = parseInt(req.query.offset as string) || 0;

            const result = await consultationService.findByPatient(patientId, tenantId, limit, offset);

            res.status(200).json({
                success: true,
                data: result.data,
                pagination: { total: result.total, limit, offset }
            });

        } catch (error: any) {
            console.error('[getPatientConsultations]', error.message);
            res.status(500).json({ success: false, error: 'Error interno' });
        }
    }

    // =========================================================================
    // PUT /api/consultations/:id
    // =========================================================================
    async updateConsultation(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = (req as any).tenantId as string;
            const { id } = req.params;

            const { assessment, plan, status } = req.body;
            const dto: UpdateConsultationDTO = { assessment, plan, status };

            const updated = await consultationService.update(id, dto, tenantId);

            res.status(200).json({
                success: true,
                message: 'Consulta actualizada exitosamente',
                data: updated
            });

        } catch (error: any) {
            console.error('[updateConsultation]', error.message);

            if (error.message?.includes('no encontrada')) {
                res.status(404).json({ success: false, error: error.message });
                return;
            }
            if (error.message?.includes('No hay campos')) {
                res.status(400).json({ success: false, error: error.message });
                return;
            }

            res.status(500).json({ success: false, error: 'Error interno' });
        }
    }

    // =========================================================================
    // DELETE /api/consultations/:id
    // =========================================================================
    async deleteConsultation(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = (req as any).tenantId as string;
            const { id } = req.params;

            await consultationService.delete(id, tenantId);

            res.status(200).json({ success: true, message: 'Consulta eliminada exitosamente' });

        } catch (error: any) {
            console.error('[deleteConsultation]', error.message);

            if (error.message?.includes('no encontrada')) {
                res.status(404).json({ success: false, error: error.message });
                return;
            }

            res.status(500).json({ success: false, error: 'Error interno' });
        }
    }

    // =========================================================================
    // POST /api/consultations/:id/prescriptions
    // =========================================================================
    async addPrescription(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = (req as any).tenantId as string;
            const { id } = req.params;

            const {
                medication_display, medication_code,
                dosage, frequency, route, duration_days, instructions
            } = req.body;

            if (!medication_display) {
                res.status(400).json({ success: false, error: 'medication_display es requerido' });
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
                consultation_id: id,
                medication_display, medication_code,
                dosage, frequency, route, duration_days, instructions
            };

            const prescription = await consultationService.addPrescription(id, dto, tenantId);

            res.status(201).json({
                success: true,
                message: 'Prescripción agregada exitosamente',
                data: prescription
            });

        } catch (error: any) {
            console.error('[addPrescription]', error.message);

            if (error.message?.includes('no encontrada')) {
                res.status(404).json({ success: false, error: error.message });
                return;
            }

            res.status(500).json({ success: false, error: 'Error interno' });
        }
    }

    // =========================================================================
    // POST /api/consultations/:id/lab-orders
    // =========================================================================
    async addLabOrder(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = (req as any).tenantId as string;
            const { id } = req.params;

            const { code, display, specimen_type } = req.body;

            if (!code) {
                res.status(400).json({ success: false, error: 'code (CUPS) es requerido' });
                return;
            }
            if (!display) {
                res.status(400).json({ success: false, error: 'display es requerido' });
                return;
            }

            const dto: CreateLabOrderDTO = {
                consultation_id: id,
                code, display, specimen_type
            };

            const labOrder = await consultationService.addLabOrder(id, dto, tenantId);

            res.status(201).json({
                success: true,
                message: 'Orden de laboratorio agregada exitosamente',
                data: labOrder
            });

        } catch (error: any) {
            console.error('[addLabOrder]', error.message);

            if (error.message?.includes('no encontrada')) {
                res.status(404).json({ success: false, error: error.message });
                return;
            }

            res.status(500).json({ success: false, error: 'Error interno' });
        }
    }

    // =========================================================================
    // PATCH /api/consultations/:id/lab-orders/:labOrderId/result
    // =========================================================================
    async updateLabOrderResult(req: Request, res: Response): Promise<void> {
        try {
            const tenantId = (req as any).tenantId as string;
            const { labOrderId } = req.params;
            const { result, result_date, status } = req.body;

            if (!result) {
                res.status(400).json({ success: false, error: 'result es requerido' });
                return;
            }

            const dto: UpdateLabOrderDTO = { result, result_date, status };
            const updated = await consultationService.updateLabOrderResult(labOrderId, dto, tenantId);

            res.status(200).json({
                success: true,
                message: 'Resultado actualizado exitosamente',
                data: updated
            });

        } catch (error: any) {
            console.error('[updateLabOrderResult]', error.message);

            if (error.message?.includes('no encontrada')) {
                res.status(404).json({ success: false, error: error.message });
                return;
            }

            res.status(500).json({ success: false, error: 'Error interno' });
        }
    }
}
