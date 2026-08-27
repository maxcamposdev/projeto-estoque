// routes/produto.routes.js
const express = require('express');
const auth = require('../middlewares/authMiddleware');
const c = require('../controllers/produtoController');
const { fields, nonNegative, numeric } = require('../middlewares/validate');
const router = express.Router();

router.get('/', auth, c.list);
router.get('/:id', auth, c.getById);

router.post(
  '/',
  auth,
  fields('name', 'sku'),
  nonNegative('quantity', 'min_quantity', 'price'),
  numeric('quantity', 'min_quantity', 'price', 'category_id'),
  c.create
);

router.put(
  '/:id',
  auth,
  nonNegative('quantity', 'min_quantity', 'price'),
  numeric('quantity', 'min_quantity', 'price', 'category_id'),
  c.update
);

router.delete('/:id', auth, c.remove);

module.exports = router;