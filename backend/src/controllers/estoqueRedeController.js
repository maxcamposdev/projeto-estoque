const db = require('../config/db');

function minhaUnidade(req) {
  const id = Number(req.user?.unit_id);
  return Number.isInteger(id) && id > 0 ? id : null;
}


// ============================================================
// CONSULTAR ESTOQUE DE OUTRAS UNIDADES
// ============================================================

exports.consultar = async (req, res, next) => {
  try {
    const unitId = minhaUnidade(req);

    if (!unitId) {
      return res.status(409).json({
        success: false,
        message:
          'O usuário atual não está vinculado a uma unidade.'
      });
    }

    const busca =
      String(req.query.busca || '').trim();

    if (!busca) {
      return res.json({
        success: true,
        produtos: []
      });
    }

    const termo = `%${busca}%`;

    const result = await db.query(`
      SELECT
        p.id AS product_id,
        p.name,
        p.sku,
        p.barcode,

        u.id AS unit_id,
        u.code AS unit_code,
        u.name AS unit_name,

        COALESCE(ps.quantity, 0) AS quantity,
        COALESCE(ps.reserved_quantity, 0)
          AS reserved_quantity,

        GREATEST(
          COALESCE(ps.quantity, 0)
          - COALESCE(ps.reserved_quantity, 0),
          0
        ) AS available_quantity

      FROM products p

      CROSS JOIN units u

      LEFT JOIN product_stocks ps
        ON ps.product_id = p.id
       AND ps.unit_id = u.id

      WHERE
        u.status = 'ACTIVE'
        AND u.id <> $1
        AND (
          p.name ILIKE $2
          OR p.sku ILIKE $2
          OR COALESCE(p.barcode, '') ILIKE $2
        )

      ORDER BY
        p.name,
        u.name
    `, [
      unitId,
      termo
    ]);

    res.json({
      success: true,
      produtos: result.rows.map((item) => ({
        ...item,
        quantity: Number(item.quantity || 0),
        reserved_quantity:
          Number(item.reserved_quantity || 0),
        available_quantity:
          Number(item.available_quantity || 0)
      }))
    });

  } catch (err) {
    next(err);
  }
};


// ============================================================
// CONSULTAR UM PRODUTO EM TODAS AS OUTRAS LOJAS
// ============================================================

exports.consultarProduto = async (req, res, next) => {
  try {
    const unitId = minhaUnidade(req);
    const productId = Number(req.params.productId);

    if (!unitId) {
      return res.status(409).json({
        success: false,
        message:
          'O usuário atual não está vinculado a uma unidade.'
      });
    }

    if (
      !Number.isInteger(productId) ||
      productId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Produto inválido.'
      });
    }

    const result = await db.query(`
      SELECT
        p.id AS product_id,
        p.name,
        p.sku,
        p.barcode,

        u.id AS unit_id,
        u.code AS unit_code,
        u.name AS unit_name,

        COALESCE(ps.quantity, 0) AS quantity,
        COALESCE(ps.reserved_quantity, 0)
          AS reserved_quantity,

        GREATEST(
          COALESCE(ps.quantity, 0)
          - COALESCE(ps.reserved_quantity, 0),
          0
        ) AS available_quantity

      FROM products p

      CROSS JOIN units u

      LEFT JOIN product_stocks ps
        ON ps.product_id = p.id
       AND ps.unit_id = u.id

      WHERE
        p.id = $1
        AND u.status = 'ACTIVE'
        AND u.id <> $2

      ORDER BY
        u.name
    `, [
      productId,
      unitId
    ]);

    res.json({
      success: true,
      produtos: result.rows.map((item) => ({
        ...item,
        quantity: Number(item.quantity || 0),
        reserved_quantity:
          Number(item.reserved_quantity || 0),
        available_quantity:
          Number(item.available_quantity || 0)
      }))
    });

  } catch (err) {
    next(err);
  }
};
