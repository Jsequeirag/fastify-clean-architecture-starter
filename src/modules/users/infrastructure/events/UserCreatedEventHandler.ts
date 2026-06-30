import { UserCreatedEvent } from '../../domain/events/UserCreatedEvent';
import { logger } from '../../../../shared/infrastructure/config/Logger';

export class UserCreatedEventHandler {
  async handle(event: UserCreatedEvent): Promise<void> {
    logger.info(
      { userId: event.aggregateId, email: event.email },
      'Sending welcome email'
    );
  }
}
