# Clean Architecture con Fastify y TypeScript

## 1. Principios Fundamentales

Clean Architecture organiza el código en capas concéntricas donde las dependencias apuntan siempre hacia adentro. Las capas internas no conocen las externas.

### Reglas de Dependencia
- **Domain** (centro): Entidades, value objects, reglas de negocio puras, eventos de dominio. No depende de nada externo.
- **Application** (casos de uso): Orquestan la lógica de negocio, CQRS, handlers. Depende solo de Domain.
- **Interface Adapters** (adaptadores): Controllers, presenters, gateways, mappers. Depende de Use Cases y Domain.
- **Frameworks/Drivers** (frameworks): Fastify, DB, Redis, etc. Depende de las capas internas.

### Diagrama de Dependencias
```
┌─────────────────────────────────────┐
│  Frameworks & Drivers               │
│  (Fastify, Prisma, Redis, etc.)     │
├─────────────────────────────────────┤
│  Interface Adapters                 │
│  (Controllers, Mappers, Routes)     │
├─────────────────────────────────────┤
│  Application (Use Cases)            │
│  (Commands, Queries, Handlers)      │
├─────────────────────────────────────┤
│  Domain (Core)                        │
│  (Entities, Value Objects, Events)  │
└─────────────────────────────────────┘
```

---

## 2. Estructura de Carpetas (Feature-Based + Clean Architecture)

```
src/
├── modules/                    # Cada módulo es un feature completo
│   └── users/
│       ├── domain/             # Capa más interna - Reglas de negocio puras
│       │   ├── entities/       # Entidades de negocio
│       │   ├── value-objects/  # Value objects inmutables con validación
│       │   ├── events/         # Eventos de dominio
│       │   ├── repositories/   # Interfaces (contratos) de repositorios
│       │   └── errors/         # Errores de dominio personalizados
│       │
│       ├── application/        # Casos de uso - CQRS
│       │   ├── commands/       # Comandos (escrituras)
│       │   ├── queries/        # Queries (lecturas)
│       │   ├── handlers/       # Command y Query handlers
│       │   ├── dto/            # Data Transfer Objects
│       │   └── interfaces/     # Interfaces que necesitan los casos de uso
│       │
│       └── infrastructure/     # Implementaciones concretas
│           ├── http/
│           │   ├── controllers/
│           │   └── routes/
│           ├── repositories/   # Implementaciones de repositorios
│           └── mappers/        # Mappers domain <-> infrastructure
│
├── shared/                     # Código compartido entre módulos
│   ├── domain/                 # Base classes, Result, DomainEvent
│   ├── application/            # Base use-case, event bus, unit of work
│   └── infrastructure/         # Base controller, middlewares comunes, config
│       ├── http/
│       │   ├── middlewares/    # Auth, validation, error handling, security
│       │   └── docs/           # OpenAPI/Swagger docs
│       ├── config/             # Logger, env config, database
│       └── utils/              # Utilidades genéricas
│
└── index.ts                    # Punto de entrada - Dependency Injection Container
```

---

## 3. Domain Layer (Sin dependencias externas)

### 3.1 Result Pattern (Value Objects seguros)

```typescript
// src/shared/domain/Result.ts
export class Result<T, E = Error> {
  private constructor(
    private readonly _value?: T,
    private readonly _error?: E,
    private readonly _isSuccess: boolean = true
  ) {}

  static ok<T>(value: T): Result<T, never> {
    return new Result(value, undefined, true);
  }

  static fail<E>(error: E): Result<never, E> {
    return new Result(undefined, error, false);
  }

  get isSuccess(): boolean { return this._isSuccess; }
  get isFailure(): boolean { return !this._isSuccess; }

  get value(): T {
    if (!this._isSuccess) throw new Error('Cannot get value from a failed result');
    return this._value!;
  }

  get error(): E {
    if (this._isSuccess) throw new Error('Cannot get error from a successful result');
    return this._error!;
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    return this._isSuccess ? Result.ok(fn(this._value!)) : Result.fail(this._error!);
  }

  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return this._isSuccess ? fn(this._value!) : Result.fail(this._error!);
  }
}
```

### 3.2 Value Objects

```typescript
// src/modules/users/domain/value-objects/Email.ts
import { Result } from '../../../../shared/domain/Result';
import { ValidationError } from '../errors/ValidationError';

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

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

// src/modules/users/domain/value-objects/UserName.ts
import { Result } from '../../../../shared/domain/Result';
import { ValidationError } from '../errors/ValidationError';

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
}
```

### 3.3 Entidades de Dominio

```typescript
// src/modules/users/domain/entities/User.ts
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

  static create(
    id: string,
    emailResult: Email,
    nameResult: UserName
  ): User {
    const user = new User(id, emailResult, nameResult);
    user.addDomainEvent(new UserCreatedEvent(id, emailResult.value));
    return user;
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
```

### 3.4 Eventos de Dominio

