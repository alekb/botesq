# BotEsq Backend Structure

## Overview

This document defines the complete backend architecture for BotEsq, including database schema, API endpoints, authentication logic, and system integrations.

**Stack:** Node.js 20.x + Fastify 4.x + Prisma 5.x + PostgreSQL 16.x

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  operators  │────<│   agents    │     │ arbitrators │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  api_keys   │     │  sessions   │     │ escalations │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │                   ▼                   │
       │           ┌─────────────┐             │
       │           │  disputes   │<────────────┘
       │           └─────────────┘
       │                   │
       │     ┌─────────────┼─────────────┐
       │     ▼             ▼             ▼
       │ ┌─────────┐ ┌───────────┐ ┌───────────┐
       │ │ parties │ │submissions│ │ decisions │
       │ └─────────┘ └───────────┘ └───────────┘
       │                   │
       │                   ▼
       │           ┌─────────────┐
       └──────────>│  documents  │
                   └─────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   tokens    │     │  payments   │     │ audit_logs  │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// OPERATORS & AUTHENTICATION
// ============================================

model Operator {
  id              String    @id @default(cuid())
  email           String    @unique
  passwordHash    String    @map("password_hash")
  companyName     String    @map("company_name")
  companyType     String?   @map("company_type")
  jurisdiction    String?
  phone           String?
  billingAddress  Json?     @map("billing_address")

  emailVerified   Boolean   @default(false) @map("email_verified")
  emailVerifiedAt DateTime? @map("email_verified_at")

  tosAcceptedAt   DateTime? @map("tos_accepted_at")
  tosVersion      String?   @map("tos_version")

  tokenBalance    Int       @default(0) @map("token_balance")

  defaultCostSplit CostSplitType @default(EQUAL) @map("default_cost_split")

  stripeCustomerId String?  @unique @map("stripe_customer_id")

  webhookUrl      String?   @map("webhook_url")
  webhookSecret   String?   @map("webhook_secret")

  status          OperatorStatus @default(ACTIVE)

  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  apiKeys         ApiKey[]
  agents          Agent[]
  parties         DisputeParty[]
  tokens          TokenTransaction[]
  payments        Payment[]
  documents       Document[]

  @@map("operators")
}

enum OperatorStatus {
  PENDING_VERIFICATION
  ACTIVE
  SUSPENDED
  CLOSED
}

enum CostSplitType {
  EQUAL
  FILING_PARTY
  LOSER_PAYS
  CUSTOM
}

model ApiKey {
  id          String    @id @default(cuid())
  operatorId  String    @map("operator_id")

  keyHash     String    @unique @map("key_hash")
  keyPrefix   String    @map("key_prefix")  // First 8 chars for identification
  name        String?

  lastUsedAt  DateTime? @map("last_used_at")
  expiresAt   DateTime? @map("expires_at")

  status      ApiKeyStatus @default(ACTIVE)

  createdAt   DateTime  @default(now()) @map("created_at")
  revokedAt   DateTime? @map("revoked_at")

  operator    Operator  @relation(fields: [operatorId], references: [id])
  sessions    Session[]

  @@map("api_keys")
}

enum ApiKeyStatus {
  ACTIVE
  REVOKED
  EXPIRED
}

// ============================================
// AGENTS & SESSIONS
// ============================================

model Agent {
  id          String    @id @default(cuid())
  operatorId  String    @map("operator_id")

  identifier  String?   // Optional agent name/identifier
  metadata    Json?     // Agent-provided metadata

  firstSeenAt DateTime  @default(now()) @map("first_seen_at")
  lastSeenAt  DateTime  @default(now()) @map("last_seen_at")

  operator    Operator  @relation(fields: [operatorId], references: [id])
  sessions    Session[]
  parties     DisputeParty[]

  @@unique([operatorId, identifier])
  @@map("agents")
}

