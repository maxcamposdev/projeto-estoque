const express = require('express');
const router = express.Router();

const rotinaController = require('../controllers/rotinaController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', rotinaController.listarRotinas);
router.get('/:id', rotinaController.buscarRotina);

router.post('/', rotinaController.criarRotina);
router.post('/:id/tasks', rotinaController.criarTarefa);

router.post(
  '/tasks/:id/complete',
  rotinaController.concluirTarefa
);

module.exports = router;
