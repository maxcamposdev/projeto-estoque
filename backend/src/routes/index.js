// routes/index.js — Agrupador de rotas da API
const express = require('express');
const db = require('../config/db');
const authRoutes = require('./auth.routes');
const router = express.Router();

// Rota de verificação de vida da API (health check)
router.get('/health', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT NOW() AS agora, version() AS versao');
    res.json({
      success: true,
      status: 'ok',
      service: 'controle-estoque-api',
      version: '1.0.0',
      database: 'connected',
      dbTime: rows[0].agora,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'error',
      service: 'controle-estoque-api',
      database: 'disconnected',
      message: error.message,
    });
  }
});

// Rotas de autenticação
router.use('/auth', authRoutes);

module.exports = router;