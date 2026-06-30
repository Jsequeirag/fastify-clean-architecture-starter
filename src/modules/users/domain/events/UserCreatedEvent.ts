import { DomainEvent } from '../../../../shared/domain/DomainEvent';

export class UserCreatedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly email: string
  ) {
    super(aggregateId, 'USER_CREATED');
  }
}
