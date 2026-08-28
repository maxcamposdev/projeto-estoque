// routes/movimentacao.routes.js
const express = require('express');
const auth = require('../middlewares/authMiddleware');
const c = require('../controllers/movimentacaoController');
const { numeric } = require('../middlewares/validate');
const router = express.Router();

router.post(
  '/',
  auth,
  numeric('product_id', 'quantity'),
  c.create
);
router.get('/resumo', auth, c.summary);
router.get('/produto/:id', auth, c.listByProduct);

module.exports = router;