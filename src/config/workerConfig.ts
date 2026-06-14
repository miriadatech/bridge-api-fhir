// src/config/workerConfig.ts
// Configuración centralizada del Worker de envío al Ministerio
import dotenv from 'dotenv';
import path from 'path';

// Cargar .env desde src/.env (igual que el resto del proyecto)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const workerConfig = {
  // Intervalo en segundos entre cada ejecución del worker
  intervalSeconds: parseInt(process.env.WORKER_INTERVAL_SECONDS ?? '60', 10),

  // Número máximo de intentos antes de marcar como ERROR permanente
  maxIntentos: parseInt(process.env.WORKER_MAX_INTENTOS ?? '5', 10),

  // Timeout de peticiones HTTP al Ministerio (ms)
  timeoutAxiosMs: parseInt(process.env.WORKER_HTTP_TIMEOUT_MS ?? '30000', 10),

  // Margen de renovación anticipada del token OAuth (segundos antes de expirar)
  tokenRefreshMarginSeconds: 60,

  // Máximo de registros a procesar por ciclo (evita ciclos muy largos)
  maxRegistrosPorCiclo: parseInt(process.env.WORKER_MAX_BATCH ?? '100', 10),

  // Base de datos
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    user: process.env.DB_USER ?? 'emrodino',
    password: process.env.DB_PASSWORD ?? 'Isys##2021',
    database: process.env.DB_NAME ?? 'SSH7Fhire',
    // Pool separado y más pequeño que el del servidor Express
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  },
} as const;

export default workerConfig;
