const db = require('../config/db');


// ============================================================
// UNIDADE DO USUÁRIO LOGADO
// ============================================================
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
// STATUS PERMITIDOS
// ============================================================
const STATUS_VALIDOS = [
  'PENDING',
  'SENT',
  'CONFIRMED',
  'RECEIVED',
  'CANCELLED'
];

// ============================================================
// LISTAR PEDIDOS DE COMPRA
// ============================================================
exports.listar = async (req, res, next) => {
  try {
    const { status } = req.query;

    const params = [];
    let where = '';

    if (status) {
      if (!STATUS_VALIDOS.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status inválido.'
        });
      }

      params.push(status);
      where = `WHERE po.status = $${params.length}`;
    }

    const pedidos = await db.query(`
      SELECT
        po.id,
        po.order_number,
        COALESCE(
          s.trade_name,
          s.legal_name,
          po.supplier
        ) AS supplier,
        po.supplier_id,
        po.note,
        po.status,
        po.invoice_number,
        po.received_at,
        po.created_at,
        po.updated_at,

        COUNT(poi.id)::INTEGER AS total_items,

        COALESCE(
          SUM(poi.quantity),
          0
        ) AS total_quantity,

        COALESCE(
          SUM(poi.quantity * p.price),
          0
        ) AS estimated_total

      FROM purchase_orders po

      LEFT JOIN suppliers s
        ON s.id = po.supplier_id

      LEFT JOIN purchase_order_items poi
        ON poi.purchase_order_id = po.id

      LEFT JOIN products p
        ON p.id = poi.product_id

      ${where}

      GROUP BY
        po.id,
        po.order_number,
        COALESCE(
          s.trade_name,
          s.legal_name,
          po.supplier
        ),
        po.supplier_id,
        po.note,
        po.status,
        po.invoice_number,
        po.received_at,
        po.created_at,
        po.updated_at

      ORDER BY po.created_at DESC
    `, params);

    const resultado = [];

    for (const pedido of pedidos.rows) {
      const itens = await db.query(`
        SELECT
          poi.id,
          poi.product_id,

          p.name AS product_name,
          p.sku,
          p.barcode,

          p.price,
          p.quantity AS current_quantity,
          p.min_quantity,

          p.image_url,
          p.image_data,

          poi.quantity,
          poi.received_quantity

        FROM purchase_order_items poi

        INNER JOIN products p
          ON p.id = poi.product_id

        WHERE poi.purchase_order_id = $1

        ORDER BY p.name
      `, [pedido.id]);

      resultado.push({
        ...pedido,
        total_items: Number(pedido.total_items || 0),
        total_quantity: Number(pedido.total_quantity || 0),
        estimated_total: Number(pedido.estimated_total || 0),
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
// BUSCAR PEDIDO POR ID
// ============================================================
exports.buscarPorId = async (req, res, next) => {
  try {
    const { id } = req.params;

    const pedido = await db.query(`
      SELECT
        po.id,
        po.order_number,
        po.supplier,
        po.note,
        po.status,
        po.invoice_number,
        po.received_at,
        po.created_at,
        po.updated_at
      FROM purchase_orders po
      LEFT JOIN suppliers s
        ON s.id = po.supplier_id
      WHERE po.id = $1
    `, [id]);

    if (pedido.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pedido de compra não encontrado.'
      });
    }

    const itens = await db.query(`
      SELECT
        poi.id,
        poi.product_id,

        p.name AS product_name,
        p.sku,
        p.barcode,

        p.price,
        p.quantity AS current_quantity,
        p.min_quantity,

        p.image_url,
        p.image_data,

        poi.quantity,
        poi.received_quantity

      FROM purchase_order_items poi

      INNER JOIN products p
        ON p.id = poi.product_id

      WHERE poi.purchase_order_id = $1

      ORDER BY p.name
    `, [id]);

    const total = itens.rows.reduce(
      (sum, item) =>
        sum + (Number(item.quantity) * Number(item.price || 0)),
      0
    );

    res.json({
      success: true,
      data: {
        ...pedido.rows[0],
        total: total,
        items: itens.rows
      }
    });

  } catch (err) {
    next(err);
  }
};


// ============================================================
// CRIAR PEDIDO DE COMPRA
// ============================================================
exports.criar = async (req, res, next) => {
  const client = await db.connect();

  try {
    const {
      items,
      supplier_id,
      supplier,
      note
    } = req.body;

    const unidadeId = await obterUnidadeUsuario(req, client);

    if (!unidadeId) {
      return res.status(409).json({
        success: false,
        message:
          'O usuário atual não está vinculado a uma unidade/loja.'
      });
    }

    // --------------------------------------------------------
    // Validar fornecedor
    // --------------------------------------------------------
    let fornecedorNome = null;
    let fornecedorId = null;

    if (
      supplier_id === undefined ||
      supplier_id === null ||
      supplier_id === ''
    ) {
      return res.status(400).json({
        success: false,
        message: 'Selecione obrigatoriamente um fornecedor antes de confirmar o pedido.'
      });
    }

    fornecedorId = Number(supplier_id);

    {

      if (!Number.isInteger(fornecedorId) || fornecedorId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Fornecedor inválido.'
        });
      }

      const fornecedorResult = await client.query(`
        SELECT
          id,
          legal_name,
          trade_name,
          status
        FROM suppliers
        WHERE id = $1
      `, [fornecedorId]);

      if (fornecedorResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Fornecedor não encontrado.'
        });
      }

      if (fornecedorResult.rows[0].status !== 'ACTIVE') {
        return res.status(409).json({
          success: false,
          message: 'O fornecedor selecionado está inativo.'
        });
      }

      fornecedorNome =
        fornecedorResult.rows[0].trade_name ||
        fornecedorResult.rows[0].legal_name;
    }

    // --------------------------------------------------------
    // Validar lista
    // --------------------------------------------------------
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Informe pelo menos um produto para o pedido.'
      });
    }

    // --------------------------------------------------------
    // Validar itens
    // --------------------------------------------------------
    const itensValidos = [];

    for (const item of items) {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);

      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Produto inválido no pedido.'
        });
      }

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: 'A quantidade de cada produto deve ser maior que zero.'
        });
      }

      itensValidos.push({
        product_id: productId,
        quantity
      });
    }

    // --------------------------------------------------------
    // Não permitir produto duplicado
    // --------------------------------------------------------
    const ids = itensValidos.map(
      item => item.product_id
    );

    if (new Set(ids).size !== ids.length) {
      return res.status(400).json({
        success: false,
        message: 'O mesmo produto não pode aparecer duas vezes no pedido.'
      });
    }

    await client.query('BEGIN');

    // --------------------------------------------------------
    // Verificar produtos
    // --------------------------------------------------------
    const produtos = await client.query(`
      SELECT
        id,
        name,
        sku,
        quantity,
        min_quantity,
        price,
        image_url,
        image_data
      FROM products
      WHERE id = ANY($1::INTEGER[])
      FOR SHARE
    `, [ids]);

    if (produtos.rows.length !== itensValidos.length) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Um ou mais produtos não foram encontrados.'
      });
    }

    // --------------------------------------------------------
    // Criar pedido
    //
    // IMPORTANTE:
    // Não usamos mais product_id/quantity da tabela
    // purchase_orders. Os produtos ficam em
    // purchase_order_items.
    // --------------------------------------------------------
    const pedido = await client.query(`
      INSERT INTO purchase_orders
        (
          supplier_id,
          supplier,
          note,
          status,
          unit_id
        )
      VALUES
        (
          $1,
          $2,
          $3,
          'PENDING',
          $4
        )
      RETURNING
        id,
        order_number,
        supplier,
        note,
        status,
        invoice_number,
        received_at,
        created_at,
        updated_at
    `, [
      fornecedorId,
      fornecedorNome,
      typeof note === 'string' && note.trim()
        ? note.trim()
        : null,

      unidadeId
    ]);

    const pedidoCriado = pedido.rows[0];

    // --------------------------------------------------------
    // Gerar número do pedido
    // --------------------------------------------------------
    await client.query(`
      UPDATE purchase_orders
      SET
        order_number =
          'PC-' || LPAD(id::TEXT, 6, '0'),
        updated_at = NOW()
      WHERE id = $1
        AND order_number IS NULL
    `, [pedidoCriado.id]);

    // --------------------------------------------------------
    // Inserir itens
    // --------------------------------------------------------
    for (const item of itensValidos) {
      await client.query(`
        INSERT INTO purchase_order_items
          (
            purchase_order_id,
            product_id,
            quantity,
            received_quantity
          )
        VALUES
          (
            $1,
            $2,
            $3,
            0
          )
      `, [
        pedidoCriado.id,
        item.product_id,
        item.quantity
      ]);
    }

    await client.query('COMMIT');

    // --------------------------------------------------------
    // Buscar pedido criado completo
    // --------------------------------------------------------
    const completo = await db.query(`
      SELECT
        po.id,
        po.order_number,
        po.supplier,
        po.note,
        po.status,
        po.invoice_number,
        po.received_at,
        po.created_at,
        po.updated_at
      FROM purchase_orders po
      WHERE po.id = $1
    `, [pedidoCriado.id]);

    const itens = await db.query(`
      SELECT
        poi.id,
        poi.product_id,

        p.name AS product_name,
        p.sku,
        p.barcode,

        p.price,
        p.quantity AS current_quantity,
        p.min_quantity,

        p.image_url,
        p.image_data,

        poi.quantity,
        poi.received_quantity

      FROM purchase_order_items poi

      INNER JOIN products p
        ON p.id = poi.product_id

      WHERE poi.purchase_order_id = $1

      ORDER BY p.name
    `, [pedidoCriado.id]);

    const total = itens.rows.reduce(
      (sum, item) =>
        sum + (
          Number(item.quantity) *
          Number(item.price || 0)
        ),
      0
    );

    res.status(201).json({
      success: true,
      message: 'Pedido de compra criado com sucesso.',
      data: {
        ...completo.rows[0],
        total,
        items: itens.rows
      }
    });

  } catch (err) {

    try {
      await client.query('ROLLBACK');
    } catch (_) {}

    next(err);

  } finally {
    client.release();
  }
};


