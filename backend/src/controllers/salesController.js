// controllers/salesController.js — Caixa + Vendas (com transação real)
const db = require('../config/db');

// ============================================================
// CAIXA
// ============================================================

async function abrirCaixa(req, res, next) {
  try {
    const { opening_amount = 0, notes = '', operator_id } = req.body;
    let userId = req.user.id;
    let unitId = req.user.unit_id || 1;

    // Só gerente/admin podem abrir o caixa em nome de outro operador
    if (operator_id && Number(operator_id) !== req.user.id) {
      if (!['gerente', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Você não tem permissão para abrir o caixa em nome de outro operador.' });
      }
      const { rows: op } = await db.query('SELECT id, unit_id FROM users WHERE id = $1', [operator_id]);
      if (op.length === 0) {
        return res.status(404).json({ success: false, message: 'Operador não encontrado.' });
      }
      userId = op[0].id;
      unitId = op[0].unit_id || unitId;
    }

    const { rows: existing } = await db.query(
      `SELECT id FROM cash_registers WHERE operator_id = $1 AND status = 'OPEN'`,
      [userId]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Já existe um caixa aberto para este operador.' });
    }

    const { rows } = await db.query(
      `INSERT INTO cash_registers (unit_id, operator_id, opening_amount, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [unitId, userId, opening_amount, notes]
    );

    res.status(201).json({ success: true, message: 'Caixa aberto com sucesso!', cashRegister: rows[0] });
  } catch (e) {
    console.error('Erro abrirCaixa:', e);
    res.status(500).json({ success: false, message: 'Erro ao abrir caixa: ' + e.message });
  }
}

async function fecharCaixa(req, res, next) {
  try {
    const { id } = req.params;
    const { closing_amount, notes = '' } = req.body;

    const { rows: cr } = await db.query('SELECT * FROM cash_registers WHERE id = $1', [id]);
    if (cr.length === 0) return res.status(404).json({ success: false, message: 'Caixa não encontrado.' });
    if (cr[0].status === 'CLOSED') return res.status(409).json({ success: false, message: 'Caixa já está fechado.' });

    const { rows: sumRows } = await db.query(
      `SELECT
        COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total ELSE 0 END), 0) as total_dinheiro,
        COALESCE(SUM(CASE WHEN payment_method = 'CARD' THEN total ELSE 0 END), 0) as total_cartao,
        COALESCE(SUM(CASE WHEN payment_method = 'PIX' THEN total ELSE 0 END), 0) as total_pix,
        COALESCE(SUM(total), 0) as total_vendas,
        COUNT(*) as qtd_vendas
       FROM sales
       WHERE cash_register_id = $1 AND status = 'COMPLETED'`,
      [id]
    );

    const expected = Number(cr[0].opening_amount) + Number(sumRows[0].total_dinheiro);

    const { rows } = await db.query(
      `UPDATE cash_registers SET
        status = 'CLOSED', closed_at = NOW(), closing_amount = $1, expected_amount = $2,
        notes = COALESCE(notes, '') || $3
       WHERE id = $4 RETURNING *`,
      [closing_amount, expected, notes ? '\n' + notes : '', id]
    );

    res.json({
      success: true, message: 'Caixa fechado com sucesso!', cashRegister: rows[0],
      resumo: {
        totalVendas: Number(sumRows[0].total_vendas),
        qtdVendas: Number(sumRows[0].qtd_vendas),
        porFormaPagamento: {
          dinheiro: Number(sumRows[0].total_dinheiro),
          cartao: Number(sumRows[0].total_cartao),
          pix: Number(sumRows[0].total_pix),
        },
        esperado: expected,
        diferenca: Number(closing_amount) - expected,
      },
    });
  } catch (e) {
    console.error('Erro fecharCaixa:', e);
    res.status(500).json({ success: false, message: 'Erro ao fechar caixa: ' + e.message });
  }
}

async function meuCaixaAtual(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT cr.*, u.name as operador_nome, un.name as unidade_nome
       FROM cash_registers cr
       JOIN users u ON u.id = cr.operator_id
       JOIN units un ON un.id = cr.unit_id
       WHERE cr.operator_id = $1 AND cr.status = 'OPEN'
       ORDER BY cr.opened_at DESC LIMIT 1`,
      [req.user.id]
    );
    if (rows.length === 0) return res.json({ success: true, cashRegister: null });
    res.json({ success: true, cashRegister: rows[0] });
  } catch (e) {
    console.error('Erro meuCaixaAtual:', e);
    res.status(500).json({ success: false, message: 'Erro: ' + e.message });
  }
}

