import swaggerJsdoc from 'swagger-jsdoc';

const servers = [{ url: 'http://localhost:3001', description: 'Development' }];
if (process.env.RENDER_EXTERNAL_URL) {
  servers.unshift({ url: process.env.RENDER_EXTERNAL_URL, description: 'Production (Render)' });
}

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FlowDesk API',
      version: '1.0.0',
      description: 'FlowDesk Operations Command Center REST API',
    },
    servers,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