```typescript
// src/shared/domain/DomainEvent.ts
export abstract class DomainEvent {
  readonly occurredAt: Date = new Date();
  constructor(
    public readonly aggregateId: string,
    public readonly eventType: string
  ) {}
}

// src/shared/domain/IEventBus.ts
export interface IEventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: (event: T) => Promise<void>
  ): void;
}

// src/modules/users/domain/events/UserCreatedEvent.ts
import { DomainEvent } from '../../../../shared/domain/DomainEvent';

export class UserCreatedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly email: string
  ) {
    super(aggregateId, 'USER_CREATED');
  }
}
```

### 3.5 Errores de Dominio

```typescript
// src/modules/users/domain/errors/DomainError.ts
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
```

### 3.6 Interfaces de Repositorio (Contratos)

```typescript
// src/modules/users/domain/repositories/IUserRepository.ts
import { User } from '../entities/User';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<void>;
  exists(email: string): Promise<boolean>;
}

// src/shared/application/IUnitOfWork.ts
export interface IUnitOfWork {
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}
```

---

## 4. Application Layer (CQRS + Handlers)

### 4.1 DTOs

```typescript
// src/modules/users/application/dto/UserDTO.ts
export interface CreateUserDTO {
  email: string;
  name: string;
}

export interface UserResponseDTO {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface UpdateUserDTO {
  name?: string;
  email?: string;
}
```

### 4.2 Commands y Queries

```typescript
// src/modules/users/application/commands/CreateUserCommand.ts
export class CreateUserCommand {
  constructor(
    public readonly email: string,
    public readonly name: string
  ) {}
}

// src/modules/users/application/queries/GetUserByIdQuery.ts
export class GetUserByIdQuery {
  constructor(public readonly id: string) {}
}

// src/modules/users/application/queries/ListUsersQuery.ts
export interface ListUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
}
```

### 4.3 Command Handlers (Escrituras)

```typescript
// src/modules/users/application/handlers/CreateUserHandler.ts
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';
import { Email } from '../../domain/value-objects/Email';
import { UserName } from '../../domain/value-objects/UserName';
import { EmailAlreadyExistsError } from '../../domain/errors/DomainError';
import { CreateUserCommand } from '../commands/CreateUserCommand';
import { UserResponseDTO } from '../dto/UserDTO';
import { IEventBus } from '../../../../shared/domain/IEventBus';
import { IUnitOfWork } from '../../../../shared/application/IUnitOfWork';

export class CreateUserHandler {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly eventBus: IEventBus,
    private readonly unitOfWork: IUnitOfWork
  ) {}

  async execute(command: CreateUserCommand): Promise<UserResponseDTO> {
    // Validar value objects
    const emailResult = Email.create(command.email);
    if (emailResult.isFailure) {
      throw emailResult.error;
    }

    const nameResult = UserName.create(command.name);
    if (nameResult.isFailure) {
      throw nameResult.error;
    }

    // Verificar duplicados
    const exists = await this.userRepository.exists(command.email);
    if (exists) {
      throw new EmailAlreadyExistsError(command.email);
    }

    // Crear entidad (genera evento de dominio)
    const user = User.create(
      crypto.randomUUID(),
      emailResult.value,
      nameResult.value
    );

    // Transacción
    await this.unitOfWork.beginTransaction();
    try {
      const savedUser = await this.userRepository.save(user);

      // Publicar eventos de dominio
      for (const event of savedUser.domainEvents) {
        await this.eventBus.publish(event);
      }
      savedUser.clearDomainEvents();

      await this.unitOfWork.commit();

      return this.toDTO(savedUser);
    } catch (error) {
      await this.unitOfWork.rollback();
      throw error;
    }
  }

  private toDTO(user: User): UserResponseDTO {
    return {
      id: user.id,
      email: user.getEmail(),
      name: user.getName(),
      createdAt: user.createdAt,
    };
  }
}

// src/modules/users/application/handlers/UpdateUserHandler.ts
export class UpdateUserHandler {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly unitOfWork: IUnitOfWork
  ) {}

  async execute(userId: string, dto: UpdateUserDTO): Promise<UserResponseDTO> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    // Reconstruir con nuevos valores (inmutabilidad)
    let newEmail = user.email;
    let newName = user.name;

    if (dto.email) {
      const emailResult = Email.create(dto.email);
      if (emailResult.isFailure) throw emailResult.error;

      const exists = await this.userRepository.exists(dto.email);
      if (exists && dto.email !== user.getEmail()) {
        throw new EmailAlreadyExistsError(dto.email);
      }
      newEmail = emailResult.value;
    }

    if (dto.name) {
      const nameResult = UserName.create(dto.name);
      if (nameResult.isFailure) throw nameResult.error;
      newName = nameResult.value;
    }

    const updatedUser = new User(user.id, newEmail, newName, user.createdAt);

    await this.unitOfWork.beginTransaction();
    try {
      const saved = await this.userRepository.save(updatedUser);
      await this.unitOfWork.commit();
      return {
        id: saved.id,
        email: saved.getEmail(),
        name: saved.getName(),
        createdAt: saved.createdAt,
      };
    } catch (error) {
      await this.unitOfWork.rollback();
      throw error;
    }
  }
}

// src/modules/users/application/handlers/DeleteUserHandler.ts
export class DeleteUserHandler {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }
    await this.userRepository.delete(userId);
  }
}
```

### 4.4 Query Handlers (Lecturas - pueden saltarse reglas de dominio complejas)

