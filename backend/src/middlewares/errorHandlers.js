// middlewares/errorHandlers.js — Tratamento de erros central
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
  });
};

const errorHandler = (err, req, res, next) => {
  console.error('💥 Erro:', err);

  // Erros de validação (Zod)
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos.',
      errors: err.errors,
    });
  }

  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Erro interno do servidor.',
  });
};

module.exports = { notFoundHandler, errorHandler };