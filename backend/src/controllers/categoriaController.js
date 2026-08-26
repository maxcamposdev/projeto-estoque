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

module.exports = { list, getById, create, update, remove };