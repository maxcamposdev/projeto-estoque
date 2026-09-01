// routes/auth.routes.js — Rotas de autenticação
const express = require('express');
const { register, login, listarUsuarios, demoLogin } = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/demo', demoLogin);
router.get('/users', authMiddleware, listarUsuarios);

module.exports = router;