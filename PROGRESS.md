# BotEsq Progress

## Current

**Phase:** 7 - Web Application Foundation
**Step:** 7.1 Next.js Setup
**Status:** pending

---

## Active Tasks

### Phase 7: Web Application Foundation

- [ ] Review Phase 7 requirements in IMPLEMENTATION_PLAN.md
- [ ] Set up Next.js with full design system tokens
- [ ] Create UI component primitives
- [ ] Build marketing page foundation

### Security Implementation (Cross-Phase)

- [ ] Implement Argon2id password hashing (no password auth exists yet — Phase 7+)
- [x] Implement API key generation with SHA-256
- [x] Add row-level security checks to all queries (operator scoping verified in 2026-07-04 review)
- [x] Implement Stripe webhook signature validation (plus idempotent claim + amount reconciliation)
- [x] Add file upload validation (magic bytes, size limits)
- [ ] Configure S3 bucket security (private, encrypted) — infra task
- [ ] Add virus scanning for uploads (ClamAV)
- [ ] Implement provider webhook signature validation (Phase FEAT-016)

---

## Blocked

_None_

---

## Completed

### Security Remediation — Code Review Findings (2026-07-04)

Branch `fix/code-review-2026-07-04`. Full review in `docs/CODE_REVIEW_2026-07-04.md`. Three verification loops: (1) fixed the 13 documented findings, verified by a 13-agent adversarial pass that caught a missed 5th credit-deduction site; (2) a full 5-dimension re-review surfaced 25 more confirmed findings (≈19 distinct) incl. two guaranteed crashes, four cross-transaction crash windows, and loggers polluting the MCP stdio channel — all fixed; (3) verified the re-review fixes + regression-scanned the new code, which found only P2 regressions (all fixed). Build/lint clean, 59 unit tests, 3 migrations added.

Round-2/3 additions on top of the round-1 list below:

