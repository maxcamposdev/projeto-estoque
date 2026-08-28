// routes/sales.routes.js — Caixa + Vendas + Relatórios
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const c = require('../controllers/salesController');

router.use(auth);

// Caixa
router.post('/caixa/abrir', c.abrirCaixa);
router.post('/caixa/:id/fechar', c.fecharCaixa);
router.get('/caixa/atual', c.meuCaixaAtual);

// Vendas
router.post('/vendas', c.criarVenda);
router.get('/vendas', c.listarVendas);
router.patch('/vendas/:id/cancelar', c.cancelarVenda);

// Relatórios
router.get('/relatorios/por-operador', c.relatorioPorOperador);
router.get('/relatorios/resumo-hoje', c.resumoVendasHoje);

module.exports = router;
