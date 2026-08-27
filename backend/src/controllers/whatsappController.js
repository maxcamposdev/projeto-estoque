// controllers/whatsappController.js — Webhook do WhatsApp (Regras 5 e 6)
const crypto = require('crypto');
const db = require('../config/db');

// Verificação do webhook (GET) — Meta exige na configuração
function verify(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ Webhook WhatsApp verificado com sucesso!');
    return res.status(200).send(challenge);
  }

  console.warn('⚠️ Tentativa de verificação do webhook com token inválido.');
  res.sendStatus(403);
}

// Valida a assinatura HMAC enviada pela Meta (segurança)
function isValidSignature(req, rawBody) {
  const signature = req.headers['x-hub-signature-256'];
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  // Se não configurou o secret, aceita (modo dev) — mas LOGA o aviso
  if (!appSecret) {
    console.warn('⚠️ WHATSAPP_APP_SECRET não configurado — validação de assinatura DESATIVADA.');
    return true;
  }

  if (!signature) {
    console.warn('⚠️ Requisição sem header X-Hub-Signature-256 — bloqueada.');
    return false;
  }

  const expected = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Receber mensagens (POST) — Meta envia as mensagens aqui
async function handleMessage(req, res, next) {
  try {
    const body = req.body;

    // Verifica se é uma mensagem do WhatsApp
    if (body.object === 'whatsapp_business_account' && body.entry) {
      for (const entry of body.entry) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            const message = change.value?.messages?.[0];
            const from = change.value?.metadata?.display_phone_number;

            if (message) {
              const text = message.text?.body || '';
              const sender = message.from;

              console.log(`📩 WhatsApp — De: ${sender} | Texto: "${text}"`);

              // Identificar a origem (tag no texto predefinido)
              let origem = 'não identificada';

              if (text.includes('E-commerce') || text.includes('Loja Virtual')) {
                origem = 'Loja Virtual (E-commerce)';
              } else if (text.includes('Delivery') || text.includes('Restaurante')) {
                origem = 'Sistema de Delivery';
              } else if (text.includes('Agendamento')) {
                origem = 'Plataforma de Agendamentos';
              } else if (text.includes('Estoque') || text.includes('estoque')) {
                origem = 'Controle de Estoque';
              } else if (text.includes('Imobiliário') || text.includes('Imóvel')) {
                origem = 'Portal Imobiliário';
              } else if (text.includes('Freelancer') || text.includes('Vitrine')) {
                origem = 'Vitrine Freelancer';
              }

              // Registrar no banco (para métricas futuras)
              try {
                await db.query(
                  'INSERT INTO lead_logs (sender, message, origem, received_at) VALUES ($1, $2, $3, NOW())',
                  [sender, text, origem]
                );
              } catch (dbErr) {
                // Tabela lead_logs ainda não existe — ignora
                console.log('ℹ️ Tabela lead_logs não existe ainda, mensagem não persistida.');
              }

              console.log(`📍 Origem detectada: ${origem}`);
            }
          }
        }
      }
    }

    // Meta espera 200 OK sempre (mesmo sem processar)
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Erro no webhook WhatsApp:', error.message);
    res.sendStatus(200); // Sempre responde 200 pro Meta não reenviar
  }
}

module.exports = { verify, handleMessage };