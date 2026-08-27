# DIAGNÓSTICO TÉCNICO - qui 27 ago 2026 13:18:36 -03

## 1. ESTRUTURA COMPLETA DO BACKEND (sem node_modules)
backend/controle-estoque-api@1.0.0
backend/.env
backend/nodemon
backend/package.json
backend/package-lock.json
backend/scripts/seed-demo.js
backend/scripts/setup-db.js
backend/src/app.js
backend/src/config/db.js
backend/src/config/schema.sql
backend/src/config/swagger-docs.js
backend/src/config/swagger.js
backend/src/controllers/authController.js
backend/src/controllers/categoriaController.js
backend/src/controllers/movimentacaoController.js
backend/src/controllers/produtoController.js
backend/src/controllers/whatsappController.js
backend/src/middlewares/authMiddleware.js
backend/src/middlewares/errorHandlers.js
backend/src/middlewares/validate.js
backend/src/pages/Dashboard.css
backend/src/routes/auth.routes.js
backend/src/routes/categoria.routes.js
backend/src/routes/index.js
backend/src/routes/movimentacao.routes.js
backend/src/routes/produto.routes.js
backend/src/routes/whatsapp.routes.js
backend/src/server.js

## 2. ENTRY POINT (server.js)
// server.js — Entrada da API
require('dotenv').config();

const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 API de Controle de Estoque rodando em http://localhost:${PORT}`);
});
## 3. ROTAS (routes/)
-e 
--- backend/src/routes/whatsapp.routes.js ---
// routes/whatsapp.routes.js — Webhook do WhatsApp
const express = require('express');
const { verify, handleMessage } = require('../controllers/whatsappController');
const router = express.Router();

// GET — Verificação do webhook (Meta exige)
router.get('/', verify);

// POST — Receber mensagens
router.post('/', handleMessage);

module.exports = router;-e 
--- backend/src/routes/produto.routes.js ---
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

module.exports = router;-e 
--- backend/src/routes/categoria.routes.js ---
const express = require('express');
const auth = require('../middlewares/authMiddleware');
const c = require('../controllers/categoriaController');
const { fields } = require('../middlewares/validate');
const router = express.Router();

router.get('/', auth, c.list);
router.get('/:id', auth, c.getById);
router.post('/', auth, fields('name'), c.create);
router.put('/:id', auth, c.update);
router.delete('/:id', auth, c.remove);

module.exports = router;-e 
--- backend/src/routes/movimentacao.routes.js ---
const express = require('express');
const auth = require('../middlewares/authMiddleware');
const c = require('../controllers/movimentacaoController');
const router = express.Router();

router.post('/', auth, c.create);
router.get('/resumo', auth, c.summary);
router.get('/produto/:id', auth, c.listByProduct);

module.exports = router;-e 
--- backend/src/routes/auth.routes.js ---
// routes/auth.routes.js — Rotas de autenticação
const express = require('express');
const { register, login } = require('../controllers/authController');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);

module.exports = router;
## 4. CONTROLLERS
-e 
--- backend/src/controllers/movimentacaoController.js ---
// controllers/movimentacaoController.js — Entrada/saída de estoque (transacional)
const db = require('../config/db');

