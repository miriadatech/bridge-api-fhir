// src/config/database.ts
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  user: process.env.DB_USER ?? 'emrodino',
  password: process.env.DB_PASSWORD ?? 'Isys##2021',
  database: process.env.DB_NAME ?? 'SSOperabilidad',
  port: parseInt(process.env.DB_PORT ?? '5432'),
  // Pool sizing para producción
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err);
});

export default pool;