```typescript
// src/modules/users/application/handlers/GetUserHandler.ts
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserNotFoundError } from '../../domain/errors/DomainError';
import { GetUserByIdQuery } from '../queries/GetUserByIdQuery';
import { UserResponseDTO } from '../dto/UserDTO';

export class GetUserHandler {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(query: GetUserByIdQuery): Promise<UserResponseDTO> {
    const user = await this.userRepository.findById(query.id);

    if (!user) {
      throw new UserNotFoundError(query.id);
    }

    return {
      id: user.id,
      email: user.getEmail(),
      name: user.getName(),
      createdAt: user.createdAt,
    };
  }
}

// src/modules/users/application/handlers/ListUsersHandler.ts
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ListUsersHandler {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(query: ListUsersQuery): Promise<PaginatedResult<UserResponseDTO>> {
    const page = query.page || 1;
    const limit = query.limit || 10;

    // Las queries pueden usar proyecciones directas de la DB para performance
    const users = await this.userRepository.findAll({ page, limit, search: query.search });
    const total = await this.userRepository.count(query.search);

    return {
      data: users.map(u => ({
        id: u.id,
        email: u.getEmail(),
        name: u.getName(),
        createdAt: u.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
```

---

## 5. Infrastructure Layer (Implementaciones concretas)

### 5.1 Configuración Centralizada con Zod

```typescript
// src/shared/infrastructure/config/Config.ts
import { z } from 'zod';

const configSchema = z.object({
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'), // 15 min
  RATE_LIMIT_MAX: z.string().default('100'),
});

export const config = configSchema.parse(process.env);

export type Config = z.infer<typeof configSchema>;
```

### 5.2 Logger Estructurado con Pino

```typescript
// src/shared/infrastructure/config/Logger.ts
import pino from 'pino';
import { config } from './Config';

export const logger = pino({
  level: config.LOG_LEVEL,
  transport: config.NODE_ENV !== 'production' 
    ? { target: 'pino-pretty', options: { colorize: true } } 
    : undefined,
  base: {
    pid: process.pid,
    env: config.NODE_ENV,
  },
});

// Uso en casos de uso:
// logger.info({ userId: user.id }, 'User created successfully');
// logger.error({ error: err.message, stack: err.stack }, 'Failed to create user');
```

### 5.3 Base de Datos (Prisma + Unit of Work)

```typescript
// src/shared/infrastructure/config/Database.ts
import { PrismaClient } from '@prisma/client';
import { logger } from './Logger';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error'] 
    : ['error'],
});

// src/shared/infrastructure/persistence/PrismaUnitOfWork.ts
import { IUnitOfWork } from '../../../shared/application/IUnitOfWork';
import { prisma } from '../config/Database';

export class PrismaUnitOfWork implements IUnitOfWork {
  async beginTransaction(): Promise<void> {
    // Prisma maneja transacciones automáticamente con $transaction
    // Esta implementación es conceptual para otros ORMs
    logger.debug('Transaction started');
  }

  async commit(): Promise<void> {
    logger.debug('Transaction committed');
  }

  async rollback(): Promise<void> {
    logger.debug('Transaction rolled back');
  }
}
```

### 5.4 Mappers (Domain <-> Infrastructure)

```typescript
// src/modules/users/infrastructure/mappers/UserMapper.ts
import { User } from '../../domain/entities/User';
import { Email } from '../../domain/value-objects/Email';
import { UserName } from '../../domain/value-objects/UserName';
import { User as PrismaUser } from '@prisma/client';

export class UserMapper {
  static toDomain(prismaUser: PrismaUser): User {
    // Los value objects se crean directamente (ya validados en DB)
    return new User(
      prismaUser.id,
      new Email(prismaUser.email),  // Asume email válido en DB
      new UserName(prismaUser.name), // Asume nombre válido en DB
      prismaUser.createdAt
    );
  }

  static toPrisma(user: User): PrismaUser {
    return {
      id: user.id,
      email: user.getEmail(),
      name: user.getName(),
      createdAt: user.createdAt,
    };
  }
}
```

### 5.5 Implementación de Repositorio con Prisma

```typescript
// src/modules/users/infrastructure/repositories/PrismaUserRepository.ts
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';
import { UserMapper } from '../mappers/UserMapper';
import { prisma } from '../../../../shared/infrastructure/config/Database';

export class PrismaUserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? UserMapper.toDomain(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    return user ? UserMapper.toDomain(user) : null;
  }

  async save(user: User): Promise<User> {
    const prismaUser = UserMapper.toPrisma(user);
    const saved = await prisma.user.upsert({
      where: { id: prismaUser.id },
      create: prismaUser,
      update: prismaUser,
    });
    return UserMapper.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }

  async exists(email: string): Promise<boolean> {
    const count = await prisma.user.count({ where: { email } });
    return count > 0;
  }

  async findAll(options: { page: number; limit: number; search?: string }): Promise<User[]> {
    const users = await prisma.user.findMany({
      where: options.search 
        ? { OR: [
            { email: { contains: options.search } },
            { name: { contains: options.search } }
          ]}
        : undefined,
      skip: (options.page - 1) * options.limit,
      take: options.limit,
      orderBy: { createdAt: 'desc' },
    });
    return users.map(UserMapper.toDomain);
  }

  async count(search?: string): Promise<number> {
    return prisma.user.count({
      where: search 
        ? { OR: [
            { email: { contains: search } },
            { name: { contains: search } }
          ]}
        : undefined,
    });
  }
}
```

