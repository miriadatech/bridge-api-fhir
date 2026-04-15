// src/modules/ehr/patient.controller.ts
import { Request, Response } from 'express';
import { PatientService } from './patient.service';
import { TenantRequest } from '../../middleware/auth.middleware';

const patientService = new PatientService();

export class PatientController {

    async create(req: Request, res: Response): Promise<void> {
        try {
            const tenant = (req as TenantRequest).tenant;
            const { family_name, given_name, identifier_type, identifier_value, gender, birth_date, contact_phone, contact_email } = req.body;

            if (!family_name || !given_name || !identifier_type || !identifier_value) {
                res.status(400).json({
                    success: false,
                    error: 'family_name, given_name, identifier_type e identifier_value son requeridos'
                });
                return;
            }

            const patient = await patientService.create(tenant.id, {
                family_name, given_name, identifier_type, identifier_value,
                gender, birth_date, contact_phone, contact_email
            });

            res.status(201).json({
                success: true,
                message: 'Paciente creado',
                data: patient
            });

        } catch (error: any) {
            console.error('❌ Create patient error:', error);
            res.status(500).json({ success: false, error: 'Error interno' });
        }
    }

    async list(req: Request, res: Response): Promise<void> {
        try {
            const tenant = (req as TenantRequest).tenant;
            const { gender, identifier_type } = req.query;

            const patients = await patientService.list(tenant.id, {
                gender: gender as string,
                identifier_type: identifier_type as string
            });

            res.json({
                success: true,
                count: patients.length,
                data: patients
            });

        } catch (error: any) {
            console.error('❌ List patients error:', error);
            res.status(500).json({ success: false, error: 'Error interno' });
        }
    }

    async getById(req: Request, res: Response): Promise<void> {
        try {
            const tenant = (req as TenantRequest).tenant;
            const { id } = req.params;

            const patient = await patientService.getById(tenant.id, id);

            res.json({
                success: true,
                data: patient
            });

        } catch (error: any) {
            if (error.message === 'PATIENT_NOT_FOUND') {
                res.status(404).json({ success: false, error: 'Paciente no encontrado' });
                return;
            }
            console.error('❌ Get patient error:', error);
            res.status(500).json({ success: false, error: 'Error interno' });
        }
    }

    async update(req: Request, res: Response): Promise<void> {
        try {
            const tenant = (req as TenantRequest).tenant;
            const { id } = req.params;

            const patient = await patientService.update(tenant.id, id, req.body);

            res.json({
                success: true,
                message: 'Paciente actualizado',
                data: patient
            });

        } catch (error: any) {
            if (error.message === 'PATIENT_NOT_FOUND') {
                res.status(404).json({ success: false, error: 'Paciente no encontrado' });
                return;
            }
            console.error('❌ Update patient error:', error);
            res.status(500).json({ success: false, error: 'Error interno' });
        }
    }

    async delete(req: Request, res: Response): Promise<void> {
        try {
            const tenant = (req as TenantRequest).tenant;
            const { id } = req.params;

            const result = await patientService.delete(tenant.id, id);

            res.json({
                success: true,
                message: result.message
            });

        } catch (error: any) {
            if (error.message === 'PATIENT_NOT_FOUND') {
                res.status(404).json({ success: false, error: 'Paciente no encontrado' });
                return;
            }
            console.error('❌ Delete patient error:', error);
            res.status(500).json({ success: false, error: 'Error interno' });
        }
    }
}
