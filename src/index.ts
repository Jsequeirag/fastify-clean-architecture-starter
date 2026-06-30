import 'dotenv/config';
import { createServer, registerRoutes } from './shared/infrastructure/http/server';
import { PrismaUserRepository } from './modules/users/infrastructure/repositories/PrismaUserRepository';
import { CreateUserHandler } from './modules/users/application/handlers/CreateUserHandler';
import { GetUserHandler } from './modules/users/application/handlers/GetUserHandler';
import { ListUsersHandler } from './modules/users/application/handlers/ListUsersHandler';
import { UpdateUserHandler } from './modules/users/application/handlers/UpdateUserHandler';
import { DeleteUserHandler } from './modules/users/application/handlers/DeleteUserHandler';
import { UserController } from './modules/users/infrastructure/http/controllers/UserController';
import { registerUserRoutes } from './modules/users/infrastructure/http/routes/UserRoutes';
import { registerHealthRoutes } from './shared/infrastructure/http/routes/HealthRoutes';
import { InMemoryEventBus } from './shared/infrastructure/events/InMemoryEventBus';
import { UserCreatedEventHandler } from './modules/users/infrastructure/events/UserCreatedEventHandler';
import { PrismaUnitOfWork } from './shared/infrastructure/persistence/PrismaUnitOfWork';
import { logger } from './shared/infrastructure/config/Logger';
import { config } from './shared/infrastructure/config/Config';
import { FastifyInstance } from 'fastify';

async function bootstrap(): Promise<void> {
  const eventBus = new InMemoryEventBus();
  const unitOfWork = new PrismaUnitOfWork();
  const userRepository = new PrismaUserRepository();

  const userCreatedHandler = new UserCreatedEventHandler();
  eventBus.subscribe('USER_CREATED', userCreatedHandler.handle.bind(userCreatedHandler));

  const createUserHandler = new CreateUserHandler(userRepository, eventBus, unitOfWork);
  const getUserHandler = new GetUserHandler(userRepository);
  const listUsersHandler = new ListUsersHandler(userRepository);
  const updateUserHandler = new UpdateUserHandler(userRepository, unitOfWork);
  const deleteUserHandler = new DeleteUserHandler(userRepository);

  const userController = new UserController(
    createUserHandler,
    getUserHandler,
    listUsersHandler,
    updateUserHandler,
    deleteUserHandler
  );

  const app: FastifyInstance = await createServer();

  await registerRoutes(app, [
    async (server) => await registerUserRoutes(server, userController),
    async (server) => await registerHealthRoutes(server),
  ]);

  try {
    await app.listen({ port: parseInt(config.PORT), host: '0.0.0.0' });
    logger.info(`🚀 Server running on port ${config.PORT} in ${config.NODE_ENV} mode`);
    logger.info(`📚 API Docs: http://localhost:${config.PORT}/api-docs`);
  } catch (error) {
    logger.error(error, 'Failed to start server');
    process.exit(1);
  }
}

bootstrap();
