const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  await client.connect();
  await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES units(id)");
  console.log("Coluna unit_id adicionada!");
  const r = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position");
  console.log("Colunas:", r.rows.map(x => x.column_name));
  await client.end();
})().catch(e => { console.error("Erro:", e.message); process.exit(1); });
