// src/app.ts
import './config/env';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import patientRoutes from './routes/patient.routes';
import consultationRoutes from './routes/consultation.routes';
import authRoutes from './modules/auth/auth.routes';
import { authMiddleware } from './middleware/auth.middleware';
import rdaRoutes from './routes/rda.routes';
import rdaAmbulatoryRoutes from './routes/rdaAmbulatory.routes';
import rdaUnifiedRoutes from './routes/rdaUnified.routes';
import familyHistoryRoutes from './routes/family-history.routes';

const app = express();

app.use(helmet());
app.use(cors());
// Los RDA pueden traer la epicrisis en PDF base64 (límite del Ministerio ~5 MB)
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT ?? '10mb', type: ['application/json', 'application/fhir+json'] }));

// ── Health check (sin autenticación) ─────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    service: 'bridge-api-fhir',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ── Rutas sin autenticación ──────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ── RDA (API principal) ──────────────────────────────────────────────────────
app.use('/api/rda', authMiddleware, rdaUnifiedRoutes);

// ── Rutas EHR / legado (protegidas) ─────────────────────────────────────────
app.use('/api/ehr/patients', authMiddleware, patientRoutes);
app.use('/api/ehr/consultations', authMiddleware, consultationRoutes);
app.use('/api/ehr/rda/ambulatory', authMiddleware, rdaAmbulatoryRoutes);
app.use('/api/ehr/rda', authMiddleware, rdaRoutes);
app.use('/api/ehr/patients/:patientId/family-history', authMiddleware, familyHistoryRoutes);

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// ── Error handler global (incluye JSON mal formado) ─────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ success: false, error: 'JSON mal formado', detalle: err.message });
    return;
  }
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ success: false, error: 'El body excede el tamaño máximo permitido' });
    return;
  }
  console.error('Error:', err);
  res.status(err.status || 500).json({ success: false, error: err.message || 'Error interno del servidor' });
});

export default app;
