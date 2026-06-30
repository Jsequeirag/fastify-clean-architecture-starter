import { CreateUserHandler } from '../../src/modules/users/application/handlers/CreateUserHandler';
import { IUserRepository } from '../../src/modules/users/domain/repositories/IUserRepository';
import { IEventBus } from '../../src/shared/domain/IEventBus';
import { IUnitOfWork } from '../../src/shared/application/IUnitOfWork';
import { CreateUserCommand } from '../../src/modules/users/application/commands/CreateUserCommand';
import { EmailAlreadyExistsError } from '../../src/modules/users/domain/errors/DomainError';

describe('CreateUserHandler', () => {
  let handler: CreateUserHandler;
  let mockRepo: jest.Mocked<IUserRepository>;
  let mockEventBus: jest.Mocked<IEventBus>;
  let mockUoW: jest.Mocked<IUnitOfWork>;

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn().mockImplementation((user) => Promise.resolve(user)),
      delete: jest.fn(),
      exists: jest.fn().mockResolvedValue(false),
      findAll: jest.fn(),
      count: jest.fn(),
    };

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn(),
    };

    mockUoW = {
      beginTransaction: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    };

    handler = new CreateUserHandler(mockRepo, mockEventBus, mockUoW);
  });

  it('should create a user successfully', async () => {
    const command = new CreateUserCommand('test@example.com', 'John Doe');

    const result = await handler.execute(command);

    expect(result.email).toBe('test@example.com');
    expect(result.name).toBe('John Doe');
    expect(mockRepo.exists).toHaveBeenCalledWith('test@example.com');
    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    expect(mockUoW.commit).toHaveBeenCalled();
  });

  it('should throw EmailAlreadyExistsError when email exists', async () => {
    mockRepo.exists.mockResolvedValue(true);
    const command = new CreateUserCommand('existing@example.com', 'John');

    await expect(handler.execute(command)).rejects.toThrow(EmailAlreadyExistsError);
    expect(mockUoW.rollback).not.toHaveBeenCalled();
  });

  it('should rollback on save error', async () => {
    mockRepo.save.mockRejectedValue(new Error('DB Error'));
    const command = new CreateUserCommand('test@example.com', 'John');

    await expect(handler.execute(command)).rejects.toThrow('DB Error');
    expect(mockUoW.rollback).toHaveBeenCalled();
  });
});
