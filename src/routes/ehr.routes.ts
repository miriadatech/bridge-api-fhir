// src/routes/ehr.routes.ts
import { Router, Request, Response } from 'express';
import { PatientController } from '../modules/ehr/patient.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const patientController = new PatientController();

// 🔴 TODAS LAS RUTAS EHR REQUIEREN x-api-key

// Pacientes
router.post('/patients', authMiddleware, (req: Request, res: Response) =>
    patientController.create(req, res)
);

router.get('/patients', authMiddleware, (req: Request, res: Response) =>
    patientController.list(req, res)
);

router.get('/patients/:id', authMiddleware, (req: Request, res: Response) =>
    patientController.getById(req, res)
);

router.put('/patients/:id', authMiddleware, (req: Request, res: Response) =>
    patientController.update(req, res)
);

router.delete('/patients/:id', authMiddleware, (req: Request, res: Response) =>
    patientController.delete(req, res)
);

export default router;
