import { Router } from 'express';
const router = Router();
router.get('/Procedure', (req, res) => res.json({ resourceType: 'Bundle', entry: [] }));
router.post('/Procedure', (req, res) => res.status(201).json(req.body));
export default router;
