// middlewares/validate.js — Validação de campos
function fields(...campos) {
  return (req, res, next) => {
    const faltando = campos.filter((c) => req.body[c] === undefined || req.body[c] === '');
    if (faltando.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Campos obrigatórios faltando: ${faltando.join(', ')}`,
      });
    }
    next();
  };
}

// Valida números não negativos (para price, quantity, min_quantity)
function nonNegative(...campos) {
  return (req, res, next) => {
    for (const c of campos) {
      if (req.body[c] !== undefined && req.body[c] !== '') {
        const num = Number(req.body[c]);
        if (Number.isNaN(num) || num < 0) {
          return res.status(400).json({
            success: false,
            message: `O campo "${c}" deve ser um número maior ou igual a zero.`,
          });
        }
      }
    }
    next();
  };
}

// Garante que um campo, se presente, seja número válido
function numeric(...campos) {
  return (req, res, next) => {
    for (const c of campos) {
      if (req.body[c] !== undefined && req.body[c] !== '') {
        const num = Number(req.body[c]);
        if (Number.isNaN(num)) {
          return res.status(400).json({
            success: false,
            message: `O campo "${c}" deve ser um número válido.`,
          });
        }
      }
    }
    next();
  };
}

module.exports = { fields, nonNegative, numeric };