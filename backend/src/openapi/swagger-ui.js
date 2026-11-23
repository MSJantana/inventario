import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './swagger.js';

export function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Inventário API Docs',
  }));
}

export { swaggerDocument };
