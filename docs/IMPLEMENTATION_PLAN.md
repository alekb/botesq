# MoltLaw Implementation Plan

## Overview

This document is the master blueprint for building MoltLaw. It contains numbered phases and steps covering the entire build from start to finish. Each step lists exact files to create, features to implement (referencing PRD feature IDs), and tests to write.

**This file is written once and does not get modified during execution.**

---

## Phase 0: Infrastructure Setup

### 0.1 Repository Initialization

**Files to create:**
```
moltlaw/
├── .gitignore
├── .nvmrc                          # Node version: 20.11.1
├── package.json                    # Root workspace config
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.json                   # Base TypeScript config
├── .eslintrc.js
├── .prettierrc
├── README.md
├── apps/
│   ├── web/
│   │   └── package.json
│   └── mcp-server/
│       └── package.json
└── packages/
    ├── database/
    │   └── package.json
    └── shared/
        └── package.json
```

**Commands:**
```bash
pnpm init
pnpm add -D turbo typescript eslint prettier
```

**Verification:**
- [ ] `pnpm install` completes without errors
- [ ] `pnpm lint` runs (even if empty)
- [ ] Git repository initialized

---

### 0.2 Database Setup (Local)

**Files to create:**
```
packages/database/
├── package.json
├── prisma/
│   └── schema.prisma               # Full schema from BACKEND_STRUCTURE.md
├── src/
│   └── index.ts                    # Prisma client export
└── tsconfig.json
```

**Dependencies:**
```bash
cd packages/database
pnpm add prisma @prisma/client
```

**Commands:**
```bash
# Start local PostgreSQL (Docker)
docker run --name moltlaw-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16

# Run migrations
pnpm prisma migrate dev --name init
```

**Verification:**
- [ ] Database container running
- [ ] Migrations applied successfully
- [ ] `pnpm prisma studio` shows all tables

---

### 0.3 EC2 Instance Setup

**Actions:**
1. Launch EC2 t3.medium instance (Amazon Linux 2023)
2. Configure security group:
   - SSH (22) from admin IPs only
   - HTTP (80) from anywhere
   - HTTPS (443) from anywhere
3. Allocate Elastic IP
4. Install dependencies:
   ```bash
   sudo yum update -y
   sudo yum install -y git nodejs npm nginx
   npm install -g pnpm pm2
   ```

**Verification:**
- [ ] SSH access working
- [ ] Node.js 20.x installed
- [ ] nginx responding on port 80

---

### 0.4 Domain & SSL Setup

**Actions:**
1. Configure Route 53 hosted zone for domain
2. Create A record pointing to Elastic IP
3. Install and configure certbot:
   ```bash
   sudo yum install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d moltlaw.io -d www.moltlaw.io
   ```

**Files to create on server:**
```
/etc/nginx/conf.d/moltlaw.conf
```

**Verification:**
- [ ] HTTPS working at https://moltlaw.io
- [ ] HTTP redirects to HTTPS
- [ ] SSL certificate valid

---

### 0.5 Production Database Setup (RDS)

**Actions:**
1. Create RDS PostgreSQL 16 instance (db.t3.small)
2. Configure security group for EC2 access only
3. Create database: `moltlaw_prod`
4. Update environment variables with connection string

**Verification:**
- [ ] EC2 can connect to RDS
- [ ] Migrations run successfully on production DB

---

## Phase 1: MCP Server Core

**Implements:** FEAT-001 (MCP Server Core), FEAT-002 (Agent Authentication & Sessions)

### 1.1 MCP Server Scaffold

**Files to create:**
```
apps/mcp-server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # Server entry point
│   ├── server.ts                   # MCP server setup
│   ├── config.ts                   # Environment configuration
│   └── types.ts                    # Shared types
```

**Dependencies:**
```bash
pnpm add @modelcontextprotocol/sdk fastify zod pino
pnpm add -D @types/node tsx
```

**Verification:**
- [ ] Server starts without errors
- [ ] MCP handshake works with test client

---

### 1.2 Session Management Tools

