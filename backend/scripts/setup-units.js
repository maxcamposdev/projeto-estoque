const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  await client.connect();
  await client.query("CREATE TABLE IF NOT EXISTS units (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, code VARCHAR(20), address TEXT, phone VARCHAR(20), active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW())");
  await client.query("INSERT INTO units (name, code, address) VALUES ('Loja Centro','L01','Rua 100'),('Loja Norte','L02','Av 200'),('Loja Sul','L03','Av 300'),('Loja Leste','L04','Rua 400') ON CONFLICT DO NOTHING");
  const r = await client.query("SELECT id, name FROM units ORDER BY id");
  console.log("Units criadas:", r.rows);
  await client.end();
})().catch(e => { console.error("Erro:", e.message); process.exit(1); });