### 5.6 Event Bus (In-Memory para desarrollo, Redis para producción)

```typescript
// src/shared/infrastructure/events/InMemoryEventBus.ts
import { IEventBus } from '../../domain/IEventBus';
import { DomainEvent } from '../../domain/DomainEvent';
import { logger } from '../config/Logger';

export class InMemoryEventBus implements IEventBus {
  private handlers: Map<string, Array<(event: DomainEvent) => Promise<void>>> = new Map();

  async publish(event: DomainEvent): Promise<void> {
    logger.info({ eventType: event.eventType, aggregateId: event.aggregateId }, 'Event published');
    const handlers = this.handlers.get(event.eventType) || [];
    await Promise.all(handlers.map(h => h(event).catch(err => {
      logger.error({ error: err.message }, 'Event handler failed');
    })));
  }

  subscribe<T extends DomainEvent>(eventType: string, handler: (event: T) => Promise<void>): void {
    const existing = this.handlers.get(eventType) || [];
    existing.push(handler as (event: DomainEvent) => Promise<void>);
    this.handlers.set(eventType, existing);
  }
}

// src/modules/users/infrastructure/events/UserCreatedEventHandler.ts
import { UserCreatedEvent } from '../../domain/events/UserCreatedEvent';
import { logger } from '../../../../shared/infrastructure/config/Logger';

export class UserCreatedEventHandler {
  async handle(event: UserCreatedEvent): Promise<void> {
    logger.info({ userId: event.aggregateId, email: event.email }, 'Sending welcome email');
    // Aquí integrarías con SendGrid, AWS SES, etc.
  }
}
```

---

## 6. HTTP Layer (Fastify + Plugins)

### 6.1 Validación con Zod

En Fastify la validación se registra como `preValidation` hook o mediante schema de Fastify. Usamos Zod para mantener la misma semántica de validación de domain.

```typescript
// src/shared/infrastructure/http/middlewares/ValidateRequest.ts
import { z } from 'zod';
import { FastifyRequest, FastifyReply, preValidationHookHandler } from 'fastify';

export function validateBody(schema: z.ZodSchema): preValidationHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      reply.status(400).send({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    // Reemplazar body por el parseado tipado
    (request as FastifyRequest & { body: unknown }).body = result.data;
  };
}

export function validateParams(schema: z.ZodSchema): preValidationHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = schema.safeParse(request.params);
    if (!result.success) {
      reply.status(400).send({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    (request as FastifyRequest & { params: unknown }).params = result.data;
  };
}

export function validateQuery(schema: z.ZodSchema): preValidationHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = schema.safeParse(request.query);
    if (!result.success) {
      reply.status(400).send({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    (request as FastifyRequest & { query: unknown }).query = result.data;
  };
}

// Schemas de validación
export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).max(100).optional(),
}).refine(data => data.email || data.name, {
  message: 'At least one field must be provided',
});

export const userIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
});
```

### 6.2 Seguridad (Helmet, CORS, Rate Limiting)

```typescript
// src/shared/infrastructure/http/middlewares/Security.ts
import { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { config } from '../../config/Config';

export async function registerSecurityPlugins(app: FastifyInstance): Promise<void> {
  await app.register(helmet, {
    contentSecurityPolicy: config.NODE_ENV === 'production',
    crossOriginEmbedderPolicy: config.NODE_ENV === 'production',
  });

  await app.register(cors, {
    origin: config.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  });

  await app.register(rateLimit, {
    max: parseInt(config.RATE_LIMIT_MAX),
    timeWindow: parseInt(config.RATE_LIMIT_WINDOW_MS),
    errorResponseBuilder: (req, context) => ({
      error: 'Too many requests, please try again later',
      code: 'RATE_LIMIT',
      retryAfter: context.after,
    }),
  });
}
```

### 6.3 Manejo de Errores Global

```typescript
// src/shared/infrastructure/http/middlewares/ErrorHandler.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DomainError } from '../../../../modules/users/domain/errors/DomainError';
import { logger } from '../../config/Logger';
import { config } from '../../config/Config';

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: Error, request: FastifyRequest, reply: FastifyReply) => {
    const requestId = request.headers['x-request-id'] || crypto.randomUUID();

    if (error instanceof DomainError) {
      logger.warn({ 
        error: error.message, 
        code: error.code, 
        requestId,
        path: request.url 
      }, 'Domain error');

      reply.status(error.statusCode).send({
        error: error.message,
        code: error.code,
        requestId,
      });
      return;
    }

    if (error.name === 'ZodError') {
      reply.status(400).send({
        error: 'Validation error',
        code: 'VALIDATION_ERROR',
        requestId,
      });
      return;
    }

    logger.error({ 
      error: error.message, 
      stack: error.stack,
      requestId,
      path: request.url,
      method: request.method,
    }, 'Unexpected error');

    reply.status(500).send({
      error: config.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message,
      code: 'INTERNAL_ERROR',
      requestId,
    });
  });

  // 404 handler
  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    reply.status(404).send({
      error: 'Route not found',
      code: 'NOT_FOUND',
      requestId: request.headers['x-request-id'] || crypto.randomUUID(),
    });
  });
}
```

