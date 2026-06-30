import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';
import { Email } from '../../domain/value-objects/Email';
import { UserName } from '../../domain/value-objects/UserName';
import { UserNotFoundError, EmailAlreadyExistsError } from '../../domain/errors/DomainError';
import { UpdateUserDTO, UserResponseDTO } from '../dto/UserDTO';
import { IUnitOfWork } from '../../../../shared/application/IUnitOfWork';

export class UpdateUserHandler {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly unitOfWork: IUnitOfWork
  ) {}

  async execute(userId: string, dto: UpdateUserDTO): Promise<UserResponseDTO> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    let newEmail = user.email;
    let newName = user.name;

    if (dto.email) {
      const emailResult = Email.create(dto.email);
      if (emailResult.isFailure) throw emailResult.error;

      const exists = await this.userRepository.exists(dto.email);
      if (exists && dto.email !== user.getEmail()) {
        throw new EmailAlreadyExistsError(dto.email);
      }
      newEmail = emailResult.value;
    }

    if (dto.name) {
      const nameResult = UserName.create(dto.name);
      if (nameResult.isFailure) throw nameResult.error;
      newName = nameResult.value;
    }

    const updatedUser = User.reconstitute(user.id, newEmail, newName, user.createdAt);

    await this.unitOfWork.beginTransaction();
    try {
      const saved = await this.userRepository.save(updatedUser);
      await this.unitOfWork.commit();
      return {
        id: saved.id,
        email: saved.getEmail(),
        name: saved.getName(),
        createdAt: saved.createdAt,
      };
    } catch (error) {
      await this.unitOfWork.rollback();
      throw error;
    }
  }
}
