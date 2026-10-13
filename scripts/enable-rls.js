const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function enableRLS() {
  const envPath = path.resolve(__dirname, '../.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/DATABASE_URL=(.+)/);
  const client = new Client({ connectionString: match[1].trim(), ssl: { rejectUnauthorized: false } });

  await client.connect();
  const tables = ['vendedores', 'rifas', 'numeros', 'sesiones_bot'];
  for (const t of tables) {
    await client.query(`ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY;`);
    console.log(`RLS habilitado exitosamente en: ${t}`);
  }
  await client.end();
}

enableRLS().catch(err => {
  console.error('Error habilitando RLS:', err);
  process.exit(1);
});
