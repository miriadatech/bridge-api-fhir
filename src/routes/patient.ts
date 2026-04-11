import { Router } from 'express';
import { PatientController } from '../controllers/PatientController';

const router = Router();
router.get('/Patient', PatientController.list);
router.post('/Patient', PatientController.create);
router.get('/Patient/:id', PatientController.read);
router.put('/Patient/:id', PatientController.update);
router.delete('/Patient/:id', PatientController.delete);

export default router;
