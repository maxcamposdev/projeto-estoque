const db = require('../config/db');

function unidadeUsuario(req) {
  const id = Number(req.user?.unit_id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// ============================================================
// LISTAR OUTRAS UNIDADES
// ============================================================
exports.listarUnidades = async (req, res, next) => {
  try {
    const minhaUnidade = unidadeUsuario(req);

    if (!minhaUnidade) {
      return res.status(403).json({
        success: false,
        message: 'Usuário não possui uma unidade vinculada.'
      });
    }

    const { rows } = await db.query(`
      SELECT
        id,
        code,
        name,
        description,
        city,
        state
      FROM units
      WHERE status = 'ACTIVE'
        AND id <> $1
      ORDER BY name
    `, [minhaUnidade]);

    res.json({
      success: true,
      unidades: rows
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// CONSULTAR ESTOQUE DE OUTRA UNIDADE
// ============================================================
exports.consultarEstoque = async (req, res, next) => {
  try {
    const minhaUnidade = unidadeUsuario(req);
    const unitId = Number(req.query.unit_id);
    const busca = String(req.query.busca || '').trim();

    if (!minhaUnidade) {
      return res.status(403).json({
        success: false,
        message: 'Usuário não possui uma unidade vinculada.'
      });
    }

    if (!Number.isInteger(unitId) || unitId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Informe uma unidade válida.'
      });
    }

    if (unitId === minhaUnidade) {
      return res.status(400).json({
        success: false,
        message: 'A unidade de origem deve ser diferente da sua unidade.'
      });
    }

    const unidade = await db.query(`
      SELECT id, name
      FROM units
      WHERE id = $1
        AND status = 'ACTIVE'
    `, [unitId]);

    if (unidade.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Unidade não encontrada.'
      });
    }

    const params = [unitId];
    let where = '';

    if (busca) {
      params.push(`%${busca}%`);
      const n = params.length;

      where = `
        AND (
          p.name ILIKE $${n}
          OR p.sku ILIKE $${n}
          OR p.barcode ILIKE $${n}
          OR REGEXP_REPLACE(
            COALESCE(p.barcode, ''),
            '[^0-9]',
            '',
            'g'
          ) ILIKE $${n}
        )
      `;
    }

    const { rows } = await db.query(`
      SELECT
        p.id AS product_id,
        p.name,
        p.sku,
        p.barcode,
        p.price,
        COALESCE(ps.quantity, 0) AS quantity,
        COALESCE(ps.reserved_quantity, 0) AS reserved_quantity,
        (
          COALESCE(ps.quantity, 0)
          - COALESCE(ps.reserved_quantity, 0)
        ) AS available_quantity
      FROM products p
      LEFT JOIN product_stocks ps
        ON ps.product_id = p.id
       AND ps.unit_id = $1
      WHERE 1 = 1
        ${where}
      ORDER BY p.name
      LIMIT 30
    `, params);

    res.json({
      success: true,
      unidade: unidade.rows[0],
      produtos: rows
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// CRIAR SOLICITAÇÃO DE TRANSFERÊNCIA
// ============================================================
exports.criar = async (req, res, next) => {
  const client = await db.connect();

  try {
    const minhaUnidade = unidadeUsuario(req);

    if (!minhaUnidade) {
      return res.status(403).json({
        success: false,
        message: 'Usuário não possui uma unidade vinculada.'
      });
    }

    const {
      origin_unit_id,
      items,
      note
    } = req.body;

    const origem = Number(origin_unit_id);

    if (!Number.isInteger(origem) || origem <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Unidade de origem inválida.'
      });
    }

    if (origem === minhaUnidade) {
      return res.status(400).json({
        success: false,
        message: 'A solicitação deve ser feita para outra unidade.'
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Adicione pelo menos um produto.'
      });
    }

    const itens = [];

    for (const item of items) {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);

      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Produto inválido.'
        });
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'A quantidade deve ser maior que zero.'
        });
      }

      itens.push({
        product_id: productId,
        quantity
      });
    }

    const ids = itens.map((item) => item.product_id);

    if (new Set(ids).size !== ids.length) {
      return res.status(400).json({
        success: false,
        message: 'O mesmo produto não pode ser repetido.'
      });
    }

    await client.query('BEGIN');

    const unidades = await client.query(`
      SELECT id
      FROM units
      WHERE id = ANY($1::INTEGER[])
        AND status = 'ACTIVE'
    `, [[origem, minhaUnidade]]);

    if (unidades.rows.length !== 2) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Uma das unidades não foi encontrada.'
      });
    }

    const produtos = await client.query(`
      SELECT id
      FROM products
      WHERE id = ANY($1::INTEGER[])
    `, [ids]);

    if (produtos.rows.length !== itens.length) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Um ou mais produtos não foram encontrados.'
      });
    }

    const pedido = await client.query(`
      INSERT INTO stock_transfer_requests (
        origin_unit_id,
        destination_unit_id,
        status,
        note,
        created_by
      )
      VALUES (
        $1,
        $2,
        'PENDING',
        $3,
        $4
      )
      RETURNING id
    `, [
      origem,
      minhaUnidade,
      typeof note === 'string' && note.trim()
        ? note.trim()
        : null,
      req.user.id
    ]);

    const transferId = pedido.rows[0].id;

    await client.query(`
      UPDATE stock_transfer_requests
      SET request_number =
        'TR-' || LPAD(id::TEXT, 6, '0')
      WHERE id = $1
    `, [transferId]);

    for (const item of itens) {
      await client.query(`
        INSERT INTO stock_transfer_items (
          transfer_request_id,
          product_id,
          quantity_requested
        )
        VALUES ($1, $2, $3)
      `, [
        transferId,
        item.product_id,
        item.quantity
      ]);
    }

    await client.query('COMMIT');

    const result = await db.query(`
      SELECT
        str.id,
        str.request_number,
        str.status,
        str.note,
        str.created_at,
        ou.name AS origin_unit_name,
        du.name AS destination_unit_name
      FROM stock_transfer_requests str
      INNER JOIN units ou
        ON ou.id = str.origin_unit_id
      INNER JOIN units du
        ON du.id = str.destination_unit_id
      WHERE str.id = $1
    `, [transferId]);

    res.status(201).json({
      success: true,
      message: 'Solicitação de transferência criada com sucesso.',
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
// LISTAR SOLICITAÇÕES DA UNIDADE
// ============================================================
exports.listar = async (req, res, next) => {
  try {
    const minhaUnidade = unidadeUsuario(req);

    if (!minhaUnidade) {
      return res.status(403).json({
        success: false,
        message: 'Usuário não possui uma unidade vinculada.'
      });
    }

    const { rows: pedidos } = await db.query(`
      SELECT
        str.id,
        str.request_number,
        str.origin_unit_id,
        str.destination_unit_id,
        str.status,
        str.note,
        str.created_at,
        ou.name AS origin_unit_name,
        du.name AS destination_unit_name
      FROM stock_transfer_requests str
      INNER JOIN units ou
        ON ou.id = str.origin_unit_id
      INNER JOIN units du
        ON du.id = str.destination_unit_id
      WHERE str.origin_unit_id = $1
         OR str.destination_unit_id = $1
      ORDER BY str.created_at DESC
    `, [minhaUnidade]);

    const resultado = [];

    for (const pedido of pedidos) {
      const { rows: items } = await db.query(`
        SELECT
          sti.id,
          sti.product_id,
          p.name AS product_name,
          p.sku,
          p.barcode,
          sti.quantity_requested,
          sti.quantity_approved,
          sti.quantity_shipped,
          sti.quantity_received
        FROM stock_transfer_items sti
        INNER JOIN products p
          ON p.id = sti.product_id
        WHERE sti.transfer_request_id = $1
        ORDER BY p.name
      `, [pedido.id]);

      resultado.push({
        ...pedido,
        items
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
// APROVAR — SOMENTE UNIDADE DE ORIGEM
// ============================================================
exports.aprovar = async (req, res, next) => {
  const client = await db.connect();

  try {
    const minhaUnidade = unidadeUsuario(req);

    await client.query('BEGIN');

    const pedido = await client.query(`
      SELECT *
      FROM stock_transfer_requests
      WHERE id = $1
      FOR UPDATE
    `, [req.params.id]);

    if (pedido.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Solicitação não encontrada.'
      });
    }

    const solicitacao = pedido.rows[0];

    if (Number(solicitacao.origin_unit_id) !== minhaUnidade) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message: 'Somente a unidade de origem pode aprovar esta solicitação.'
      });
    }

    if (solicitacao.status !== 'PENDING') {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message: 'Esta solicitação não está pendente.'
      });
    }

    const { rows: itens } = await client.query(`
      SELECT
        sti.*,
        COALESCE(ps.quantity, 0) AS quantity,
        COALESCE(ps.reserved_quantity, 0) AS reserved_quantity
      FROM stock_transfer_items sti
      LEFT JOIN product_stocks ps
        ON ps.product_id = sti.product_id
       AND ps.unit_id = $1
      WHERE sti.transfer_request_id = $2
      FOR UPDATE
    `, [
      solicitacao.origin_unit_id,
      solicitacao.id
    ]);

    for (const item of itens) {
      const disponivel =
        Number(item.quantity) -
        Number(item.reserved_quantity);

      if (disponivel < Number(item.quantity_requested)) {
        await client.query('ROLLBACK');

        return res.status(409).json({
          success: false,
          message: `Estoque disponível insuficiente para o produto ID ${item.product_id}.`,
          disponivel,
          solicitado: Number(item.quantity_requested)
        });
      }
    }

    for (const item of itens) {
      await client.query(`
        UPDATE product_stocks
        SET
          reserved_quantity =
            reserved_quantity + $1,
          updated_at = NOW()
        WHERE product_id = $2
          AND unit_id = $3
      `, [
        item.quantity_requested,
        item.product_id,
        solicitacao.origin_unit_id
      ]);

      await client.query(`
        UPDATE stock_transfer_items
        SET
          quantity_approved = quantity_requested
        WHERE id = $1
      `, [item.id]);
    }

    await client.query(`
      UPDATE stock_transfer_requests
      SET
        status = 'APPROVED',
        approved_by = $1,
        updated_at = NOW()
      WHERE id = $2
    `, [req.user.id, solicitacao.id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Solicitação aprovada e estoque reservado.'
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};

// ============================================================
// RECUSAR — SOMENTE UNIDADE DE ORIGEM
// ============================================================
exports.recusar = async (req, res, next) => {
  try {
    const minhaUnidade = unidadeUsuario(req);

    const result = await db.query(`
      UPDATE stock_transfer_requests
      SET
        status = 'REJECTED',
        updated_at = NOW()
      WHERE id = $1
        AND origin_unit_id = $2
        AND status = 'PENDING'
      RETURNING id
    `, [
      req.params.id,
      minhaUnidade
    ]);

    if (result.rows.length === 0) {
      return res.status(409).json({
        success: false,
        message: 'Não foi possível recusar esta solicitação.'
      });
    }

    res.json({
      success: true,
      message: 'Solicitação recusada.'
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// ENVIAR — SOMENTE UNIDADE DE ORIGEM
// ============================================================
exports.enviar = async (req, res, next) => {
  try {
    const minhaUnidade = unidadeUsuario(req);

    const result = await db.query(`
      UPDATE stock_transfer_requests
      SET
        status = 'SHIPPED',
        updated_at = NOW()
      WHERE id = $1
        AND origin_unit_id = $2
        AND status = 'APPROVED'
      RETURNING id
    `, [
      req.params.id,
      minhaUnidade
    ]);

    if (result.rows.length === 0) {
      return res.status(409).json({
        success: false,
        message: 'A solicitação precisa estar aprovada antes do envio.'
      });
    }

    res.json({
      success: true,
      message: 'Transferência marcada como enviada.'
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// RECEBER — SOMENTE UNIDADE DE DESTINO
// ============================================================
exports.receber = async (req, res, next) => {
  const client = await db.connect();

  try {
    const minhaUnidade = unidadeUsuario(req);
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Informe as quantidades recebidas.'
      });
    }

    await client.query('BEGIN');

    const pedido = await client.query(`
      SELECT *
      FROM stock_transfer_requests
      WHERE id = $1
      FOR UPDATE
    `, [req.params.id]);

    if (pedido.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Solicitação não encontrada.'
      });
    }

    const solicitacao = pedido.rows[0];

    if (Number(solicitacao.destination_unit_id) !== minhaUnidade) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message: 'Somente a unidade de destino pode confirmar o recebimento.'
      });
    }

    if (!['SHIPPED', 'PARTIAL'].includes(solicitacao.status)) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message: 'A transferência ainda não está disponível para recebimento.'
      });
    }

    const requested = new Map(
      items.map((item) => [
        Number(item.item_id),
        Number(item.quantity_received)
      ])
    );

    const { rows: itens } = await client.query(`
      SELECT
        sti.*,
        p.name,
        p.sku
      FROM stock_transfer_items sti
      INNER JOIN products p
        ON p.id = sti.product_id
      WHERE sti.transfer_request_id = $1
      FOR UPDATE
    `, [solicitacao.id]);

    for (const item of itens) {
      if (!requested.has(Number(item.id))) {
        continue;
      }

      const recebidoAgora = Number(
        requested.get(Number(item.id))
      );

      const recebidoAnterior = Number(
        item.quantity_received
      );

      const totalRecebido =
        recebidoAnterior + recebidoAgora;

      const aprovado = Number(
        item.quantity_approved
      );

      if (
        !Number.isFinite(recebidoAgora) ||
        recebidoAgora < 0 ||
        totalRecebido > aprovado
      ) {
        await client.query('ROLLBACK');

        return res.status(400).json({
          success: false,
          message: `Quantidade recebida inválida para ${item.name}.`
        });
      }

      if (recebidoAgora === 0) {
        continue;
      }

      const origemStock = await client.query(`
        SELECT *
        FROM product_stocks
        WHERE product_id = $1
          AND unit_id = $2
        FOR UPDATE
      `, [
        item.product_id,
        solicitacao.origin_unit_id
      ]);

      if (origemStock.rows.length === 0) {
        await client.query('ROLLBACK');

        return res.status(409).json({
          success: false,
          message: `Estoque de origem não encontrado para ${item.name}.`
        });
      }

      await client.query(`
        UPDATE product_stocks
        SET
          quantity = quantity - $1,
          reserved_quantity =
            GREATEST(0, reserved_quantity - $1),
          updated_at = NOW()
        WHERE product_id = $2
          AND unit_id = $3
      `, [
        recebidoAgora,
        item.product_id,
        solicitacao.origin_unit_id
      ]);

      await client.query(`
        INSERT INTO product_stocks (
          product_id,
          unit_id,
          quantity,
          reserved_quantity
        )
        VALUES ($1, $2, $3, 0)
        ON CONFLICT (product_id, unit_id)
        DO UPDATE SET
          quantity =
            product_stocks.quantity + EXCLUDED.quantity,
          updated_at = NOW()
      `, [
        item.product_id,
        solicitacao.destination_unit_id,
        recebidoAgora
      ]);

      await client.query(`
        UPDATE stock_transfer_items
        SET
          quantity_received = quantity_received + $1
        WHERE id = $2
      `, [
        recebidoAgora,
        item.id
      ]);

      await client.query(`
        INSERT INTO stock_movements (
          product_id,
          type,
          quantity,
          note,
          user_id,
          unit_id
        )
        VALUES (
          $1,
          'OUT',
          $2,
          $3,
          $4,
          $5
        )
      `, [
        item.product_id,
        recebidoAgora,
        `Transferência ${solicitacao.request_number} - saída`,
        req.user.id,
        solicitacao.origin_unit_id
      ]);

      await client.query(`
        INSERT INTO stock_movements (
          product_id,
          type,
          quantity,
          note,
          user_id,
          unit_id
        )
        VALUES (
          $1,
          'IN',
          $2,
          $3,
          $4,
          $5
        )
      `, [
        item.product_id,
        recebidoAgora,
        `Transferência ${solicitacao.request_number} - recebimento`,
        req.user.id,
        solicitacao.destination_unit_id
      ]);
    }

    const conferencia = await client.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (
          WHERE quantity_received >= quantity_approved
        )::int AS completos
      FROM stock_transfer_items
      WHERE transfer_request_id = $1
    `, [solicitacao.id]);

    const status =
      conferencia.rows[0].total === conferencia.rows[0].completos
        ? 'RECEIVED'
        : 'PARTIAL';

    await client.query(`
      UPDATE stock_transfer_requests
      SET
        status = $1,
        updated_at = NOW()
      WHERE id = $2
    `, [
      status,
      solicitacao.id
    ]);

    // Compatibilidade com a Unidade Principal
    await client.query(`
      UPDATE products p
      SET
        quantity = ps.quantity,
        updated_at = NOW()
      FROM product_stocks ps
      WHERE ps.product_id = p.id
        AND ps.unit_id = 1
        AND p.id IN (
          SELECT product_id
          FROM stock_transfer_items
          WHERE transfer_request_id = $1
        )
    `, [solicitacao.id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      status,
      message:
        status === 'RECEIVED'
          ? 'Transferência recebida e confirmada.'
          : 'Recebimento parcial registrado.'
    });

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};


// ============================================================
// CANCELAR SOLICITAÇÃO
// ============================================================
// Só pode ser cancelada enquanto estiver PENDING.
// Não mexe no estoque porque ainda não houve aprovação/reserva.
// ============================================================
exports.cancelar = async (req, res, next) => {
  try {
    const minhaUnidade = unidadeUsuario(req);

    if (!minhaUnidade) {
      return res.status(403).json({
        success: false,
        message: 'Usuário não possui uma unidade vinculada.'
      });
    }

    const result = await db.query(`
      UPDATE stock_transfer_requests
      SET
        status = 'CANCELLED',
        updated_at = NOW()
      WHERE id = $1
        AND destination_unit_id = $2
        AND status = 'PENDING'
      RETURNING
        id,
        request_number,
        status,
        updated_at
    `, [
      req.params.id,
      minhaUnidade
    ]);

    if (result.rows.length === 0) {
      return res.status(409).json({
        success: false,
        message: 'Esta solicitação não pode mais ser cancelada.'
      });
    }

    res.json({
      success: true,
      message: 'Solicitação de transferência cancelada.',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

