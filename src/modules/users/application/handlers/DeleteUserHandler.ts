import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserNotFoundError } from '../../domain/errors/DomainError';

export class DeleteUserHandler {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }
    await this.userRepository.delete(userId);
  }
}
