// config/swagger.js — Configuração do Swagger/OpenAPI
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Controle de Estoque',
      version: '1.0.0',
      description: 'API REST do Sistema de Controle de Estoque — Projeto 04 do Portfólio Max Campos',
      contact: {
        name: 'Max Campos',
        email: 'maxcamposdev@gmail.com',
        url: 'https://github.com/maxcamposdev',
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