// ============================================================
// ATUALIZAR STATUS
// ============================================================
exports.atualizarStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // O fluxo oficial possui endpoints específicos.
    // Este endpoint antigo só continua permitindo o envio ao fornecedor.
    if (status !== 'SENT') {
      return res.status(400).json({
        success: false,
        message:
          'Esta alteração deve ser feita pela ação específica da etapa do pedido.'
      });
    }

    const result = await db.query(`
      UPDATE purchase_orders
      SET
        status = 'SENT',
        updated_at = NOW()
      WHERE id = $1
        AND status = 'PENDING'
        AND supplier_id IS NOT NULL
      RETURNING
        id,
        order_number,
        supplier_id,
        supplier,
        status,
        invoice_number,
        received_at,
        created_at,
        updated_at
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(409).json({
        success: false,
        message:
          'O pedido precisa estar pendente e possuir fornecedor antes de ser enviado.'
      });
    }

    res.json({
      success: true,
      message: 'Pedido enviado ao fornecedor.',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// CONFIRMAR PELO FORNECEDOR
// ============================================================
exports.confirmar = async (req, res, next) => {
  try {
    const result = await db.query(`
      UPDATE purchase_orders
      SET
        status = 'CONFIRMED',
        updated_at = NOW()
      WHERE id = $1
        AND status = 'SENT'
        AND supplier_id IS NOT NULL
      RETURNING
        id,
        order_number,
        supplier_id,
        supplier,
        status,
        created_at,
        updated_at
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(409).json({
        success: false,
        message:
          'O pedido precisa estar enviado ao fornecedor antes de ser confirmado.'
      });
    }

    res.json({
      success: true,
      message: 'Confirmação do fornecedor registrada.',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};


// ============================================================
// RECEBER PEDIDO
// ============================================================
exports.receber = async (req, res, next) => {
  const client = await db.connect();

  try {
    const id = Number(req.params.id);

    await client.query('BEGIN');

    const pedido = await client.query(`
      SELECT
        id,
        order_number,
        unit_id,
        supplier_id,
        supplier,
        status
      FROM purchase_orders
      WHERE id = $1
      FOR UPDATE
    `, [id]);

    if (pedido.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Pedido de compra não encontrado.'
      });
    }

    const ordem = pedido.rows[0];

    if (ordem.status !== 'CONFIRMED') {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          'O pedido precisa estar confirmado pelo fornecedor antes do recebimento.'
      });
    }

    const unidadeUsuario = await obterUnidadeUsuario(req, client);

    if (!unidadeUsuario || unidadeUsuario !== Number(ordem.unit_id)) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message:
          'Você não pode receber um pedido destinado a outra unidade.'
      });
    }

    const itens = await client.query(`
      SELECT
        id,
        product_id,
        quantity,
        received_quantity
      FROM purchase_order_items
      WHERE purchase_order_id = $1
      ORDER BY id
    `, [id]);

    if (itens.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          'O pedido não possui produtos para recebimento.'
      });
    }

    for (const item of itens.rows) {
      const quantidade = Number(item.quantity);

      if (!Number.isFinite(quantidade) || quantidade <= 0) {
        await client.query('ROLLBACK');

        return res.status(409).json({
          success: false,
          message:
            'Foi encontrada uma quantidade inválida em um dos itens do pedido.'
        });
      }

      await client.query(`
        INSERT INTO product_stocks
          (
            product_id,
            unit_id,
            quantity,
            reserved_quantity
          )
        VALUES
          (
            $1,
            $2,
            $3,
            0
          )
        ON CONFLICT (product_id, unit_id)
        DO UPDATE SET
          quantity =
            product_stocks.quantity + EXCLUDED.quantity,
          updated_at = NOW()
      `, [
        item.product_id,
        ordem.unit_id,
        quantidade
      ]);

      await client.query(`
        UPDATE purchase_order_items
        SET
          received_quantity = quantity
        WHERE id = $1
      `, [item.id]);
    }

    const result = await client.query(`
      UPDATE purchase_orders
      SET
        status = 'RECEIVED',
        received_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        order_number,
        unit_id,
        supplier_id,
        supplier,
        status,
        received_at,
        created_at,
        updated_at
    `, [id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message:
        'Recebimento registrado e estoque da unidade atualizado.',
      data: result.rows[0]
    });

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};