async function create(req, res, next) {
  const { product_id, type, quantity, note } = req.body;
  if (!product_id || !type || !quantity || quantity <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Informe product_id, type (IN/OUT) e quantity > 0.',
    });
  }
  if (!['IN', 'OUT'].includes(type)) {
    return res.status(400).json({
      success: false,
      message: 'type deve ser IN (entrada) ou OUT (saída).',
    });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Bloqueia o produto para leitura consistente
    const { rows } = await client.query(
      'SELECT id, quantity FROM products WHERE id = $1 FOR UPDATE',
      [product_id]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Produto não encontrado.' });
    }

    const produto = rows[0];

    // REGRA DE NEGÓCIO: saída não pode zerar/negativar o estoque
    if (type === 'OUT' && Number(produto.quantity) - Number(quantity) < 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'Estoque insuficiente.',
        atual: Number(produto.quantity),
        solicitado: Number(quantity),
      });
    }

    // Atualiza a quantidade do produto
    const novoEstoque = type === 'IN'
      ? Number(produto.quantity) + Number(quantity)
      : Number(produto.quantity) - Number(quantity);

    await client.query(
      'UPDATE products SET quantity = $1, updated_at = NOW() WHERE id = $2',
      [novoEstoque, product_id]
    );

    // Registra a movimentação
    const { rows: mov } = await client.query(
      `INSERT INTO stock_movements (product_id, type, quantity, note, user_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [product_id, type, quantity, note || null, req.user.id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: type === 'IN' ? 'Entrada registrada!' : 'Saída registrada!',
      movimentacao: mov[0],
      estoqueAtual: novoEstoque,
    });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    next(e);
  } finally {
    client.release();
  }
}

// Histórico de um produto
async function listByProduct(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT m.*, u.name AS responsavel
       FROM stock_movements m
       LEFT JOIN users u ON u.id = m.user_id
       WHERE m.product_id = $1
       ORDER BY m.created_at DESC`,
      [req.params.id]
    );
    res.json({ success: true, movimentacoes: rows });
  } catch (e) { next(e); }
}

// Resumo geral do estoque (para o dashboard)
async function summary(req, res, next) {
  try {
    const total = await db.query(
      'SELECT COUNT(*)::int AS total, COALESCE(SUM(quantity),0) AS unidades FROM products'
    );
    const baixos = await db.query(
      'SELECT COUNT(*)::int AS qtd FROM products WHERE quantity <= min_quantity'
    );
    const movs = await db.query(
      'SELECT COUNT(*)::int AS qtd FROM stock_movements'
    );

    res.json({
      success: true,
      resumo: {
        totalProdutos: total.rows[0].total,
        totalUnidades: Number(total.rows[0].unidades),
        estoqueBaixo: baixos.rows[0].qtd,
        totalMovimentacoes: movs.rows[0].qtd,
      },
    });
  } catch (e) { next(e); }
}

module.exports = { create, listByProduct, summary };-e 
--- backend/src/controllers/categoriaController.js ---
// controllers/categoriaController.js — CRUD de categorias
const db = require('../config/db');

async function list(req, res, next) {
  try {
    const { busca } = req.query;
    const query = busca
      ? 'SELECT * FROM categories WHERE name ILIKE $1 ORDER BY name'
      : 'SELECT * FROM categories ORDER BY name';
    const params = busca ? [`%${busca}%`] : [];
    const { rows } = await db.query(query, params);
    res.json({ success: true, categorias: rows });
  } catch (e) { next(e); }
}

async function getById(req, res, next) {
  try {
    const { rows } = await db.query('SELECT * FROM categories WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Categoria não encontrada.' });
    res.json({ success: true, categoria: rows[0] });
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const { name, description } = req.body;
    const { rows } = await db.query(
      'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || null]
    );
    res.status(201).json({ success: true, message: 'Categoria criada!', categoria: rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ success: false, message: 'Já existe uma categoria com esse nome.' });
    next(e);
  }
}

async function update(req, res, next) {
  try {
    const { name, description } = req.body;
    const { rows } = await db.query(
      'UPDATE categories SET name = COALESCE($1, name), description = COALESCE($2, description) WHERE id = $3 RETURNING *',
      [name, description, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Categoria não encontrada.' });
    res.json({ success: true, message: 'Categoria atualizada!', categoria: rows[0] });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const { rows } = await db.query('DELETE FROM categories WHERE id = $1 RETURNING id', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Categoria não encontrada.' });
    res.json({ success: true, message: 'Categoria excluída.' });
  } catch (e) { next(e); }
}

module.exports = { list, getById, create, update, remove };-e 
--- backend/src/controllers/authController.js ---
// controllers/authController.js — Cadastro e login
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Cadastro de usuário
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Preencha nome, email e senha.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'A senha deve ter pelo menos 6 caracteres.' });
    }

    // Verifica se o email já existe
    const existe = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Este email já está cadastrado.' });
    }

    // Criptografa a senha (Regra 9: bcrypt)
    const passwordHash = await bcrypt.hash(password, 12);

    const { rows } = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
      [name, email.toLowerCase(), passwordHash, 'admin']
    );

    res.status(201).json({ success: true, message: 'Usuário cadastrado com sucesso!', user: rows[0] });
  } catch (error) {
    next(error);
  }
}

