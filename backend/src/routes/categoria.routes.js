// routes/categoria.routes.js
const express = require('express');
const auth = require('../middlewares/authMiddleware');
const c = require('../controllers/categoriaController');
const { fields } = require('../middlewares/validate');
const router = express.Router();

router.get('/', auth, c.list);
router.get('/:id', auth, c.getById);
router.post('/', auth, fields('name'), c.create);
router.put('/:id', auth, fields('name'), c.update);
router.delete('/:id', auth, c.remove);

module.exports = router;