**Files to create:**
```
apps/mcp-server/src/
├── tools/
│   ├── index.ts                    # Tool registry
│   ├── start-session.ts
│   └── get-session-info.ts
├── services/
│   ├── auth.service.ts             # API key validation
│   └── session.service.ts          # Session CRUD
└── middleware/
    └── auth.middleware.ts          # Session validation
```

**Tests to write:**
```
apps/mcp-server/src/__tests__/
├── tools/
│   ├── start-session.test.ts
│   └── get-session-info.test.ts
└── services/
    └── session.service.test.ts
```

**Verification:**
- [ ] `start_session` returns valid token
- [ ] `get_session_info` returns correct data
- [ ] Invalid API keys rejected with 401
- [ ] Expired sessions rejected

---

### 1.3 Rate Limiting

**Files to create:**
```
apps/mcp-server/src/
├── middleware/
│   └── rate-limit.middleware.ts
└── services/
    └── rate-limit.service.ts
```

**Verification:**
- [ ] Rate limits enforced per session
- [ ] 429 returned when limit exceeded
- [ ] Retry-after header included

---

### 1.4 Basic Info Tools

**Files to create:**
```
apps/mcp-server/src/tools/
├── list-services.ts
├── get-disclaimers.ts
└── check-credits.ts
```

**Verification:**
- [ ] `list_services` returns pricing info
- [ ] `get_disclaimers` returns current disclaimers
- [ ] `check_credits` returns balance

---

## Phase 2: Legal Engine

**Implements:** FEAT-006 (Legal Q&A), FEAT-009 (Internal Legal AI)

### 2.1 OpenAI Integration

**Files to create:**
```
apps/mcp-server/src/
├── services/
│   ├── llm.service.ts              # OpenAI client wrapper
│   └── legal-ai.service.ts         # Legal prompt engineering
├── prompts/
│   ├── legal-qa.prompt.ts
│   └── document-analysis.prompt.ts
└── utils/
    └── token-counter.ts
```

**Dependencies:**
```bash
pnpm add openai tiktoken
```

**Verification:**
- [ ] OpenAI connection working
- [ ] Legal responses generated
- [ ] Token counting accurate

---

### 2.2 Legal Q&A Tool

**Files to create:**
```
apps/mcp-server/src/tools/
└── ask-legal-question.ts
```

**Tests:**
```
apps/mcp-server/src/__tests__/tools/
└── ask-legal-question.test.ts
```

**Verification:**
- [ ] Simple questions answered instantly
- [ ] Complex questions queued for review
- [ ] Credits deducted correctly
- [ ] Disclaimers included in response

---

### 2.3 LLM Fallback Handling

**Files to create:**
```
apps/mcp-server/src/
├── services/
│   └── queue.service.ts            # Human queue management
└── utils/
    └── retry.ts                    # Retry with backoff
```

**Verification:**
- [ ] Timeout triggers fallback
- [ ] Request queued for human review
- [ ] Estimated wait time returned

---

### 2.4 MCP Prompts

**Files to create:**
```
apps/mcp-server/src/prompts/
├── index.ts                        # Prompt registry
├── contract-review.ts
├── entity-formation.ts
├── compliance-check.ts
├── ip-question.ts
└── general-legal.ts
```

**Verification:**
- [ ] All 5 prompts registered
- [ ] Prompts accessible via MCP protocol

---

## Phase 3: Matter Management

**Implements:** FEAT-004 (Matter Management), FEAT-005 (Retainer Agreement Flow)

### 3.1 Matter Tools

**Files to create:**
```
apps/mcp-server/src/tools/
├── create-matter.ts
├── get-matter-status.ts
└── list-matters.ts

apps/mcp-server/src/services/
└── matter.service.ts
```

**Tests:**
```
apps/mcp-server/src/__tests__/tools/
├── create-matter.test.ts
├── get-matter-status.test.ts
└── list-matters.test.ts
```

**Verification:**
- [ ] Matters created with correct type
- [ ] Matter IDs follow MATTER-XXXXXX format
- [ ] Status transitions work correctly

---

### 3.2 Retainer Tools

**Files to create:**
```
apps/mcp-server/src/tools/
├── get-retainer-terms.ts
└── accept-retainer.ts

apps/mcp-server/src/services/
└── retainer.service.ts
```

