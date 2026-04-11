import { Request, Response } from 'express';
import { PatientService } from '../services/PatientService';
import { Patient } from '../models/Patient';

export class PatientController {
  static async list(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query._count as string) || 20;
      const offset = parseInt(req.query._offset as string) || 0;
      const patients = await PatientService.getAllPatients(limit, offset);
      res.json({ resourceType: 'Bundle', type: 'searchset', total: patients.length, entry: patients.map((p: any) => ({ resource: p })) });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async read(req: Request, res: Response) {
    try {
      const patient = await PatientService.getPatientById(req.params.id);
      res.json(patient);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const patient = await PatientService.createPatient(req.body);
      res.status(201).json(patient);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const patient = await PatientService.updatePatient(req.params.id, req.body);
      res.json(patient);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await PatientService.deletePatient(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
