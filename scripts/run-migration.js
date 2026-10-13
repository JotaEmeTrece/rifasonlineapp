const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('No se encontró .env.local');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/DATABASE_URL=(.+)/);
  if (!match) {
    console.error('No se encontró DATABASE_URL en .env.local');
    process.exit(1);
  }

  const connectionString = match[1].trim();
  const sqlPath = path.resolve(__dirname, '../supabase/migrations/001_initial_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('[MIGRATION] Conectando a Supabase PostgreSQL...');
    await client.connect();

    console.log('[MIGRATION] Ejecutando migración 001_initial_schema.sql...');
    await client.query(sql);

    console.log('[MIGRATION] Verificando tablas creadas...');
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('[MIGRATION] Tablas en la base de datos:');
    res.rows.forEach(r => console.log('  - ' + r.table_name));

    console.log('[MIGRATION] ¡Migración completada con éxito!');
  } catch (err) {
    console.error('[MIGRATION_ERROR]:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
