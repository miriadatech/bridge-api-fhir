// src/config/env.ts
// Carga variables de entorno UNA sola vez, antes que cualquier otro módulo.
// Orden: variables del sistema > .env en la raíz > src/.env (compatibilidad).
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'src/.env'),
    path.resolve(__dirname, '../.env'),
];

for (const file of candidates) {
    if (fs.existsSync(file)) dotenv.config({ path: file }); // no sobreescribe variables ya definidas
}

export function requireEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Variable de entorno requerida no definida: ${name}`);
    return v;
}
