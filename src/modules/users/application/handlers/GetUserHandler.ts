import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserNotFoundError } from '../../domain/errors/DomainError';
import { GetUserByIdQuery } from '../queries/GetUserByIdQuery';
import { UserResponseDTO } from '../dto/UserDTO';

export class GetUserHandler {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(query: GetUserByIdQuery): Promise<UserResponseDTO> {
    const user = await this.userRepository.findById(query.id);

    if (!user) {
      throw new UserNotFoundError(query.id);
    }

    return {
      id: user.id,
      email: user.getEmail(),
      name: user.getName(),
      createdAt: user.createdAt,
    };
  }
}
