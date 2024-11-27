const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Casino Game API',
      version: '1.0.0',
      description: '骰子游戏 API 文档',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: '开发服务器',
      },
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
  apis: ['./Server/routes/*.js'], // API 路由文件的路径
};

const specs = swaggerJsdoc(options);

module.exports = specs; 