### 6.4 Request Logging

```typescript
// src/shared/infrastructure/http/middlewares/RequestLogger.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../config/Logger';

export function registerRequestLogger(app: FastifyInstance): void {
  app.addHook('onRequest', async (request: FastifyRequest) => {
    const requestId = crypto.randomUUID();
    request.headers['x-request-id'] = requestId;
  });

  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    logger.info({
      requestId: request.headers['x-request-id'],
      method: request.method,
      path: request.url,
      statusCode: reply.statusCode,
      duration: `${reply.elapsedTime.toFixed(2)}ms`,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    }, 'Request completed');
  });
}
```

### 6.5 Controllers (Adaptadores de entrada)

```typescript
// src/modules/users/infrastructure/http/controllers/UserController.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateUserHandler } from '../../../application/handlers/CreateUserHandler';
import { GetUserHandler } from '../../../application/handlers/GetUserHandler';
import { ListUsersHandler } from '../../../application/handlers/ListUsersHandler';
import { UpdateUserHandler } from '../../../application/handlers/UpdateUserHandler';
import { DeleteUserHandler } from '../../../application/handlers/DeleteUserHandler';
import { CreateUserCommand } from '../../../application/commands/CreateUserCommand';
import { GetUserByIdQuery } from '../../../application/queries/GetUserByIdQuery';
import { ListUsersQuery } from '../../../application/queries/ListUsersQuery';
import { UpdateUserDTO } from '../../../application/dto/UserDTO';
import { logger } from '../../../../../shared/infrastructure/config/Logger';

interface CreateUserBody {
  email: string;
  name: string;
}

interface UserParams {
  id: string;
}

interface ListUsersQueryString {
  page?: number;
  limit?: number;
  search?: string;
}

export class UserController {
  constructor(
    private readonly createUserHandler: CreateUserHandler,
    private readonly getUserHandler: GetUserHandler,
    private readonly listUsersHandler: ListUsersHandler,
    private readonly updateUserHandler: UpdateUserHandler,
    private readonly deleteUserHandler: DeleteUserHandler
  ) {}

  async create(request: FastifyRequest<{ Body: CreateUserBody }>, reply: FastifyReply): Promise<void> {
    const { email, name } = request.body;
    const command = new CreateUserCommand(email, name);
    const user = await this.createUserHandler.execute(command);
    reply.status(201).send(user);
  }

  async getById(request: FastifyRequest<{ Params: UserParams }>, reply: FastifyReply): Promise<void> {
    const { id } = request.params;
    const query = new GetUserByIdQuery(id);
    const user = await this.getUserHandler.execute(query);
    reply.status(200).send(user);
  }

  async list(request: FastifyRequest<{ Querystring: ListUsersQueryString }>, reply: FastifyReply): Promise<void> {
    const query: ListUsersQuery = {
      page: request.query.page,
      limit: request.query.limit,
      search: request.query.search,
    };
    const result = await this.listUsersHandler.execute(query);
    reply.status(200).send(result);
  }

  async update(
    request: FastifyRequest<{ Params: UserParams; Body: UpdateUserDTO }>,
    reply: FastifyReply
  ): Promise<void> {
    const { id } = request.params;
    const user = await this.updateUserHandler.execute(id, request.body);
    reply.status(200).send(user);
  }

  async delete(request: FastifyRequest<{ Params: UserParams }>, reply: FastifyReply): Promise<void> {
    const { id } = request.params;
    await this.deleteUserHandler.execute(id);
    reply.status(204).send();
  }
}
```

### 6.6 Routes con OpenAPI/Swagger

