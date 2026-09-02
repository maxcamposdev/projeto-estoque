const express = require('express');

const router = express.Router();

const rotinaController = require('../controllers/rotinaController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// ============================================================
// ROTINAS DO USUÁRIO
// ============================================================

router.get(
  '/minhas',
  rotinaController.minhasRotinas
);

// ============================================================
// ADMIN / GESTÃO DE ROTINAS
// ============================================================

router.get(
  '/',
  rotinaController.listarRotinas
);

router.get(
  '/usuarios/disponiveis',
  rotinaController.listarUsuariosParaAtribuicao
);

router.get(
  '/:id/atribuicoes',
  rotinaController.listarAtribuicoes
);

router.post(
  '/:id/atribuicoes',
  rotinaController.atribuirRotina
);

router.delete(
  '/:id/atribuicoes/:userId',
  rotinaController.removerAtribuicao
);

// ============================================================
// ROTINA
// ============================================================

router.get(
  '/:id',
  rotinaController.buscarRotina
);

router.post(
  '/',
  rotinaController.criarRotina
);

// ============================================================
// TAREFAS
// ============================================================

router.post(
  '/:id/tasks',
  rotinaController.criarTarefa
);

router.post(
  '/tasks/:id/complete',
  rotinaController.concluirTarefa
);

module.exports = router;
