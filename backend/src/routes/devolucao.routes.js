const express = require('express');

const router = express.Router();

const controller = require('../controllers/devolucaoController');
const auth = require('../middlewares/authMiddleware');

router.use(auth);

router.get('/', controller.listar);
router.get('/:id', controller.buscarPorId);

router.post('/', controller.criar);

router.patch('/:id/enviar', controller.enviar);
router.patch('/:id/cancelar', controller.cancelar);
router.patch(
  '/:id/confirmar-recebimento',
  controller.confirmarRecebimento
);

module.exports = router;
