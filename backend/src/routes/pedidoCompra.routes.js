const express = require('express');

const router = express.Router();

const controller = require('../controllers/pedidoCompraController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// ============================================================
// PEDIDOS
// ============================================================

router.get('/', controller.listar);

router.get('/:id', controller.buscarPorId);

router.post('/', controller.criar);

router.put('/:id', controller.atualizar);

// ============================================================
// FLUXO DO PEDIDO
// ============================================================

router.patch('/:id/enviar', controller.atualizarStatus);

router.patch('/:id/confirmar', controller.confirmar);

router.patch('/:id/receber', controller.receber);

router.patch('/:id/cancelar', controller.cancelar);

// ============================================================
// SOLICITAÇÕES PÓS-ENVIO
// ============================================================

router.post(
  '/:id/solicitar-cancelamento',
  controller.solicitarCancelamento
);

router.post(
  '/:id/solicitar-alteracao',
  controller.solicitarAlteracao
);

router.get(
  '/:id/solicitacoes',
  controller.listarSolicitacoes
);

router.patch(
  '/solicitacoes/:id/responder',
  controller.responderSolicitacao
);

module.exports = router;
