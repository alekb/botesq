# BotEsq Tech Stack

## Overview

This document defines the exact frameworks, versions, and dependencies for the BotEsq platform. All versions are locked to ensure reproducible builds and consistent behavior across environments.

---

## Architectural Principles

### Extensibility-First Design

BotEsq is architected as a **platform**, not just an application. Key design decisions support future third-party provider integration:

| Principle                 | Implementation                                                 | Benefit                                  |
| ------------------------- | -------------------------------------------------------------- | ---------------------------------------- |
| Provider Abstraction      | All legal services go through `LegalServiceProvider` interface | Any provider can be plugged in           |
| Webhook-Based Integration | Async provider communication via webhooks                      | Providers don't need to run BotEsq code  |
| Standardized Contracts    | Typed request/response schemas with Zod                        | Clear API boundaries for integrators     |
| Event-Driven Architecture | Actions emit events that can trigger webhooks                  | Real-time integration capabilities       |
| Multi-Tenant Isolation    | Operator-scoped data with provider preferences                 | Each operator can customize provider mix |

### Why These Technology Choices

```yaml
# Fastify over Express
# - Schema-based validation built-in (easy API contracts)
# - Plugin architecture for modular provider adapters
# - Better TypeScript support
# - Higher performance for webhook handling

# Prisma over raw SQL
# - Type-safe queries prevent provider data leaks
# - Easy schema evolution as providers are added
# - Built-in connection pooling for multi-provider load

# Zod for validation
# - Runtime + compile-time type safety
# - Easy to share schemas with provider SDK
# - Self-documenting API contracts

# PostgreSQL over NoSQL
# - ACID transactions for financial data (credits, settlements)
# - JSON columns for flexible provider metadata
# - Strong consistency for legal audit requirements

# Webhook + REST over GraphQL
# - Simpler for third-party integration
# - Standard HTTP semantics providers understand
# - Easier to document and version
```

### Future Integration Points

The architecture supports these future extensions:

1. **Provider SDK** - TypeScript/Python packages for easy provider onboarding
2. **Provider Marketplace** - Discovery and rating system
3. **White-Label Embedding** - Providers can embed BotEsq in their apps
4. **Multi-LLM Support** - Swap AI backends per provider or service type
5. **Regional Routing** - Route to jurisdiction-specific providers
6. **Compliance Plugins** - Add compliance checks without core changes

---

## SDK Examples

### Python Client SDK

Install the BotEsq client (or use httpx directly):

```bash
pip install botesq  # Future package
# Or use httpx for direct API access
pip install httpx pydantic
```

**Quick Start:**

```python
import asyncio
from botesq import BotEsqClient

async def main():
    # Initialize client
    client = BotEsqClient(api_key="botesq_live_xxxxx")

    # Start session
    session = await client.start_session(agent_identifier="my-agent-v1")
    print(f"Session started, credits: {session['credits']['balance']}")

    # Ask a legal question
    answer = await client.ask_legal_question(
        question="What are the requirements for forming an LLC in Delaware?",
        jurisdiction="Delaware"
    )
    print(f"Answer: {answer['answer']}")
    print(f"Confidence: {answer['confidence_score']}")
    print(f"Credits used: {answer['credits_used']}")

if __name__ == "__main__":
    asyncio.run(main())
```

**Direct httpx Usage:**

```python
import httpx
import asyncio

BOTESQ_API_URL = "https://api.botesq.com/mcp"

async def start_session(api_key: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BOTESQ_API_URL}/start_session",
            json={"api_key": api_key}
        )
        response.raise_for_status()
        return response.json()["data"]

async def ask_legal_question(session_token: str, question: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BOTESQ_API_URL}/ask_legal_question",
            json={
                "session_token": session_token,
                "question": question
            }
        )
        response.raise_for_status()
        return response.json()["data"]
```

### TypeScript Client SDK

```typescript
import { BotEsqClient } from '@botesq/sdk' // Future package

const client = new BotEsqClient({ apiKey: 'botesq_live_xxxxx' })

// Start session
const session = await client.startSession({ agentIdentifier: 'my-agent-v1' })
console.log(`Credits: ${session.credits.balance}`)

// Ask a legal question
const answer = await client.askLegalQuestion({
  question: 'What are the requirements for forming an LLC in Delaware?',
  jurisdiction: 'Delaware',
})
console.log(`Answer: ${answer.answer}`)
console.log(`Confidence: ${answer.confidenceScore}`)
```

### Provider SDK (Python)

For third-party providers implementing the BotEsq provider interface:

