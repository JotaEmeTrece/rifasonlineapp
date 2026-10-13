const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/DATABASE_URL=(.+)/);
const client = new Client({ connectionString: match[1].trim(), ssl: { rejectUnauthorized: false } });

async function test() {
  await client.connect();
  console.log('--- TEST INICIADO ---');

  // 1. Insertar vendedor de prueba
  const v = await client.query(
    "INSERT INTO vendedores (nombre, telefono_bot, nequi_numero, nequi_titular) VALUES ($1, $2, $3, $4) RETURNING id",
    ['Vendedor Demo', '573001234567', '3001234567', 'Demo Titular']
  );
  const vId = v.rows[0].id;
  console.log('1. Vendedor creado ID:', vId);

  // 2. Crear rifa con sus 100 números usando la función de Supabase
  const r = await client.query('SELECT crear_rifa_con_numeros($1) as rifa_id', [vId]);
  const rId = r.rows[0].rifa_id;
  console.log('2. Rifa creada ID:', rId);

  // 3. Contar números creados
  const c = await client.query("SELECT count(*) as total, count(*) filter (where estado = 'available') as disponibles FROM numeros WHERE rifa_id = $1", [rId]);
  console.log('3. Conteo de números:', c.rows[0]);

  // 4. Probar reserva atómica de dos números: 07 y 47
  const res = await client.query('SELECT reservar_numeros_atomica($1, $2, $3, $4) as resultado', [
    rId,
    ['07', '47'],
    '573019998877',
    'Juan Perez'
  ]);
  console.log('4. Reserva exitosa de 07 y 47:', res.rows[0].resultado);

  // 5. Probar intento de conflicto: reservar de nuevo el 47
  const conf = await client.query('SELECT reservar_numeros_atomica($1, $2, $3, $4) as resultado', [
    rId,
    ['47', '88'],
    '573021112233',
    'Carlos Gomez'
  ]);
  console.log('5. Conflicto prevenido (47 ocupado):', conf.rows[0].resultado);

  // 6. Limpieza de datos de prueba
  await client.query('DELETE FROM vendedores WHERE id = $1', [vId]);
  console.log('6. Limpieza completada con éxito.');
  await client.end();
}

test().catch(err => { console.error('TEST_ERROR:', err); process.exit(1); });