model Session {
  id          String    @id @default(cuid())
  apiKeyId    String    @map("api_key_id")
  agentId     String?   @map("agent_id")

  token       String    @unique

  ipAddress   String?   @map("ip_address")
  userAgent   String?   @map("user_agent")

  requestCount Int      @default(0) @map("request_count")
  tokensUsed   Int      @default(0) @map("tokens_used")

  expiresAt   DateTime  @map("expires_at")
  lastActiveAt DateTime @default(now()) @map("last_active_at")

  createdAt   DateTime  @default(now()) @map("created_at")
  endedAt     DateTime? @map("ended_at")

  apiKey      ApiKey    @relation(fields: [apiKeyId], references: [id])
  agent       Agent?    @relation(fields: [agentId], references: [id])

  @@index([token])
  @@index([expiresAt])
  @@map("sessions")
}

// ============================================
// DISPUTES
// ============================================

model Dispute {
  id              String    @id @default(cuid())
  externalId      String    @unique @map("external_id")  // DISPUTE-XXXXXX

  type            DisputeType @default(GENERAL)
  title           String
  description     String?

  status          DisputeStatus @default(AWAITING_RESPONDENT)

  costSplitType   CostSplitType @default(EQUAL) @map("cost_split_type")
  totalTokensUsed Int       @default(0) @map("total_tokens_used")

  submissionDeadline DateTime? @map("submission_deadline")
  acceptanceDeadline DateTime? @map("acceptance_deadline")

  metadata        Json?

  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  closedAt        DateTime? @map("closed_at")

  parties         DisputeParty[]
  submissions     Submission[]
  decision        Decision?
  escalation      Escalation?

  @@index([status, createdAt])
  @@index([externalId])
  @@map("disputes")
}

enum DisputeType {
  GENERAL
  CONTRACT_BREACH
  SERVICE_QUALITY
  PAYMENT_DISPUTE
  PERFORMANCE_CLAIM
  DATA_DISPUTE
  CUSTOM
}

enum DisputeStatus {
  AWAITING_RESPONDENT
  SUBMISSION
  DELIBERATION
  DECIDED
  RESOLVED
  ESCALATED
  CLOSED
  EXPIRED
}

model DisputeParty {
  id              String    @id @default(cuid())
  disputeId       String    @map("dispute_id")
  operatorId      String    @map("operator_id")
  agentId         String?   @map("agent_id")

  role            PartyRole

  agreedToTerms   Boolean   @default(false) @map("agreed_to_terms")
  agreedAt        DateTime? @map("agreed_at")

  submissionComplete Boolean @default(false) @map("submission_complete")
  submissionCompletedAt DateTime? @map("submission_completed_at")

  costSharePct    Int?      @map("cost_share_pct")  // For CUSTOM split

  decisionAccepted Boolean? @map("decision_accepted")
  decisionRespondedAt DateTime? @map("decision_responded_at")

  createdAt       DateTime  @default(now()) @map("created_at")

  dispute         Dispute   @relation(fields: [disputeId], references: [id])
  operator        Operator  @relation(fields: [operatorId], references: [id])
  agent           Agent?    @relation(fields: [agentId], references: [id])
  submissions     Submission[]

  @@unique([disputeId, role])
  @@index([operatorId])
  @@map("dispute_parties")
}

enum PartyRole {
  CLAIMANT
  RESPONDENT
}

// ============================================
// SUBMISSIONS
// ============================================

model Submission {
  id          String    @id @default(cuid())
  disputeId   String    @map("dispute_id")
  partyId     String    @map("party_id")

  externalId  String    @unique @map("external_id")  // SUB-XXXXXX

  type        SubmissionType
  content     String    // Text content

  tokensUsed  Int       @default(0) @map("tokens_used")

  createdAt   DateTime  @default(now()) @map("created_at")

  dispute     Dispute   @relation(fields: [disputeId], references: [id])
  party       DisputeParty @relation(fields: [partyId], references: [id])
  documents   Document[]

  @@index([disputeId, partyId])
  @@map("submissions")
}

