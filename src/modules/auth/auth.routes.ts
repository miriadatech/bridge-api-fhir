import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();
const ctrl = new AuthController();

// Rutas PÚBLICAS (sin API Key)
router.post('/register', ctrl.register.bind(ctrl));

// Rutas PROTEGIDAS (requieren x-api-key)
router.post('/regenerate-key', authMiddleware, ctrl.regenerateKey.bind(ctrl));
router.put('/ministry-credentials', authMiddleware, ctrl.saveMinistryCredentials.bind(ctrl));
router.get('/profile', authMiddleware, ctrl.getProfile.bind(ctrl));

export default router;
