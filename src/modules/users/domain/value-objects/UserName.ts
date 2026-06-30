import { Result } from '../../../../shared/domain/Result';
import { ValidationError } from '../errors/DomainError';

export class UserName {
  private constructor(public readonly value: string) {}

  static create(name: string): Result<UserName, ValidationError> {
    if (!name || name.trim().length === 0) {
      return Result.fail(new ValidationError('Name is required'));
    }
    if (name.trim().length < 2 || name.trim().length > 100) {
      return Result.fail(new ValidationError('Name must be between 2 and 100 characters'));
    }
    return Result.ok(new UserName(name.trim()));
  }

  static reconstitute(name: string): UserName {
    return new UserName(name);
  }

  equals(other: UserName): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
