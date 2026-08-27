// server.js — Entrada da API
require('dotenv').config();

// Validação de variáveis de ambiente obrigatórias (segurança)
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`❌ Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}`);
  console.error('   Copie .env.example para .env e preencha os valores.');
  process.exit(1);
}

const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 API de Controle de Estoque rodando em http://localhost:${PORT}`);
});