```typescript
// src/modules/users/infrastructure/http/routes/UserRoutes.ts
import { FastifyInstance } from 'fastify';
import { UserController } from '../controllers/UserController';
import { validateBody, validateParams, validateQuery, createUserSchema, updateUserSchema, userIdParamsSchema, listUsersQuerySchema } from '../../../../../shared/infrastructure/http/middlewares/ValidateRequest';

export async function registerUserRoutes(app: FastifyInstance, userController: UserController): Promise<void> {
  app.register(
    async (routes: FastifyInstance) => {
      /**
       * @openapi
       * /api/users:
       *   post:
       *     summary: Create a new user
       *     tags: [Users]
       *     requestBody:
       *       required: true
       *       content:
       *         application/json:
       *           schema:
       *             type: object
       *             required: [email, name]
       *             properties:
       *               email: { type: string, format: email, example: "user@example.com" }
       *               name: { type: string, minLength: 2, maxLength: 100, example: "John Doe" }
       *     responses:
       *       201:
       *         description: User created successfully
       *       400:
       *         description: Validation error
       *       409:
       *         description: Email already exists
       */
      routes.post('/', { preValidation: validateBody(createUserSchema) }, (req, reply) =>
        userController.create(req as typeof req & { Body: { email: string; name: string } }, reply)
      );

      /**
       * @openapi
       * /api/users:
       *   get:
       *     summary: List all users
       *     tags: [Users]
       *     parameters:
       *       - in: query
       *         name: page
       *         schema: { type: integer, default: 1 }
       *       - in: query
       *         name: limit
       *         schema: { type: integer, default: 10 }
       *       - in: query
       *         name: search
       *         schema: { type: string }
       *     responses:
       *       200:
       *         description: Paginated list of users
       */
      routes.get('/', { preValidation: validateQuery(listUsersQuerySchema) }, (req, reply) =>
        userController.list(req as typeof req & { Querystring: { page?: number; limit?: number; search?: string } }, reply)
      );

      /**
       * @openapi
       * /api/users/{id}:
       *   get:
       *     summary: Get user by ID
       *     tags: [Users]
       *     parameters:
       *       - in: path
       *         name: id
       *         required: true
       *         schema: { type: string }
       *     responses:
       *       200: { description: User found }
       *       404: { description: User not found }
       */
      routes.get('/:id', { preValidation: validateParams(userIdParamsSchema) }, (req, reply) =>
        userController.getById(req as typeof req & { Params: { id: string } }, reply)
      );

      routes.patch('/:id', { preValidation: [validateParams(userIdParamsSchema), validateBody(updateUserSchema)] }, (req, reply) =>
        userController.update(req as typeof req & { Params: { id: string }; Body: { email?: string; name?: string } }, reply)
      );

      routes.delete('/:id', { preValidation: validateParams(userIdParamsSchema) }, (req, reply) =>
        userController.delete(req as typeof req & { Params: { id: string } }, reply)
      );
    },
    { prefix: '/users' }
  );
}
```

### 6.7 Health Checks

```typescript
// src/shared/infrastructure/http/routes/HealthRoutes.ts
import { FastifyInstance } from 'fastify';
import { prisma } from '../config/Database';
import { logger } from '../config/Logger';

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (request, reply) => {
    const checks = await Promise.all([
      dbHealthCheck(),
    ]);

    const healthy = checks.every(c => c.status === 'up');

    reply.status(healthy ? 200 : 503).send({
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: checks.reduce((acc, check) => ({ ...acc, [check.name]: check }), {}),
    });
  });

  app.get('/health/live', async (request, reply) => {
    reply.status(200).send({ status: 'alive' });
  });

  app.get('/health/ready', async (request, reply) => {
    const dbCheck = await dbHealthCheck();
    reply.status(dbCheck.status === 'up' ? 200 : 503).send({
      status: dbCheck.status === 'up' ? 'ready' : 'not ready',
    });
  });
}

async function dbHealthCheck() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { name: 'database', status: 'up' as const, responseTime: '10ms' };
  } catch (error) {
    logger.error('Database health check failed');
    return { name: 'database', status: 'down' as const, error: 'Connection failed' };
  }
}
```

### 6.8 Server Factory

```typescript
// src/shared/infrastructure/http/server.ts
import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { FastifyInstance } from 'fastify';
import { registerErrorHandler } from './middlewares/ErrorHandler';
import { registerRequestLogger } from './middlewares/RequestLogger';
import { registerSecurityPlugins } from './middlewares/Security';
import { config } from '../config/Config';

export async function createServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false, // Usamos Pino directamente
    genReqId: () => crypto.randomUUID(),
  });

  // Request logging
  registerRequestLogger(app);

  // Security plugins
  await registerSecurityPlugins(app);

  // Body parsing ya viene habilitado por defecto en Fastify

  // Swagger / OpenAPI docs
  if (config.NODE_ENV !== 'production') {
    await app.register(swagger, {
      openapi: {
        info: {
          title: 'Clean Architecture API',
          version: '1.0.0',
          description: 'API built with Clean Architecture, Fastify and TypeScript',
        },
        servers: [{ url: `http://localhost:${config.PORT}/api` }],
      },
    });

    await app.register(swaggerUi, {
      routePrefix: '/api-docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
    });
  }

  return app;
}

export async function registerRoutes(
  app: FastifyInstance,
  routeRegistrars: Array<(app: FastifyInstance) => Promise<void>>
): Promise<void> {
  await app.register(async (api) => {
    for (const register of routeRegistrars) {
      await register(api);
    }
  }, { prefix: '/api' });

  // Error handler debe registrarse después de las rutas
  registerErrorHandler(app);
}
```

---

## 7. Dependency Injection Container (Manual)

```typescript
// src/index.ts
import { createServer, registerRoutes } from './shared/infrastructure/http/server';
import { PrismaUserRepository } from './modules/users/infrastructure/repositories/PrismaUserRepository';
import { CreateUserHandler } from './modules/users/application/handlers/CreateUserHandler';
import { GetUserHandler } from './modules/users/application/handlers/GetUserHandler';
import { ListUsersHandler } from './modules/users/application/handlers/ListUsersHandler';
import { UpdateUserHandler } from './modules/users/application/handlers/UpdateUserHandler';
import { DeleteUserHandler } from './modules/users/application/handlers/DeleteUserHandler';
import { UserController } from './modules/users/infrastructure/http/controllers/UserController';
import { registerUserRoutes } from './modules/users/infrastructure/http/routes/UserRoutes';
import { registerHealthRoutes } from './shared/infrastructure/http/routes/HealthRoutes';
import { InMemoryEventBus } from './shared/infrastructure/events/InMemoryEventBus';
import { UserCreatedEventHandler } from './modules/users/infrastructure/events/UserCreatedEventHandler';
import { PrismaUnitOfWork } from './shared/infrastructure/persistence/PrismaUnitOfWork';
import { logger } from './shared/infrastructure/config/Logger';
import { config } from './shared/infrastructure/config/Config';
import { FastifyInstance } from 'fastify';

