import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateUserHandler } from '../../../application/handlers/CreateUserHandler';
import { GetUserHandler } from '../../../application/handlers/GetUserHandler';
import { ListUsersHandler } from '../../../application/handlers/ListUsersHandler';
import { UpdateUserHandler } from '../../../application/handlers/UpdateUserHandler';
import { DeleteUserHandler } from '../../../application/handlers/DeleteUserHandler';
import { CreateUserCommand } from '../../../application/commands/CreateUserCommand';
import { GetUserByIdQuery } from '../../../application/queries/GetUserByIdQuery';
import { ListUsersQuery } from '../../../application/queries/ListUsersQuery';
import { UpdateUserDTO } from '../../../application/dto/UserDTO';

interface CreateUserBody {
  email: string;
  name: string;
}

interface UserParams {
  id: string;
}

interface ListUsersQueryString {
  page?: number;
  limit?: number;
  search?: string;
}

export class UserController {
  constructor(
    private readonly createUserHandler: CreateUserHandler,
    private readonly getUserHandler: GetUserHandler,
    private readonly listUsersHandler: ListUsersHandler,
    private readonly updateUserHandler: UpdateUserHandler,
    private readonly deleteUserHandler: DeleteUserHandler
  ) {}

  async create(
    request: FastifyRequest<{ Body: CreateUserBody }>,
    reply: FastifyReply
  ): Promise<void> {
    const { email, name } = request.body;
    const command = new CreateUserCommand(email, name);
    const user = await this.createUserHandler.execute(command);
    reply.status(201).send(user);
  }

  async getById(
    request: FastifyRequest<{ Params: UserParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const { id } = request.params;
    const query = new GetUserByIdQuery(id);
    const user = await this.getUserHandler.execute(query);
    reply.status(200).send(user);
  }

  async list(
    request: FastifyRequest<{ Querystring: ListUsersQueryString }>,
    reply: FastifyReply
  ): Promise<void> {
    const query: ListUsersQuery = {
      page: request.query.page,
      limit: request.query.limit,
      search: request.query.search,
    };
    const result = await this.listUsersHandler.execute(query);
    reply.status(200).send(result);
  }

  async update(
    request: FastifyRequest<{ Params: UserParams; Body: UpdateUserDTO }>,
    reply: FastifyReply
  ): Promise<void> {
    const { id } = request.params;
    const user = await this.updateUserHandler.execute(id, request.body);
    reply.status(200).send(user);
  }

  async delete(
    request: FastifyRequest<{ Params: UserParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const { id } = request.params;
    await this.deleteUserHandler.execute(id);
    reply.status(204).send();
  }
}
