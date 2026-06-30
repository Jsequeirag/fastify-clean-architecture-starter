import { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { config } from '../../config/Config';

export async function registerSecurityPlugins(app: FastifyInstance): Promise<void> {
  await app.register(helmet, {
    contentSecurityPolicy: config.NODE_ENV === 'production',
    crossOriginEmbedderPolicy: config.NODE_ENV === 'production',
  });

  await app.register(cors, {
    origin: config.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  });

  await app.register(rateLimit, {
    max: parseInt(config.RATE_LIMIT_MAX),
    timeWindow: parseInt(config.RATE_LIMIT_WINDOW_MS),
    errorResponseBuilder: (_req, context) => ({
      error: 'Too many requests, please try again later',
      code: 'RATE_LIMIT',
      retryAfter: context.after,
    }),
  });
}
