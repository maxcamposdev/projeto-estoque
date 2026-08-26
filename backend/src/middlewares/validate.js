// middlewares/validate.js — Validação simples de campos obrigatórios
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

module.exports = { fields };