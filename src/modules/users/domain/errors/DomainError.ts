export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class UserNotFoundError extends DomainError {
  constructor(userId: string) {
    super(`User with id ${userId} not found`, 'USER_NOT_FOUND', 404);
  }
}

export class EmailAlreadyExistsError extends DomainError {
  constructor(email: string) {
    super(`Email ${email} already exists`, 'EMAIL_EXISTS', 409);
  }
}
