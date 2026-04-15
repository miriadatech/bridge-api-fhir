import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import patientRoutes from './routes/patient.routes';
import consultationRoutes from './routes/consultation.routes';
import authRoutes from './modules/auth/auth.routes';
import { authMiddleware } from './middleware/auth.middleware';

const app = express();

// Middlewares globales
app.use(helmet());
app.use(cors());
app.use(express.json());

// ============================================
// Health check (SIN autenticación)
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'bridge-api-fhir',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    ministry_mode: process.env.MINISTRY_MODE || 'sandbox'
  });
});

// ============================================
// RUTAS SIN AUTENTICACIÓN
// ============================================
app.use('/api/auth', authRoutes);  // ✅ Login, Register

// ============================================
// RUTAS CON AUTENTICACIÓN (protegidas)
// ============================================
app.use('/api/ehr/patients', authMiddleware, patientRoutes);
app.use('/api/ehr/consultations', authMiddleware, consultationRoutes);

// ============================================
// Error handler global
// ============================================
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Error interno del servidor'
  });
});

export default app;
