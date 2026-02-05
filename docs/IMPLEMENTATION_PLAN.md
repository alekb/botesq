# BotEsq Implementation Plan

## Overview

This document is the master blueprint for building BotEsq as a neutral AI dispute resolution service. It contains numbered phases and steps covering the entire build from start to finish. Each step lists exact files to create, features to implement (referencing PRD feature IDs), and tests to write.

**This file is written once and does not get modified during execution.**

---

## Phase 0: Infrastructure Setup

### 0.1 Repository Initialization

**Files to create:**

```
botesq/
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
docker run --name botesq-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16

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
   sudo certbot --nginx -d botesq.io -d www.botesq.io
   ```

**Verification:**

- [ ] HTTPS working at https://botesq.io
- [ ] HTTP redirects to HTTPS
- [ ] SSL certificate valid

---

### 0.5 Production Database Setup (RDS)

**Actions:**

1. Create RDS PostgreSQL 16 instance (db.t3.small)
2. Configure security group for EC2 access only
3. Create database: `botesq_prod`
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
├── get-dispute-terms.ts
└── check-token-usage.ts
```

**Verification:**

- [ ] `list_services` returns available services
- [ ] `get_dispute_terms` returns terms and conditions
- [ ] `check_token_usage` returns balance and history

---

## Phase 2: Dispute Management

**Implements:** FEAT-004 (Dispute Management)

### 2.1 Dispute Service

**Files to create:**

```
apps/mcp-server/src/
├── services/
│   └── dispute.service.ts          # Dispute CRUD operations
└── utils/
    └── secure-id.ts                # Cryptographically secure ID generation
```

**Tests to write:**

```
apps/mcp-server/src/__tests__/services/
└── dispute.service.test.ts
```

**Verification:**

- [ ] Disputes created with DISPUTE-XXXXXX format
- [ ] Status transitions work correctly
- [ ] Parties tracked correctly

---

### 2.2 Filing & Joining Tools

**Files to create:**

```
apps/mcp-server/src/tools/
├── file-dispute.ts
├── join-dispute.ts
├── get-dispute-status.ts
└── list-disputes.ts
```

**Tests to write:**

```
apps/mcp-server/src/__tests__/tools/
├── file-dispute.test.ts
├── join-dispute.test.ts
├── get-dispute-status.test.ts
└── list-disputes.test.ts
```

**Verification:**

- [ ] Claimant can file dispute
- [ ] Respondent can join dispute
- [ ] Status updates correctly
- [ ] List filters work (status, role)

---

### 2.3 Webhook Notifications

**Files to create:**

```
apps/mcp-server/src/services/
└── operator-webhook.service.ts     # Webhook dispatch for operators
```

**Verification:**

- [ ] Webhook sent when dispute filed against operator
- [ ] HMAC signature included
- [ ] Timestamp included for replay protection

---

## Phase 3: Submission System

**Implements:** FEAT-005 (Submission System)

### 3.1 Submission Service

**Files to create:**

```
apps/mcp-server/src/services/
└── submission.service.ts           # Submission CRUD
```

**Verification:**

- [ ] Submissions linked to disputes and parties
- [ ] Multiple submission types supported
- [ ] Token usage tracked

---

### 3.2 Submission Tools

**Files to create:**

```
apps/mcp-server/src/tools/
├── submit-position.ts
├── submit-evidence.ts
├── mark-submission-complete.ts
└── get-submissions.ts
```

**Tests to write:**

```
apps/mcp-server/src/__tests__/tools/
├── submit-position.test.ts
├── submit-evidence.test.ts
├── mark-submission-complete.test.ts
└── get-submissions.test.ts
```

**Verification:**

- [ ] Position statements stored correctly
- [ ] Evidence documents uploaded to S3
- [ ] Both parties marked complete triggers deliberation
- [ ] Submissions hidden until both complete

---

### 3.3 Evidence Processing

**Files to create:**

```
apps/mcp-server/src/
├── services/
│   ├── storage.service.ts          # S3 integration
│   └── document-analysis.service.ts # AI document analysis
```

**Dependencies:**

```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Verification:**

