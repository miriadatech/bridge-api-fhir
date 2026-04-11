import { Router } from 'express';
const router = Router();
router.get('/Observation', (req, res) => res.json({ resourceType: 'Bundle', entry: [] }));
router.post('/Observation', (req, res) => res.status(201).json(req.body));
export default router;
