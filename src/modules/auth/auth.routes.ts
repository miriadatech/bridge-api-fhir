// src/routes/auth.routes.ts
import { Router, Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

// 🟢 RUTAS PÚBLICAS
router.post('/register', (req: Request, res: Response) =>
    authController.register(req, res)
);

// 🔴 RUTAS PROTEGIDAS (requieren x-api-key)
router.post('/regenerate-key', authMiddleware, (req: Request, res: Response) =>
    authController.regenerateKey(req, res)
);

router.put('/ministry-credentials', authMiddleware, (req: Request, res: Response) =>
    authController.saveMinistryCredentials(req, res)
);

router.get('/profile', authMiddleware, (req: Request, res: Response) =>
    authController.getProfile(req, res)
);

export default router;