// ============================================================
// CANCELAR PEDIDO
// ============================================================
// Permitido somente enquanto o fornecedor ainda não confirmou.
// Prazo máximo: 24 horas após a criação.
// ============================================================
exports.cancelar = async (req, res, next) => {
  try {
    const result = await db.query(`
      UPDATE purchase_orders
      SET
        status = 'CANCELLED',
        updated_at = NOW()
      WHERE id = $1
        AND status IN ('PENDING', 'SENT')
        AND created_at >= NOW() - INTERVAL '24 hours'
      RETURNING
        id,
        order_number,
        supplier_id,
        supplier,
        status,
        created_at,
        updated_at
    `, [req.params.id]);

    if (result.rows.length > 0) {
      return res.json({
        success: true,
        message: 'Pedido de compra cancelado com sucesso.',
        data: result.rows[0]
      });
    }

    const verificacao = await db.query(`
      SELECT
        status,
        created_at
      FROM purchase_orders
      WHERE id = $1
    `, [req.params.id]);

    if (verificacao.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pedido de compra não encontrado.'
      });
    }

    const pedido = verificacao.rows[0];

    if (pedido.status === 'CONFIRMED') {
      return res.status(409).json({
        success: false,
        message:
          'O pedido já foi confirmado pelo fornecedor e não pode mais ser cancelado.'
      });
    }

    if (pedido.status === 'RECEIVED') {
      return res.status(409).json({
        success: false,
        message:
          'O pedido já foi recebido e não pode ser cancelado.'
      });
    }

    if (pedido.status === 'CANCELLED') {
      return res.status(409).json({
        success: false,
        message: 'Este pedido já está cancelado.'
      });
    }

    return res.status(409).json({
      success: false,
      message:
        'O prazo de cancelamento deste pedido terminou.'
    });

  } catch (err) {
    next(err);
  }
};