- [ ] Documents upload to S3
- [ ] File type validation (magic bytes)
- [ ] Document analysis generates summary

---

## Phase 4: AI Decision Engine

**Implements:** FEAT-006 (AI Decision Engine)

### 4.1 OpenAI Integration

**Files to create:**

```
apps/mcp-server/src/
├── services/
│   ├── llm.service.ts              # OpenAI client wrapper
│   └── decision-engine.service.ts  # Decision generation
├── prompts/
│   └── arbiter.prompt.ts           # Neutral arbiter system prompt
```

**Dependencies:**

```bash
pnpm add openai tiktoken
```

**Verification:**

- [ ] OpenAI connection working
- [ ] Neutral decisions generated
- [ ] Token counting accurate

---

### 4.2 Decision Rendering

**Files to create:**

```
apps/mcp-server/src/services/
└── decision.service.ts             # Decision creation and storage
```

**Verification:**

- [ ] Decision includes ruling, reasoning, confidence
- [ ] Key findings cite evidence
- [ ] Tokens tracked for billing

---

### 4.3 Decision Tools

**Files to create:**

```
apps/mcp-server/src/tools/
└── get-decision.ts
```

**Verification:**

- [ ] Decision retrievable after rendering
- [ ] Party acceptance status included

---

## Phase 5: Decision Acceptance Flow

**Implements:** FEAT-007 (Decision Acceptance Flow)

### 5.1 Acceptance Tools

**Files to create:**

```
apps/mcp-server/src/tools/
├── accept-decision.ts
└── reject-decision.ts
```

**Tests to write:**

```
apps/mcp-server/src/__tests__/tools/
├── accept-decision.test.ts
└── reject-decision.test.ts
```

**Verification:**

- [ ] Both accepting resolves dispute
- [ ] Rejection enables escalation option
- [ ] Webhooks sent on resolution

---

## Phase 6: Escalation System

**Implements:** FEAT-008 (Escalation System)

### 6.1 Escalation Service

**Files to create:**

```
apps/mcp-server/src/services/
└── escalation.service.ts           # Escalation CRUD and queue
```

**Verification:**

- [ ] Escalations queued correctly
- [ ] SLA deadlines calculated
- [ ] Status tracking works

---

### 6.2 Escalation Tools

**Files to create:**

```
apps/mcp-server/src/tools/
├── request-escalation.ts
└── get-escalation-status.ts
```

**Tests to write:**

```
apps/mcp-server/src/__tests__/tools/
├── request-escalation.test.ts
└── get-escalation-status.test.ts
```

**Verification:**

- [ ] Escalation created on request
- [ ] Tokens charged for escalation
- [ ] Status updates available

---

## Phase 7: Token System

**Implements:** FEAT-003 (Token-Based Pricing System)

### 7.1 Stripe Integration

**Files to create:**

```
apps/mcp-server/src/services/
└── stripe.service.ts               # Stripe checkout and webhooks

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
- [ ] Tokens added on successful payment

---

### 7.2 Token Service

**Files to create:**

```
apps/mcp-server/src/services/
└── token.service.ts                # Token balance management
```

**Verification:**

- [ ] Balance queries accurate
- [ ] Deductions tracked with references
- [ ] Transaction history maintained

---

### 7.3 Token Estimation Tool

**Files to create:**

```
apps/mcp-server/src/tools/
└── get-token-estimate.ts
```

**Verification:**

- [ ] Estimates returned for actions
- [ ] Sufficiency check included

---

## Phase 8: Web Application Foundation

**Implements:** FEAT-014 (Marketing Website) foundation

### 8.1 Next.js Setup

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

### 8.2 Design System Implementation

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

### 8.3 Marketing Pages

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
    ├── pricing-explanation.tsx
    └── footer.tsx
```