async function bootstrap(): Promise<void> {
  // ========== Dependency Injection Container ==========

  // Infrastructure
  const eventBus = new InMemoryEventBus();
  const unitOfWork = new PrismaUnitOfWork();
  const userRepository = new PrismaUserRepository();

  // Event Handlers
  const userCreatedHandler = new UserCreatedEventHandler();
  eventBus.subscribe('USER_CREATED', userCreatedHandler.handle.bind(userCreatedHandler));

  // Application Handlers
  const createUserHandler = new CreateUserHandler(userRepository, eventBus, unitOfWork);
  const getUserHandler = new GetUserHandler(userRepository);
  const listUsersHandler = new ListUsersHandler(userRepository);
  const updateUserHandler = new UpdateUserHandler(userRepository, unitOfWork);
  const deleteUserHandler = new DeleteUserHandler(userRepository);

  // Controllers
  const userController = new UserController(
    createUserHandler,
    getUserHandler,
    listUsersHandler,
    updateUserHandler,
    deleteUserHandler
  );

  // ========== Start Server ==========
  const app: FastifyInstance = await createServer();

  await registerRoutes(app, [
    async (server) => await registerUserRoutes(server, userController),
    async (server) => await registerHealthRoutes(server),
  ]);

  try {
    await app.listen({ port: parseInt(config.PORT), host: '0.0.0.0' });
    logger.info(`🚀 Server running on port ${config.PORT} in ${config.NODE_ENV} mode`);
    logger.info(`📚 API Docs: http://localhost:${config.PORT}/api-docs`);
  } catch (error) {
    logger.error(error, 'Failed to start server');
    process.exit(1);
  }
}

bootstrap();
```

---

## 8. Testing Completo

### 8.1 Tests Unitarios (Casos de uso con mocks)

```typescript
// tests/unit/CreateUserHandler.test.ts
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
      save: jest.fn().mockImplementation(user => Promise.resolve(user)),
      delete: jest.fn(),
      exists: jest.fn().mockResolvedValue(false),
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
    expect(mockUoW.rollback).not.toHaveBeenCalled(); // No se inicia transacción si falla validación
  });

  it('should rollback on save error', async () => {
    mockRepo.save.mockRejectedValue(new Error('DB Error'));
    const command = new CreateUserCommand('test@example.com', 'John');

    await expect(handler.execute(command)).rejects.toThrow('DB Error');
    expect(mockUoW.rollback).toHaveBeenCalled();
  });
});
```

### 8.2 Tests de Integración con TestContainers

```typescript
// tests/integration/UserRepository.test.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';
import { PrismaUserRepository } from '../../src/modules/users/infrastructure/repositories/PrismaUserRepository';
import { User } from '../../src/modules/users/domain/entities/User';
import { Email } from '../../src/modules/users/domain/value-objects/Email';
import { UserName } from '../../src/modules/users/domain/value-objects/UserName';

describe('PrismaUserRepository Integration', () => {
  let container: PostgreSqlContainer;
  let prisma: PrismaClient;
  let repository: PrismaUserRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer()
      .withDatabase('test_db')
      .withUsername('test')
      .withPassword('test')
      .start();

    const connectionUri = container.getConnectionUri();

    prisma = new PrismaClient({
      datasources: { db: { url: connectionUri } },
    });

    // Ejecutar migraciones
    // await execa('npx', ['prisma', 'migrate', 'deploy']);

    repository = new PrismaUserRepository();
  }, 30000);

  afterAll(async () => {
    await prisma.$disconnect();
    await container.stop();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  it('should save and retrieve a user', async () => {
    const user = User.create(
      'user-1',
      Email.create('test@example.com').value,
      UserName.create('John Doe').value
    );

    const saved = await repository.save(user);
    const retrieved = await repository.findById(saved.id);

    expect(retrieved).not.toBeNull();
    expect(retrieved!.getEmail()).toBe('test@example.com');
  });

  it('should check email existence', async () => {
    const user = User.create(
      'user-2',
      Email.create('exists@example.com').value,
      UserName.create('Jane').value
    );
    await repository.save(user);

    const exists = await repository.exists('exists@example.com');
    expect(exists).toBe(true);
  });
});
```

### 8.3 Tests E2E con Fastify Inject

```typescript
// tests/e2e/users.e2e.test.ts
import { FastifyInstance } from 'fastify';
import { createServer, registerRoutes } from '../../src/shared/infrastructure/http/server';
import { registerUserRoutes } from '../../src/modules/users/infrastructure/http/routes/UserRoutes';
// ... imports de DI

