const express = require('express');
const router = express.Router();

const auth = require('../middlewares/authMiddleware');
const controller = require('../controllers/transferenciaController');

router.use(auth);

router.get('/unidades', controller.listarUnidades);
router.get('/estoque', controller.consultarEstoque);

router.get('/', controller.listar);

router.post('/', controller.criar);
router.patch('/:id/cancelar', controller.cancelar);

router.patch('/:id/aprovar', controller.aprovar);
router.patch('/:id/recusar', controller.recusar);
router.patch('/:id/enviar', controller.enviar);
router.patch('/:id/receber', controller.receber);

module.exports = router;
