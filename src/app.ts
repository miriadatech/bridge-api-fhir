import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import patientRoutes from './routes/patient.routes';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'bridge-api-fhir',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// ✅ FIX: montar en '/api/patients' para que el router use '/' y '/:id'
app.use('/api/patients', patientRoutes);

// 404 handler
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`❌ Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    status: 404,
    message: 'Ruta no encontrada'
  });
});

export default app;