```python
"""
BotEsq Provider SDK - Python implementation example.
Providers implement this to receive and process legal service requests.
"""

import hmac
import hashlib
import time
from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from enum import Enum

app = FastAPI()

# Configuration
WEBHOOK_SECRET = "your_provider_webhook_secret"
BOTESQ_CALLBACK_URL = "https://api.botesq.com/webhooks/provider/{provider_id}"

class ServiceType(Enum):
    LEGAL_QA = "LEGAL_QA"
    DOCUMENT_REVIEW = "DOCUMENT_REVIEW"
    CONSULTATION = "CONSULTATION"
    CONTRACT_DRAFTING = "CONTRACT_DRAFTING"

class ServiceRequest(BaseModel):
    request_id: str
    service_type: ServiceType
    jurisdiction: Optional[str] = None
    question: Optional[str] = None
    document_url: Optional[str] = None
    context: Optional[dict] = None
    urgency: str = "standard"
    sla_deadline: str

class ServiceResponse(BaseModel):
    request_id: str
    status: str  # "completed" | "pending" | "failed"
    response: Optional[str] = None
    confidence_score: Optional[float] = None
    citations: Optional[List[dict]] = None
    error: Optional[str] = None

def verify_botesq_signature(payload: str, signature: str, timestamp: str) -> bool:
    """Verify incoming webhook from BotEsq."""
    if abs(time.time() - int(timestamp)) > 300:
        return False

    expected = hmac.new(
        WEBHOOK_SECRET.encode(),
        f"{timestamp}.{payload}".encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected)

@app.post("/botesq/webhook")
async def handle_botesq_request(request: Request):
    """Receive service requests from BotEsq."""
    signature = request.headers.get("X-BotEsq-Signature")
    timestamp = request.headers.get("X-BotEsq-Timestamp")
    payload = await request.body()

    if not verify_botesq_signature(payload.decode(), signature, timestamp):
        raise HTTPException(status_code=401, detail="Invalid signature")

    data = await request.json()
    service_request = ServiceRequest(**data)

    # Process based on service type
    if service_request.service_type == ServiceType.LEGAL_QA:
        # Process synchronously for simple questions
        response = await process_legal_qa(service_request)
        return response.dict()

    elif service_request.service_type == ServiceType.DOCUMENT_REVIEW:
        # Queue for async processing
        await queue_document_review(service_request)
        return {"status": "accepted", "request_id": service_request.request_id}

    # Return 202 Accepted for async processing
    return {"status": "accepted", "request_id": service_request.request_id}

async def process_legal_qa(request: ServiceRequest) -> ServiceResponse:
    """Process a legal Q&A request."""
    # Your legal AI/attorney workflow here
    answer = await your_legal_ai.process(request.question, request.jurisdiction)

    return ServiceResponse(
        request_id=request.request_id,
        status="completed",
        response=answer.text,
        confidence_score=answer.confidence,
        citations=answer.citations
    )

async def send_callback_to_botesq(response: ServiceResponse):
    """Send completed response back to BotEsq."""
    import httpx

    payload = response.json()
    timestamp = str(int(time.time()))
    signature = hmac.new(
        WEBHOOK_SECRET.encode(),
        f"{timestamp}.{payload}".encode(),
        hashlib.sha256
    ).hexdigest()

    async with httpx.AsyncClient() as client:
        await client.post(
            BOTESQ_CALLBACK_URL,
            content=payload,
            headers={
                "Content-Type": "application/json",
                "X-Provider-Signature": signature,
                "X-Provider-Timestamp": timestamp,
            }
        )
```

---

## Runtime Environment

```yaml
Node.js: 20.11.1 LTS
npm: 10.2.4
pnpm: 8.15.4 (package manager of choice)
```

---

## Frontend Stack

### Core Framework

```yaml
next: 14.2.3
react: 18.2.0
react-dom: 18.2.0
typescript: 5.4.5
```

### Styling

```yaml
tailwindcss: 3.4.3
postcss: 8.4.38
autoprefixer: 10.4.19
tailwind-merge: 2.3.0
clsx: 2.1.1
class-variance-authority: 0.7.0
```

### UI Components

```yaml
@radix-ui/react-accordion: 1.1.2
@radix-ui/react-alert-dialog: 1.0.5
@radix-ui/react-avatar: 1.0.4
@radix-ui/react-checkbox: 1.0.4
@radix-ui/react-dialog: 1.0.5
@radix-ui/react-dropdown-menu: 2.0.6
@radix-ui/react-label: 2.0.2
@radix-ui/react-popover: 1.0.7
@radix-ui/react-progress: 1.0.3
@radix-ui/react-select: 2.0.0
@radix-ui/react-separator: 1.0.3
@radix-ui/react-slot: 1.0.2
@radix-ui/react-switch: 1.0.3
@radix-ui/react-tabs: 1.0.4
@radix-ui/react-toast: 1.1.5
@radix-ui/react-tooltip: 1.0.7
lucide-react: 0.378.0 (icons)
```

### State Management

