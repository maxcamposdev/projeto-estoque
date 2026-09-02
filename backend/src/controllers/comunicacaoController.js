const db = require('../config/db');

function minhaUnidade(req) {
  const id = Number(req.user?.unit_id);
  return Number.isInteger(id) && id > 0 ? id : null;
}


// ============================================================
// LISTAR CONVERSAS
// ============================================================

exports.listarConversas = async (req, res, next) => {
  try {
    const unitId = minhaUnidade(req);

    if (!unitId) {
      return res.status(409).json({
        success: false,
        message:
          'Usuário sem unidade vinculada.'
      });
    }

    const result = await db.query(`
      SELECT
        c.id,

        ua.id AS unit_a_id,
        ua.name AS unit_a_name,

        ub.id AS unit_b_id,
        ub.name AS unit_b_name,

        c.transfer_request_id,
        c.purchase_order_id,
        c.purchase_return_id,

        c.updated_at,
        c.created_at,

        (
          SELECT m.message
          FROM internal_conversation_messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) AS last_message,

        (
          SELECT m.created_at
          FROM internal_conversation_messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) AS last_message_at,

        (
          SELECT COUNT(*)::INTEGER
          FROM internal_conversation_messages m
          WHERE
            m.conversation_id = c.id
            AND m.read_at IS NULL
            AND m.user_id <> $1
        ) AS unread_count

      FROM internal_conversations c

      INNER JOIN units ua
        ON ua.id = c.unit_a_id

      INNER JOIN units ub
        ON ub.id = c.unit_b_id

      WHERE
        c.unit_a_id = $2
        OR c.unit_b_id = $2

      ORDER BY
        COALESCE(
          (
            SELECT MAX(m.created_at)
            FROM internal_conversation_messages m
            WHERE m.conversation_id = c.id
          ),
          c.updated_at
        ) DESC
    `, [
      Number(req.user.id),
      unitId
    ]);

    res.json({
      success: true,
      conversas: result.rows.map((item) => ({
        ...item,
        unread_count:
          Number(item.unread_count || 0)
      }))
    });

  } catch (err) {
    next(err);
  }
};


// ============================================================
// CRIAR / REUTILIZAR CONVERSA ENTRE UNIDADES
// ============================================================

exports.criarConversa = async (req, res, next) => {
  try {
    const unitId = minhaUnidade(req);

    const outraUnidadeId =
      Number(req.body?.unit_id);

    if (!unitId || !Number.isInteger(outraUnidadeId)) {
      return res.status(400).json({
        success: false,
        message:
          'Informe uma unidade válida.'
      });
    }

    if (unitId === outraUnidadeId) {
      return res.status(400).json({
        success: false,
        message:
          'Não é possível iniciar uma conversa com a própria unidade.'
      });
    }

    const unidade = await db.query(`
      SELECT id, name
      FROM units
      WHERE
        id = $1
        AND active = true
    `, [outraUnidadeId]);

    if (unidade.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          'Unidade não encontrada.'
      });
    }

    const a = Math.min(
      unitId,
      outraUnidadeId
    );

    const b = Math.max(
      unitId,
      outraUnidadeId
    );

    const existente = await db.query(`
      SELECT *
      FROM internal_conversations
      WHERE unit_a_id = $1
        AND unit_b_id = $2
        AND transfer_request_id IS NULL
        AND purchase_order_id IS NULL
        AND purchase_return_id IS NULL
      LIMIT 1
    `, [a, b]);

    if (existente.rows.length > 0) {
      return res.json({
        success: true,
        data: existente.rows[0]
      });
    }

    const result = await db.query(`
      INSERT INTO internal_conversations
      (
        unit_a_id,
        unit_b_id,
        created_by
      )
      VALUES
      (
        $1,
        $2,
        $3
      )
      RETURNING *
    `, [
      a,
      b,
      req.user.id
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });

  } catch (err) {
    next(err);
  }
};


// ============================================================
// BUSCAR MENSAGENS
// ============================================================

exports.mensagens = async (req, res, next) => {
  try {
    const unitId = minhaUnidade(req);
    const conversationId =
      Number(req.params.id);

    if (!unitId) {
      return res.status(409).json({
        success: false,
        message:
          'Usuário sem unidade vinculada.'
      });
    }

    const conversa = await db.query(`
      SELECT id
      FROM internal_conversations
      WHERE
        id = $1
        AND (
          unit_a_id = $2
          OR unit_b_id = $2
        )
    `, [
      conversationId,
      unitId
    ]);

    if (conversa.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message:
          'Você não participa desta conversa.'
      });
    }

    const result = await db.query(`
      SELECT
        m.id,
        m.message,
        m.user_id,
        u.name AS user_name,
        m.created_at,
        m.read_at
      FROM internal_conversation_messages m
      LEFT JOIN users u
        ON u.id = m.user_id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC
    `, [conversationId]);

    await db.query(`
      UPDATE internal_conversation_messages
      SET read_at = NOW()
      WHERE
        conversation_id = $1
        AND user_id <> $2
        AND read_at IS NULL
    `, [
      conversationId,
      req.user.id
    ]);

    res.json({
      success: true,
      mensagens: result.rows
    });

  } catch (err) {
    next(err);
  }
};


// ============================================================
// ENVIAR MENSAGEM
// ============================================================

exports.enviarMensagem = async (req, res, next) => {
  try {
    const unitId = minhaUnidade(req);
    const conversationId =
      Number(req.params.id);

    const message =
      String(
        req.body?.message || ''
      ).trim();

    if (!unitId) {
      return res.status(409).json({
        success: false,
        message:
          'Usuário sem unidade vinculada.'
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        message:
          'Digite uma mensagem.'
      });
    }

    if (message.length > 3000) {
      return res.status(400).json({
        success: false,
        message:
          'A mensagem não pode ultrapassar 3000 caracteres.'
      });
    }

    const conversa = await db.query(`
      SELECT id
      FROM internal_conversations
      WHERE
        id = $1
        AND (
          unit_a_id = $2
          OR unit_b_id = $2
        )
    `, [
      conversationId,
      unitId
    ]);

    if (conversa.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message:
          'Você não participa desta conversa.'
      });
    }

    const result = await db.query(`
      INSERT INTO internal_conversation_messages
      (
        conversation_id,
        user_id,
        message
      )
      VALUES
      (
        $1,
        $2,
        $3
      )
      RETURNING
        id,
        conversation_id,
        user_id,
        message,
        created_at
    `, [
      conversationId,
      req.user.id,
      message
    ]);

    await db.query(`
      UPDATE internal_conversations
      SET updated_at = NOW()
      WHERE id = $1
    `, [conversationId]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });

  } catch (err) {
    next(err);
  }
};


// ============================================================
// UNIDADES DISPONÍVEIS PARA NOVA CONVERSA
// ============================================================

exports.unidades = async (req, res, next) => {
  try {
    const unitId = minhaUnidade(req);

    const result = await db.query(`
      SELECT
        id,
        code,
        name
      FROM units
      WHERE
        active = true
        AND id <> $1
      ORDER BY name
    `, [unitId]);

    res.json({
      success: true,
      unidades: result.rows
    });

  } catch (err) {
    next(err);
  }
};
