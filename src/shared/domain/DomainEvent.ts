export abstract class DomainEvent {
  readonly occurredAt: Date = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly eventType: string
  ) {}
}
