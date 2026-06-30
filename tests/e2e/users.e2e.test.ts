import { FastifyInstance } from 'fastify';
import { createServer, registerRoutes } from '../../src/shared/infrastructure/http/server';
import { registerUserRoutes } from '../../src/modules/users/infrastructure/http/routes/UserRoutes';
import { InMemoryEventBus } from '../../src/shared/infrastructure/events/InMemoryEventBus';
import { PrismaUnitOfWork } from '../../src/shared/infrastructure/persistence/PrismaUnitOfWork';
import { PrismaUserRepository } from '../../src/modules/users/infrastructure/repositories/PrismaUserRepository';
import { CreateUserHandler } from '../../src/modules/users/application/handlers/CreateUserHandler';
import { GetUserHandler } from '../../src/modules/users/application/handlers/GetUserHandler';
import { ListUsersHandler } from '../../src/modules/users/application/handlers/ListUsersHandler';
import { UpdateUserHandler } from '../../src/modules/users/application/handlers/UpdateUserHandler';
import { DeleteUserHandler } from '../../src/modules/users/application/handlers/DeleteUserHandler';
import { UserController } from '../../src/modules/users/infrastructure/http/controllers/UserController';
import { UserCreatedEventHandler } from '../../src/modules/users/infrastructure/events/UserCreatedEventHandler';

describe('Users E2E', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const eventBus = new InMemoryEventBus();
    const unitOfWork = new PrismaUnitOfWork();
    const userRepository = new PrismaUserRepository();

    const userCreatedHandler = new UserCreatedEventHandler();
    eventBus.subscribe('USER_CREATED', userCreatedHandler.handle.bind(userCreatedHandler));

    const userController = new UserController(
      new CreateUserHandler(userRepository, eventBus, unitOfWork),
      new GetUserHandler(userRepository),
      new ListUsersHandler(userRepository),
      new UpdateUserHandler(userRepository, unitOfWork),
      new DeleteUserHandler(userRepository)
    );

    app = await createServer();
    await registerRoutes(app, [
      async (server) => await registerUserRoutes(server, userController),
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/users - should reject invalid email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/users',
      payload: { email: 'invalid', name: 'Test' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('GET /api/users/:id - should return 400 for non-uuid id', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/users/non-existent-id',
    });

    expect(response.statusCode).toBe(400);
  });
});
