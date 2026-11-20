// src/config/database.ts
// Pool único de PostgreSQL para la API (el worker crea el suyo con workerConfig).
// Las credenciales se leen SOLO de variables de entorno (.env); no hay valores por defecto sensibles.
import './env';
import { Pool } from 'pg';

const pool = new Pool({
    host: process.env.DB_HOST ?? 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    max: parseInt(process.env.DB_POOL_MAX ?? '20', 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
    console.error('❌ PostgreSQL pool error:', err.message);
});

export default pool;