**Verification:**

- [ ] Landing page renders
- [ ] Mobile responsive
- [ ] All links work

---

## Phase 9: Operator Portal

**Implements:** FEAT-011 (Operator Portal)

### 9.1 Authentication UI

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

### 9.2 Portal Dashboard

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

### 9.3 Dispute Management UI

**Files to create:**

```
apps/web/app/portal/
├── disputes/
│   ├── page.tsx                    # Dispute list
│   └── [id]/
│       ├── page.tsx                # Dispute detail
│       ├── timeline/page.tsx
│       ├── submissions/page.tsx
│       └── decision/page.tsx
└── components/portal/
    ├── dispute-card.tsx
    ├── dispute-list.tsx
    ├── dispute-detail.tsx
    └── dispute-timeline.tsx
```

**Verification:**

- [ ] Dispute list loads
- [ ] Filtering works
- [ ] Detail view shows all data

---

### 9.4 API Key Management

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

### 9.5 Token & Billing UI

**Files to create:**

```
apps/web/app/portal/
├── billing/
│   ├── page.tsx
│   └── history/page.tsx
└── components/portal/
    ├── token-balance.tsx
    ├── purchase-tokens-dialog.tsx
    └── transaction-history.tsx
```

**Verification:**

- [ ] Token balance displays
- [ ] Purchase flow works
- [ ] History loads

---

### 9.6 Settings & Webhooks

**Files to create:**

```
apps/web/app/portal/
├── settings/
│   ├── page.tsx
│   ├── profile/page.tsx
│   └── webhooks/page.tsx
```

**Verification:**

- [ ] Profile updates work
- [ ] Webhook configuration works

---

## Phase 10: Arbitrator Dashboard

**Implements:** FEAT-010 (Arbitrator Dashboard)

### 10.1 Arbitrator Authentication

**Files to create:**

```
apps/web/app/arbitrator/
├── login/page.tsx
└── lib/
    └── arbitrator-auth.ts
```

**Verification:**

- [ ] Arbitrator login works
- [ ] 2FA required
- [ ] Session management correct

---

### 10.2 Queue Management

**Files to create:**

```
apps/web/app/arbitrator/
├── layout.tsx
├── page.tsx                        # Queue view
└── components/
    ├── queue-list.tsx
    ├── queue-item.tsx
    └── queue-stats.tsx
```

**Verification:**

- [ ] Queue loads with prioritization
- [ ] Claiming works

---

### 10.3 Escalation Review UI

**Files to create:**

```
apps/web/app/arbitrator/
├── escalation/[id]/
│   ├── page.tsx
│   └── components/
│       ├── escalation-header.tsx
│       ├── ai-decision-panel.tsx
│       ├── submission-panel.tsx
│       └── decision-editor.tsx
```

**Verification:**

- [ ] Full dispute context displayed
- [ ] AI decision shown
- [ ] Decision editor works
- [ ] Submit decision flow works

---

### 10.4 Arbitrator Stats

**Files to create:**

```
apps/web/app/arbitrator/
├── stats/page.tsx
└── components/
    └── arbitrator-stats.tsx
```

**Verification:**

- [ ] Personal stats display
- [ ] Time tracking accurate

---

## Phase 11: Admin Dashboard

**Implements:** FEAT-012 (Admin Dashboard)

### 11.1 Admin Authentication

**Files to create:**

```
apps/web/app/admin/
├── login/page.tsx
└── lib/
    └── admin-auth.ts
```

---

### 11.2 Admin Overview

**Files to create:**

```
apps/web/app/admin/
├── layout.tsx
├── page.tsx                        # Overview dashboard
└── components/
    ├── system-health.tsx
    ├── dispute-stats.tsx
    └── alerts.tsx
```

---

### 11.3 Operator Management

**Files to create:**

