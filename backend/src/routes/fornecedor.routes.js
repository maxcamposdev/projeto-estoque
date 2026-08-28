const express = require('express');
const router = express.Router();

const controller = require('../controllers/fornecedorController');
const auth = require('../middlewares/authMiddleware');

router.use(auth);

router.get('/', controller.listar);
router.get('/:id', controller.buscarPorId);
router.post('/', controller.criar);
router.put('/:id', controller.atualizar);
router.delete('/:id', controller.excluir);

module.exports = router;
