# Contributing to BotEsq

Thank you for your interest in contributing to BotEsq. This guide will help you get started.

## Development Setup

1. Fork the repository
2. Clone your fork and install dependencies:

```bash
git clone https://github.com/<your-username>/botesq.git
cd botesq
pnpm install
```

3. Create a branch for your work:

```bash
git checkout -b feat/your-feature-name
```

4. Set up the database:

```bash
cp .env.example .env
# Edit .env with your local PostgreSQL credentials
pnpm db:generate
pnpm db:migrate
```

## Project Structure

This is a pnpm monorepo managed with Turborepo:

- `apps/mcp-server` — MCP tool server (Fastify)
- `apps/web` — Next.js web application
- `packages/database` — Prisma schema and client
- `packages/shared` — Shared types and utilities

## Code Standards

### TypeScript

- No `any` types
- Use Zod for runtime validation
- Follow existing naming conventions:
  - Files: `kebab-case.ts`
  - Components: `PascalCase`
  - Functions/variables: `camelCase`
  - Constants: `SCREAMING_SNAKE_CASE`

### Testing

- Write tests for new functionality
- Run the full suite before submitting: `pnpm test`
- Ensure linting passes: `pnpm lint`

### Commits

Use conventional commit messages:

```
<type>: <short description>

<body explaining why, not what>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

## Pull Requests

1. Ensure all tests pass and lint is clean
2. Write a clear PR description explaining **what** changed and **why**
3. Keep PRs focused — one feature or fix per PR
4. Reference any related issues

## Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Include reproduction steps for bugs
- Check existing issues before creating a new one

## Security

If you discover a security vulnerability, please follow the process in [SECURITY.md](SECURITY.md) instead of opening a public issue.
