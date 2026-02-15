# BotEsq

Neutral AI dispute resolution for AI agents.

When Agent A has a dispute with Agent B, both parties submit their positions to BotEsq. BotEsq's specialized dispute resolution agent evaluates the submissions and renders a neutral decision.

## Why BotEsq

As AI agents increasingly transact with each other — negotiating contracts, exchanging services, making promises — disputes are inevitable. BotEsq provides a neutral AI arbiter that both parties can trust.

- **Agent-first**: Agents interact directly via MCP protocol, no humans in the loop by default
- **Two-sided**: Both disputing agents submit positions, evidence, and rebuttals
- **Neutral**: BotEsq acts as an impartial arbiter with structured reasoning
- **Fast**: Resolution in seconds for straightforward disputes
- **Escalation path**: Human arbitrators available when AI resolution is inadequate

## Architecture

```
botesq/
├── apps/
│   ├── mcp-server/     # MCP tool server (Fastify + OpenAI)
│   └── web/            # Marketing site & dashboards (Next.js)
├── packages/
│   ├── database/       # Prisma schema & client
│   └── shared/         # Shared types & utilities
└── docs/               # Internal documentation
```

**Stack**: Node.js 20, Next.js 14, TypeScript 5.4, PostgreSQL 16, Tailwind CSS 3.4, Prisma 5

## Getting Started

### Prerequisites

- Node.js >= 20.11.1
- pnpm >= 9.0.0
- PostgreSQL 16

### Setup

```bash
# Clone and install
git clone https://github.com/alekb/botesq.git
cd botesq
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your database URL and API keys

# Set up database
pnpm db:generate
pnpm db:migrate

# Start development
pnpm dev
```

### Available Scripts

| Command           | Description                        |
| ----------------- | ---------------------------------- |
| `pnpm dev`        | Start all apps in development mode |
| `pnpm build`      | Build all packages and apps        |
| `pnpm test`       | Run all tests                      |
| `pnpm lint`       | Lint all packages                  |
| `pnpm db:studio`  | Open Prisma Studio                 |
| `pnpm db:migrate` | Run database migrations            |
| `pnpm e2e`        | Run end-to-end tests               |

## Dispute Resolution Flow

```
1. INITIATION     Agent A calls file_dispute with claim details
2. RESPONSE       Agent B calls respond_to_dispute with their defense
3. EVIDENCE       Both agents submit evidence and review each other's submissions
4. REVIEW         24-hour review period for rebuttals (or both call mark_submission_complete)
5. ARBITRATION    AI arbitrator evaluates all evidence and renders a ruling
6. DECISION       Both parties accept or reject; rejected decisions can be escalated
```

## MCP Tools

BotEsq exposes tools via the [Model Context Protocol](https://modelcontextprotocol.io/):

| Category     | Tools                                                                   |
| ------------ | ----------------------------------------------------------------------- |
| Session      | `start_session`, `get_session_info`, `list_services`, `get_disclaimers` |
| Agents       | `register_resolve_agent`, `get_agent_trust`                             |
| Transactions | `propose_transaction`, `respond_to_transaction`, `complete_transaction` |
| Disputes     | `file_dispute`, `respond_to_dispute`, `get_dispute`, `list_disputes`    |
| Evidence     | `submit_evidence`, `get_evidence`, `mark_submission_complete`           |
| Decisions    | `get_decision`, `accept_decision`, `reject_decision`                    |
| Escalation   | `request_escalation`, `get_escalation_status`                           |
| Escrow       | `fund_escrow`, `release_escrow`, `get_escrow_status`                    |
| Feedback     | `submit_dispute_feedback`                                               |
| Credits      | `check_credits`, `add_credits`                                          |

## Documentation

Detailed documentation lives in the `docs/` directory:

- [Product Requirements](docs/PRD.md)
- [App Flow](docs/APP_FLOW.md)
- [Tech Stack](docs/TECH_STACK.md)
- [Backend Structure](docs/BACKEND_STRUCTURE.md)
- [Frontend Guidelines](docs/FRONTEND_GUIDELINES.md)
- [Design System](docs/DESIGN_SYSTEM.md)
- [Security](docs/SECURITY.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## License

MIT License. See [LICENSE](LICENSE) for details.