describe('Users E2E', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Setup DI con mocks o DB de test
    const userController = new UserController(/* handlers */);
    app = await createServer();
    await registerRoutes(app, [
      async (server) => await registerUserRoutes(server, userController),
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/users - should create user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/users',
      payload: { email: 'e2e@test.com', name: 'E2E User' },
    });

    expect(response.statusCode).toBe('201');
    const body = JSON.parse(response.payload);
    expect(body.email).toBe('e2e@test.com');
    expect(body).toHaveProperty('id');
  });

  it('POST /api/users - should reject invalid email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/users',
      payload: { email: 'invalid', name: 'Test' },
    });

    expect(response.statusCode).toBe('400');
  });

  it('GET /api/users/:id - should return 404 for non-existent user', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/users/non-existent-id',
    });

    expect(response.statusCode).toBe('404');
  });
});
```

---

## 9. ❌ Anti-patrones a Evitar

| Anti-patrón | Por qué es malo | Solución |
|-------------|-----------------|----------|
| **Lógica de negocio en controllers** | Acopla HTTP a reglas de dominio, imposible testear sin Fastify | Mover a handlers/casos de uso |
| **Entidades mutables (setters)** | Rompe inmutabilidad, inconsistencias, race conditions | Constructor + métodos de dominio, reconstruir entidades |
| **Repositorios que retornan DTOs** | Rompe la separación de capas, acopla infraestructura a application | Retornar entidades, mapear en handler |
| **`any` en TypeScript** | Pierdes type safety, errores en runtime | Usar tipos estrictos, `unknown`, generics |
| **Casos de uso que llaman a otros casos de uso** | Crea acoplamiento circular, difícil de rastrear | Usar domain events para comunicación indirecta |
| **Lógica de autorización en controllers** | Difícil de testear y reutilizar | Domain services o policy objects en application |
| **Dependencias de Fastify en application** | Rompe la regla de dependencia, no puedes cambiar framework | Fastify solo en `infrastructure/http/` |
| **Queries que modifican estado** | Rompe CQRS, comportamiento impredecible | Separar comandos (escritura) de queries (lectura) |
| **Validación solo en Zod/Fastify** | La lógica de negocio no está protegida si se reusa en CLI/workers | Validar también en value objects de domain |
| **Importar `infrastructure` desde `domain`** | Rompe Clean Architecture completamente | Las interfaces van en domain, implementaciones en infrastructure |
| **Servicios God Object** | `UserService` con 20 métodos, acoplamiento masivo | Un handler/clase por caso de uso |
| **Usar `throw new Error()` en domain** | Pierdes semántica, el controller no sabe qué código HTTP usar | Errores de dominio con `code` y `statusCode` |

---

## 10. Checklist de Validación

- [ ] `domain/` no tiene imports de `application/`, `infrastructure/` o `shared/` (excepto `shared/domain/`)
- [ ] `application/` solo importa de `domain/` y `shared/application/`
- [ ] `infrastructure/` puede importar de `domain/`, `application/` y `shared/`
- [ ] Cada caso de uso es una clase independiente (handler)
- [ ] Los controllers solo adaptan HTTP a handlers (sin lógica de negocio)
- [ ] Los repositorios son interfaces en domain, implementaciones en infrastructure
- [ ] Los errores de dominio no conocen códigos HTTP (pero tienen `statusCode` para mapeo)
- [ ] Los DTOs desacoplan entidades de dominio de la API
- [ ] Existe un punto de inyección de dependencias (container o manual)
- [ ] Los value objects validan en su creación (fail-fast)
- [ ] Las entidades son inmutables (no setters)
- [ ] Los eventos de dominio desacoplan acciones secundarias
- [ ] CQRS separa comandos de queries
- [ ] Unit of Work maneja transacciones
- [ ] Zod valida en la capa HTTP, value objects en domain
- [ ] Logger estructurado (no console.log)
- [ ] Configuración validada con Zod en startup
- [ ] Rate limiting, helmet, CORS configurados
- [ ] Health checks implementados
- [ ] Tests unitarios, de integración y E2E presentes
- [ ] Swagger/OpenAPI documenta los endpoints

---

## 11. Dependencias Recomendadas (package.json)

```json
{
  "dependencies": {
    "fastify": "^4.26.0",
    "@fastify/cors": "^9.0.0",
    "@fastify/helmet": "^11.1.0",
    "@fastify/rate-limit": "^9.1.0",
    "@fastify/swagger": "^8.14.0",
    "@fastify/swagger-ui": "^3.0.0",
    "zod": "^3.22.4",
    "pino": "^8.16.0",
    "pino-pretty": "^10.2.0",
    "@prisma/client": "^5.6.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.10.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "@testcontainers/postgresql": "^10.7.0",
    "prisma": "^5.6.0"
  }
}
```

---

## 12. Comandos Útiles

```bash
# Instalar dependencias
npm install

# Generar Prisma client
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev

# Desarrollo con hot reload
npm run dev

# Tests
npm run test:unit        # Tests unitarios
npm run test:integration # Tests con TestContainers
npm run test:e2e         # Tests end-to-end
npm run test:watch       # Modo watch

# Build producción
npm run build
npm start
```
