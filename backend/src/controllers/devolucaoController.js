const db = require('../config/db');

const MOTIVOS_VALIDOS = [
  'DAMAGED',
  'EXPIRED',
  'WRONG_PRODUCT',
  'QUANTITY_DIVERGENCE',
  'QUALITY',
  'OTHER'
];

const STATUS_VALIDOS = [
  'PENDING',
  'SENT',
  'RECEIVED',
  'CANCELLED'
];

async function obterUnidadeUsuario(req, client = db) {
  const userId = Number(req.user?.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  const result = await client.query(`
    SELECT unit_id
    FROM users
    WHERE id = $1
  `, [userId]);

  if (result.rows.length === 0) {
    return null;
  }

  const unitId = Number(result.rows[0].unit_id);

  return Number.isInteger(unitId) && unitId > 0
    ? unitId
    : null;
}


// ============================================================
// LISTAR DEVOLUÇÕES
// ============================================================

exports.listar = async (req, res, next) => {
  try {
    const params = [];
    let where = '';

    if (req.query.status) {
      const status = String(req.query.status).toUpperCase();

      if (!STATUS_VALIDOS.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status de devolução inválido.'
        });
      }

      params.push(status);
      where = `WHERE pr.status = $${params.length}`;
    }

    const result = await db.query(`
      SELECT
        pr.id,
        pr.return_number,
        pr.purchase_order_id,
        po.order_number,
        pr.unit_id,
        u.name AS unit_name,
        pr.supplier_id,
        COALESCE(
          s.trade_name,
          s.legal_name
        ) AS supplier,
        pr.invoice_number,
        pr.status,
        pr.note,
        pr.created_at,
        pr.updated_at,

        COUNT(pri.id)::INTEGER AS total_items,
        COALESCE(
          SUM(pri.quantity),
          0
        ) AS total_quantity

      FROM purchase_returns pr

      LEFT JOIN purchase_orders po
        ON po.id = pr.purchase_order_id

      LEFT JOIN units u
        ON u.id = pr.unit_id

      LEFT JOIN suppliers s
        ON s.id = pr.supplier_id

      LEFT JOIN purchase_return_items pri
        ON pri.purchase_return_id = pr.id

      ${where}

      GROUP BY
        pr.id,
        pr.return_number,
        pr.purchase_order_id,
        po.order_number,
        pr.unit_id,
        u.name,
        pr.supplier_id,
        COALESCE(
          s.trade_name,
          s.legal_name
        ),
        pr.invoice_number,
        pr.status,
        pr.note,
        pr.created_at,
        pr.updated_at

      ORDER BY pr.created_at DESC
    `, params);

    const resultado = [];

    for (const devolucao of result.rows) {
      const itens = await db.query(`
        SELECT
          pri.id,
          pri.purchase_order_item_id,
          pri.product_id,
          p.name AS product_name,
          p.sku,
          p.barcode,
          pri.quantity,
          pri.reason,
          pri.note
        FROM purchase_return_items pri
        INNER JOIN products p
          ON p.id = pri.product_id
        WHERE pri.purchase_return_id = $1
        ORDER BY p.name
      `, [devolucao.id]);

      resultado.push({
        ...devolucao,
        total_items: Number(devolucao.total_items || 0),
        total_quantity: Number(devolucao.total_quantity || 0),
        items: itens.rows
      });
    }

    res.json({
      success: true,
      data: resultado
    });

  } catch (err) {
    next(err);
  }
};


// ============================================================
// BUSCAR DEVOLUÇÃO
// ============================================================

exports.buscarPorId = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const devolucao = await db.query(`
      SELECT
        pr.id,
        pr.return_number,
        pr.purchase_order_id,
        po.order_number,
        pr.unit_id,
        u.name AS unit_name,
        pr.supplier_id,
        COALESCE(
          s.trade_name,
          s.legal_name
        ) AS supplier,
        pr.invoice_number,
        pr.status,
        pr.note,
        pr.created_by,
        pr.created_at,
        pr.updated_at
      FROM purchase_returns pr
      LEFT JOIN purchase_orders po
        ON po.id = pr.purchase_order_id
      LEFT JOIN units u
        ON u.id = pr.unit_id
      LEFT JOIN suppliers s
        ON s.id = pr.supplier_id
      WHERE pr.id = $1
    `, [id]);

    if (devolucao.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Devolução não encontrada.'
      });
    }

    const itens = await db.query(`
      SELECT
        pri.id,
        pri.purchase_order_item_id,
        pri.product_id,
        p.name AS product_name,
        p.sku,
        p.barcode,
        pri.quantity,
        pri.reason,
        pri.note
      FROM purchase_return_items pri
      INNER JOIN products p
        ON p.id = pri.product_id
      WHERE pri.purchase_return_id = $1
      ORDER BY p.name
    `, [id]);

    res.json({
      success: true,
      data: {
        ...devolucao.rows[0],
        items: itens.rows
      }
    });

  } catch (err) {
    next(err);
  }
};