// ============================================================
// VENDAS — agora com transação real
// ============================================================

async function criarVenda(req, res, next) {
  const { items, customer_name = '', customer_cpf = '', discount = 0, payment_method = 'CASH', amount_paid, seller_id } = req.body;
  const userId = req.user.id;
  const unitId = req.user.unit_id || 1;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'A venda precisa ter pelo menos 1 item.' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const { rows: cr } = await client.query(
      `SELECT id FROM cash_registers WHERE operator_id = $1 AND status = 'OPEN' LIMIT 1`,
      [userId]
    );
    if (cr.length === 0) {
      throw { status: 400, message: 'Você precisa abrir o caixa antes de registrar vendas.' };
    }
    const cashRegisterId = cr[0].id;

    if (!seller_id) {
      throw { status: 400, message: 'Selecione o vendedor antes de registrar a venda.' };
    }

    const { rows: seller } = await client.query(
      `SELECT id FROM users
       WHERE id = $1
         AND role = 'operador'
         AND unit_id = $2`,
      [seller_id, unitId]
    );

    if (seller.length === 0) {
      throw { status: 400, message: 'Vendedor inválido ou pertencente a outra unidade.' };
    }

    let subtotal = 0;
    const itemsProcessados = [];

    for (const item of items) {
      const { rows: prod } = await client.query(
        `SELECT id, name, price, quantity FROM products WHERE id = $1 FOR UPDATE`,
        [item.product_id]
      );
      if (prod.length === 0) throw { status: 404, message: `Produto #${item.product_id} não encontrado.` };
      const p = prod[0];
      const qty = Number(item.quantity);
      if (qty <= 0) throw { status: 400, message: 'Quantidade inválida.' };
      if (Number(p.quantity) < qty) {
        throw { status: 400, message: `Estoque insuficiente para "${p.name}" (disponível: ${p.quantity}).` };
      }

      const itemSubtotal = Number(p.price) * qty;
      subtotal += itemSubtotal;
      itemsProcessados.push({
        product_id: p.id, product_name: p.name, quantity: qty,
        unit_price: Number(p.price), subtotal: itemSubtotal,
      });
    }

    const total = Math.max(0, subtotal - Number(discount));
    let changeAmount = 0;
    if (payment_method === 'CASH') {
      const paid = Number(amount_paid || total);
      changeAmount = Math.max(0, paid - total);
    }

    const { rows: sale } = await client.query(
      `INSERT INTO sales (cash_register_id, operator_id, seller_id, unit_id, customer_name, customer_cpf, subtotal, discount, total, payment_method, amount_paid, change_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [cashRegisterId, userId, seller_id, unitId, customer_name, customer_cpf, subtotal, discount, total, payment_method, amount_paid || total, changeAmount]
    );

    for (const item of itemsProcessados) {
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [sale[0].id, item.product_id, item.product_name, item.quantity, item.unit_price, item.subtotal]
      );
      await client.query(
        `UPDATE products SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2`,
        [item.quantity, item.product_id]
      );
      await client.query(
        `INSERT INTO stock_movements (product_id, type, quantity, note, user_id)
         VALUES ($1, 'OUT', $2, $3, $4)`,
        [item.product_id, item.quantity, `Venda #${sale[0].id}`, userId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Venda registrada com sucesso!', sale: { ...sale[0], items: itemsProcessados } });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Erro criarVenda:', e);
    const status = e.status || 500;
    res.status(status).json({ success: false, message: e.message ? 'Erro ao registrar venda: ' + e.message : 'Erro ao registrar venda.' });
  } finally {
    client.release();
  }
}

