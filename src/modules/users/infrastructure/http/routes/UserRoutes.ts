import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserController } from '../controllers/UserController';
import {
  validateBody,
  validateParams,
  validateQuery,
  createUserSchema,
  updateUserSchema,
  userIdParamsSchema,
  listUsersQuerySchema,
} from '../../../../../shared/infrastructure/http/middlewares/ValidateRequest';

interface CreateUserBody {
  email: string;
  name: string;
}

interface UpdateUserBody {
  email?: string;
  name?: string;
}

interface UserParams {
  id: string;
}

interface ListUsersQueryString {
  page?: number;
  limit?: number;
  search?: string;
}

export async function registerUserRoutes(
  app: FastifyInstance,
  userController: UserController
): Promise<void> {
  app.register(
    async (routes: FastifyInstance) => {
      /**
       * @openapi
       * /api/users:
       *   post:
       *     summary: Create a new user
       *     tags: [Users]
       *     requestBody:
       *       required: true
       *       content:
       *         application/json:
       *           schema:
       *             type: object
       *             required: [email, name]
       *             properties:
       *               email: { type: string, format: email, example: "user@example.com" }
       *               name: { type: string, minLength: 2, maxLength: 100, example: "John Doe" }
       *     responses:
       *       201:
       *         description: User created successfully
       *       400:
       *         description: Validation error
       *       409:
       *         description: Email already exists
       */
      routes.post<{ Body: CreateUserBody }>(
        '/',
        { preValidation: validateBody(createUserSchema) },
        async (req: FastifyRequest<{ Body: CreateUserBody }>, reply: FastifyReply) => {
          await userController.create(req, reply);
        }
      );

      /**
       * @openapi
       * /api/users:
       *   get:
       *     summary: List all users
       *     tags: [Users]
       *     parameters:
       *       - in: query
       *         name: page
       *         schema: { type: integer, default: 1 }
       *       - in: query
       *         name: limit
       *         schema: { type: integer, default: 10 }
       *       - in: query
       *         name: search
       *         schema: { type: string }
       *     responses:
       *       200:
       *         description: Paginated list of users
       */
      routes.get<{ Querystring: ListUsersQueryString }>(
        '/',
        { preValidation: validateQuery(listUsersQuerySchema) },
        async (
          req: FastifyRequest<{ Querystring: ListUsersQueryString }>,
          reply: FastifyReply
        ) => {
          await userController.list(req, reply);
        }
      );

      /**
       * @openapi
       * /api/users/{id}:
       *   get:
       *     summary: Get user by ID
       *     tags: [Users]
       *     parameters:
       *       - in: path
       *         name: id
       *         required: true
       *         schema: { type: string }
       *     responses:
       *       200: { description: User found }
       *       404: { description: User not found }
       */
      routes.get<{ Params: UserParams }>(
        '/:id',
        { preValidation: validateParams(userIdParamsSchema) },
        async (req: FastifyRequest<{ Params: UserParams }>, reply: FastifyReply) => {
          await userController.getById(req, reply);
        }
      );

      routes.patch<{ Params: UserParams; Body: UpdateUserBody }>(
        '/:id',
        { preValidation: [validateParams(userIdParamsSchema), validateBody(updateUserSchema)] },
        async (
          req: FastifyRequest<{ Params: UserParams; Body: UpdateUserBody }>,
          reply: FastifyReply
        ) => {
          await userController.update(req, reply);
        }
      );

      routes.delete<{ Params: UserParams }>(
        '/:id',
        { preValidation: validateParams(userIdParamsSchema) },
        async (req: FastifyRequest<{ Params: UserParams }>, reply: FastifyReply) => {
          await userController.delete(req, reply);
        }
      );
    },
    { prefix: '/users' }
  );
}