```yaml
zustand: 4.5.2
@tanstack/react-query: 5.37.1
```

### Forms & Validation

```yaml
react-hook-form: 7.51.4
@hookform/resolvers: 3.4.0
zod: 3.23.8
```

### Utilities

```yaml
date-fns: 3.6.0
lodash-es: 4.17.21
nanoid: 5.0.7
```

---

## Backend Stack

### MCP Server

```yaml
@modelcontextprotocol/sdk: 1.0.4
```

### HTTP Server

```yaml
fastify: 4.27.0
@fastify/cors: 9.0.1
@fastify/helmet: 11.1.1
@fastify/rate-limit: 9.1.0
@fastify/multipart: 8.3.0
@fastify/cookie: 9.3.1
@fastify/session: 10.9.0
@fastify/swagger: 8.14.0
@fastify/swagger-ui: 3.0.0
```

### Database

```yaml
prisma: 5.14.0
@prisma/client: 5.14.0
```

### Authentication

```yaml
@lucia-auth/adapter-prisma: 4.0.1
lucia: 3.2.0
@simplewebauthn/server: 10.0.0 (optional 2FA)
otplib: 12.0.1 (TOTP 2FA)
```

### AI Integration

```yaml
openai: 4.47.1
@anthropic-ai/sdk: 0.22.0 (backup/future)
tiktoken: 1.0.15 (token counting)
```

### Payments

```yaml
stripe: 15.7.0
```

### File Storage

```yaml
@aws-sdk/client-s3: 3.577.0
@aws-sdk/s3-request-presigner: 3.577.0
```

### Email (Future)

```yaml
@aws-sdk/client-ses: 3.577.0
nodemailer: 6.9.13
```

### Validation

```yaml
zod: 3.23.8 (shared with frontend)
```

### Logging & Monitoring

```yaml
pino: 9.1.0
pino-pretty: 11.1.0
```

### Utilities

```yaml
bcryptjs: 2.4.3
nanoid: 5.0.7
date-fns: 3.6.0
lodash-es: 4.17.21
```

---

## Database

### Primary Database

```yaml
PostgreSQL: 16.2
```

**Configuration:**

- Connection pooling via PgBouncer (production)
- max_connections: 100
- shared_buffers: 256MB (adjust for instance size)
- SSL required for all connections

### Schema Management

```yaml
Prisma: 5.14.0
```

Migrations managed via Prisma Migrate. See BACKEND_STRUCTURE.md for schema details.

---

## Infrastructure

### Hosting

```yaml
AWS EC2:
  instance_type: t3.medium (MVP)
  ami: Amazon Linux 2023
  region: us-east-1
  availability_zones: [us-east-1a, us-east-1b]

AWS RDS:
  engine: postgres
  engine_version: 16.2
  instance_class: db.t3.small (MVP)
  multi_az: false (MVP), true (production)
  storage: 20GB gp3
  backup_retention: 7 days
```

### DNS & SSL

```yaml
AWS Route 53:
  domain: botesq.io (assumed)
  hosted_zone: managed

SSL:
  provider: Let's Encrypt
  automation: certbot
  renewal: automatic (cron)
```

### File Storage

```yaml
AWS S3:
  bucket: botesq-documents-{env}
  region: us-east-1
  encryption: AES-256 (SSE-S3)
  versioning: enabled
  lifecycle:
    - transition_to_ia: 90 days
    - transition_to_glacier: 365 days
```

### Reverse Proxy

```yaml
nginx: 1.25.x
```

**Configuration:**

- HTTP → HTTPS redirect
- WebSocket support (if needed)
- Gzip compression
- Static asset caching

### Process Management

```yaml
pm2: 5.3.1
```

**Configuration:**

- Cluster mode (4 instances on t3.medium)
- Automatic restart on failure
- Log rotation

---

## Development Tools

### Package Management

```yaml
pnpm: 8.15.4
```

**Workspace configuration:**

```
packages:
  - 'apps/*'
  - 'packages/*'
```

### Linting & Formatting

```yaml
eslint: 8.57.0
@typescript-eslint/eslint-plugin: 7.9.0
@typescript-eslint/parser: 7.9.0
eslint-config-next: 14.2.3
eslint-config-prettier: 9.1.0
prettier: 3.2.5
prettier-plugin-tailwindcss: 0.5.14
```

### Testing

```yaml
vitest: 1.6.0
@testing-library/react: 15.0.7
@testing-library/jest-dom: 6.4.5
playwright: 1.44.0
msw: 2.3.0 (API mocking)
```

### Build Tools

```yaml
turbo: 1.13.3 (monorepo build orchestration)
tsup: 8.0.2 (library bundling)
```

### Git Hooks

```yaml
husky: 9.0.11
lint-staged: 15.2.2
```

---

## CI/CD

### GitHub Actions

