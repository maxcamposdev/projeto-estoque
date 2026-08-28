const express = require('express');

const router = express.Router();

const auth = require('../middlewares/authMiddleware');
const controller = require('../controllers/comunicacaoController');

router.use(auth);

router.get(
  '/conversas',
  controller.listarConversas
);

router.post(
  '/conversas',
  controller.criarConversa
);

router.get(
  '/conversas/:id/mensagens',
  controller.mensagens
);

router.post(
  '/conversas/:id/mensagens',
  controller.enviarMensagem
);

router.get(
  '/unidades',
  controller.unidades
);

module.exports = router;
