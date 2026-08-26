// routes/whatsapp.routes.js — Webhook do WhatsApp
const express = require('express');
const { verify, handleMessage } = require('../controllers/whatsappController');
const router = express.Router();

// GET — Verificação do webhook (Meta exige)
router.get('/', verify);

// POST — Receber mensagens
router.post('/', handleMessage);

module.exports = router;