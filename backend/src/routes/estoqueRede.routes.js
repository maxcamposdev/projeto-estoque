const express = require('express');

const router = express.Router();

const auth = require('../middlewares/authMiddleware');
const controller = require('../controllers/estoqueRedeController');

router.use(auth);

router.get(
  '/',
  controller.consultar
);

router.get(
  '/produto/:productId',
  controller.consultarProduto
);

module.exports = router;