exports.atualizar = async (req, res, next) => {
  const client = await db.connect();

  try {
    const id = Number(req.params.id);

    const {
      supplier_id,
      note,
      invoice_number,
      items
    } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Pedido inválido.'
      });
    }

    if (
      supplier_id === undefined ||
      supplier_id === null ||
      supplier_id === ''
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Selecione obrigatoriamente um fornecedor.'
      });
    }

    const fornecedorId = Number(supplier_id);

    if (
      !Number.isInteger(fornecedorId) ||
      fornecedorId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Fornecedor inválido.'
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          'O pedido precisa possuir pelo menos um produto.'
      });
    }

    const itensValidos = items.map((item) => ({
      product_id: Number(item.product_id),
      quantity: Number(item.quantity)
    }));

    if (
      itensValidos.some(
        (item) =>
          !Number.isInteger(item.product_id) ||
          item.product_id <= 0 ||
          !Number.isFinite(item.quantity) ||
          item.quantity <= 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Todos os produtos e quantidades precisam ser válidos.'
      });
    }

    const ids = itensValidos.map(
      (item) => item.product_id
    );

    if (new Set(ids).size !== ids.length) {
      return res.status(400).json({
        success: false,
        message:
          'O mesmo produto não pode aparecer duas vezes no pedido.'
      });
    }

    await client.query('BEGIN');

    const pedido = await client.query(`
      SELECT
        id,
        status,
        unit_id
      FROM purchase_orders
      WHERE id = $1
      FOR UPDATE
    `, [id]);

    if (pedido.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Pedido de compra não encontrado.'
      });
    }

    if (
      !['PENDING', 'SENT'].includes(
        pedido.rows[0].status
      )
    ) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          'Somente pedidos pendentes ou ainda não confirmados pelo fornecedor podem ser editados diretamente.'
      });
    }

    const fornecedor = await client.query(`
      SELECT
        id,
        legal_name,
        trade_name,
        status
      FROM suppliers
      WHERE id = $1
    `, [fornecedorId]);

    if (fornecedor.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Fornecedor não encontrado.'
      });
    }

    if (fornecedor.rows[0].status !== 'ACTIVE') {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message: 'O fornecedor selecionado está inativo.'
      });
    }

    const produtos = await client.query(`
      SELECT id
      FROM products
      WHERE id = ANY($1::INTEGER[])
    `, [ids]);

    if (produtos.rows.length !== itensValidos.length) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message:
          'Um ou mais produtos não foram encontrados.'
      });
    }

    const fornecedorNome =
      fornecedor.rows[0].trade_name ||
      fornecedor.rows[0].legal_name;

    await client.query(`
      UPDATE purchase_orders
      SET
        supplier_id = $1,
        supplier = $2,
        note = $3,
        invoice_number = $4,
        status = CASE
          WHEN status = 'SENT'
          THEN 'PENDING'
          ELSE status
        END,
        updated_at = NOW()
      WHERE id = $5
    `, [
      fornecedorId,
      fornecedorNome,
      typeof note === 'string'
        ? note.trim() || null
        : null,
      typeof invoice_number === 'string'
        ? invoice_number.trim() || null
        : null,
      id
    ]);

    await client.query(`
      DELETE FROM purchase_order_items
      WHERE purchase_order_id = $1
    `, [id]);

    for (const item of itensValidos) {
      await client.query(`
        INSERT INTO purchase_order_items
          (
            purchase_order_id,
            product_id,
            quantity,
            received_quantity
          )
        VALUES
          (
            $1,
            $2,
            $3,
            0
          )
      `, [
        id,
        item.product_id,
        item.quantity
      ]);
    }

    const atualizado = await client.query(`
      SELECT
        po.id,
        po.order_number,
        po.supplier_id,
        COALESCE(
          s.trade_name,
          s.legal_name,
          po.supplier
        ) AS supplier,
        po.note,
        po.status,
        po.invoice_number,
        po.received_at,
        po.created_at,
        po.updated_at
      FROM purchase_orders po
      LEFT JOIN suppliers s
        ON s.id = po.supplier_id
      WHERE po.id = $1
    `, [id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message:
        'Pedido de compra atualizado com sucesso.',
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
// EXCLUIR PEDIDO — BLOQUEADO
// ============================================================
exports.excluir = async (req, res) => {
  return res.status(409).json({
    success: false,
    message:
      'Pedidos de compra não podem ser apagados. Use o cancelamento ou uma solicitação para preservar o histórico.'
  });
};

// ============================================================
// EXCLUIR PEDIDO
// ============================================================
exports.excluir = async (req, res, next) => {
  const client = await db.connect();

  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // --------------------------------------------------------
    // Buscar pedido
    // --------------------------------------------------------
    const pedido = await client.query(`
      SELECT
        id,
        order_number,
        status
      FROM purchase_orders
      WHERE id = $1
      FOR UPDATE
    `, [id]);

    if (pedido.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Pedido de compra não encontrado.'
      });
    }

    // --------------------------------------------------------
    // Excluir itens primeiro
    // --------------------------------------------------------
    await client.query(`
      DELETE FROM purchase_order_items
      WHERE purchase_order_id = $1
    `, [id]);

    // --------------------------------------------------------
    // Excluir pedido
    // --------------------------------------------------------
    await client.query(`
      DELETE FROM purchase_orders
      WHERE id = $1
    `, [id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Pedido de compra excluído com sucesso.'
    });

  } catch (err) {

    try {
      await client.query('ROLLBACK');
    } catch (_) {}

    next(err);

  } finally {
    client.release();
  }
};


