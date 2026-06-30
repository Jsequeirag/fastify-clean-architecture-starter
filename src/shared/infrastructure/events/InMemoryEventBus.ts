import { IEventBus } from '../../domain/IEventBus';
import { DomainEvent } from '../../domain/DomainEvent';
import { logger } from '../config/Logger';

export class InMemoryEventBus implements IEventBus {
  private handlers: Map<string, Array<(event: DomainEvent) => Promise<void>>> = new Map();

  async publish(event: DomainEvent): Promise<void> {
    logger.info(
      { eventType: event.eventType, aggregateId: event.aggregateId },
      'Event published'
    );
    const handlers = this.handlers.get(event.eventType) || [];
    await Promise.all(
      handlers.map((handler) =>
        handler(event).catch((err) => {
          logger.error({ error: err.message }, 'Event handler failed');
        })
      )
    );
  }

  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: (event: T) => Promise<void>
  ): void {
    const existing = this.handlers.get(eventType) || [];
    existing.push(handler as (event: DomainEvent) => Promise<void>);
    this.handlers.set(eventType, existing);
  }
}
