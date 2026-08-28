// controllers/produtoController.js — CRUD de produtos + alerta de estoque baixo
const db = require('../config/db');

// Valida se uma string base64 é uma imagem razoável (limite ~2MB em base64)
function validarImagemBase64(str) {
  if (typeof str !== 'string') return false;
  // Aceita: data:image/png;base64,XXXX  OU  data:image/jpeg;base64,XXXX
  const match = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.exec(str);
  if (!match) return false;
  // Limite aproximado: ~2.7MB em base64 (~2MB binário)
  return str.length < 2800000;
}

async function list(req, res, next) {
  try {
    const { busca, categoria, baixo } = req.query;
    let sql = 'SELECT p.*, c.name AS categoria_nome FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE 1=1';
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
      sql += ' AND p.quantity <= p.min_quantity';
    }

    sql += ' ORDER BY p.name';
    const { rows } = await db.query(sql, params);
    res.json({ success: true, produtos: rows });
  } catch (e) { next(e); }
}

async function getById(req, res, next) {
  try {
    const { rows } = await db.query(
      'SELECT p.*, c.name AS categoria_nome FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = $1',
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
    const { name, sku, description, category_id, quantity, min_quantity, price, barcode, image_url, image_data } = req.body;

    // Validação da imagem, se enviada
    const imgData = image_data ? (validarImagemBase64(image_data) ? image_data : null) : null;
    const imgUrl = image_url && image_url.trim() ? image_url.trim().slice(0, 500) : null;

    const { rows } = await db.query(
      `INSERT INTO products (name, sku, description, category_id, quantity, min_quantity, price, barcode, image_url, image_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name, sku, description || null, category_id || null, quantity ?? 0, min_quantity ?? 0, price ?? 0, barcode || null, imgUrl, imgData]
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
    const { name, sku, description, category_id, quantity, min_quantity, price, barcode, image_url, image_data } = req.body;
    const params = [name, sku, description, category_id, quantity, min_quantity, price, barcode, req.params.id];

    let sqlSets = `name = COALESCE($1, name),
      sku = COALESCE($2, sku),
      description = COALESCE($3, description),
      category_id = COALESCE($4, category_id),
      quantity = COALESCE($5, quantity),
      min_quantity = COALESCE($6, min_quantity),
      price = COALESCE($7, price),
      barcode = COALESCE($8, barcode),
      updated_at = NOW()`;

    // Atualizar imagens só se foram enviadas
    if (typeof image_data !== 'undefined') {
      const imgData = image_data ? (validarImagemBase64(image_data) ? image_data : null) : null;
      params.push(imgData);
      sqlSets += `, image_data = $${params.length}`;
    }
    if (typeof image_url !== 'undefined') {
      const imgUrl = image_url && image_url.trim() ? image_url.trim().slice(0, 500) : null;
      params.push(imgUrl);
      sqlSets += `, image_url = $${params.length}`;
    }

    const { rows } = await db.query(
      `UPDATE products SET ${sqlSets} WHERE id = $${params.length - (typeof image_data !== 'undefined' ? 1 : 0) - (typeof image_url !== 'undefined' ? 1 : 0)} RETURNING *`,
      params
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
