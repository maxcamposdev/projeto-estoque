const express = require('express');
const auth = require('../middlewares/authMiddleware');
const c = require('../controllers/produtoController');
const { fields } = require('../middlewares/validate');
const router = express.Router();

router.get('/', auth, c.list);
router.get('/:id', auth, c.getById);
router.post('/', auth, fields('name', 'sku'), c.create);
router.put('/:id', auth, c.update);
router.delete('/:id', auth, c.remove);

module.exports = router;