```yaml
Workflows:
  - lint: ESLint + Prettier check
  - test: Vitest + Playwright
  - build: Next.js build + MCP server build
  - deploy: SSH deploy to EC2
```

**Deployment Strategy:**

1. Push to `main` triggers build
2. Tests must pass
3. Build artifacts created
4. SSH to EC2, pull latest, restart pm2
5. Health check verification

---

## Third-Party Services

### AI Provider

```yaml
OpenAI:
  model_primary: gpt-4-turbo
  model_fallback: gpt-4
  api_version: 2024-04-09
  rate_limit: 10,000 TPM (tokens per minute)
  max_tokens_per_request: 4096
```

### Payments

```yaml
Stripe:
  api_version: 2024-04-10
  products:
    - credits_5000: $50
    - credits_10000: $100
    - credits_25000: $250
    - credits_50000: $500
    - credits_100000: $1000
  webhooks:
    - checkout.session.completed
    - payment_intent.succeeded
    - payment_intent.failed
    - invoice.paid
```

### MCP Registry

```yaml
Registry: Official MCP Registry
Listing:
  name: botesq
  description: Licensed legal services for AI agents
  category: legal
```

---

## Environment Variables

### Required (All Environments)

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/botesq

# Authentication
SESSION_SECRET=<32+ random bytes>
API_KEY_SALT=<32+ random bytes>

# OpenAI
OPENAI_API_KEY=sk-...

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_...

# AWS
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET_NAME=botesq-documents-prod

# App
NEXT_PUBLIC_APP_URL=https://botesq.io
MCP_SERVER_URL=https://mcp.botesq.io
```

### Development Only

```bash
# Local overrides
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/botesq_dev
NEXT_PUBLIC_APP_URL=http://localhost:3000
MCP_SERVER_URL=http://localhost:3001
```

---

## Version Constraints

### Minimum Versions

| Dependency | Minimum | Reason                          |
| ---------- | ------- | ------------------------------- |
| Node.js    | 20.x    | ES modules, native fetch        |
| PostgreSQL | 16.x    | JSONB improvements, performance |
| Next.js    | 14.x    | App Router stability            |
| React      | 18.x    | Concurrent features             |

### Locked Versions

All dependencies are locked via `pnpm-lock.yaml`. Updates require explicit review and testing.

**Update Policy:**

- Security patches: Immediate
- Minor versions: Weekly review
- Major versions: Quarterly evaluation

---

## Cost Estimates (Monthly)

### Infrastructure (MVP)

| Service                  | Specification         | Est. Cost |
| ------------------------ | --------------------- | --------- |
| EC2                      | t3.medium             | $30       |
| RDS                      | db.t3.small           | $25       |
| S3                       | 10GB + transfers      | $5        |
| Route 53                 | Hosted zone + queries | $1        |
| **Total Infrastructure** |                       | **~$61**  |

### Third-Party Services

| Service            | Usage            | Est. Cost       |
| ------------------ | ---------------- | --------------- |
| OpenAI             | 1M tokens/month  | $30             |
| Stripe             | 2.9% + $0.30/txn | Variable        |
| **Total Services** |                  | **~$30 + fees** |

### Scaling Costs

| Scale          | Infrastructure | Services |
| -------------- | -------------- | -------- |
| 100 operators  | $61/mo         | $50/mo   |
| 500 operators  | $200/mo        | $200/mo  |
| 1000 operators | $500/mo        | $500/mo  |

---

## Monorepo Structure

```
botesq/
├── apps/
│   ├── web/                 # Next.js marketing + portals
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── package.json
│   └── mcp-server/          # MCP server
│       ├── src/
│       │   ├── tools/
│       │   ├── prompts/
│       │   └── index.ts
│       └── package.json
├── packages/
│   ├── database/            # Prisma schema + client
│   │   ├── prisma/
│   │   └── package.json
│   ├── shared/              # Shared types + utilities
│   │   ├── src/
│   │   └── package.json
│   └── ui/                  # Shared UI components (optional)
│       ├── src/
│       └── package.json
├── docs/                    # Documentation (this folder)
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
└── tsconfig.json
```

---

## Browser Support

```yaml
Browsers:
  Chrome: last 2 versions
  Firefox: last 2 versions
  Safari: last 2 versions
  Edge: last 2 versions

Mobile:
  iOS Safari: 15+
  Chrome Android: last 2 versions
```

Configured via `browserslist` in `package.json`.

---

## Security Requirements

### Dependencies

- All dependencies scanned via `pnpm audit`
- No critical vulnerabilities allowed in production
- Dependabot alerts enabled

### Secrets

- No secrets in code or version control
- All secrets via environment variables
- Production secrets in AWS Secrets Manager (future)

### Headers

Configured via `@fastify/helmet`:

- Content-Security-Policy
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