**Tests:**
```
apps/mcp-server/src/__tests__/tools/
├── get-retainer-terms.test.ts
└── accept-retainer.test.ts
```

**Verification:**
- [ ] Retainer terms generated correctly
- [ ] Pre-auth acceptance works
- [ ] Manual signing URL generated
- [ ] Matter activates after retainer accepted

---

### 3.3 Retainer Pre-Authorization

**Files to create:**
```
apps/mcp-server/src/services/
└── preauth.service.ts
```

**Verification:**
- [ ] Pre-auth tokens validate correctly
- [ ] Scope restrictions enforced
- [ ] Credit limits enforced

---

## Phase 4: Document Handling

**Implements:** FEAT-008 (Document Upload & Review)

### 4.1 S3 Integration

**Files to create:**
```
apps/mcp-server/src/services/
└── storage.service.ts              # S3 upload/download

packages/shared/src/
└── file-utils.ts                   # File validation
```

**Dependencies:**
```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Verification:**
- [ ] Files upload to S3
- [ ] Presigned URLs generated
- [ ] File type validation works

---

### 4.2 Document Tools

**Files to create:**
```
apps/mcp-server/src/tools/
├── submit-document.ts
└── get-document-analysis.ts

apps/mcp-server/src/services/
└── document.service.ts
```

**Verification:**
- [ ] Documents upload and store
- [ ] Analysis queued automatically
- [ ] Results retrievable when ready

---

### 4.3 Document Analysis Pipeline

**Files to create:**
```
apps/mcp-server/src/
├── workers/
│   └── document-analysis.worker.ts
└── prompts/
    └── document-analysis.prompt.ts
```

**Verification:**
- [ ] PDF text extraction works
- [ ] Analysis generates structured output
- [ ] Risks and recommendations identified

---

## Phase 5: Payments & Credits

**Implements:** FEAT-003 (Credit System & Payments)

### 5.1 Stripe Integration

**Files to create:**
```
apps/mcp-server/src/services/
└── stripe.service.ts

apps/web/app/api/webhooks/
└── stripe/route.ts
```

**Dependencies:**
```bash
pnpm add stripe
```

**Verification:**
- [ ] Checkout sessions created
- [ ] Webhook events processed
- [ ] Credits added on successful payment

---

### 5.2 Credit Tools

**Files to create:**
```
apps/mcp-server/src/tools/
└── add-credits.ts

apps/mcp-server/src/services/
└── credit.service.ts
```

**Verification:**
- [ ] Payment URL generated
- [ ] Credits added after payment
- [ ] Transaction history accurate

---

### 5.3 Credit Deduction Logic

**Files to modify:**
- All tools that consume credits

**Verification:**
- [ ] Pre-flight credit checks work
- [ ] Credits deducted on success
- [ ] Refunds on failure
- [ ] Transaction audit trail complete

---

## Phase 6: Consultation System

**Implements:** FEAT-007 (Async Consultation Requests)

### 6.1 Consultation Tools

**Files to create:**
```
apps/mcp-server/src/tools/
├── request-consultation.ts
└── get-consultation-result.ts

apps/mcp-server/src/services/
└── consultation.service.ts
```

**Verification:**
- [ ] Consultations queued correctly
- [ ] SLA deadlines calculated
- [ ] Status polling works

---

### 6.2 Consultation Queue

**Files to create:**
```
apps/mcp-server/src/services/
└── queue.service.ts

apps/mcp-server/src/workers/
└── consultation.worker.ts
```

**Verification:**
- [ ] AI drafts generated
- [ ] Queue prioritization correct
- [ ] SLA tracking works

---

## Phase 7: Web Application Foundation

**Implements:** FEAT-014 (Marketing Website) foundation

### 7.1 Next.js Setup

**Files to create:**
```
apps/web/
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   └── page.tsx
└── components/
    └── ui/                         # All UI primitives
