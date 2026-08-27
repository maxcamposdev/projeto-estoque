// app.js — Configuração do Express
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandlers');

const app = express();

// Segurança básica
app.use(helmet());
app.use(cors({ origin: process.env.WEB_URL || '*', credentials: true }));

// Parse de JSON com captura do corpo cru (para assinatura do webhook WhatsApp)
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: true }));

// Swagger — documentação da API
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Gestão de estoque para sua empresa — API Docs',
}));

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