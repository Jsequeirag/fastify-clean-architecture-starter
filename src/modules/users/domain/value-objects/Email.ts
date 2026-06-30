import { Result } from '../../../../shared/domain/Result';
import { ValidationError } from '../errors/DomainError';

export class Email {
  private constructor(public readonly value: string) {}

  static create(email: string): Result<Email, ValidationError> {
    if (!email || email.trim().length === 0) {
      return Result.fail(new ValidationError('Email is required'));
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Result.fail(new ValidationError('Invalid email format'));
    }
    return Result.ok(new Email(email.toLowerCase().trim()));
  }

  static reconstitute(email: string): Email {
    return new Email(email);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