```
apps/web/app/admin/
├── operators/
│   ├── page.tsx
│   └── [id]/page.tsx
```

---

### 11.4 Arbitrator Management

**Files to create:**

```
apps/web/app/admin/
├── arbitrators/
│   ├── page.tsx
│   ├── new/page.tsx
│   └── [id]/page.tsx
```

---

### 11.5 Dispute Oversight

**Files to create:**

```
apps/web/app/admin/
├── disputes/
│   ├── page.tsx
│   └── [id]/page.tsx
├── escalations/
│   ├── page.tsx
│   └── [id]/page.tsx
```

---

### 11.6 Audit Logs

**Files to create:**

```
apps/web/app/admin/
├── audit/page.tsx
└── components/
    └── audit-log-viewer.tsx
```

---

## Phase 12: API Documentation

**Implements:** FEAT-015 (API Documentation)

### 12.1 Documentation Site

**Files to create:**

```
apps/web/app/docs/
├── page.tsx                        # Docs home
├── quickstart/page.tsx
├── authentication/page.tsx
├── tools/
│   ├── page.tsx
│   └── [tool]/page.tsx
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

## Phase 13: Billing & Invoicing

**Implements:** FEAT-013 (Billing & Invoicing)

### 13.1 Invoice Generation

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

## Phase 14: Security Hardening

### 14.1 Security Audit

**Actions:**

- [ ] Review all authentication flows
- [ ] Audit API key handling
- [ ] Check for SQL injection
- [ ] Check for XSS
- [ ] Review rate limiting
- [ ] Audit logging completeness

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
Phase 2 (Disputes)                    │
    │                                 │
    ▼                                 │
Phase 3 (Submissions) ◄───────────────┤
    │                                 │
    ▼                                 │
Phase 4 (AI Decision)                 │
    │                                 │
    ▼                                 │
Phase 5 (Acceptance Flow)             │
    │                                 │
    ▼                                 │
Phase 6 (Escalation) ◄────────────────┤
    │                                 │
    ▼                                 │
Phase 7 (Token System)                │
    │                                 │
    ├─────────────────────────────────┤
    │                                 │
    ▼                                 ▼
Phase 8 (Web Foundation)         Phase 10 (Arbitrator)
    │                                 │
    ▼                                 │
Phase 9 (Operator Portal)             │
    │                                 │
    ├─────────────────────────────────┤
    │                                 │
    ▼                                 ▼
Phase 11 (Admin)                 Phase 12 (Docs)
    │                                 │
    ├─────────────────────────────────┤
    │
    ▼
Phase 13 (Invoicing)
    │
    ▼
Phase 14-17 (Hardening & Launch)
```

---

## Milestone Checklist

| Phase | Milestone                      | Target  |
| ----- | ------------------------------ | ------- |
| 0     | Infrastructure ready           | Week 1  |
| 1     | MCP server responding          | Week 2  |
| 2     | Disputes can be filed & joined | Week 3  |
| 3     | Submissions working            | Week 4  |
| 4     | AI decisions rendering         | Week 5  |
| 5     | Acceptance flow complete       | Week 6  |
| 6     | Escalations working            | Week 7  |
| 7     | Token system complete          | Week 8  |
| 8     | Web foundation                 | Week 9  |
| 9     | Operator portal complete       | Week 11 |
| 10    | Arbitrator dashboard complete  | Week 12 |
| 11    | Admin dashboard complete       | Week 13 |
| 12    | Documentation complete         | Week 14 |
| 13    | Billing complete               | Week 15 |
| 14-16 | Hardening complete             | Week 17 |
| 17    | Launch ready                   | Week 18 |

---

## Notes

- Each phase should be completed before moving to the next
- Dependencies must be respected
- Tests must pass before marking a phase complete
- All code must follow guidelines in FRONTEND_GUIDELINES.md and BACKEND_STRUCTURE.md
- All UI must use tokens from DESIGN_SYSTEM.md