- [x] Single atomic credit deduction (conditional decrement + row lock) replacing five race-prone implementations; DB CHECK constraint `credit_balance >= 0`
- [x] Stripe webhook: atomic claim + credit in one transaction, amount reconciliation, credits from own payment record
- [x] Fixed guaranteed crash: `'moderate'` mapped to `STANDARD` (ConsultationComplexity has no MODERATE)
- [x] Retainer pre-auth: token always required for agent acceptance, sha256-hashed at rest, constant-time compare, race-safe claim, typed errors
- [x] Document analysis wired (fire-and-forget) with refund on failure; magic-byte + pre-decode size validation
- [x] ask_legal_question: LLM-only catch scope, instant answers persisted + charged in one transaction, creditsCharged set at creation
- [x] Rate limiting keyed by operator (not session token); start_session throttled per presented-key hash
- [x] Log redaction (credentials + privileged content), pino `err` key serialization, generic INTERNAL_ERROR to clients
- [x] Session `endedAt` enforced in auth; dead `endSession` removed
- [x] Unified env validation (`@botesq/shared` validateEnv consumed by mcp-server config; prod-required secrets)
- [x] `besq_live_` API key prefix; `Payment.amountCents` rename; instant-answer audit trail
- [x] All five charging paths + retainer create/accept + webhook + failed-analysis refund now commit the row/state and the money in a single transaction (crash-safe); guaranteed crashes fixed (`create_matter` enum parity via `z.nativeEnum`, `submit_document` matter-id FK resolution)
- [x] All logging moved to a shared stderr logger (stdout was corrupting the MCP stdio protocol); session bearer tokens hashed; API-key expiry enforced; LLM analysis JSON coerced (can't crash the read path); config/env hardening (LOG_LEVEL, S3 URL expiry, mock-key prod guard)
- [x] 59 unit tests incl. atomic-deduction semantics, webhook idempotent claim, pre-auth gate, magic bytes, matter-type parity, analysis null-coercion, wrapped-base64
- Deferred to user: delete/rotate `admin-totp-qr.png` (2FA secret in Dropbox-synced folder; now gitignored)
- Known gap: no live-DB concurrency integration tests (no postgres in dev env)

### Phase 6: Consultation System (2026-02-03)

- [x] Create consultation.service.ts with create/get/list functions
- [x] Implement request_consultation tool (5000 standard / 10000 urgent credits)
- [x] Implement get_consultation_result tool for status checking
- [x] Add RequestConsultation/GetConsultationResult types to types.ts
- [x] Register tools in tools/index.ts
- [x] Build and lint passes

### Phase 5: Payments & Credits (2026-02-03)

- [x] Add stripe SDK dependency
- [x] Add Stripe configuration to config.ts (secretKey, webhookSecret, successUrl, cancelUrl)
- [x] Create credit.service.ts with add/deduct/refund credits functions
- [x] Create stripe.service.ts with checkout session creation and webhook handling
- [x] Implement add_credits tool (creates Stripe checkout session)
- [x] Add AddCreditsInput/Output types to types.ts
- [x] Register add_credits tool in tools/index.ts
- [x] Existing tools already have credit deduction logic (ask_legal_question, create_matter, submit_document)
- [x] Build and lint passes

### Phase 4: Document Handling (2026-02-03)

- [x] Add @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner dependencies
- [x] Create storage.service.ts with S3 upload/download/presigned URLs
- [x] Add AWS configuration to config.ts
- [x] Create document.service.ts with CRUD and analysis tracking
- [x] Create document-analysis.service.ts with AI-powered analysis
- [x] Implement submit_document tool with pricing (base 2500 + 100/page)
- [x] Implement get_document_analysis tool
- [x] Build and lint passes

### Phase 3: Matter Management (2026-02-03)

- [x] Create matter.service.ts with CRUD operations
- [x] Implement create_matter tool (10,000 credits)
- [x] Implement get_matter_status tool
- [x] Implement list_matters tool with pagination
- [x] Create retainer.service.ts with engagement terms template
- [x] Implement get_retainer_terms tool
- [x] Implement accept_retainer tool with pre-auth support
- [x] Build and lint passes

### Phase 2: Legal Engine (2026-02-03)

- [x] Create llm.service.ts with OpenAI client wrapper
- [x] Create legal-ai.service.ts with legal response generation
- [x] Implement ask_legal_question tool with pricing/credits
- [x] Add queue.service.ts for human attorney fallback
- [x] Create MCP prompts (contract_review, entity_formation, compliance_check, ip_question, general_legal)
- [x] Add confidence parsing, citation extraction, complexity determination
- [x] Register prompts in server.ts capabilities
- [x] Build and lint passes

### Phase 1: MCP Server Core (2026-02-03)

- [x] Create MCP server scaffold with @modelcontextprotocol/sdk
- [x] Add config.ts with environment validation (zod)
- [x] Add types.ts with tool input/output types and error classes
- [x] Implement auth.service.ts (API key validation, session auth)
- [x] Implement session.service.ts (start/get/end session)
- [x] Implement rate-limit.service.ts (in-memory rate limiting)
- [x] Implement start_session tool
- [x] Implement get_session_info tool
- [x] Implement list_services tool
- [x] Implement get_disclaimers tool
- [x] Implement check_credits tool
- [x] Build and lint passes

### Phase 0.2: Database Setup (2026-02-03)

- [x] Create Prisma schema with 24 models from BACKEND_STRUCTURE.md
- [x] Install PostgreSQL 16.11 locally
- [x] Create botesq_dev database
- [x] Run initial migration (20260203195618_init)
- [x] Configure Prisma client export
- [x] Verify build passes

### Infrastructure: Testing & Git Hooks (2026-02-03)

- [x] Set up Vitest for mcp-server (vitest.config.ts, sample credit.service tests)
- [x] Set up Vitest for web app (@testing-library/react, jsdom, sample tests)
- [x] Set up Playwright for E2E tests (playwright.config.ts, e2e/home.spec.ts)
- [x] Set up Husky + lint-staged (pre-commit hook runs eslint --fix + prettier)
- [x] All 18 unit tests pass (15 mcp-server + 3 web)
- [x] E2E tests pass (3 home page tests)
- [x] Lint-staged verified working

### Phase 0.1: Repository Initialization (2026-02-03)

- [x] Initialize git repository
- [x] Create monorepo folder structure (apps/web, apps/mcp-server, packages/database, packages/shared)
- [x] Create root package.json with pnpm workspace
- [x] Create pnpm-workspace.yaml
- [x] Create turbo.json
- [x] Create base tsconfig.json
- [x] Create .eslintrc.js
- [x] Create .prettierrc
- [x] Create .gitignore and .nvmrc
- [x] Create apps/web with Next.js 14.2.3, Tailwind CSS
- [x] Create apps/mcp-server with Fastify, MCP SDK
- [x] Create packages/database with Prisma
- [x] Create packages/shared
- [x] Install dependencies (pnpm install)
- [x] Verify lint passes

**Note:** Project moved from Dropbox path to `~/projects/bot-law` for WSL compatibility.

### Documentation (2026-02-03)

- [x] docs/PRD.md — 17 features defined (FEAT-001 through FEAT-017)
- [x] docs/APP_FLOW.md — Agent, Operator, Attorney journeys
- [x] docs/TECH_STACK.md — Versions locked, infrastructure defined
- [x] docs/DESIGN_SYSTEM.md — Colors, typography, spacing tokens
- [x] docs/FRONTEND_GUIDELINES.md — Component architecture
- [x] docs/BACKEND_STRUCTURE.md — Schema, API contracts, auth logic
- [x] docs/IMPLEMENTATION_PLAN.md — 17 phases, 18-week timeline
- [x] CLAUDE.md — AI agent instructions
- [x] LESSONS.md — Initialized

---

## What's Next

**Phase 7: Web Application Foundation**

- Set up Next.js with full design system tokens
- Create UI component primitives (button, input, card, etc.)
- Build marketing page foundation

See `docs/IMPLEMENTATION_PLAN.md` Phase 7 for full details.

---

## Session Log

### 2026-02-03

- Security review completed and improvements implemented:
  - Enhanced .env.example with full documentation
  - Added environment validation utility (packages/shared/src/env.ts)
  - Created docs/SECURITY.md with implementation patterns
  - Added CI security scanning (audit, secrets detection, dependency review)
  - Updated LESSONS.md with security patterns
- Infrastructure: Testing + Git Hooks setup (Vitest, Playwright, Husky, lint-staged)
- Phase 6 complete: Consultation System with request_consultation and get_consultation_result tools
- Phase 5 complete: Payments & Credits with Stripe integration, add_credits tool, credit.service.ts
- Phase 4 complete: Document Handling with S3 storage, AI analysis, 2 tools (submit/get_analysis)
- Phase 3 complete: Matter Management with 5 tools (create/get/list matter, get/accept retainer)
- Phase 2 complete: Legal Engine with ask_legal_question tool, LLM integration, 5 MCP prompts
- Phase 1 complete: MCP Server with 5 tools (session, credits, services, disclaimers)
- Phase 0.2 complete: PostgreSQL + Prisma schema with 24 models
- Phase 0.1 complete: monorepo initialized, all packages created, dependencies installed
- Project relocated to ~/projects/bot-law (WSL compatibility)
- Project renamed from MoltLaw to BotEsq
- Provider Integration Framework added (FEAT-016, FEAT-017)
- Documentation suite created (11 files)
- Consolidated tracking system (progress.txt + todo.md → PROGRESS.md)
