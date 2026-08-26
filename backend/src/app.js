// app.js — Configuração do Express
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandlers');

const app = express();

// Segurança básica
app.use(helmet());
app.use(cors({ origin: process.env.WEB_URL || '*', credentials: true }));

// Parse de JSON (limite 10mb, útil para fotos em base64 no futuro)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rotas da API
app.use('/api', routes);

// Health check simples na raiz
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'API Controle de Estoque — Projeto 04' });
});

// 404 e tratamento de erros (SEMPRE por último)
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;