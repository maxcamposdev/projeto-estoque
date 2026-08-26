// server.js — Entrada da API
require('dotenv').config();

const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 API de Controle de Estoque rodando em http://localhost:${PORT}`);
});