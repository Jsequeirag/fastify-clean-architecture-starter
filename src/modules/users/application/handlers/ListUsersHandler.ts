import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { ListUsersQuery } from '../queries/ListUsersQuery';
import { UserResponseDTO } from '../dto/UserDTO';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ListUsersHandler {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(query: ListUsersQuery): Promise<PaginatedResult<UserResponseDTO>> {
    const page = query.page || 1;
    const limit = query.limit || 10;

    const users = await this.userRepository.findAll({ page, limit, search: query.search });
    const total = await this.userRepository.count(query.search);

    return {
      data: users.map((u) => ({
        id: u.id,
        email: u.getEmail(),
        name: u.getName(),
        createdAt: u.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
