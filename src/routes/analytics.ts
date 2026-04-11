import { Router } from 'express';
const router = Router();
router.get('/metrics', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));
router.get('/patients', (req, res) => res.json({ total: 0, active: 0 }));
export default router;