```

**Dependencies:**
```bash
pnpm add next react react-dom
pnpm add tailwindcss postcss autoprefixer
pnpm add @radix-ui/react-* lucide-react
pnpm add zustand @tanstack/react-query
```

**Verification:**
- [ ] Next.js dev server runs
- [ ] Tailwind CSS working
- [ ] UI components render

---

### 7.2 Design System Implementation

**Files to create:**
```
apps/web/
├── tailwind.config.ts              # Full token config
├── components/ui/
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   ├── badge.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── select.tsx
│   ├── tabs.tsx
│   ├── toast.tsx
│   └── ... (all primitives)
└── lib/utils/
    └── cn.ts
```

**Verification:**
- [ ] All design tokens implemented
- [ ] Components match DESIGN_SYSTEM.md
- [ ] Dark mode working

---

### 7.3 Marketing Pages

**Files to create:**
```
apps/web/app/
├── (marketing)/
│   ├── layout.tsx
│   ├── page.tsx                    # Landing page
│   ├── features/page.tsx
│   ├── pricing/page.tsx
│   └── docs/page.tsx
└── components/marketing/
    ├── hero.tsx
    ├── feature-grid.tsx
    ├── pricing-table.tsx
    └── footer.tsx
```

**Verification:**
- [ ] Landing page renders
- [ ] Mobile responsive
- [ ] All links work

---

## Phase 8: Operator Portal

**Implements:** FEAT-011 (Operator Portal)

### 8.1 Authentication UI

**Files to create:**
```
apps/web/app/
├── (auth)/
│   ├── layout.tsx
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── verify-email/page.tsx
│   └── forgot-password/page.tsx
├── lib/
│   └── auth/
│       ├── actions.ts              # Server actions
│       └── session.ts              # Session management
```

**Verification:**
- [ ] Registration flow works
- [ ] Email verification works
- [ ] Login/logout works
- [ ] Password reset works

---

### 8.2 Portal Dashboard

**Files to create:**
```
apps/web/app/portal/
├── layout.tsx                      # Portal layout with sidebar
├── page.tsx                        # Dashboard
├── components/
│   ├── sidebar.tsx
│   ├── header.tsx
│   ├── stats-cards.tsx
│   └── recent-activity.tsx
```

**Verification:**
- [ ] Dashboard loads with real data
- [ ] Navigation works
- [ ] Protected routes redirect

---

### 8.3 Matter Management UI

**Files to create:**
```
apps/web/app/portal/
├── matters/
│   ├── page.tsx                    # Matter list
│   └── [id]/
│       ├── page.tsx                # Matter detail
│       ├── timeline/page.tsx
│       ├── documents/page.tsx
│       └── messages/page.tsx
└── components/portal/
    ├── matter-card.tsx
    ├── matter-list.tsx
    ├── matter-detail.tsx
    └── matter-timeline.tsx
```

**Verification:**
- [ ] Matter list loads
- [ ] Filtering works
- [ ] Detail view shows all data

---

### 8.4 API Key Management

**Files to create:**
```
apps/web/app/portal/
├── api-keys/page.tsx
└── components/portal/
    ├── api-key-list.tsx
    └── create-api-key-dialog.tsx
```

**Verification:**
- [ ] API keys listed
- [ ] New key creation works
- [ ] Key shown once only
- [ ] Revocation works

---

### 8.5 Billing UI

**Files to create:**
```
apps/web/app/portal/
├── billing/
│   ├── page.tsx
│   ├── history/page.tsx
│   └── invoices/page.tsx
└── components/portal/
    ├── credit-balance.tsx
    ├── purchase-credits-dialog.tsx
    ├── transaction-history.tsx
    └── invoice-list.tsx
```

**Verification:**
- [ ] Credit balance displays
- [ ] Purchase flow works
- [ ] History loads
- [ ] Invoice download works

---

### 8.6 Settings & Pre-Authorization

**Files to create:**
```
apps/web/app/portal/
├── settings/
│   ├── page.tsx
│   ├── profile/page.tsx
│   ├── preauth/page.tsx
│   └── webhooks/page.tsx
```

**Verification:**
- [ ] Profile updates work
- [ ] Pre-auth configuration works
- [ ] Webhook settings save

---

## Phase 9: Attorney Dashboard

**Implements:** FEAT-010 (Attorney Dashboard)

### 9.1 Attorney Authentication

**Files to create:**
```
apps/web/app/attorney/
├── login/page.tsx
└── lib/
    └── attorney-auth.ts
