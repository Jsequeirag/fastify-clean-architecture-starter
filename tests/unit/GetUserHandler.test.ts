import { GetUserHandler } from '../../src/modules/users/application/handlers/GetUserHandler';
import { IUserRepository } from '../../src/modules/users/domain/repositories/IUserRepository';
import { GetUserByIdQuery } from '../../src/modules/users/application/queries/GetUserByIdQuery';
import { UserNotFoundError } from '../../src/modules/users/domain/errors/DomainError';
import { User } from '../../src/modules/users/domain/entities/User';
import { Email } from '../../src/modules/users/domain/value-objects/Email';
import { UserName } from '../../src/modules/users/domain/value-objects/UserName';

describe('GetUserHandler', () => {
  let handler: GetUserHandler;
  let mockRepo: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
    };
    handler = new GetUserHandler(mockRepo);
  });

  it('should return user when found', async () => {
    const user = User.create(
      'user-1',
      Email.create('test@example.com').value,
      UserName.create('John Doe').value
    );
    mockRepo.findById.mockResolvedValue(user);

    const result = await handler.execute(new GetUserByIdQuery('user-1'));

    expect(result.id).toBe('user-1');
    expect(result.email).toBe('test@example.com');
  });

  it('should throw UserNotFoundError when user not found', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(handler.execute(new GetUserByIdQuery('missing'))).rejects.toThrow(
      UserNotFoundError
    );
  });
});