// ============================================================
// SOLICITAR CANCELAMENTO APÓS CONFIRMAÇÃO
// ============================================================

if (!exports.solicitarCancelamento) {
  exports.solicitarCancelamento = async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const reason = String(req.body?.reason || '').trim();

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Pedido inválido.'
        });
      }

      if (!reason) {
        return res.status(400).json({
          success: false,
          message:
            'Informe o motivo da solicitação de cancelamento.'
        });
      }

      const pedido = await db.query(`
        SELECT
          id,
          order_number,
          status
        FROM purchase_orders
        WHERE id = $1
      `, [id]);

      if (pedido.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Pedido de compra não encontrado.'
        });
      }

      if (pedido.rows[0].status !== 'CONFIRMED') {
        return res.status(409).json({
          success: false,
          message:
            'A solicitação de cancelamento só pode ser feita após a confirmação do fornecedor.'
        });
      }

      const existente = await db.query(`
        SELECT id
        FROM purchase_order_requests
        WHERE purchase_order_id = $1
          AND request_type = 'CANCELLATION'
          AND status = 'PENDING'
        LIMIT 1
      `, [id]);

      if (existente.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message:
            'Já existe uma solicitação de cancelamento pendente para este pedido.'
        });
      }

      const result = await db.query(`
        INSERT INTO purchase_order_requests
        (
          purchase_order_id,
          request_type,
          status,
          reason,
          requested_data,
          requested_by
        )
        VALUES
        (
          $1,
          'CANCELLATION',
          'PENDING',
          $2,
          NULL,
          $3
        )
        RETURNING *
      `, [
        id,
        reason,
        req.user.id
      ]);

      res.status(201).json({
        success: true,
        message:
          'Solicitação de cancelamento enviada ao fornecedor.',
        data: result.rows[0]
      });

    } catch (err) {
      next(err);
    }
  };
}