async function listarVendas(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT s.*, u.name as operador_nome, un.name as unidade_nome
       FROM sales s
       JOIN users u ON u.id = s.operator_id
       JOIN units un ON un.id = s.unit_id
       ORDER BY s.created_at DESC LIMIT 50`
    );
    res.json({ success: true, vendas: rows });
  } catch (e) {
    console.error('Erro listarVendas:', e);
    res.status(500).json({ success: false, message: 'Erro: ' + e.message });
  }
}

async function cancelarVenda(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const { rows: sale } = await db.query('SELECT * FROM sales WHERE id = $1', [id]);
    if (sale.length === 0) return res.status(404).json({ success: false, message: 'Venda não encontrada.' });
    if (sale[0].status === 'CANCELLED') return res.status(409).json({ success: false, message: 'Venda já cancelada.' });

    const { rows: items } = await db.query('SELECT * FROM sale_items WHERE sale_id = $1', [id]);
    for (const item of items) {
      await db.query('UPDATE products SET quantity = quantity + $1 WHERE id = $2', [item.quantity, item.product_id]);
      await db.query(
        `INSERT INTO stock_movements (product_id, type, quantity, note, user_id)
         VALUES ($1, 'IN', $2, $3, $4)`,
        [item.product_id, item.quantity, `Cancelamento venda #${id}`, req.user.id]
      );
    }

    await db.query(
      `UPDATE sales SET status = 'CANCELLED', cancelled_reason = $1 WHERE id = $2`,
      [reason || 'Não informado', id]
    );
    res.json({ success: true, message: 'Venda cancelada e estoque devolvido.' });
  } catch (e) {
    console.error('Erro cancelarVenda:', e);
    res.status(500).json({ success: false, message: 'Erro: ' + e.message });
  }
}

// ============================================================
// RELATÓRIOS
// ============================================================

async function relatorioPorOperador(req, res, next) {
  try {
    const { rows } = await db.query(`
      SELECT
        u.id as operador_id, u.name as operador_nome, u.unit_id, un.name as unidade_nome,
        COUNT(s.id) as total_vendas,
        COALESCE(SUM(s.total), 0) as faturamento,
        COALESCE(AVG(s.total), 0) as ticket_medio,
        MAX(s.created_at) as ultima_venda
      FROM users u
      LEFT JOIN sales s ON s.operator_id = u.id AND s.status = 'COMPLETED'
      LEFT JOIN units un ON un.id = u.unit_id
      WHERE u.role IN ('operador', 'gerente', 'admin')
      GROUP BY u.id, u.name, u.unit_id, un.name
      ORDER BY faturamento DESC
    `);
    res.json({ success: true, relatorio: rows });
  } catch (e) {
    console.error('Erro relatorioPorOperador:', e);
    res.status(500).json({ success: false, message: 'Erro: ' + e.message });
  }
}

async function resumoVendasHoje(req, res, next) {
  try {
    const { rows } = await db.query(`
      SELECT
        COUNT(*) as total_vendas,
        COALESCE(SUM(total), 0) as faturamento,
        COALESCE(AVG(total), 0) as ticket_medio,
        COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total ELSE 0 END), 0) as total_dinheiro,
        COALESCE(SUM(CASE WHEN payment_method = 'CARD' THEN total ELSE 0 END), 0) as total_cartao,
        COALESCE(SUM(CASE WHEN payment_method = 'PIX' THEN total ELSE 0 END), 0) as total_pix
      FROM sales
      WHERE status = 'COMPLETED' AND created_at >= CURRENT_DATE
    `);
    res.json({ success: true, resumo: rows[0] });
  } catch (e) {
    console.error('Erro resumoVendasHoje:', e);
    res.status(500).json({ success: false, message: 'Erro: ' + e.message });
  }
}

module.exports = {
  abrirCaixa, fecharCaixa, meuCaixaAtual,
  criarVenda, listarVendas, cancelarVenda,
  relatorioPorOperador, resumoVendasHoje,
};
