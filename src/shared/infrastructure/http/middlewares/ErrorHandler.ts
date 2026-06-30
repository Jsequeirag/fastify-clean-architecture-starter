import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DomainError } from '../../../../modules/users/domain/errors/DomainError';
import { logger } from '../../config/Logger';
import { config } from '../../config/Config';

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: Error, request: FastifyRequest, reply: FastifyReply) => {
    const requestId = (request.headers['x-request-id'] as string) || crypto.randomUUID();

    if (error instanceof DomainError) {
      logger.warn(
        {
          error: error.message,
          code: error.code,
          requestId,
          path: request.url,
        },
        'Domain error'
      );

      reply.status(error.statusCode).send({
        error: error.message,
        code: error.code,
        requestId,
      });
      return;
    }

    if (error.name === 'ZodError') {
      reply.status(400).send({
        error: 'Validation error',
        code: 'VALIDATION_ERROR',
        requestId,
      });
      return;
    }

    logger.error(
      {
        error: error.message,
        stack: error.stack,
        requestId,
        path: request.url,
        method: request.method,
      },
      'Unexpected error'
    );

    reply.status(500).send({
      error: config.NODE_ENV === 'production' ? 'Internal server error' : error.message,
      code: 'INTERNAL_ERROR',
      requestId,
    });
  });

  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    reply.status(404).send({
      error: 'Route not found',
      code: 'NOT_FOUND',
      requestId: (request.headers['x-request-id'] as string) || crypto.randomUUID(),
    });
  });
}
