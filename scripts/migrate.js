// scripts/migrate.js
// Ejecuta migraciones SQL usando la conexión del .env (no requiere psql instalado).
// Uso:  npm run migrate                      → corre 002_interoperabilidad_rda.sql
//       npm run migrate -- 003_otra.sql      → corre el archivo indicado
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

const root = path.resolve(__dirname, '..');
for (const f of [path.join(root, '.env'), path.join(root, 'src', '.env')]) {
  if (fs.existsSync(f)) dotenv.config({ path: f });
}

const files = process.argv.slice(2).length ? process.argv.slice(2) : ['002_interoperabilidad_rda.sql'];

(async () => {
  const missing = ['DB_USER', 'DB_PASSWORD', 'DB_NAME'].filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`❌ Faltan variables en .env: ${missing.join(', ')}`);
    process.exit(1);
  }
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    await client.connect();
    console.log(`🔌 Conectado a ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`);
    for (const name of files) {
      const file = path.isAbsolute(name) ? name : path.join(root, 'database', 'migrations', name);
      const sql = fs.readFileSync(file, 'utf8');
      console.log(`▶ Ejecutando ${path.basename(file)} …`);
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log(`✅ ${path.basename(file)} aplicada`);
    }
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* sin transacción */ }
    console.error(`❌ Error: ${err.message}`);
    if (err.code === '42501') console.error('   El usuario no tiene permisos (p. ej. CREATE EXTENSION pgcrypto). Ejecútala con un usuario administrador.');
    if (err.code === '23505') console.error('   Hay filas duplicadas (ips_id, uuid_evento) en interoperabilidad_recibida; depúrelas antes.');
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
})();
