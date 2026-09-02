// routes/index.js — Agrupador de rotas da API
const express = require('express');
const db = require('../config/db');
const authRoutes = require('./auth.routes');
const categoriaRoutes = require('./categoria.routes');
const produtoRoutes = require('./produto.routes');
const movimentacaoRoutes = require('./movimentacao.routes');
const whatsappRoutes = require('./whatsapp.routes');
const pedidoCompraRoutes = require('./pedidoCompra.routes');
const fornecedorRoutes = require('./fornecedor.routes');
const transferenciaRoutes = require('./transferencia.routes');
const devolucaoRoutes = require('./devolucao.routes');
const estoqueRedeRoutes = require('./estoqueRede.routes');
const comunicacaoRoutes = require('./comunicacao.routes');
const rotinaRoutes = require('./rotina.routes');
const salesRoutes = require('./sales.routes');
const router = express.Router();

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
      database: 'disconnected',
      message: error.message,
    });
  }
});

router.use('/auth', authRoutes);
router.use('/categorias', categoriaRoutes);
router.use('/produtos', produtoRoutes);
router.use('/movimentacoes', movimentacaoRoutes);

// Webhook do WhatsApp
router.use('/whatsapp', whatsappRoutes);
router.use('/pedidos-compra', pedidoCompraRoutes);
router.use('/fornecedores', fornecedorRoutes);
router.use('/transferencias', transferenciaRoutes);
router.use('/devolucoes', devolucaoRoutes);
router.use('/estoque-rede', estoqueRedeRoutes);
router.use('/comunicacao', comunicacaoRoutes);
router.use('/rotinas', rotinaRoutes);
router.use('/sales', salesRoutes);
module.exports = router;