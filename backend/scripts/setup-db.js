// scripts/setup-db.js — Cria as tabelas no banco (rodar apenas 1x)
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function setup() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'src', 'config', 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('✅ Tabelas criadas com sucesso!');
  const { rows } = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  console.log('📋 Tabelas existentes:', rows.map((r) => r.table_name).join(', '));
}

setup()
  .catch((err) => { console.error('❌ Erro ao criar tabelas:', err.message); process.exit(1); })
  .finally(() => pool.end());