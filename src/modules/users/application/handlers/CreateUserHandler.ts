import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';
import { Email } from '../../domain/value-objects/Email';
import { UserName } from '../../domain/value-objects/UserName';
import { EmailAlreadyExistsError } from '../../domain/errors/DomainError';
import { CreateUserCommand } from '../commands/CreateUserCommand';
import { UserResponseDTO } from '../dto/UserDTO';
import { IEventBus } from '../../../../shared/domain/IEventBus';
import { IUnitOfWork } from '../../../../shared/application/IUnitOfWork';

export class CreateUserHandler {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly eventBus: IEventBus,
    private readonly unitOfWork: IUnitOfWork
  ) {}

  async execute(command: CreateUserCommand): Promise<UserResponseDTO> {
    const emailResult = Email.create(command.email);
    if (emailResult.isFailure) {
      throw emailResult.error;
    }

    const nameResult = UserName.create(command.name);
    if (nameResult.isFailure) {
      throw nameResult.error;
    }

    const exists = await this.userRepository.exists(command.email);
    if (exists) {
      throw new EmailAlreadyExistsError(command.email);
    }

    const user = User.create(crypto.randomUUID(), emailResult.value, nameResult.value);

    await this.unitOfWork.beginTransaction();
    try {
      const savedUser = await this.userRepository.save(user);

      for (const event of savedUser.domainEvents) {
        await this.eventBus.publish(event);
      }
      savedUser.clearDomainEvents();

      await this.unitOfWork.commit();

      return this.toDTO(savedUser);
    } catch (error) {
      await this.unitOfWork.rollback();
      throw error;
    }
  }

  private toDTO(user: User): UserResponseDTO {
    return {
      id: user.id,
      email: user.getEmail(),
      name: user.getName(),
      createdAt: user.createdAt,
    };
  }
}
