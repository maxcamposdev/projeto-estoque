// config/db.js — Pool de conexões PostgreSQL
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Teste rápido de conexão no boot
pool.query('SELECT NOW()').then(() => {
  console.log('🗄️  PostgreSQL conectado com sucesso!');
}).catch((err) => {
  console.error('❌ Erro ao conectar no PostgreSQL:', err.message);
});

module.exports = pool;