```

**Verification:**
- [ ] Attorney login works
- [ ] 2FA required
- [ ] Session management correct

---

### 9.2 Queue Management

**Files to create:**
```
apps/web/app/attorney/
├── layout.tsx
├── page.tsx                        # Queue view
└── components/
    ├── queue-list.tsx
    ├── queue-item.tsx
    ├── queue-filters.tsx
    └── queue-stats.tsx
```

**Verification:**
- [ ] Queue loads with prioritization
- [ ] Claiming works
- [ ] Real-time updates (if implemented)

---

### 9.3 Matter Review UI

**Files to create:**
```
apps/web/app/attorney/
├── matter/[id]/
│   ├── page.tsx
│   └── components/
│       ├── matter-header.tsx
│       ├── request-panel.tsx
│       ├── ai-draft-panel.tsx
│       ├── response-editor.tsx
│       └── action-buttons.tsx
```

**Verification:**
- [ ] Full matter context displayed
- [ ] AI draft shown
- [ ] Editor works
- [ ] Approval flow works

---

### 9.4 Attorney Stats

**Files to create:**
```
apps/web/app/attorney/
├── stats/page.tsx
└── components/
    └── attorney-stats.tsx
```

**Verification:**
- [ ] Personal stats display
- [ ] Time tracking accurate

---

## Phase 10: Admin Dashboard

**Implements:** FEAT-012 (Admin Dashboard)

### 10.1 Admin Authentication

**Files to create:**
```
apps/web/app/admin/
├── login/page.tsx
└── lib/
    └── admin-auth.ts
```

---

### 10.2 Admin Overview

**Files to create:**
```
apps/web/app/admin/
├── layout.tsx
├── page.tsx                        # Overview dashboard
└── components/
    ├── system-health.tsx
    ├── revenue-stats.tsx
    └── alerts.tsx
```

---

### 10.3 Operator Management

**Files to create:**
```
apps/web/app/admin/
├── operators/
│   ├── page.tsx
│   └── [id]/page.tsx
```

---

### 10.4 Attorney Management

**Files to create:**
```
apps/web/app/admin/
├── attorneys/
│   ├── page.tsx
│   ├── new/page.tsx
│   └── [id]/page.tsx
```

---

### 10.5 Audit Logs

**Files to create:**
```
apps/web/app/admin/
├── audit/page.tsx
└── components/
    └── audit-log-viewer.tsx
```

---

## Phase 11: API Documentation

**Implements:** FEAT-015 (API Documentation)

### 11.1 Documentation Site

**Files to create:**
```
apps/web/app/docs/
├── page.tsx                        # Docs home
├── quickstart/page.tsx
├── authentication/page.tsx
├── tools/
│   ├── page.tsx
│   └── [tool]/page.tsx
├── prompts/page.tsx
├── errors/page.tsx
├── webhooks/page.tsx
└── examples/
    ├── page.tsx
    ├── python/page.tsx
    └── typescript/page.tsx
```

**Verification:**
- [ ] All tools documented
- [ ] Examples work
- [ ] Navigation clear

---

## Phase 12: Billing & Invoicing

**Implements:** FEAT-013 (Billing & Invoicing)

### 12.1 Invoice Generation

**Files to create:**
```
apps/mcp-server/src/services/
└── invoice.service.ts

apps/mcp-server/src/workers/
└── invoice-generation.worker.ts
```

**Verification:**
- [ ] Monthly invoices generated
- [ ] PDF generation works
- [ ] Email delivery works

---

## Phase 13: Provider Integration Framework

**Implements:** FEAT-016 (Provider Integration Framework), FEAT-017 (Provider Marketplace)

### 13.1 Provider Data Model

**Files to create/modify:**
```
packages/database/prisma/
└── schema.prisma           # Add Provider models (already defined in BACKEND_STRUCTURE)

