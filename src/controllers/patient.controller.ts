import { Request, Response } from 'express';
import { PatientService } from '../services/patient.service';

const service = new PatientService();

export class PatientController {

    async create(req: Request, res: Response) {
        try {
            const patient = await service.createPatient(req.body);
            res.status(201).json({ success: true, data: patient });
        } catch (error: any) {
            res.status(error.status || 500).json({
                success: false,
                message: error.message || 'Error interno del servidor',
                detail: error.detail || undefined
            });
        }
    }

    async getById(req: Request, res: Response) {
        try {
            const patient = await service.getPatientById(req.params.id);
            res.json({ success: true, data: patient });
        } catch (error: any) {
            res.status(error.status || 500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getByIdentifier(req: Request, res: Response) {
        try {
            const { type, value } = req.params;
            const patient = await service.getPatientByIdentifier(type, value);
            res.json({ success: true, data: patient });
        } catch (error: any) {
            res.status(error.status || 500).json({
                success: false,
                message: error.message
            });
        }
    }

    async list(req: Request, res: Response) {
        try {
            const { search, page, limit } = req.query;
            const result = await service.listPatients({
                search: search as string,
                page: page ? parseInt(page as string) : 1,
                limit: limit ? parseInt(limit as string) : 20
            });
            res.json({ success: true, ...result });
        } catch (error: any) {
            res.status(error.status || 500).json({
                success: false,
                message: error.message
            });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const patient = await service.updatePatient(req.params.id, req.body);
            res.json({ success: true, data: patient });
        } catch (error: any) {
            res.status(error.status || 500).json({
                success: false,
                message: error.message
            });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const result = await service.deletePatient(req.params.id);
            res.json({ success: true, ...result });
        } catch (error: any) {
            res.status(error.status || 500).json({
                success: false,
                message: error.message
            });
        }
    }

    async sync(req: Request, res: Response) {
        try {
            const result = await service.syncWithMinistry(req.params.id);
            res.json({ success: true, ...result });
        } catch (error: any) {
            res.status(error.status || 500).json({
                success: false,
                message: error.message,
                detail: error.detail || undefined
            });
        }
    }
}