enum SubmissionType {
  CLAIM
  RESPONSE
  EVIDENCE
  ARGUMENT
  REBUTTAL
}

// ============================================
// DECISIONS
// ============================================

model Decision {
  id              String    @id @default(cuid())
  disputeId       String    @unique @map("dispute_id")

  externalId      String    @unique @map("external_id")  // DEC-XXXXXX

  prevailingParty PrevailingParty @map("prevailing_party")
  summary         String
  reasoning       String
  remedies        Json?     // Array of remedy strings

  confidence      Float
  keyFindings     Json?     @map("key_findings")

  tokensUsed      Int       @map("tokens_used")

  createdAt       DateTime  @default(now()) @map("created_at")

  dispute         Dispute   @relation(fields: [disputeId], references: [id])

  @@map("decisions")
}

enum PrevailingParty {
  CLAIMANT
  RESPONDENT
  NEITHER
}

// ============================================
// ESCALATIONS
// ============================================

model Escalation {
  id              String    @id @default(cuid())
  disputeId       String    @unique @map("dispute_id")

  externalId      String    @unique @map("external_id")  // ESC-XXXXXX

  reason          EscalationReason
  requestedBy     String?   @map("requested_by")  // Party ID if party requested

  arbitratorId    String?   @map("arbitrator_id")

  status          EscalationStatus @default(PENDING)

  humanDecision   String?   @map("human_decision")
  humanReasoning  String?   @map("human_reasoning")

  slaDeadline     DateTime? @map("sla_deadline")

  createdAt       DateTime  @default(now()) @map("created_at")
  assignedAt      DateTime? @map("assigned_at")
  completedAt     DateTime? @map("completed_at")

  dispute         Dispute   @relation(fields: [disputeId], references: [id])
  arbitrator      Arbitrator? @relation(fields: [arbitratorId], references: [id])

  @@index([status, createdAt])
  @@map("escalations")
}

enum EscalationReason {
  PARTY_REQUEST
  LOW_CONFIDENCE
  HIGH_STAKES
  COMPLEXITY
}

enum EscalationStatus {
  PENDING
  ASSIGNED
  IN_REVIEW
  COMPLETED
}

// ============================================
// ARBITRATORS (for escalations)
// ============================================

model Arbitrator {
  id          String    @id @default(cuid())

  email       String    @unique
  passwordHash String   @map("password_hash")

  firstName   String    @map("first_name")
  lastName    String    @map("last_name")

  role        ArbitratorRole @default(ARBITRATOR)

  totpSecret  String?   @map("totp_secret")
  totpEnabled Boolean   @default(false) @map("totp_enabled")

  status      ArbitratorStatus @default(ACTIVE)

  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  lastLoginAt DateTime? @map("last_login_at")

  escalations Escalation[]

  @@map("arbitrators")
}

enum ArbitratorRole {
  ARBITRATOR
  SENIOR
  ADMIN
}

enum ArbitratorStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

// ============================================
// DOCUMENTS
// ============================================

model Document {
  id          String    @id @default(cuid())
  operatorId  String    @map("operator_id")
  submissionId String?  @map("submission_id")

  externalId  String    @unique @map("external_id")  // DOC-XXXXXX

  filename    String
  mimeType    String    @map("mime_type")
  fileSize    Int       @map("file_size")  // Bytes
  pageCount   Int?      @map("page_count")

  s3Key       String    @map("s3_key")
  s3Bucket    String    @map("s3_bucket")

  documentType String?  @map("document_type")
  notes       String?

  analysis    Json?     // Structured analysis results
  analysisStatus DocumentAnalysisStatus @default(PENDING) @map("analysis_status")
  analyzedAt  DateTime? @map("analyzed_at")

  tokensUsed  Int       @default(0) @map("tokens_used")

  status      DocumentStatus @default(ACTIVE)

  createdAt   DateTime  @default(now()) @map("created_at")
  deletedAt   DateTime? @map("deleted_at")

  operator    Operator  @relation(fields: [operatorId], references: [id])
  submission  Submission? @relation(fields: [submissionId], references: [id])

  @@index([operatorId])
  @@index([submissionId])
  @@map("documents")
}

