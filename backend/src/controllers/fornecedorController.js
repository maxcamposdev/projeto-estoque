const db = require('../config/db');

function limpar(valor) {
  if (valor === undefined || valor === null) return null;
  const texto = String(valor).trim();
  return texto || null;
}

exports.listar = async (req, res, next) => {
  try {
    const { status } = req.query;

    const params = [];
    let where = '';

    if (status) {
      params.push(status);
      where = `WHERE s.status = $${params.length}`;
    }

    const { rows } = await db.query(`
      SELECT
        s.*,
        COUNT(po.id)::int AS total_pedidos
      FROM suppliers s
      LEFT JOIN purchase_orders po
        ON po.supplier_id = s.id
      ${where}
      GROUP BY s.id
      ORDER BY
        CASE WHEN s.status = 'ACTIVE' THEN 0 ELSE 1 END,
        COALESCE(s.trade_name, s.legal_name)
    `, params);

    res.json({
      success: true,
      fornecedores: rows
    });
  } catch (err) {
    next(err);
  }
};

exports.buscarPorId = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT
        s.*,
        COUNT(po.id)::int AS total_pedidos
      FROM suppliers s
      LEFT JOIN purchase_orders po
        ON po.supplier_id = s.id
      WHERE s.id = $1
      GROUP BY s.id
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Fornecedor não encontrado.'
      });
    }

    res.json({
      success: true,
      fornecedor: rows[0]
    });
  } catch (err) {
    next(err);
  }
};

exports.criar = async (req, res, next) => {
  try {
    const body = req.body;

    const legalName = limpar(body.legal_name);
    const type = body.type === 'PF' ? 'PF' : 'PJ';

    if (!legalName) {
      return res.status(400).json({
        success: false,
        message: 'Informe a razão social ou nome completo do fornecedor.'
      });
    }

    const { rows } = await db.query(`
      INSERT INTO suppliers (
        type,
        legal_name,
        trade_name,
        cnpj,
        state_registration,
        municipal_registration,
        contact_name,
        phone,
        whatsapp,
        email,
        website,
        zip_code,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        payment_terms,
        delivery_days,
        minimum_order,
        freight_type,
        notes,
        status
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
        $13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24
      )
      RETURNING *
    `, [
      type,
      legalName,
      limpar(body.trade_name),
      limpar(body.cnpj),
      limpar(body.state_registration),
      limpar(body.municipal_registration),
      limpar(body.contact_name),
      limpar(body.phone),
      limpar(body.whatsapp),
      limpar(body.email),
      limpar(body.website),
      limpar(body.zip_code),
      limpar(body.street),
      limpar(body.number),
      limpar(body.complement),
      limpar(body.neighborhood),
      limpar(body.city),
      limpar(body.state)?.toUpperCase(),
      limpar(body.payment_terms),
      body.delivery_days === '' ? null : Number(body.delivery_days) || null,
      body.minimum_order === '' ? null : Number(body.minimum_order) || null,
      limpar(body.freight_type),
      limpar(body.notes),
      body.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
    ]);

    res.status(201).json({
      success: true,
      message: 'Fornecedor cadastrado com sucesso.',
      fornecedor: rows[0]
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Já existe um fornecedor com este CNPJ.'
      });
    }

    next(err);
  }
};

exports.atualizar = async (req, res, next) => {
  try {
    const body = req.body;

    const { rows } = await db.query(`
      UPDATE suppliers
      SET
        type = $1,
        legal_name = COALESCE($2, legal_name),
        trade_name = $3,
        cnpj = $4,
        state_registration = $5,
        municipal_registration = $6,
        contact_name = $7,
        phone = $8,
        whatsapp = $9,
        email = $10,
        website = $11,
        zip_code = $12,
        street = $13,
        number = $14,
        complement = $15,
        neighborhood = $16,
        city = $17,
        state = $18,
        payment_terms = $19,
        delivery_days = $20,
        minimum_order = $21,
        freight_type = $22,
        notes = $23,
        status = $24,
        updated_at = NOW()
      WHERE id = $25
      RETURNING *
    `, [
      body.type === 'PF' ? 'PF' : 'PJ',
      limpar(body.legal_name),
      limpar(body.trade_name),
      limpar(body.cnpj),
      limpar(body.state_registration),
      limpar(body.municipal_registration),
      limpar(body.contact_name),
      limpar(body.phone),
      limpar(body.whatsapp),
      limpar(body.email),
      limpar(body.website),
      limpar(body.zip_code),
      limpar(body.street),
      limpar(body.number),
      limpar(body.complement),
      limpar(body.neighborhood),
      limpar(body.city),
      limpar(body.state)?.toUpperCase(),
      limpar(body.payment_terms),
      body.delivery_days === '' ? null : Number(body.delivery_days) || null,
      body.minimum_order === '' ? null : Number(body.minimum_order) || null,
      limpar(body.freight_type),
      limpar(body.notes),
      body.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      req.params.id
    ]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Fornecedor não encontrado.'
      });
    }

    res.json({
      success: true,
      message: 'Fornecedor atualizado com sucesso.',
      fornecedor: rows[0]
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Já existe um fornecedor com este CNPJ.'
      });
    }

    next(err);
  }
};

exports.excluir = async (req, res, next) => {
  try {
    const result = await db.query(`
      DELETE FROM suppliers
      WHERE id = $1
      RETURNING id
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Fornecedor não encontrado.'
      });
    }

    res.json({
      success: true,
      message: 'Fornecedor excluído com sucesso.'
    });
  } catch (err) {
    next(err);
  }
};
