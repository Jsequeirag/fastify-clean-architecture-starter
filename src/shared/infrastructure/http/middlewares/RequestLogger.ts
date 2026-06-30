import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../config/Logger';

export function registerRequestLogger(app: FastifyInstance): void {
  app.addHook('onRequest', async (request: FastifyRequest) => {
    const requestId = crypto.randomUUID();
    request.headers['x-request-id'] = requestId;
  });

  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    logger.info(
      {
        requestId: request.headers['x-request-id'],
        method: request.method,
        path: request.url,
        statusCode: reply.statusCode,
        duration: `${reply.elapsedTime.toFixed(2)}ms`,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      },
      'Request completed'
    );
  });
}
