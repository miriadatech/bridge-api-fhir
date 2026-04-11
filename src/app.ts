import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import patientRoutes from './routes/patient.routes';
import consultationRoutes from './routes/consultation.routes'; // 👈 ¿Falta esta línea?
import authRoutes from './modules/auth/auth.routes';
import { authMiddleware } from './middleware/auth.middleware';


const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'bridge-api-fhir',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    ministry_mode: process.env.MINISTRY_MODE || 'sandbox'
  });
});

// Rutas
app.use('/auth', authRoutes);
app.use('/api/patients', authMiddleware, patientRoutes);
app.use('/api/consultations', authMiddleware, consultationRoutes); // 👈 ¿Falta esta línea?

// Error handler global
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Error interno del servidor'
  });
});

export default app;
