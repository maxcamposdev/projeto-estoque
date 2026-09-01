// config/swagger.js — Configuração do Swagger/OpenAPI
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Gestão de estoque para sua empresa',
      version: '1.0.0',
      description: 'API REST do Sistema de Controle de Estoque — Versão de demonstração',
      contact: {
        name: '[Sua Empresa]',
        email: 'contato@suaempresa.test',
        url: 'https://suaempresa.com',
      },
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Desenvolvimento local' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.js', './src/config/swagger-docs.js'],
};

module.exports = swaggerJsdoc(options);