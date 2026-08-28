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
      `INSERT INTO users
        (name, email, password_hash, role, unit_id)
       VALUES
        ($1, $2, $3, $4, $5)
       RETURNING
        id,
        name,
        email,
        role,
        unit_id,
        created_at`,
      [
        name,
        email.toLowerCase(),
        passwordHash,
        'admin',
        1
      ]
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
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        unit_id: user.unit_id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      message: 'Login realizado com sucesso!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        unit_id: user.unit_id
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login };