// ============================================================
// SOLICITAR ALTERAÇÃO APÓS ENVIO/CONFIRMAÇÃO
// ============================================================

if (!exports.solicitarAlteracao) {
  exports.solicitarAlteracao = async (req, res, next) => {
    try {
      const id = Number(req.params.id);

      const reason =
        String(req.body?.reason || '').trim();

      const supplierId =
        Number(req.body?.supplier_id);

      const note =
        typeof req.body?.note === 'string'
          ? req.body.note.trim()
          : null;

      const items = req.body?.items;

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Pedido inválido.'
        });
      }

      if (!reason) {
        return res.status(400).json({
          success: false,
          message:
            'Informe o motivo da alteração.'
        });
      }

      if (
        !Number.isInteger(supplierId) ||
        supplierId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Selecione um fornecedor válido.'
        });
      }

      if (
        !Array.isArray(items) ||
        items.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Informe pelo menos um produto para a alteração.'
        });
      }

      const itensValidos = items.map((item) => ({
        product_id: Number(item.product_id),
        quantity: Number(item.quantity)
      }));

      if (
        itensValidos.some(
          (item) =>
            !Number.isInteger(item.product_id) ||
            item.product_id <= 0 ||
            !Number.isFinite(item.quantity) ||
            item.quantity <= 0
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Todos os produtos e quantidades precisam ser válidos.'
        });
      }

      const pedido = await db.query(`
        SELECT
          id,
          status,
          supplier_id
        FROM purchase_orders
        WHERE id = $1
      `, [id]);

      if (pedido.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            'Pedido de compra não encontrado.'
        });
      }

      if (
        !['SENT', 'CONFIRMED'].includes(
          pedido.rows[0].status
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            'O pedido não está em uma etapa que permita solicitar alteração.'
        });
      }

      const fornecedor = await db.query(`
        SELECT
          id,
          legal_name,
          trade_name,
          status
        FROM suppliers
        WHERE id = $1
      `, [supplierId]);

      if (fornecedor.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Fornecedor não encontrado.'
        });
      }

      if (fornecedor.rows[0].status !== 'ACTIVE') {
        return res.status(409).json({
          success: false,
          message:
            'O fornecedor selecionado está inativo.'
        });
      }

      const existente = await db.query(`
        SELECT id
        FROM purchase_order_requests
        WHERE purchase_order_id = $1
          AND request_type = 'CHANGE'
          AND status = 'PENDING'
        LIMIT 1
      `, [id]);

      if (existente.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message:
            'Já existe uma solicitação de alteração pendente para este pedido.'
        });
      }

      const requestedData = {
        supplier_id: supplierId,
        note,
        items: itensValidos
      };

      const result = await db.query(`
        INSERT INTO purchase_order_requests
        (
          purchase_order_id,
          request_type,
          status,
          reason,
          requested_data,
          requested_by
        )
        VALUES
        (
          $1,
          'CHANGE',
          'PENDING',
          $2,
          $3::jsonb,
          $4
        )
        RETURNING *
      `, [
        id,
        reason,
        JSON.stringify(requestedData),
        req.user.id
      ]);

      res.status(201).json({
        success: true,
        message:
          'Solicitação de alteração enviada ao fornecedor.',
        data: result.rows[0]
      });

    } catch (err) {
      next(err);
    }
  };
}


