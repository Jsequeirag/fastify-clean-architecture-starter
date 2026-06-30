import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { FastifyInstance } from 'fastify';
import { registerErrorHandler } from './middlewares/ErrorHandler';
import { registerRequestLogger } from './middlewares/RequestLogger';
import { registerSecurityPlugins } from './middlewares/Security';
import { config } from '../config/Config';

export async function createServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
    genReqId: () => crypto.randomUUID(),
  });

  registerRequestLogger(app);
  await registerSecurityPlugins(app);

  if (config.NODE_ENV !== 'production') {
    await app.register(swagger, {
      openapi: {
        info: {
          title: 'Clean Architecture API',
          version: '1.0.0',
          description: 'API built with Clean Architecture, Fastify and TypeScript',
        },
        servers: [{ url: `http://localhost:${config.PORT}/api` }],
      },
    });

    await app.register(swaggerUi, {
      routePrefix: '/api-docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
    });
  }

  return app;
}

export async function registerRoutes(
  app: FastifyInstance,
  routeRegistrars: Array<(app: FastifyInstance) => Promise<void>>
): Promise<void> {
  await app.register(async (api) => {
    for (const register of routeRegistrars) {
      await register(api);
    }
  }, { prefix: '/api' });

  registerErrorHandler(app);
}