// Login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Informe email e senha.' });
    }

    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Email ou senha incorretos.' });
    }

    const user = rows[0];
    const senhaOk = await bcrypt.compare(password, user.password_hash);
    if (!senhaOk) {
      return res.status(401).json({ success: false, message: 'Email ou senha incorretos.' });
    }

    // Gera o token JWT
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      message: 'Login realizado com sucesso!',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login };-e 
--- backend/src/controllers/produtoController.js ---
// controllers/produtoController.js — CRUD de produtos + alerta de estoque baixo
const db = require('../config/db');

async function list(req, res, next) {
  try {
    const { busca, categoria, baixo } = req.query;
    let sql = `SELECT p.*, c.name AS categoria_nome
               FROM products p
               LEFT JOIN categories c ON c.id = p.category_id WHERE 1=1`;
    const params = [];

    if (busca) {
      params.push(`%${busca}%`);
      sql += ` AND (p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`;
    }
    if (categoria) {
      params.push(categoria);
      sql += ` AND p.category_id = $${params.length}`;
    }
    if (baixo === 'true') {
      sql += ` AND p.quantity <= p.min_quantity`;
    }

    sql += ' ORDER BY p.name';
    const { rows } = await db.query(sql, params);
    res.json({ success: true, produtos: rows });
  } catch (e) { next(e); }
}

async function getById(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT p.*, c.name AS categoria_nome
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado.' });
    }
    res.json({ success: true, produto: rows[0] });
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const { name, sku, description, category_id, quantity, min_quantity, price, barcode } = req.body;
    const { rows } = await db.query(
      `INSERT INTO products (name, sku, description, category_id, quantity, min_quantity, price, barcode)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, sku, description || null, category_id || null, quantity ?? 0, min_quantity ?? 0, price ?? 0, barcode || null]
    );
    res.status(201).json({ success: true, message: 'Produto cadastrado!', produto: rows[0] });
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ success: false, message: 'Já existe um produto com esse SKU.' });
    }
    next(e);
  }
}

async function update(req, res, next) {
  try {
    const { name, sku, description, category_id, quantity, min_quantity, price, barcode } = req.body;
    const { rows } = await db.query(
      `UPDATE products SET
         name = COALESCE($1, name),
         sku = COALESCE($2, sku),
         description = COALESCE($3, description),
         category_id = COALESCE($4, category_id),
         quantity = COALESCE($5, quantity),
         min_quantity = COALESCE($6, min_quantity),
         price = COALESCE($7, price),
         barcode = COALESCE($8, barcode),
         updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [name, sku, description, category_id, quantity, min_quantity, price, barcode, req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado.' });
    }
    res.json({ success: true, message: 'Produto atualizado!', produto: rows[0] });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const { rows } = await db.query('DELETE FROM products WHERE id = $1 RETURNING id', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado.' });
    }
    res.json({ success: true, message: 'Produto excluído.' });
  } catch (e) { next(e); }
}

module.exports = { list, getById, create, update, remove };-e 
--- backend/src/controllers/whatsappController.js ---
// controllers/whatsappController.js — Webhook do WhatsApp (Regras 5 e 6)
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
## 5. MIDDLEWARES (auth, RBAC, erro)
-e 
--- backend/src/middlewares/authMiddleware.js ---
// middlewares/authMiddleware.js — Proteção de rotas com JWT
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token não informado. Faça login para continuar.',
    });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido ou expirado.',
    });
  }
}