// ============================================================
// LISTAR SOLICITAÇÕES DE UM PEDIDO
// ============================================================

if (!exports.listarSolicitacoes) {
  exports.listarSolicitacoes = async (req, res, next) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Pedido inválido.'
        });
      }

      const result = await db.query(`
        SELECT
          r.id,
          r.purchase_order_id,
          r.request_type,
          r.status,
          r.reason,
          r.requested_data,
          r.requested_by,
          r.responded_at,
          r.response_note,
          r.created_at,
          r.updated_at
        FROM purchase_order_requests r
        WHERE r.purchase_order_id = $1
        ORDER BY r.created_at DESC
      `, [id]);

      res.json({
        success: true,
        data: result.rows
      });

    } catch (err) {
      next(err);
    }
  };
}


// ============================================================
// RESPONDER SOLICITAÇÃO
// ============================================================
// APPROVED = aceita
// REJECTED = recusa
//
// IMPORTANTE:
// A aprovação de CANCELAMENTO altera o pedido para CANCELLED.
// A aprovação de CHANGE aplica os novos dados ao pedido.
// ============================================================

if (!exports.responderSolicitacao) {
  exports.responderSolicitacao = async (req, res, next) => {
    const client = await db.connect();

    try {
      const id = Number(req.params.id);

      const decision =
        String(
          req.body?.decision || ''
        ).toUpperCase();

      const responseNote =
        typeof req.body?.response_note === 'string'
          ? req.body.response_note.trim()
          : null;

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Solicitação inválida.'
        });
      }

      if (
        !['APPROVED', 'REJECTED'].includes(
          decision
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'A decisão deve ser APPROVED ou REJECTED.'
        });
      }

      await client.query('BEGIN');

      const request = await client.query(`
        SELECT
          r.*,
          po.status AS order_status
        FROM purchase_order_requests r
        INNER JOIN purchase_orders po
          ON po.id = r.purchase_order_id
        WHERE r.id = $1
        FOR UPDATE
      `, [id]);

      if (request.rows.length === 0) {
        await client.query('ROLLBACK');

        return res.status(404).json({
          success: false,
          message:
            'Solicitação não encontrada.'
        });
      }

      const solicitacao =
        request.rows[0];

      if (solicitacao.status !== 'PENDING') {
        await client.query('ROLLBACK');

        return res.status(409).json({
          success: false,
          message:
            'Esta solicitação já foi respondida.'
        });
      }

      // ------------------------------------------------------
      // RECUSADA
      // ------------------------------------------------------

      if (decision === 'REJECTED') {

        const result =
          await client.query(`
            UPDATE purchase_order_requests
            SET
              status = 'REJECTED',
              responded_at = NOW(),
              response_note = $2,
              updated_at = NOW()
            WHERE id = $1
            RETURNING *
          `, [
            id,
            responseNote
          ]);

        await client.query('COMMIT');

        return res.json({
          success: true,
          message:
            'Solicitação recusada.',
          data: result.rows[0]
        });
      }

      // ------------------------------------------------------
      // CANCELAMENTO APROVADO
      // ------------------------------------------------------

      if (
        solicitacao.request_type ===
        'CANCELLATION'
      ) {

        if (
          !['SENT', 'CONFIRMED'].includes(
            solicitacao.order_status
          )
        ) {
          await client.query('ROLLBACK');

          return res.status(409).json({
            success: false,
            message:
              'O pedido não está mais em uma etapa que permita cancelamento.'
          });
        }

        await client.query(`
          UPDATE purchase_orders
          SET
            status = 'CANCELLED',
            updated_at = NOW()
          WHERE id = $1
        `, [
          solicitacao.purchase_order_id
        ]);
      }

      // ------------------------------------------------------
      // ALTERAÇÃO APROVADA
      // ------------------------------------------------------

      if (
        solicitacao.request_type ===
        'CHANGE'
      ) {

        const dados =
          solicitacao.requested_data || {};

        const supplierId =
          Number(dados.supplier_id);

        const note =
          typeof dados.note === 'string'
            ? dados.note
            : null;

        const items =
          Array.isArray(dados.items)
            ? dados.items
            : [];

        if (
          !Number.isInteger(supplierId) ||
          supplierId <= 0 ||
          items.length === 0
        ) {
          await client.query('ROLLBACK');

          return res.status(409).json({
            success: false,
            message:
              'Os dados da alteração são inválidos.'
          });
        }

        const fornecedor =
          await client.query(`
            SELECT
              id,
              legal_name,
              trade_name,
              status
            FROM suppliers
            WHERE id = $1
          `, [supplierId]);

        if (
          fornecedor.rows.length === 0 ||
          fornecedor.rows[0].status !== 'ACTIVE'
        ) {
          await client.query('ROLLBACK');

          return res.status(409).json({
            success: false,
            message:
              'O fornecedor da alteração é inválido ou está inativo.'
          });
        }

        const ids =
          items.map(
            (item) =>
              Number(item.product_id)
          );

        const produtos =
          await client.query(`
            SELECT id
            FROM products
            WHERE id = ANY($1::INTEGER[])
          `, [ids]);

        if (
          produtos.rows.length !==
          items.length
        ) {
          await client.query('ROLLBACK');

          return res.status(409).json({
            success: false,
            message:
              'Um ou mais produtos da alteração não existem.'
          });
        }

        await client.query(`
          UPDATE purchase_orders
          SET
            supplier_id = $1,
            supplier = (
              SELECT COALESCE(
                trade_name,
                legal_name
              )
              FROM suppliers
              WHERE id = $1
            ),
            note = $2,
            status = 'SENT',
            updated_at = NOW()
          WHERE id = $3
        `, [
          supplierId,
          note,
          solicitacao.purchase_order_id
        ]);

        await client.query(`
          DELETE FROM purchase_order_items
          WHERE purchase_order_id = $1
        `, [
          solicitacao.purchase_order_id
        ]);

        for (const item of items) {

          const productId =
            Number(item.product_id);

          const quantity =
            Number(item.quantity);

          if (
            !Number.isInteger(productId) ||
            productId <= 0 ||
            !Number.isFinite(quantity) ||
            quantity <= 0
          ) {
            await client.query('ROLLBACK');

            return res.status(409).json({
              success: false,
              message:
                'Produto ou quantidade inválida na alteração.'
            });
          }

          await client.query(`
            INSERT INTO purchase_order_items
            (
              purchase_order_id,
              product_id,
              quantity,
              received_quantity
            )
            VALUES
            (
              $1,
              $2,
              $3,
              0
            )
          `, [
            solicitacao.purchase_order_id,
            productId,
            quantity
          ]);
        }
      }

      const atualizado =
        await client.query(`
          UPDATE purchase_order_requests
          SET
            status = 'APPROVED',
            responded_at = NOW(),
            response_note = $2,
            updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `, [
          id,
          responseNote
        ]);

      await client.query('COMMIT');

      res.json({
        success: true,
        message:
          'Solicitação aprovada com sucesso.',
        data: atualizado.rows[0]
      });

    } catch (err) {
      await client.query(
        'ROLLBACK'
      ).catch(() => {});

      next(err);

    } finally {
      client.release();
    }
  };
}

