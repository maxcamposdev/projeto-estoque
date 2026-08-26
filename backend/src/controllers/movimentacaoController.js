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

module.exports = { create, listByProduct, summary };