// ============================================================
// CRIAR DEVOLUÇÃO
// ============================================================

exports.criar = async (req, res, next) => {
  const client = await db.connect();

  try {
    const {
      purchase_order_id,
      invoice_number,
      note,
      items
    } = req.body;

    const orderId = Number(purchase_order_id);
    const unidadeId = await obterUnidadeUsuario(req, client);

    if (!unidadeId) {
      return res.status(409).json({
        success: false,
        message:
          'O usuário atual não está vinculado a uma unidade/loja.'
      });
    }

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Pedido de compra inválido.'
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          'Adicione pelo menos um produto à devolução.'
      });
    }

    await client.query('BEGIN');

    const pedido = await client.query(`
      SELECT
        id,
        order_number,
        unit_id,
        supplier_id,
        status
      FROM purchase_orders
      WHERE id = $1
      FOR UPDATE
    `, [orderId]);

    if (pedido.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Pedido de compra não encontrado.'
      });
    }

    const ordem = pedido.rows[0];

    if (Number(ordem.unit_id) !== unidadeId) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message:
          'Você não pode registrar devolução de outra unidade.'
      });
    }

    if (ordem.status !== 'RECEIVED') {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          'A devolução só pode ser criada após o recebimento do pedido.'
      });
    }

    const itensValidos = [];

    for (const item of items) {
      const purchaseOrderItemId =
        Number(item.purchase_order_item_id);

      const quantidade = Number(item.quantity);
      const reason = String(
        item.reason || ''
      ).toUpperCase();

      if (
        !Number.isInteger(purchaseOrderItemId) ||
        purchaseOrderItemId <= 0
      ) {
        await client.query('ROLLBACK');

        return res.status(400).json({
          success: false,
          message:
            'Item do pedido inválido na devolução.'
        });
      }

      if (!Number.isFinite(quantidade) || quantidade <= 0) {
        await client.query('ROLLBACK');

        return res.status(400).json({
          success: false,
          message:
            'A quantidade da devolução deve ser maior que zero.'
        });
      }

      if (!MOTIVOS_VALIDOS.includes(reason)) {
        await client.query('ROLLBACK');

        return res.status(400).json({
          success: false,
          message:
            'Informe um motivo válido para cada produto devolvido.'
        });
      }

      const itemPedido = await client.query(`
        SELECT
          id,
          product_id,
          quantity,
          received_quantity
        FROM purchase_order_items
        WHERE id = $1
          AND purchase_order_id = $2
        FOR UPDATE
      `, [
        purchaseOrderItemId,
        orderId
      ]);

      if (itemPedido.rows.length === 0) {
        await client.query('ROLLBACK');

        return res.status(404).json({
          success: false,
          message:
            'Um dos produtos não pertence ao pedido informado.'
        });
      }

      const itemOriginal = itemPedido.rows[0];

      const devolucoes = await client.query(`
        SELECT
          COALESCE(
            SUM(pri.quantity) FILTER (
              WHERE pr.status IN (
                'PENDING',
                'SENT',
                'RECEIVED'
              )
            ),
            0
          ) AS quantidade_devolvida
        FROM purchase_return_items pri
        INNER JOIN purchase_returns pr
          ON pr.id = pri.purchase_return_id
        WHERE pri.purchase_order_item_id = $1
      `, [purchaseOrderItemId]);

      const jaSolicitada =
        Number(
          devolucoes.rows[0].quantidade_devolvida || 0
        );

      const recebida =
        Number(
          itemOriginal.received_quantity ||
          itemOriginal.quantity
        );

      const disponivelParaDevolver =
        recebida - jaSolicitada;

      if (quantidade > disponivelParaDevolver) {
        await client.query('ROLLBACK');

        return res.status(409).json({
          success: false,
          message:
            `A quantidade informada para devolução excede o saldo recebido disponível. Disponível: ${disponivelParaDevolver}.`
        });
      }

      itensValidos.push({
        purchase_order_item_id: purchaseOrderItemId,
        product_id: Number(itemOriginal.product_id),
        quantity: quantidade,
        reason,
        note:
          typeof item.note === 'string'
            ? item.note.trim() || null
            : null
      });
    }

    const devolucao = await client.query(`
      INSERT INTO purchase_returns
        (
          purchase_order_id,
          unit_id,
          supplier_id,
          invoice_number,
          status,
          created_by,
          note
        )
      VALUES
        (
          $1,
          $2,
          $3,
          $4,
          'PENDING',
          $5,
          $6
        )
      RETURNING
        id,
        return_number,
        purchase_order_id,
        unit_id,
        supplier_id,
        invoice_number,
        status,
        created_by,
        note,
        created_at,
        updated_at
    `, [
      orderId,
      unidadeId,
      ordem.supplier_id,
      typeof invoice_number === 'string'
        ? invoice_number.trim() || null
        : null,
      req.user.id,
      typeof note === 'string'
        ? note.trim() || null
        : null
    ]);

    const devolucaoCriada = devolucao.rows[0];

    await client.query(`
      UPDATE purchase_returns
      SET
        return_number =
          'DV-' || LPAD(id::TEXT, 6, '0'),
        updated_at = NOW()
      WHERE id = $1
    `, [devolucaoCriada.id]);

    for (const item of itensValidos) {
      await client.query(`
        INSERT INTO purchase_return_items
          (
            purchase_return_id,
            purchase_order_item_id,
            product_id,
            quantity,
            reason,
            note
          )
        VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6
          )
      `, [
        devolucaoCriada.id,
        item.purchase_order_item_id,
        item.product_id,
        item.quantity,
        item.reason,
        item.note
      ]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message:
        'Solicitação de devolução criada com sucesso.',
      data: devolucaoCriada
    });

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};


