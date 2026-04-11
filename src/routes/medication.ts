import { Router } from 'express';
const router = Router();
router.get('/Medication', (req, res) => res.json({ resourceType: 'Bundle', entry: [] }));
router.post('/Medication', (req, res) => res.status(201).json(req.body));
export default router;
