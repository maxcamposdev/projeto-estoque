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

module.exports = { list, getById, create, update, remove };