// ============================================================
// ENVIAR DEVOLUÇÃO
// ============================================================
// Neste momento a mercadoria sai fisicamente da loja.
// Portanto o estoque é reduzido aqui.
// ============================================================

exports.enviar = async (req, res, next) => {
  const client = await db.connect();

  try {
    const id = Number(req.params.id);

    await client.query('BEGIN');

    const result = await client.query(`
      SELECT
        pr.*,
        po.order_number
      FROM purchase_returns pr
      INNER JOIN purchase_orders po
        ON po.id = pr.purchase_order_id
      WHERE pr.id = $1
      FOR UPDATE
    `, [id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Devolução não encontrada.'
      });
    }

    const devolucao = result.rows[0];

    const unidadeUsuario = await obterUnidadeUsuario(
      req,
      client
    );

    if (
      !unidadeUsuario ||
      Number(devolucao.unit_id) !== unidadeUsuario
    ) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message:
          'Você não pode enviar uma devolução de outra unidade.'
      });
    }

    if (devolucao.status !== 'PENDING') {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          'Somente devoluções pendentes podem ser enviadas.'
      });
    }

    const itens = await client.query(`
      SELECT
        id,
        product_id,
        quantity
      FROM purchase_return_items
      WHERE purchase_return_id = $1
      ORDER BY id
    `, [id]);

    if (itens.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          'A devolução não possui itens.'
      });
    }

    for (const item of itens.rows) {

      const estoque = await client.query(`
        SELECT
          id,
          quantity,
          reserved_quantity
        FROM product_stocks
        WHERE product_id = $1
          AND unit_id = $2
        FOR UPDATE
      `, [
        item.product_id,
        devolucao.unit_id
      ]);

      if (estoque.rows.length === 0) {
        await client.query('ROLLBACK');

        return res.status(409).json({
          success: false,
          message:
            'Estoque da unidade não encontrado para um dos produtos.'
        });
      }

      const saldo =
        Number(estoque.rows[0].quantity) -
        Number(estoque.rows[0].reserved_quantity);

      if (Number(item.quantity) > saldo) {
        await client.query('ROLLBACK');

        return res.status(409).json({
          success: false,
          message:
            'Estoque disponível insuficiente para realizar a devolução.'
        });
      }

      await client.query(`
        UPDATE product_stocks
        SET
          quantity = quantity - $1,
          updated_at = NOW()
        WHERE id = $2
      `, [
        item.quantity,
        estoque.rows[0].id
      ]);
    }

    const atualizado = await client.query(`
      UPDATE purchase_returns
      SET
        status = 'SENT',
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message:
        'Devolução enviada ao fornecedor e estoque atualizado.',
      data: atualizado.rows[0]
    });

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};


// ============================================================
// CANCELAR DEVOLUÇÃO
// ============================================================

exports.cancelar = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const result = await db.query(`
      UPDATE purchase_returns
      SET
        status = 'CANCELLED',
        updated_at = NOW()
      WHERE id = $1
        AND status = 'PENDING'
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(409).json({
        success: false,
        message:
          'Somente devoluções pendentes podem ser canceladas.'
      });
    }

    res.json({
      success: true,
      message: 'Devolução cancelada.',
      data: result.rows[0]
    });

  } catch (err) {
    next(err);
  }
};


// ============================================================
// CONFIRMAR RECEBIMENTO PELO FORNECEDOR
// ============================================================

exports.confirmarRecebimento = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const result = await db.query(`
      UPDATE purchase_returns
      SET
        status = 'RECEIVED',
        updated_at = NOW()
      WHERE id = $1
        AND status = 'SENT'
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(409).json({
        success: false,
        message:
          'A devolução precisa estar enviada antes da confirmação.'
      });
    }

    res.json({
      success: true,
      message:
        'Recebimento da devolução confirmado.',
      data: result.rows[0]
    });

  } catch (err) {
    next(err);
  }
};
