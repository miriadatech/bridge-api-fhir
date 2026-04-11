import { Router } from 'express';
import { PatientController } from '../controllers/patient.controller';

const router = Router();
const controller = new PatientController();

// ─── RUTAS ────────────────────────────────────────────────────────────
// GET    /api/patients                        → Listar con paginación
// POST   /api/patients                        → Crear paciente
// GET    /api/patients/:id                    → Obtener por UUID
// PUT    /api/patients/:id                    → Actualizar
// DELETE /api/patients/:id                    → Soft delete
// GET    /api/patients/identifier/:type/:value → Buscar por documento
// POST   /api/patients/:id/sync               → Sincronizar con Ministerio

router.get('/', (req, res) => controller.list(req, res));
router.post('/', (req, res) => controller.create(req, res));
router.get('/:id', (req, res) => controller.getById(req, res));
router.put('/:id', (req, res) => controller.update(req, res));
router.delete('/:id', (req, res) => controller.delete(req, res));
router.get('/identifier/:type/:value', (req, res) => controller.getByIdentifier(req, res));
router.post('/:id/sync', (req, res) => controller.sync(req, res));

export default router;
