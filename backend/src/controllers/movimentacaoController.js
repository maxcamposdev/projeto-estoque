// controllers/movimentacaoController.js
// Entrada/saída de estoque + consultas para relatórios

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

    const { rows } = await client.query(
      'SELECT id, quantity FROM products WHERE id = $1 FOR UPDATE',
      [product_id]
    );

    if (rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado.',
      });
    }

    const produto = rows[0];

    if (
      type === 'OUT' &&
      Number(produto.quantity) - Number(quantity) < 0
    ) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message: 'Estoque insuficiente.',
        atual: Number(produto.quantity),
        solicitado: Number(quantity),
      });
    }

    const novoEstoque =
      type === 'IN'
        ? Number(produto.quantity) + Number(quantity)
        : Number(produto.quantity) - Number(quantity);

    await client.query(
      'UPDATE products SET quantity = $1, updated_at = NOW() WHERE id = $2',
      [novoEstoque, product_id]
    );

    const { rows: mov } = await client.query(
      `INSERT INTO stock_movements
       (product_id, type, quantity, note, user_id)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [
        product_id,
        type,
        quantity,
        note || null,
        req.user.id,
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message:
        type === 'IN'
          ? 'Entrada registrada!'
          : 'Saída registrada!',
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
    const produto = await db.query(
      'SELECT id FROM products WHERE id = $1',
      [req.params.id]
    );

    if (produto.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado.',
      });
    }

    const { rows } = await db.query(
      `SELECT
        m.*,
        p.name AS produto_nome,
        p.sku,
        p.barcode,
        u.name AS responsavel
       FROM stock_movements m
       LEFT JOIN products p ON p.id = m.product_id
       LEFT JOIN users u ON u.id = m.user_id
       WHERE m.product_id = $1
       ORDER BY m.created_at DESC`,
      [req.params.id]
    );

    res.json({
      success: true,
      movimentacoes: rows,
    });
  } catch (e) {
    next(e);
  }
}


// Histórico geral — utilizado pelos relatórios
async function list(req, res, next) {
  try {
    const {
      type,
      inicio,
      fim,
    } = req.query;

    let sql = `
      SELECT
        m.id,
        m.product_id,
        m.type,
        m.quantity,
        m.note,
        m.created_at,
        p.name AS produto_nome,
        p.sku,
        p.barcode,
        p.price,
        c.name AS categoria_nome,
        u.name AS responsavel
      FROM stock_movements m
      LEFT JOIN products p ON p.id = m.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN users u ON u.id = m.user_id
      WHERE 1=1
    `;

    const params = [];

    if (type && ['IN', 'OUT'].includes(type)) {
      params.push(type);
      sql += ` AND m.type = $${params.length}`;
    }

    if (inicio) {
      params.push(inicio);
      sql += ` AND m.created_at >= $${params.length}::date`;
    }

    if (fim) {
      params.push(fim);
      sql += ` AND m.created_at < ($${params.length}::date + INTERVAL '1 day')`;
    }

    sql += ' ORDER BY m.created_at DESC';

    const { rows } = await db.query(sql, params);

    res.json({
      success: true,
      movimentacoes: rows,
    });
  } catch (e) {
    next(e);
  }
}


// Resumo geral do estoque
async function summary(req, res, next) {
  try {
    const total = await db.query(
      `SELECT
        COUNT(*)::int AS total,
        COALESCE(SUM(quantity),0) AS unidades
       FROM products`
    );

    const baixos = await db.query(
      `SELECT COUNT(*)::int AS qtd
       FROM products
       WHERE quantity <= min_quantity`
    );

    const movs = await db.query(
      `SELECT COUNT(*)::int AS qtd
       FROM stock_movements`
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
  } catch (e) {
    next(e);
  }
}


module.exports = {
  create,
  list,
  listByProduct,
  summary,
};
