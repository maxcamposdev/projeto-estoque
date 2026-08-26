const express = require('express');
const auth = require('../middlewares/authMiddleware');
const c = require('../controllers/movimentacaoController');
const router = express.Router();

router.post('/', auth, c.create);
router.get('/resumo', auth, c.summary);
router.get('/produto/:id', auth, c.listByProduct);

module.exports = router;