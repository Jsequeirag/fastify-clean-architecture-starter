# 🚀 Fastify Clean Architecture Starter

![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![TypeScript](https://img.shields.io/badge/typescript-5.3-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Tests](https://img.shields.io/badge/tests-unit%20%7C%20e2e-brightgreen)

A production-ready **Fastify + TypeScript** starter built with **Clean Architecture**, **CQRS**, and **Domain-Driven Design** principles. Swap frameworks, databases, or UIs without touching your business logic.

> ⚡️ Keywords: `fastify`, `typescript`, `clean-architecture`, `cqrs`, `prisma`, `nodejs`, `starter`, `domain-driven-design`

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🏗️ Clean Architecture | Domain → Application → Infrastructure layers with inward dependencies |
| 🔄 CQRS | Separate command and query handlers for writes and reads |
| 🧪 Testing | Unit, integration, and E2E tests with Jest + TestContainers |
| 🔒 Security | Helmet, CORS, rate limiting, request ID logging |
| 📚 API Docs | Auto-generated Swagger/OpenAPI at `/api-docs` |
| 🗄️ Persistence | Prisma + PostgreSQL with repository pattern |
| 📨 Domain Events | Decouple side effects via in-memory event bus |
| ✅ Validation | Zod at HTTP layer + value objects in domain |
| 📝 Structured Logs | Pino logger with pretty printing in dev |

---

## 📋 Requirements

- [Node.js](https://nodejs.org/) `>= 18`
- [pnpm](https://pnpm.io/) `>= 9` (this project uses pnpm as its package manager)
- [PostgreSQL](https://www.postgresql.org/) `>= 14`
- [Docker](https://www.docker.com/) (optional, for integration tests with TestContainers)

---

## 🛠️ Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/fastify-clean-architecture-starter.git
cd fastify-clean-architecture-starter

# 2. Install dependencies
pnpm install

# 3. Copy environment variables
cp .env.example .env

# 4. Update DATABASE_URL in .env
# DATABASE_URL="postgresql://user:password@localhost:5432/fastify_clean_db?schema=public"

# 5. Generate Prisma client and run migrations
pnpm prisma generate
pnpm prisma migrate dev

# 6. Start development server
pnpm dev
```

Open [http://localhost:3000/api-docs](http://localhost:3000/api-docs) to explore the API.

---

## 🧑‍💻 Basic Usage

### Create a user

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com", "name": "John Doe"}'
```

### List users

```bash
curl "http://localhost:3000/api/users?page=1&limit=10"
```

### Health check

```bash
curl http://localhost:3000/api/health
```

---

## 🧪 Running Tests

```bash
# Run all tests
pnpm test

# Run only unit tests
pnpm test:unit

# Run integration tests (requires Docker)
pnpm test:integration

# Run E2E tests
pnpm test:e2e

# Watch mode
pnpm test:watch
```

---

## 📁 Project Structure

```
src/
├── modules/                 # Feature modules (bounded contexts)
│   └── users/
│       ├── domain/          # Entities, value objects, events, errors, repository interfaces
│       ├── application/     # Commands, queries, handlers, DTOs
│       └── infrastructure/  # Controllers, routes, mappers, concrete repositories
├── shared/                  # Cross-cutting concerns
│   ├── domain/              # Result, DomainEvent, IEventBus
│   ├── application/         # IUnitOfWork
│   └── infrastructure/      # Config, logger, DB, HTTP server, middlewares
└── index.ts                 # Bootstrap + manual dependency injection
```

---

## 🏷️ License

This project is licensed under the **MIT License**.

**Why MIT?** Because this is a starter/template and MIT is the most permissive and widely adopted license for open-source Node.js projects. It allows anyone to use, modify, distribute, and even build commercial products on top of it with minimal friction.

See [LICENSE](./LICENSE) for details.

---

## 🛡️ .gitignore

An appropriate `.gitignore` is included for:

- `node_modules/` and `dist/`
- `.env` files
- Logs and coverage reports
- IDE/OS files (`.vscode`, `.idea`, `.DS_Store`)
- Prisma migration artifacts
- pnpm store and debug logs

---

## 📈 Commit Strategy

To keep the repository active and easy to follow, we recommend:

- **Commit frequency:** at least 3–5 meaningful commits per week during active development.
- **Commit convention:** use [Conventional Commits](https://www.conventionalcommits.org/)
  - `feat:` new feature
  - `fix:` bug fix
  - `refactor:` code restructuring
  - `test:` adding or updating tests
  - `docs:` documentation changes
  - `chore:` tooling/config changes
- **Atomic commits:** each commit should represent a single logical change.
- **Example:** `feat(users): add update user handler`

---

## 🤝 Contributing

Contributions are welcome. Please open an issue or pull request with a clear description of the change.
