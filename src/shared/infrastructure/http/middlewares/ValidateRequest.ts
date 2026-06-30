import { z } from 'zod';
import { FastifyRequest, FastifyReply, preValidationHookHandler } from 'fastify';

export function validateBody(schema: z.ZodSchema): preValidationHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      reply.status(400).send({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    (request as FastifyRequest & { body: unknown }).body = result.data;
  };
}

export function validateParams(schema: z.ZodSchema): preValidationHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = schema.safeParse(request.params);
    if (!result.success) {
      reply.status(400).send({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    (request as FastifyRequest & { params: unknown }).params = result.data;
  };
}

export function validateQuery(schema: z.ZodSchema): preValidationHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = schema.safeParse(request.query);
    if (!result.success) {
      reply.status(400).send({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    (request as FastifyRequest & { query: unknown }).query = result.data;
  };
}

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
});

export const updateUserSchema = z
  .object({
    email: z.string().email().optional(),
    name: z.string().min(2).max(100).optional(),
  })
  .refine((data) => data.email || data.name, {
    message: 'At least one field must be provided',
  });

export const userIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
});