module.exports = authMiddleware;
## 6. CONEXÃO COM BANCO / CONFIG
-e 
--- backend/src/config/db.js ---
// config/db.js — Pool de conexões PostgreSQL
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Teste rápido de conexão no boot
pool.query('SELECT NOW()').then(() => {
  console.log('🗄️  PostgreSQL conectado com sucesso!');
}).catch((err) => {
  console.error('❌ Erro ao conectar no PostgreSQL:', err.message);
});

module.exports = pool;
## 7. MODELS

## 8. MIGRATIONS / SCHEMA SQL
-e 
--- backend/src/config/schema.sql ---
-- schema.sql — Estrutura do banco de dados do Controle de Estoque
-- Executado uma única vez (via scripts/setup-db.js)
-- Tabela: usuários (admin/operadores)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Tabela: categorias
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Tabela: produtos
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    sku VARCHAR(60) NOT NULL UNIQUE,
    description TEXT,
    category_id INTEGER REFERENCES categories(id) ON DELETE
    SET NULL,
        quantity NUMERIC(12, 3) NOT NULL DEFAULT 0,
        min_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0,
        price NUMERIC(12, 2) NOT NULL DEFAULT 0,
        barcode VARCHAR(60),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Tabela: movimentações de estoque (entradas e saídas)
CREATE TABLE IF NOT EXISTS stock_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('IN', 'OUT')),
    quantity NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
    note TEXT,
    user_id INTEGER REFERENCES users(id) ON DELETE
    SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_created ON stock_movements(created_at);
## 9. FRONTEND - ROTAS E APP PRINCIPAL
// App.jsx — Rotas da aplicação
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Produtos from './pages/Produtos';
import Movimentacoes from './pages/Movimentacoes';
import './locales/i18n';
import './styles/theme.css';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout><Login /></Layout>} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Layout><Dashboard /></Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/produtos"
          element={
            <PrivateRoute>
              <Layout><Produtos /></Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/movimentacoes"
          element={
            <PrivateRoute>
              <Layout><Movimentacoes /></Layout>
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
## 10. FRONTEND - SERVICE DE API
// services/api.js — Conexão com a API do backend
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor: adiciona o token em toda requisição
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: trata erro 401 (token expirado)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
## 11. FRONTEND - i18n
// locales/i18n.js — Configuração de internacionalização (robusta)
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ptBR from './pt-BR.json';
import en from './en.json';

const savedLang = localStorage.getItem('lang') || 'pt-BR';

i18n.use(initReactI18next).init({
  resources: {
    'pt-BR': { translation: ptBR },
    en: { translation: en },
  },
  lng: savedLang,
  fallbackLng: 'pt-BR',
  supportedLngs: ['pt-BR', 'en'],
  nonExplicitSupportedLngs: true,
  load: 'currentOnly',
  interpolation: { escapeValue: false },
  initImmediate: false,
  react: { useSuspense: false },
});

export default i18n;
## 12. FRONTEND - CONTEXTO DE AUTENTICAÇÃO (se existir)

## 13. GIT STATUS E ÚLTIMOS COMMITS
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   backend/src/app.js
	modified:   backend/src/config/swagger.js
	modified:   web/src/App.jsx
	modified:   web/src/components/Header.jsx
	modified:   web/src/locales/en.json
	modified:   web/src/locales/pt-BR.json
	modified:   web/src/pages/Login.css
	modified:   web/src/styles/theme.css

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	AUDITORIA.md
	DIAGNOSTICO.md
	backend/controle-estoque-api@1.0.0
	backend/nodemon
	backend/scripts/seed-demo.js
	backend/src/pages/
	web/src/pages/Movimentacoes.css
	web/src/pages/Movimentacoes.jsx
	web/src/pages/Produtos.css
	web/src/pages/Produtos.jsx

no changes added to commit (use "git add" and/or "git commit -a")
bfc97f9 fix: correção do botão de idioma (i18n robusto)
6a43bb3 feat: web dashboard React - tema escuro, i18n PT/EN, login demo, página de produtos
d907c99 feat: CRUD + regras de negócio, Swagger/API docs, webhook WhatsApp
bf49212 feat: estrutura inicial da API de controle de estoque (server, auth JWT, banco PostgreSQL)