packages/database/prisma/migrations/
└── XXXXXX_add_providers/   # Migration for provider tables
```

**Verification:**
- [ ] All provider tables created
- [ ] Indexes in place
- [ ] Foreign keys correct

---

### 13.2 Provider Service Abstraction

**Files to create:**
```
apps/mcp-server/src/
├── providers/
│   ├── index.ts                    # Provider registry
│   ├── types.ts                    # LegalServiceProvider interface
│   ├── internal-provider.ts        # MoltLaw internal implementation
│   ├── external-adapter.ts         # Adapter for external providers
│   └── routing-service.ts          # Request routing logic
```

**Verification:**
- [ ] Internal provider implements interface
- [ ] External adapter handles webhooks
- [ ] Routing logic selects correctly

---

### 13.3 Provider API Endpoints

**Files to create:**
```
apps/mcp-server/src/routes/
├── provider-auth.ts               # Provider login, 2FA
├── provider-profile.ts            # Profile, services management
├── provider-requests.ts           # Work queue
└── provider-webhook.ts            # Callback handler

apps/web/app/api/provider/
└── [...route]/route.ts            # Provider portal API routes
```

**Verification:**
- [ ] Provider registration works
- [ ] Webhook signature validation
- [ ] Request acceptance flow

---

### 13.4 Provider Portal UI

**Files to create:**
```
apps/web/app/provider/
├── layout.tsx
├── page.tsx                        # Provider dashboard
├── login/page.tsx
├── register/page.tsx
├── services/page.tsx               # Manage service offerings
├── requests/
│   ├── page.tsx                    # Work queue
│   └── [id]/page.tsx               # Request detail
├── earnings/page.tsx               # Revenue dashboard
└── settings/page.tsx
```

**Verification:**
- [ ] Provider can register
- [ ] Provider can manage services
- [ ] Provider can view/respond to requests

---

### 13.5 Operator Provider Preferences

**Files to create:**
```
apps/web/app/portal/
├── providers/
│   ├── page.tsx                    # Provider marketplace
│   └── [id]/page.tsx               # Provider detail
└── settings/
    └── provider-preferences/page.tsx

apps/web/components/portal/
├── provider-card.tsx
├── provider-list.tsx
└── provider-preference-form.tsx
```

**Verification:**
- [ ] Operators can browse providers
- [ ] Operators can enable/disable providers
- [ ] Operator preferences affect routing

---

### 13.6 Provider Settlement System

**Files to create:**
```
apps/mcp-server/src/services/
└── settlement.service.ts

apps/mcp-server/src/workers/
└── settlement.worker.ts            # Monthly settlement job

apps/web/app/admin/
└── settlements/page.tsx
```

**Verification:**
- [ ] Monthly settlements calculated
- [ ] Stripe Connect transfers work
- [ ] Settlement reports generated

---

### 13.7 Provider SDK (Optional - Post-Launch)

**Files to create:**
```
packages/provider-sdk/
├── package.json
├── src/
│   ├── index.ts
│   ├── client.ts                   # HTTP client for MoltLaw API
│   ├── types.ts                    # Shared types
│   ├── webhook-handler.ts          # Express/Fastify middleware
│   └── signature.ts                # HMAC verification
└── README.md
```

**Verification:**
- [ ] SDK installable via npm
- [ ] Example provider works
- [ ] Documentation complete

---

## Phase 14: Security Hardening

### 14.1 Security Audit

**Actions:**
- [ ] Review all authentication flows
- [ ] Audit API key handling
- [ ] Check for SQL injection
- [ ] Check for XSS
- [ ] Review rate limiting
- [ ] Audit logging completeness
- [ ] Review provider webhook security

---

### 14.2 Security Improvements

**Files to create/modify:**
```
apps/mcp-server/src/middleware/
├── security-headers.ts
└── input-validation.ts
```

**Verification:**
- [ ] All OWASP Top 10 addressed
- [ ] Penetration test passes
- [ ] Security headers configured

---

## Phase 15: Monitoring & Observability

### 15.1 Logging

**Files to create:**
```
apps/mcp-server/src/
└── lib/
    └── logger.ts
