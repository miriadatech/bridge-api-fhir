// scripts/check-db.js — verifica a qué base se conecta y si la migración 002 está aplicada.
// Uso: npm run check-db
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

const root = path.resolve(__dirname, '..');
const loaded = [];
for (const f of [path.join(root, '.env'), path.join(root, 'src', '.env')]) {
  if (fs.existsSync(f)) { dotenv.config({ path: f }); loaded.push(path.relative(root, f)); }
}

const EXPECTED = {
  clientes: ['codigo_habilitacion', 'email', 'telefono', 'api_key_created_at', 'ministry_tenant_id',
             'ministry_api_murl', 'ministry_api_msubs_key', 'created_at', 'updated_at'],
  interoperabilidad_recibida: ['http_status'],
};
const INDEXES = ['ux_clientes_email', 'ux_interop_ips_evento', 'ix_interop_estado_fecha', 'ix_interop_ips_fecha'];

(async () => {
  console.log(`Archivos .env cargados: ${loaded.join(', ') || '(ninguno)'}`);
  const c = new Client({
    host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
  });
  await c.connect();
  const info = await c.query('SELECT current_database() db, current_user usr, current_schema() sch, inet_server_port() port');
  console.log(`Conectado a BD="${info.rows[0].db}" usuario="${info.rows[0].usr}" esquema="${info.rows[0].sch}" puerto=${info.rows[0].port}\n`);

  let pendientes = 0;
  for (const [table, cols] of Object.entries(EXPECTED)) {
    const t = await c.query(`SELECT table_schema FROM information_schema.tables WHERE table_name = $1`, [table]);
    if (!t.rows.length) { console.log(`❌ Tabla ${table}: NO existe`); pendientes++; continue; }
    console.log(`Tabla ${table} (esquema ${t.rows.map(r => r.table_schema).join(', ')})`);
    const r = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [table]);
    const have = new Set(r.rows.map(x => x.column_name));
    for (const col of cols) {
      console.log(`  ${have.has(col) ? '✅' : '❌'} ${col}`);
      if (!have.has(col)) pendientes++;
    }
  }
  const ix = await c.query(`SELECT indexname FROM pg_indexes WHERE indexname = ANY($1)`, [INDEXES]);
  const haveIx = new Set(ix.rows.map(x => x.indexname));
  console.log('Índices');
  for (const i of INDEXES) { console.log(`  ${haveIx.has(i) ? '✅' : '❌'} ${i}`); if (!haveIx.has(i)) pendientes++; }

  const cl = await c.query(`SELECT to_jsonb(x) j FROM clientes x ORDER BY 1 LIMIT 50`).catch(() => ({ rows: [] }));
  if (cl.rows.length) {
    console.log('\nClientes (codigo_habilitacion es el que se usará como custodian):');
    for (const { j } of cl.rows) console.log(`  ${j.id} | ${j.nombre} | NIT ${j.nit ?? '-'} | codigo_habilitacion=${j.codigo_habilitacion ?? '⚠️ VACÍO'}`);
  }
  console.log(pendientes ? `\n⚠️ Faltan ${pendientes} elementos: ejecute "npm run migrate" contra ESTA base.` : '\n✅ La migración 002 está aplicada en esta base.');
  await c.end();
})().catch(e => { console.error('❌', e.message); process.exit(1); });