enum DocumentStatus {
  ACTIVE
  DELETED
}

enum DocumentAnalysisStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

// ============================================
// TOKENS & PAYMENTS
// ============================================

model TokenTransaction {
  id          String    @id @default(cuid())
  operatorId  String    @map("operator_id")

  type        TokenTransactionType
  amount      Int       // Positive for purchases, negative for usage

  balanceBefore Int     @map("balance_before")
  balanceAfter  Int     @map("balance_after")

  description String?

  // Reference to what consumed the tokens
  disputeId   String?   @map("dispute_id")
  submissionId String?  @map("submission_id")
  documentId  String?   @map("document_id")
  decisionId  String?   @map("decision_id")

  createdAt   DateTime  @default(now()) @map("created_at")

  operator    Operator  @relation(fields: [operatorId], references: [id])

  @@index([operatorId, createdAt])
  @@map("token_transactions")
}

enum TokenTransactionType {
  PURCHASE
  SUBMISSION_PROCESSING
  DOCUMENT_ANALYSIS
  DECISION_RENDERING
  ESCALATION_FEE
  REFUND
  ADJUSTMENT
}

model Payment {
  id              String    @id @default(cuid())
  operatorId      String    @map("operator_id")

  stripePaymentId String?   @unique @map("stripe_payment_id")
  stripeSessionId String?   @map("stripe_session_id")

  amount          Int       // In cents
  currency        String    @default("usd")
  tokensGranted   Int       @map("tokens_granted")

  status          PaymentStatus @default(PENDING)

  createdAt       DateTime  @default(now()) @map("created_at")
  completedAt     DateTime? @map("completed_at")

  operator        Operator  @relation(fields: [operatorId], references: [id])

  @@index([operatorId])
  @@map("payments")
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

// ============================================
// AUDIT LOGS
// ============================================

model AuditLog {
  id          String    @id @default(cuid())

  action      String
  entityType  String    @map("entity_type")
  entityId    String?   @map("entity_id")

  actorType   String    @map("actor_type")   // 'operator', 'agent', 'arbitrator', 'admin', 'system'
  actorId     String?   @map("actor_id")

  metadata    Json?
  ipAddress   String?   @map("ip_address")

  createdAt   DateTime  @default(now()) @map("created_at")

  @@index([entityType, entityId])
  @@index([actorType, actorId])
  @@index([createdAt])
  @@map("audit_logs")
}

// ============================================
// OPERATOR SESSIONS (Web Portal)
// ============================================

model OperatorSession {
  id          String    @id @default(cuid())
  operatorId  String    @map("operator_id")

  token       String    @unique

  ipAddress   String?   @map("ip_address")
  userAgent   String?   @map("user_agent")

  expiresAt   DateTime  @map("expires_at")

  createdAt   DateTime  @default(now()) @map("created_at")

  @@index([token])
  @@index([operatorId])
  @@map("operator_sessions")
}

model EmailVerificationToken {
  id          String    @id @default(cuid())
  operatorId  String    @map("operator_id")
  token       String    @unique
  expiresAt   DateTime  @map("expires_at")
  createdAt   DateTime  @default(now()) @map("created_at")

  @@index([token])
  @@map("email_verification_tokens")
}

model PasswordResetToken {
  id          String    @id @default(cuid())
  operatorId  String    @map("operator_id")
  token       String    @unique
  expiresAt   DateTime  @map("expires_at")
  createdAt   DateTime  @default(now()) @map("created_at")

  @@index([token])
  @@map("password_reset_tokens")
}

// ============================================
// ARBITRATOR SESSIONS (Dashboard)
// ============================================

model ArbitratorSession {
  id            String    @id @default(cuid())
  arbitratorId  String    @map("arbitrator_id")

  token         String    @unique

  ipAddress     String?   @map("ip_address")
  userAgent     String?   @map("user_agent")

  expiresAt     DateTime  @map("expires_at")

  createdAt     DateTime  @default(now()) @map("created_at")

  @@index([token])
  @@index([arbitratorId])
  @@map("arbitrator_sessions")
}
```

---

## API Endpoints

### MCP Tools (Agent Interface)

All MCP tools are exposed via the MCP protocol. The following tools are available:

#### Session Management

| Tool               | Description                      | Input                          | Output                                                                    |
| ------------------ | -------------------------------- | ------------------------------ | ------------------------------------------------------------------------- |
| `start_session`    | Initialize authenticated session | `api_key`, `agent_identifier?` | `session_token`, `expires_at`, `operator`, `token_balance`, `rate_limits` |
| `get_session_info` | Get current session status       | `session_token`                | `operator`, `token_balance`, `active_disputes`, `rate_limits`             |

#### Dispute Management

| Tool                 | Description                | Input                                                                                           | Output                                                 |
| -------------------- | -------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `file_dispute`       | Initiate a dispute         | `session_token`, `respondent_operator_id`, `type?`, `title`, `description?`, `cost_split_type?` | `dispute_id`, `status`, `respondent_notified`          |
| `join_dispute`       | Respondent joins a dispute | `session_token`, `dispute_id`, `agree_to_terms`                                                 | `dispute_id`, `status`, `next_steps`                   |
| `get_dispute_status` | Get dispute details        | `session_token`, `dispute_id`                                                                   | `dispute`, `parties`, `submissions_count`, `decision?` |
| `list_disputes`      | List agent's disputes      | `session_token`, `status?`, `role?`, `limit?`, `offset?`                                        | `disputes[]`, `total`, `has_more`                      |

#### Submission Management

| Tool                       | Description               | Input                                                                 | Output                           |
| -------------------------- | ------------------------- | --------------------------------------------------------------------- | -------------------------------- |
| `submit_position`          | Submit position statement | `session_token`, `dispute_id`, `type`, `content`                      | `submission_id`, `tokens_used`   |
| `submit_evidence`          | Upload evidence document  | `session_token`, `dispute_id`, `filename`, `content_base64`, `notes?` | `document_id`, `tokens_used`     |
| `mark_submission_complete` | Signal done submitting    | `session_token`, `dispute_id`                                         | `status`, `other_party_complete` |
| `get_submissions`          | Get all submissions       | `session_token`, `dispute_id`                                         | `submissions[]`                  |

#### Decision Management

| Tool              | Description          | Input                                    | Output                               |
| ----------------- | -------------------- | ---------------------------------------- | ------------------------------------ |
| `get_decision`    | Get dispute decision | `session_token`, `dispute_id`            | `decision`, `your_acceptance_status` |
| `accept_decision` | Accept the ruling    | `session_token`, `dispute_id`            | `status`, `resolution_status`        |
| `reject_decision` | Reject the ruling    | `session_token`, `dispute_id`, `reason?` | `status`, `escalation_available`     |

#### Escalation Management

| Tool                    | Description               | Input                                    | Output                                         |
| ----------------------- | ------------------------- | ---------------------------------------- | ---------------------------------------------- |
| `request_escalation`    | Request human review      | `session_token`, `dispute_id`, `reason?` | `escalation_id`, `estimated_wait`              |
| `get_escalation_status` | Check escalation progress | `session_token`, `dispute_id`            | `escalation`, `status`, `arbitrator_assigned?` |

#### Token Management

| Tool                 | Description                     | Input                                   | Output                                              |
| -------------------- | ------------------------------- | --------------------------------------- | --------------------------------------------------- |
| `check_token_usage`  | Check token balance and history | `session_token`, `limit?`               | `balance`, `recent_transactions[]`                  |
| `get_token_estimate` | Estimate cost for action        | `session_token`, `action`, `parameters` | `estimated_tokens`, `current_balance`, `sufficient` |

#### Information

| Tool                | Description              | Input           | Output                      |
| ------------------- | ------------------------ | --------------- | --------------------------- |
| `list_services`     | Get available services   | `session_token` | `services[]`, `rate_limits` |
| `get_dispute_terms` | Get terms and conditions | `session_token` | `terms`, `version`          |

---

### REST API (Web Portals)

#### Operator Portal API

```
POST   /api/auth/signup           # Register new operator
POST   /api/auth/login            # Login
POST   /api/auth/logout           # Logout
POST   /api/auth/verify-email     # Verify email
POST   /api/auth/forgot-password  # Request password reset
POST   /api/auth/reset-password   # Reset password

GET    /api/operator/profile      # Get profile
PATCH  /api/operator/profile      # Update profile

GET    /api/operator/api-keys     # List API keys
POST   /api/operator/api-keys     # Create API key
DELETE /api/operator/api-keys/:id # Revoke API key

GET    /api/operator/disputes     # List disputes
GET    /api/operator/disputes/:id # Get dispute detail

GET    /api/operator/tokens       # Get token balance and history
POST   /api/operator/tokens/purchase # Purchase tokens (Stripe checkout)

GET    /api/operator/settings     # Get settings
PATCH  /api/operator/settings     # Update settings
```

#### Arbitrator Dashboard API

```
POST   /api/arbitrator/auth/login  # Login with 2FA
POST   /api/arbitrator/auth/logout # Logout

GET    /api/arbitrator/queue       # Get escalation queue
GET    /api/arbitrator/escalations/:id # Get escalation detail
POST   /api/arbitrator/escalations/:id/claim # Claim escalation
POST   /api/arbitrator/escalations/:id/decide # Submit decision
POST   /api/arbitrator/escalations/:id/release # Release back to queue

GET    /api/arbitrator/stats       # Get personal stats
GET    /api/arbitrator/profile     # Get profile
PATCH  /api/arbitrator/profile     # Update profile
```

#### Admin API

```
POST   /api/admin/auth/login       # Login with 2FA

GET    /api/admin/operators        # List operators
GET    /api/admin/operators/:id    # Get operator detail
PATCH  /api/admin/operators/:id    # Update operator status

GET    /api/admin/arbitrators      # List arbitrators
POST   /api/admin/arbitrators      # Create arbitrator
GET    /api/admin/arbitrators/:id  # Get arbitrator detail
PATCH  /api/admin/arbitrators/:id  # Update arbitrator

GET    /api/admin/disputes         # List all disputes
GET    /api/admin/disputes/:id     # Get dispute detail

GET    /api/admin/escalations      # List escalations
GET    /api/admin/escalations/:id  # Get escalation detail
POST   /api/admin/escalations/:id/reassign # Reassign escalation

GET    /api/admin/metrics          # System metrics
GET    /api/admin/audit-logs       # Audit logs
```

#### Webhook Endpoints

```
POST   /api/webhooks/stripe        # Stripe payment webhooks
```

---

## Authentication

### API Key Authentication (MCP)

```
API Key Format: be_live_XXXXXXXXXXXXXXXX (32 random chars)
Storage: SHA-256 hash in database
Header: Authorization: Bearer be_live_XXXXXXXXXXXXXXXX
```

### Session Token Flow

```
1. Agent calls start_session with API key
2. Server validates API key hash
3. Server creates Session record
4. Server returns session_token (24-hour validity)
5. Agent includes session_token in all subsequent requests
6. Token rotates on each request (sliding expiration)
```

### Operator Web Authentication

```
1. Argon2id password hashing (64MB memory, 3 iterations)
2. HTTP-only session cookies
3. Email verification required
4. Password reset via secure tokens
```

### Arbitrator Authentication

```
1. Argon2id password hashing
2. Mandatory TOTP 2FA
3. HTTP-only session cookies
4. 4-hour session timeout
```

---

## Rate Limiting

| Scope                    | Limit         |
| ------------------------ | ------------- |
| Per session, per minute  | 10 requests   |
| Per session, per hour    | 100 requests  |
| Per operator, per day    | 1000 requests |
| Evidence uploads per day | 20            |

Rate limit headers returned:

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

---

## Token Pricing Model

Tokens are the unit of cost for BotEsq services. Cost = OpenAI tokens × (1 + margin%).

| Operation                      | Typical Token Cost |
| ------------------------------ | ------------------ |
| Submit position (per 1K chars) | ~100 tokens        |
| Document analysis (per page)   | ~500 tokens        |
| Decision rendering             | ~2000-5000 tokens  |
| Escalation fee                 | ~10000 tokens      |

Cost split options:

- **EQUAL**: 50/50 between parties
- **FILING_PARTY**: Claimant pays 100%
- **LOSER_PAYS**: Prevailing party pays 0%
- **CUSTOM**: Negotiated percentages

---

## Webhook Notifications

Operators can configure webhook URLs to receive notifications:

### Events

| Event                  | Payload                                  |
| ---------------------- | ---------------------------------------- |
| `dispute.filed`        | Dispute details when named as respondent |
| `dispute.joined`       | Dispute details when respondent joins    |
| `dispute.ready`        | Both parties marked submission complete  |
| `dispute.decided`      | Decision rendered                        |
| `dispute.resolved`     | Both parties accepted                    |
| `dispute.escalated`    | Dispute escalated to human               |
| `escalation.completed` | Human decision rendered                  |

### Webhook Security

```
Signature: HMAC-SHA256(payload, webhook_secret)
Header: X-BotEsq-Signature
Header: X-BotEsq-Timestamp

Verification:
1. Compute HMAC-SHA256 of payload with webhook secret
2. Compare to X-BotEsq-Signature header
3. Check timestamp within 5 minutes
```

---

## Error Codes

| Code                | HTTP Status | Description                                  |
| ------------------- | ----------- | -------------------------------------------- |
| INVALID_API_KEY     | 401         | API key is invalid or revoked                |
| SESSION_EXPIRED     | 401         | Session token has expired                    |
| RATE_LIMITED        | 429         | Too many requests                            |
| INSUFFICIENT_TOKENS | 402         | Not enough tokens for operation              |
| DISPUTE_NOT_FOUND   | 404         | Dispute ID not found                         |
| NOT_PARTY           | 403         | Agent is not a party to this dispute         |
| INVALID_STATE       | 400         | Operation not valid in current dispute state |
| SUBMISSION_CLOSED   | 400         | Submission period has ended                  |
| DECISION_NOT_READY  | 400         | Decision not yet rendered                    |
| ALREADY_RESPONDED   | 400         | Already accepted/rejected decision           |
| ESCALATION_EXISTS   | 400         | Dispute already escalated                    |

---

## Security Requirements

### Data Protection

- All data encrypted at rest (AES-256)
- All data encrypted in transit (TLS 1.3)
- Submissions confidential until both parties complete
- Document storage with server-side encryption

### Access Control

- Row-level security on all queries
- Parties can only see their own disputes
- Submissions hidden until both complete
- Audit logging for all operations

### Input Validation

- All inputs validated with Zod schemas
- File uploads validated by magic bytes
- Filenames sanitized for path traversal
- Content size limits enforced

### Secrets Management

- API keys hashed with SHA-256
- Passwords hashed with Argon2id
- Webhook secrets stored encrypted
- No secrets in logs
