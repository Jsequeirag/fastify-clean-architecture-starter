import { Email } from '../value-objects/Email';
import { UserName } from '../value-objects/UserName';
import { UserCreatedEvent } from '../events/UserCreatedEvent';
import { DomainEvent } from '../../../../shared/domain/DomainEvent';

export class User {
  private _domainEvents: DomainEvent[] = [];

  private constructor(
    public readonly id: string,
    public readonly email: Email,
    public readonly name: UserName,
    public readonly createdAt: Date = new Date()
  ) {}

  static create(id: string, emailResult: Email, nameResult: UserName): User {
    const user = new User(id, emailResult, nameResult);
    user.addDomainEvent(new UserCreatedEvent(id, emailResult.value));
    return user;
  }

  static reconstitute(
    id: string,
    email: Email,
    name: UserName,
    createdAt: Date
  ): User {
    return new User(id, email, name, createdAt);
  }

  get domainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }

  getEmail(): string {
    return this.email.value;
  }

  getName(): string {
    return this.name.value;
  }
}
