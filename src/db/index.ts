import { Pool } from 'pg';

export const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'SSOperabilidad',
    user: process.env.DB_USER || 'emrodino',
    password: process.env.DB_PASSWORD || 'Isys##2021',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
    console.error('❌ PostgreSQL Pool Error:', err);
});
