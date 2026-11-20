// src/db/index.ts
// Compatibilidad: antes existía un segundo pool apuntando a otra base de datos
// (SSOperabilidad) con credenciales hardcodeadas. Ahora todo usa el mismo pool.
import pool from '../config/database';

export { pool };
export default pool;