```

**Verification:**
- [ ] Structured logging in place
- [ ] Log levels configurable
- [ ] Sensitive data redacted

---

### 15.2 Health Checks

**Files to create:**
```
apps/mcp-server/src/routes/
└── health.ts

apps/web/app/api/health/
└── route.ts
```

**Verification:**
- [ ] Health endpoints respond
- [ ] Database connectivity checked
- [ ] External service status checked

---

## Phase 16: Deployment Pipeline

### 16.1 GitHub Actions

**Files to create:**
```
.github/workflows/
├── lint.yml
├── test.yml
├── build.yml
└── deploy.yml
```

**Verification:**
- [ ] Lint passes
- [ ] Tests pass
- [ ] Build succeeds
- [ ] Deployment works

---

### 16.2 Production Deployment

**Actions:**
1. Deploy MCP server to EC2
2. Deploy web app to EC2
3. Configure pm2
4. Set up nginx reverse proxy
5. Configure SSL

**Verification:**
- [ ] MCP server accessible
- [ ] Web app accessible
- [ ] SSL working
- [ ] Auto-restart on failure

---

## Phase 17: Launch Preparation

### 17.1 MCP Registry Listing

**Actions:**
1. Register with MCP registry
2. Submit listing information
3. Complete verification

**Verification:**
- [ ] Listed in registry
- [ ] Discoverable by agents

---

### 17.2 Final Testing

**Actions:**
1. End-to-end testing
2. Load testing
3. Security review
4. Documentation review

**Verification:**
- [ ] All features working
- [ ] Performance acceptable
- [ ] Documentation complete

---

### 17.3 Launch

**Actions:**
1. Enable public access
2. Monitor for issues
3. Announce launch

---

## Dependency Graph

```
Phase 0 (Infrastructure)
    │
    ▼
Phase 1 (MCP Core) ───────────────────┐
    │                                 │
    ▼                                 │
Phase 2 (Legal Engine)                │
    │                                 │
    ▼                                 │
Phase 3 (Matters) ◄───────────────────┤
    │                                 │
    ▼                                 │
Phase 4 (Documents)                   │
    │                                 │
    ▼                                 │
Phase 5 (Payments) ◄──────────────────┤
    │                                 │
    ▼                                 │
Phase 6 (Consultations)               │
    │                                 │
    │                                 │
    ├─────────────────────────────────┤
    │                                 │
    ▼                                 ▼
Phase 7 (Web Foundation)         Phase 9 (Attorney)
    │                                 │
    ▼                                 │
Phase 8 (Operator Portal)             │
    │                                 │
    ├─────────────────────────────────┤
    │                                 │
    ▼                                 ▼
Phase 10 (Admin)                 Phase 11 (Docs)
    │                                 │
    ├─────────────────────────────────┤
    │
    ▼
Phase 12 (Invoicing)
    │
    ▼
Phase 13 (Provider Integration) ◄──── Extensibility layer
    │
    ▼
Phase 14-17 (Hardening & Launch)
```

---

## Milestone Checklist

| Phase | Milestone | Target |
|-------|-----------|--------|
| 0 | Infrastructure ready | Week 1 |
| 1 | MCP server responding | Week 2 |
| 2 | Legal Q&A working | Week 3 |
| 3 | Matters + Retainers | Week 4 |
| 4 | Documents working | Week 5 |
| 5 | Payments working | Week 6 |
| 6 | Consultations working | Week 7 |
| 7 | Web foundation | Week 8 |
| 8 | Operator portal complete | Week 10 |
| 9 | Attorney dashboard complete | Week 11 |
| 10 | Admin dashboard complete | Week 12 |
| 11 | Documentation complete | Week 13 |
| 12 | Billing complete | Week 14 |
| 13 | Provider integration ready | Week 16 |
| 14-16 | Hardening complete | Week 17 |
| 17 | Launch ready | Week 18 |

---

## Notes

- Each phase should be completed before moving to the next
- Dependencies must be respected
- Tests must pass before marking a phase complete
- All code must follow guidelines in FRONTEND_GUIDELINES.md and BACKEND_STRUCTURE.md
- All UI must use tokens from DESIGN_SYSTEM.md
