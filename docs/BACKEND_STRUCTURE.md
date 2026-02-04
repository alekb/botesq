# BotEsq Backend Structure

## Overview

This document defines the complete backend architecture for BotEsq, including database schema, API endpoints, authentication logic, and system integrations.

**Stack:** Node.js 20.x + Fastify 4.x + Prisma 5.x + PostgreSQL 16.x

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  operators  │────<│   agents    │     │  attorneys  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  api_keys   │     │  sessions   │     │  matter_    │
└─────────────┘     └─────────────┘     │  assignments│
       │                   │            └─────────────┘
       │                   │                   │
       ▼                   ▼                   │
┌─────────────┐     ┌─────────────┐            │
│  retainers  │────<│   matters   │<───────────┘
└─────────────┘     └─────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌───────────┐   ┌───────────┐   ┌───────────┐
    │ documents │   │ messages  │   │ consults  │
    └───────────┘   └───────────┘   └───────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  credits    │     │  payments   │     │ audit_logs  │
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

  creditBalance   Int       @default(0) @map("credit_balance")

  preAuthToken    String?   @unique @map("pre_auth_token")
  preAuthScope    Json?     @map("pre_auth_scope")
  preAuthMaxCredits Int?    @map("pre_auth_max_credits")

  stripeCustomerId String?  @unique @map("stripe_customer_id")

  status          OperatorStatus @default(ACTIVE)

  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  apiKeys         ApiKey[]
  agents          Agent[]
  matters         Matter[]
  retainers       Retainer[]
  credits         CreditTransaction[]
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
  matters     Matter[]

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
  creditsUsed  Int      @default(0) @map("credits_used")

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
// MATTERS & LEGAL WORK
// ============================================

model Matter {
  id          String    @id @default(cuid())
  operatorId  String    @map("operator_id")
  agentId     String?   @map("agent_id")
  retainerId  String?   @unique @map("retainer_id")

  externalId  String    @unique @map("external_id")  // MATTER-XXXXXX

  type        MatterType
  title       String
  description String?
  urgency     MatterUrgency @default(STANDARD)

  status      MatterStatus @default(PENDING_RETAINER)

  metadata    Json?

  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  resolvedAt  DateTime? @map("resolved_at")
  closedAt    DateTime? @map("closed_at")

  operator    Operator  @relation(fields: [operatorId], references: [id])
  agent       Agent?    @relation(fields: [agentId], references: [id])
  retainer    Retainer? @relation(fields: [retainerId], references: [id])

  documents   Document[]
  messages    MatterMessage[]
  consultations Consultation[]
  assignments MatterAssignment[]

  @@index([operatorId, status])
  @@index([externalId])
  @@map("matters")
}

enum MatterType {
  CONTRACT_REVIEW
  ENTITY_FORMATION
  COMPLIANCE
  IP_TRADEMARK
  IP_COPYRIGHT
  GENERAL_CONSULTATION
  LITIGATION_CONSULTATION
}

enum MatterStatus {
  PENDING_RETAINER
  ACTIVE
  ON_HOLD
  RESOLVED
  CLOSED
}

enum MatterUrgency {
  LOW
  STANDARD
  HIGH
  URGENT
}

model MatterMessage {
  id          String    @id @default(cuid())
  matterId    String    @map("matter_id")

  role        MessageRole
  content     String

  metadata    Json?     // For AI: confidence, citations, etc.

  createdAt   DateTime  @default(now()) @map("created_at")

  matter      Matter    @relation(fields: [matterId], references: [id])

  @@index([matterId, createdAt])
  @@map("matter_messages")
}

enum MessageRole {
  AGENT       // From AI agent
  OPERATOR    // From human operator
  SYSTEM      // System messages
  AI          // From internal legal AI
  ATTORNEY    // From human attorney
}

model MatterAssignment {
  id          String    @id @default(cuid())
  matterId    String    @map("matter_id")
  attorneyId  String    @map("attorney_id")

  assignedAt  DateTime  @default(now()) @map("assigned_at")
  completedAt DateTime? @map("completed_at")

  timeSpentMinutes Int? @map("time_spent_minutes")

  matter      Matter    @relation(fields: [matterId], references: [id])
  attorney    Attorney  @relation(fields: [attorneyId], references: [id])

  @@map("matter_assignments")
}

// ============================================
// RETAINERS
// ============================================

model Retainer {
  id          String    @id @default(cuid())
  operatorId  String    @map("operator_id")

  externalId  String    @unique @map("external_id")  // RET-XXXXXX

  scope       String
  feeArrangement FeeArrangement @map("fee_arrangement")
  estimatedFee   Int?    @map("estimated_fee")  // In credits

  conflictCheck  String? @map("conflict_check")
  engagementTerms String @map("engagement_terms")

  status      RetainerStatus @default(PENDING)

  acceptedAt  DateTime? @map("accepted_at")
  acceptedBy  String?   @map("accepted_by")  // 'agent_preauth', 'operator_manual', etc.
  signatureMethod String? @map("signature_method")
  signatureIp String?   @map("signature_ip")

  expiresAt   DateTime  @map("expires_at")

  createdAt   DateTime  @default(now()) @map("created_at")

  operator    Operator  @relation(fields: [operatorId], references: [id])
  matter      Matter?

  @@index([operatorId])
  @@map("retainers")
}

enum RetainerStatus {
  PENDING
  ACCEPTED
  EXPIRED
  REVOKED
}

enum FeeArrangement {
  FLAT_FEE
  HOURLY
  CONTINGENT
  HYBRID
}

// ============================================
// DOCUMENTS
// ============================================

model Document {
  id          String    @id @default(cuid())
  operatorId  String    @map("operator_id")
  matterId    String?   @map("matter_id")

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

  confidenceScore Float? @map("confidence_score")
  attorneyReviewRecommended Boolean @default(false) @map("attorney_review_recommended")

  status      DocumentStatus @default(ACTIVE)

  createdAt   DateTime  @default(now()) @map("created_at")
  deletedAt   DateTime? @map("deleted_at")

  operator    Operator  @relation(fields: [operatorId], references: [id])
  matter      Matter?   @relation(fields: [matterId], references: [id])

  @@index([operatorId])
  @@index([matterId])
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
// CONSULTATIONS (ASYNC Q&A)
// ============================================

model Consultation {
  id          String    @id @default(cuid())
  matterId    String?   @map("matter_id")
  operatorId  String    @map("operator_id")

  externalId  String    @unique @map("external_id")  // CONS-XXXXXX

  question    String
  context     String?
  jurisdiction String?

  complexity  ConsultationComplexity @default(STANDARD)

  status      ConsultationStatus @default(QUEUED)

  aiDraft     String?   @map("ai_draft")
  aiConfidence Float?   @map("ai_confidence")
  aiMetadata  Json?     @map("ai_metadata")

  finalResponse String? @map("final_response")
  responseMetadata Json? @map("response_metadata")

  attorneyId  String?   @map("attorney_id")

  creditsCharged Int    @default(0) @map("credits_charged")

  slaDeadline DateTime? @map("sla_deadline")

  createdAt   DateTime  @default(now()) @map("created_at")
  completedAt DateTime? @map("completed_at")

  matter      Matter?   @relation(fields: [matterId], references: [id])
  attorney    Attorney? @relation(fields: [attorneyId], references: [id])

  @@index([status, createdAt])
  @@map("consultations")
}

enum ConsultationStatus {
  QUEUED
  AI_PROCESSING
  PENDING_REVIEW
  IN_REVIEW
  NEEDS_INFO
  COMPLETED
  FAILED
}

enum ConsultationComplexity {
  SIMPLE
  STANDARD
  COMPLEX
  URGENT
}

// ============================================
// ATTORNEYS
// ============================================

model Attorney {
  id          String    @id @default(cuid())

  email       String    @unique
  passwordHash String   @map("password_hash")

  firstName   String    @map("first_name")
  lastName    String    @map("last_name")
  barNumber   String?   @map("bar_number")
  barState    String?   @map("bar_state")

  role        AttorneyRole @default(ASSOCIATE)

  totpSecret  String?   @map("totp_secret")
  totpEnabled Boolean   @default(false) @map("totp_enabled")

  status      AttorneyStatus @default(ACTIVE)

  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  lastLoginAt DateTime? @map("last_login_at")

  assignments MatterAssignment[]
  consultations Consultation[]

  @@map("attorneys")
}

enum AttorneyRole {
  ASSOCIATE
  SENIOR
  PARTNER
  ADMIN
}

enum AttorneyStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

// ============================================
// CREDITS & PAYMENTS
// ============================================

model CreditTransaction {
  id          String    @id @default(cuid())
  operatorId  String    @map("operator_id")

  type        CreditTransactionType
  amount      Int       // Positive for additions, negative for deductions

  balanceBefore Int     @map("balance_before")
  balanceAfter  Int     @map("balance_after")

  description String?

  // Reference to what caused this transaction
  referenceType String? @map("reference_type")  // 'payment', 'matter', 'consultation', etc.
  referenceId   String? @map("reference_id")

  createdAt   DateTime  @default(now()) @map("created_at")

  operator    Operator  @relation(fields: [operatorId], references: [id])

  @@index([operatorId, createdAt])
  @@map("credit_transactions")
}

enum CreditTransactionType {
  PURCHASE
  DEDUCTION
  REFUND
  ADJUSTMENT
  PROMO
}

model Payment {
  id          String    @id @default(cuid())
  operatorId  String    @map("operator_id")

  stripePaymentIntentId String? @unique @map("stripe_payment_intent_id")
  stripeCheckoutSessionId String? @unique @map("stripe_checkout_session_id")

  amountUsd   Int       @map("amount_usd")  // Cents
  credits     Int

  status      PaymentStatus @default(PENDING)

  metadata    Json?

  createdAt   DateTime  @default(now()) @map("created_at")
  completedAt DateTime? @map("completed_at")

  operator    Operator  @relation(fields: [operatorId], references: [id])

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

  actorType   AuditActorType @map("actor_type")
  actorId     String?   @map("actor_id")

  action      String
  resourceType String   @map("resource_type")
  resourceId  String?   @map("resource_id")

  details     Json?

  ipAddress   String?   @map("ip_address")
  userAgent   String?   @map("user_agent")

  createdAt   DateTime  @default(now()) @map("created_at")

  @@index([actorType, actorId])
  @@index([resourceType, resourceId])
  @@index([createdAt])
  @@map("audit_logs")
}

enum AuditActorType {
  OPERATOR
  AGENT
  ATTORNEY
  ADMIN
  SYSTEM
  PROVIDER
}

// ============================================
// PROVIDERS (Third-Party Integration)
// ============================================

model Provider {
  id              String    @id @default(cuid())

  externalId      String    @unique @map("external_id")  // PROV-XXXXXX

  name            String
  legalName       String    @map("legal_name")
  description     String?

  // Contact & Auth
  email           String    @unique
  passwordHash    String    @map("password_hash")
  webhookUrl      String?   @map("webhook_url")
  webhookSecret   String?   @map("webhook_secret")  // For HMAC signing

  // Capabilities
  jurisdictions   String[]  // Array of supported jurisdictions
  specialties     MatterType[]
  serviceTypes    ProviderServiceType[]  @map("service_types")

  // Capacity & Performance
  maxConcurrent   Int       @default(10) @map("max_concurrent")
  avgResponseMins Int?      @map("avg_response_mins")
  qualityScore    Float     @default(0) @map("quality_score")  // 0-5 rating

  // Business
  revenueSharePct Int       @default(70) @map("revenue_share_pct")  // Provider gets this %
  stripeConnectId String?   @unique @map("stripe_connect_id")

  // Status
  status          ProviderStatus @default(PENDING_APPROVAL)
  verifiedAt      DateTime? @map("verified_at")

  totpSecret      String?   @map("totp_secret")
  totpEnabled     Boolean   @default(false) @map("totp_enabled")

  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  services        ProviderService[]
  requests        ProviderRequest[]
  reviews         ProviderReview[]
  settlements     ProviderSettlement[]
  operatorPrefs   OperatorProviderPreference[]

  @@map("providers")
}

enum ProviderStatus {
  PENDING_APPROVAL
  ACTIVE
  SUSPENDED
  INACTIVE
}

enum ProviderServiceType {
  LEGAL_QA
  DOCUMENT_REVIEW
  CONSULTATION
  CONTRACT_DRAFTING
  ENTITY_FORMATION
  TRADEMARK
  LITIGATION
}

model ProviderService {
  id          String    @id @default(cuid())
  providerId  String    @map("provider_id")

  serviceType ProviderServiceType @map("service_type")
  enabled     Boolean   @default(true)

  // Pricing (in credits)
  basePrice   Int       @map("base_price")
  priceModel  PriceModel @default(FLAT) @map("price_model")
  pricePerUnit Int?     @map("price_per_unit")  // For per-page, per-hour, etc.

  // Capacity
  maxConcurrent Int     @default(5) @map("max_concurrent")
  currentLoad   Int     @default(0) @map("current_load")

  // SLA
  targetResponseMins Int @map("target_response_mins")

  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  provider    Provider  @relation(fields: [providerId], references: [id])

  @@unique([providerId, serviceType])
  @@map("provider_services")
}

enum PriceModel {
  FLAT
  PER_PAGE
  PER_HOUR
  COMPLEXITY_BASED
}

model ProviderRequest {
  id          String    @id @default(cuid())
  providerId  String    @map("provider_id")
  matterId    String?   @map("matter_id")
  consultationId String? @map("consultation_id")

  externalId  String    @unique @map("external_id")  // PREQ-XXXXXX

  serviceType ProviderServiceType @map("service_type")
  status      ProviderRequestStatus @default(PENDING)

  // Request payload (sent to provider)
  requestPayload Json   @map("request_payload")

  // Response (from provider)
  responsePayload Json? @map("response_payload")
  responseAt    DateTime? @map("response_at")

  // Routing info
  routingReason String?  @map("routing_reason")  // Why this provider was selected

  // Financials
  creditsCharged Int     @default(0) @map("credits_charged")
  providerEarnings Int   @default(0) @map("provider_earnings")

  // SLA tracking
  slaDeadline   DateTime? @map("sla_deadline")
  slaMet        Boolean?  @map("sla_met")

  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  provider      Provider  @relation(fields: [providerId], references: [id])

  @@index([providerId, status])
  @@index([status, createdAt])
  @@map("provider_requests")
}

enum ProviderRequestStatus {
  PENDING
  SENT_TO_PROVIDER
  IN_PROGRESS
  COMPLETED
  FAILED
  CANCELLED
}

model ProviderReview {
  id          String    @id @default(cuid())
  providerId  String    @map("provider_id")
  operatorId  String    @map("operator_id")
  requestId   String?   @map("request_id")

  rating      Int       // 1-5
  comment     String?
  isPublic    Boolean   @default(true) @map("is_public")

  createdAt   DateTime  @default(now()) @map("created_at")

  provider    Provider  @relation(fields: [providerId], references: [id])

  @@index([providerId])
  @@map("provider_reviews")
}

model ProviderSettlement {
  id          String    @id @default(cuid())
  providerId  String    @map("provider_id")

  periodStart DateTime  @map("period_start")
  periodEnd   DateTime  @map("period_end")

  totalRequests Int     @map("total_requests")
  totalCredits  Int     @map("total_credits")
  providerShare Int     @map("provider_share")
  platformShare Int     @map("platform_share")

  status      SettlementStatus @default(PENDING)

  stripeTransferId String? @map("stripe_transfer_id")
  paidAt      DateTime? @map("paid_at")

  createdAt   DateTime  @default(now()) @map("created_at")

  provider    Provider  @relation(fields: [providerId], references: [id])

  @@index([providerId, periodStart])
  @@map("provider_settlements")
}

enum SettlementStatus {
  PENDING
  PROCESSING
  PAID
  FAILED
}

model OperatorProviderPreference {
  id          String    @id @default(cuid())
  operatorId  String    @map("operator_id")
  providerId  String    @map("provider_id")

  enabled     Boolean   @default(true)
  priority    Int       @default(0)  // Higher = more preferred
  serviceTypes ProviderServiceType[]  @map("service_types")  // Empty = all services

  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  provider    Provider  @relation(fields: [providerId], references: [id])

  @@unique([operatorId, providerId])
  @@map("operator_provider_preferences")
}
```

---

## API Structure

### MCP Tools (Primary Agent Interface)

All MCP tools follow this request/response pattern:

```typescript
// Tool Input Schema
interface ToolInput {
  session_token?: string // Required for authenticated tools
  // ... tool-specific parameters
}

// Tool Output Schema
interface ToolOutput {
  success: boolean
  data?: any
  error?: {
    code: string
    message: string
    details?: any
  }
}
```

#### Tool Specifications

```typescript
// ============================================
// SESSION MANAGEMENT
// ============================================

// start_session
interface StartSessionInput {
  api_key: string
  agent_identifier?: string
}

interface StartSessionOutput {
  session_token: string
  expires_at: string // ISO 8601
  operator: {
    id: string
    name: string
  }
  credits: {
    balance: number
    currency: 'credits'
  }
  rate_limits: {
    requests_per_minute: number
    requests_per_hour: number
  }
}

// get_session_info
interface GetSessionInfoInput {
  session_token: string
}

interface GetSessionInfoOutput {
  session_id: string
  operator: { id: string; name: string }
  credits: { balance: number }
  active_matters: number
  requests_this_minute: number
  requests_this_hour: number
  expires_at: string
}

// ============================================
// LEGAL Q&A
// ============================================

// ask_legal_question
interface AskLegalQuestionInput {
  session_token: string
  question: string
  jurisdiction?: string
  context?: string
}

interface AskLegalQuestionOutput {
  answer_id: string
  status: 'instant' | 'queued'
  answer?: string
  confidence_score?: number
  complexity: 'simple' | 'moderate' | 'complex'
  citations?: Array<{ source: string; section?: string }>
  suggested_followups?: string[]
  disclaimers: string[]
  credits_used: number
  credits_remaining: number
  // If queued:
  estimated_wait_minutes?: number
  consultation_id?: string
}

// ============================================
// MATTER MANAGEMENT
// ============================================

// create_matter
interface CreateMatterInput {
  session_token: string
  matter_type: MatterType
  title: string
  description?: string
  urgency?: 'low' | 'standard' | 'high' | 'urgent'
}

interface CreateMatterOutput {
  matter_id: string
  status: MatterStatus
  type: MatterType
  title: string
  retainer_required: boolean
  retainer?: { id: string; status: string }
  next_steps: string[]
  credits_used: number
  credits_remaining: number
}

// get_matter_status
interface GetMatterStatusInput {
  session_token: string
  matter_id: string
}

interface GetMatterStatusOutput {
  matter_id: string
  status: MatterStatus
  type: MatterType
  title: string
  created_at: string
  updated_at: string
  documents: Array<{ id: string; filename: string; status: string }>
  message_count: number
  assigned_attorney?: string
}

// list_matters
interface ListMattersInput {
  session_token: string
  status?: MatterStatus
  limit?: number
  offset?: number
}

interface ListMattersOutput {
  matters: Array<{
    matter_id: string
    status: MatterStatus
    type: MatterType
    title: string
    created_at: string
    updated_at: string
  }>
  total: number
  limit: number
  offset: number
}

// ============================================
// RETAINERS
// ============================================

// get_retainer_terms
interface GetRetainerTermsInput {
  session_token: string
  matter_id: string
}

interface GetRetainerTermsOutput {
  retainer_id: string
  matter_id: string
  terms: {
    client_name: string
    attorney_name: string
    scope: string
    fee_arrangement: string
    estimated_fee: number
    fee_currency: 'credits'
    conflict_check: string
    engagement_terms: string
  }
  acceptance_methods: {
    pre_auth_available: boolean
    manual_signing_url: string
  }
  expires_at: string
}

// accept_retainer
interface AcceptRetainerInput {
  session_token: string
  retainer_id: string
  pre_auth_token?: string // Required if using pre-authorization
}

interface AcceptRetainerOutput {
  retainer_id: string
  status: 'accepted' | 'pending_manual'
  accepted_at?: string
  accepted_by?: string
  matter: { id: string; status: MatterStatus }
  manual_signing_url?: string // If pre-auth not available
  message: string
  next_steps: string[]
}

// ============================================
// DOCUMENTS
// ============================================

// submit_document
interface SubmitDocumentInput {
  session_token: string
  matter_id?: string
  filename: string
  content_base64: string
  document_type?: string
  notes?: string
}

interface SubmitDocumentOutput {
  document_id: string
  matter_id?: string
  filename: string
  status: 'processing' | 'queued'
  page_count: number
  estimated_analysis_minutes: number
  credits_used: number
  credits_remaining: number
}

// get_document_analysis
interface GetDocumentAnalysisInput {
  session_token: string
  document_id: string
}

interface GetDocumentAnalysisOutput {
  document_id: string
  status: 'processing' | 'completed' | 'failed'
  analysis?: {
    summary: string
    document_type: string
    parties?: Array<{ role: string; name: string }>
    key_terms: Array<{ term: string; summary: string }>
    identified_risks: Array<{
      severity: 'low' | 'medium' | 'high'
      clause: string
      issue: string
      recommendation: string
    }>
    missing_clauses: string[]
    recommendations: string[]
  }
  confidence_score?: number
  attorney_review_recommended?: boolean
  disclaimers?: string[]
}

// ============================================
// CONSULTATIONS
// ============================================

// request_consultation
interface RequestConsultationInput {
  session_token: string
  matter_id?: string
  question: string
  context?: string
  jurisdiction?: string
  urgency?: 'standard' | 'urgent'
}

interface RequestConsultationOutput {
  consultation_id: string
  status: 'queued'
  estimated_wait_minutes: number
  sla_deadline: string
  credits_used: number
  credits_remaining: number
}

// get_consultation_result
interface GetConsultationResultInput {
  session_token: string
  consultation_id: string
}

interface GetConsultationResultOutput {
  consultation_id: string
  status: ConsultationStatus
  question: string
  response?: string
  citations?: Array<{ source: string; section?: string }>
  attorney_reviewed: boolean
  disclaimers?: string[]
  completed_at?: string
  // If still processing:
  estimated_wait_minutes?: number
}

// ============================================
// CREDITS
// ============================================

// check_credits
interface CheckCreditsInput {
  session_token: string
}

interface CheckCreditsOutput {
  balance: number
  currency: 'credits'
  usd_equivalent: number
  low_balance_warning: boolean
  usage_this_month: number
  top_services: Array<{ service: string; credits: number }>
}

// add_credits
interface AddCreditsInput {
  session_token: string
  amount_usd: number
}

interface AddCreditsOutput {
  payment_url: string
  amount_usd: number
  credits_to_add: number
  expires_at: string
  message: string
}

// ============================================
// SERVICES & INFO
// ============================================

// list_services
interface ListServicesInput {
  session_token?: string // Optional for public pricing
}

interface ListServicesOutput {
  services: Array<{
    service: string
    description: string
    credit_cost: number | { min: number; max: number }
    requires_retainer: boolean
  }>
}

// get_disclaimers
interface GetDisclaimersOutput {
  disclaimers: Array<{
    type: string
    text: string
  }>
  version: string
  last_updated: string
}
```

---

### REST API (Portal/Dashboard)

#### Authentication Endpoints

```
POST   /api/auth/register          # Operator registration
POST   /api/auth/verify-email      # Email verification
POST   /api/auth/login             # Operator login
POST   /api/auth/logout            # Logout
POST   /api/auth/refresh           # Refresh session
POST   /api/auth/forgot-password   # Password reset request
POST   /api/auth/reset-password    # Password reset

POST   /api/attorney/login         # Attorney login
POST   /api/attorney/2fa/setup     # 2FA setup
POST   /api/attorney/2fa/verify    # 2FA verification
```

#### Operator Portal Endpoints

```
# Profile
GET    /api/portal/profile         # Get operator profile
PATCH  /api/portal/profile         # Update profile

# API Keys
GET    /api/portal/api-keys        # List API keys
POST   /api/portal/api-keys        # Create API key
DELETE /api/portal/api-keys/:id    # Revoke API key

# Matters
GET    /api/portal/matters         # List matters
GET    /api/portal/matters/:id     # Get matter details
GET    /api/portal/matters/:id/timeline  # Get matter timeline
GET    /api/portal/matters/:id/documents # Get matter documents
GET    /api/portal/matters/:id/messages  # Get matter messages

# Documents
GET    /api/portal/documents       # List all documents
GET    /api/portal/documents/:id   # Get document details
GET    /api/portal/documents/:id/download  # Download document

# Billing
GET    /api/portal/credits         # Get credit balance
GET    /api/portal/credits/history # Get credit history
POST   /api/portal/credits/purchase  # Create checkout session
GET    /api/portal/invoices        # List invoices
GET    /api/portal/invoices/:id/pdf  # Download invoice

# Pre-authorization
GET    /api/portal/preauth         # Get pre-auth settings
PATCH  /api/portal/preauth         # Update pre-auth settings
POST   /api/portal/preauth/regenerate  # Regenerate token

# Settings
GET    /api/portal/settings        # Get settings
PATCH  /api/portal/settings        # Update settings
GET    /api/portal/webhooks        # Get webhook config
PATCH  /api/portal/webhooks        # Update webhooks
```

#### Attorney Dashboard Endpoints

```
# Queue
GET    /api/attorney/queue         # Get queue items
POST   /api/attorney/queue/:id/claim    # Claim matter
POST   /api/attorney/queue/:id/release  # Release matter

# Matters
GET    /api/attorney/matters/:id   # Get matter for review
POST   /api/attorney/matters/:id/response  # Submit response
POST   /api/attorney/matters/:id/escalate  # Escalate matter

# Consultations
GET    /api/attorney/consultations/:id  # Get consultation
PATCH  /api/attorney/consultations/:id  # Update consultation
POST   /api/attorney/consultations/:id/approve  # Approve response

# Stats
GET    /api/attorney/stats         # Get personal stats
```

#### Admin Endpoints

```
# Operators
GET    /api/admin/operators        # List operators
GET    /api/admin/operators/:id    # Get operator details
PATCH  /api/admin/operators/:id    # Update operator
POST   /api/admin/operators/:id/suspend  # Suspend operator

# Attorneys
GET    /api/admin/attorneys        # List attorneys
POST   /api/admin/attorneys        # Create attorney
PATCH  /api/admin/attorneys/:id    # Update attorney

# Matters
GET    /api/admin/matters          # List all matters
GET    /api/admin/matters/:id      # Get any matter
POST   /api/admin/matters/:id/reassign  # Reassign matter

# System
GET    /api/admin/stats            # System statistics
GET    /api/admin/audit-logs       # Audit logs
GET    /api/admin/health           # Health check
```

#### Provider Portal Endpoints

```
# Authentication
POST   /api/provider/register       # Provider registration
POST   /api/provider/login          # Provider login
POST   /api/provider/2fa/setup      # 2FA setup
POST   /api/provider/2fa/verify     # 2FA verification

# Profile & Services
GET    /api/provider/profile        # Get provider profile
PATCH  /api/provider/profile        # Update profile
GET    /api/provider/services       # List provider's services
POST   /api/provider/services       # Add service offering
PATCH  /api/provider/services/:id   # Update service
DELETE /api/provider/services/:id   # Remove service

# Requests (work queue)
GET    /api/provider/requests       # List incoming requests
GET    /api/provider/requests/:id   # Get request details
POST   /api/provider/requests/:id/accept   # Accept request
POST   /api/provider/requests/:id/complete # Submit response
POST   /api/provider/requests/:id/reject   # Reject request

# Financials
GET    /api/provider/earnings       # View earnings
GET    /api/provider/settlements    # View settlement history
POST   /api/provider/stripe-connect # Set up Stripe Connect

# Webhooks
GET    /api/provider/webhook-config # Get webhook configuration
PATCH  /api/provider/webhook-config # Update webhook URL/secret
```

#### Provider Marketplace Endpoints (Operator Access)

```
# Discovery
GET    /api/marketplace/providers   # List available providers
GET    /api/marketplace/providers/:id  # Get provider details
GET    /api/marketplace/providers/:id/reviews  # Get reviews

# Preferences
GET    /api/portal/providers        # List enabled providers
POST   /api/portal/providers/:id/enable   # Enable provider
DELETE /api/portal/providers/:id/enable   # Disable provider
PATCH  /api/portal/providers/:id/priority # Set priority

# Reviews
POST   /api/portal/providers/:id/review   # Submit review
```

#### Admin Provider Management

```
# Provider management
GET    /api/admin/providers         # List all providers
GET    /api/admin/providers/:id     # Get provider details
PATCH  /api/admin/providers/:id     # Update provider
POST   /api/admin/providers/:id/approve   # Approve provider
POST   /api/admin/providers/:id/suspend   # Suspend provider

# Settlements
GET    /api/admin/settlements       # List all settlements
POST   /api/admin/settlements/:id/process # Process settlement
```

#### Webhook Endpoints

```
POST   /api/webhooks/stripe        # Stripe webhook handler
POST   /api/webhooks/provider/:id  # Provider webhook callbacks
```

---

## Authentication Logic

### API Key Authentication (MCP)

```typescript
// Middleware for MCP tool authentication
async function authenticateSession(token: string): Promise<Session> {
  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      apiKey: {
        include: { operator: true },
      },
      agent: true,
    },
  })

  if (!session) {
    throw new AuthError('INVALID_SESSION', 'Session not found')
  }

  if (session.expiresAt < new Date()) {
    throw new AuthError('SESSION_EXPIRED', 'Session has expired')
  }

  if (session.apiKey.status !== 'ACTIVE') {
    throw new AuthError('API_KEY_REVOKED', 'API key has been revoked')
  }

  if (session.apiKey.operator.status !== 'ACTIVE') {
    throw new AuthError('OPERATOR_SUSPENDED', 'Operator account is suspended')
  }

  // Update last active timestamp
  await prisma.session.update({
    where: { id: session.id },
    data: {
      lastActiveAt: new Date(),
      requestCount: { increment: 1 },
    },
  })

  return session
}
```

### Session Token Generation

```typescript
import { nanoid } from 'nanoid'

function generateSessionToken(): string {
  return `sess_${nanoid(32)}`
}

async function createSession(apiKeyId: string, agentId?: string): Promise<Session> {
  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  return prisma.session.create({
    data: {
      token,
      apiKeyId,
      agentId,
      expiresAt,
    },
  })
}
```

### Operator Portal Authentication (Lucia)

```typescript
// Using Lucia for session-based auth
import { Lucia } from 'lucia'
import { PrismaAdapter } from '@lucia-auth/adapter-prisma'

const adapter = new PrismaAdapter(prisma.operatorSession, prisma.operator)

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === 'production',
    },
  },
})
```

---

## Rate Limiting

### Configuration

```typescript
const RATE_LIMITS = {
  session: {
    requestsPerMinute: 10,
    requestsPerHour: 100,
  },
  operator: {
    documentsPerDay: 20,
    concurrentMatters: 5,
  },
}
```

### Implementation

```typescript
import { FastifyInstance } from 'fastify'
import fastifyRateLimit from '@fastify/rate-limit'

export function setupRateLimiting(app: FastifyInstance) {
  app.register(fastifyRateLimit, {
    global: false,
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      // Use session token or IP
      return (request.headers['x-session-token'] as string) || request.ip
    },
    errorResponseBuilder: (request, context) => ({
      error: {
        code: 'RATE_LIMITED',
        message: `Rate limit exceeded. Retry after ${context.after}`,
        retry_after_seconds: Math.ceil(context.ttl / 1000),
      },
    }),
  })
}
```

---

## Credit System

### Pricing Table

```typescript
const PRICING = {
  ask_legal_question: {
    simple: 200,
    moderate: 500,
    complex: 1000,
  },
  create_matter: 10000,
  submit_document: {
    base: 2500,
    perPage: 100,
    max: 10000,
  },
  request_consultation: {
    standard: 5000,
    urgent: 10000,
  },
}
```

### Credit Deduction

```typescript
async function deductCredits(
  operatorId: string,
  amount: number,
  description: string,
  referenceType?: string,
  referenceId?: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const operator = await tx.operator.findUnique({
      where: { id: operatorId },
      select: { creditBalance: true },
    })

    if (!operator || operator.creditBalance < amount) {
      throw new PaymentError('INSUFFICIENT_CREDITS', 'Not enough credits')
    }

    await tx.operator.update({
      where: { id: operatorId },
      data: { creditBalance: { decrement: amount } },
    })

    await tx.creditTransaction.create({
      data: {
        operatorId,
        type: 'DEDUCTION',
        amount: -amount,
        balanceBefore: operator.creditBalance,
        balanceAfter: operator.creditBalance - amount,
        description,
        referenceType,
        referenceId,
      },
    })
  })
}
```

---

## LLM Integration

### Internal Legal AI

```typescript
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const LEGAL_SYSTEM_PROMPT = `You are BotEsq's internal legal AI assistant. You provide accurate, well-reasoned legal information to assist licensed attorneys.

Guidelines:
1. Always cite relevant statutes, regulations, or case law when applicable
2. Clearly distinguish between established law and areas of legal uncertainty
3. Flag any conflicts of law or jurisdictional issues
4. Note when a question requires attorney review due to complexity
5. Never provide advice that could constitute unauthorized practice of law
6. Always recommend consulting with a licensed attorney for specific situations

Confidence scoring:
- 90-100%: Well-established law with clear precedent
- 70-89%: Generally accepted but may have exceptions
- 50-69%: Uncertain or evolving area of law
- Below 50%: Requires attorney review`

async function generateLegalResponse(
  question: string,
  jurisdiction?: string,
  context?: string
): Promise<LegalResponse> {
  const messages = [
    { role: 'system', content: LEGAL_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `
Question: ${question}
${jurisdiction ? `Jurisdiction: ${jurisdiction}` : ''}
${context ? `Context: ${context}` : ''}

Provide a response with:
1. Direct answer to the question
2. Relevant legal citations
3. Confidence score (0-100)
4. Whether attorney review is recommended
5. Suggested follow-up questions
`,
    },
  ]

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages,
    temperature: 0.3,
    max_tokens: 2048,
  })

  return parseLegalResponse(response.choices[0].message.content)
}
```

### Fallback Handling

```typescript
async function handleLLMRequest<T>(
  operation: () => Promise<T>,
  fallbackFn: () => Promise<T>
): Promise<T> {
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('LLM_TIMEOUT')), 30000)
    })

    return (await Promise.race([operation(), timeoutPromise])) as T
  } catch (error) {
    if (error.message === 'LLM_TIMEOUT' || isLLMError(error)) {
      console.error('LLM unavailable, falling back:', error)
      return fallbackFn()
    }
    throw error
  }
}

// Usage
const response = await handleLLMRequest(
  () => generateLegalResponse(question, jurisdiction),
  () => queueForHumanAttorney(question, jurisdiction)
)
```

---

## Provider Routing System

### Architecture Overview

The provider routing system enables BotEsq to act as a platform, routing requests to either internal resources or third-party legal service providers based on configurable rules.

```
┌─────────────────┐
│   AI Agent      │
│   Request       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Request Router │
│  ┌───────────┐  │
│  │ Routing   │  │
│  │ Rules     │  │
│  └───────────┘  │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│Internal│ │External│
│BotEsq │ │Provider│
│Service │ │  API   │
└────────┘ └────────┘
```

### Provider Interface Contract

All providers (including BotEsq internal) implement this interface:

```typescript
interface LegalServiceProvider {
  providerId: string

  // Capability check
  canHandle(request: ServiceRequest): Promise<boolean>

  // Get estimated cost and time
  getQuote(request: ServiceRequest): Promise<ServiceQuote>

  // Execute the service
  execute(request: ServiceRequest): Promise<ServiceResponse>

  // Check status of async request
  getStatus(requestId: string): Promise<RequestStatus>

  // Cancel a pending request
  cancel(requestId: string): Promise<void>
}

interface ServiceRequest {
  type: ProviderServiceType
  jurisdiction?: string
  matter?: Matter
  document?: Document
  question?: string
  context?: any
  urgency: 'low' | 'standard' | 'high' | 'urgent'
  operatorPreferences?: OperatorProviderPreference[]
}

interface ServiceQuote {
  providerId: string
  canHandle: boolean
  estimatedCredits: number
  estimatedMinutes: number
  confidence: number
  reason?: string // Why this provider is/isn't suitable
}

interface ServiceResponse {
  requestId: string
  status: 'completed' | 'pending' | 'failed'
  result?: any
  error?: string
  processingTime: number
  actualCredits: number
}
```

### Routing Service

```typescript
class ProviderRoutingService {
  private providers: Map<string, LegalServiceProvider> = new Map()

  // Register internal BotEsq provider
  constructor() {
    this.providers.set('botesq-internal', new BotEsqInternalProvider())
  }

  // Dynamic provider registration
  registerProvider(provider: LegalServiceProvider): void {
    this.providers.set(provider.providerId, provider)
  }

  async routeRequest(request: ServiceRequest): Promise<ServiceResponse> {
    // 1. Get quotes from all eligible providers
    const quotes = await this.getQuotes(request)

    // 2. Select best provider based on routing rules
    const selected = this.selectProvider(quotes, request)

    // 3. Create provider request record
    const providerRequest = await this.createProviderRequest(selected.providerId, request)

    // 4. Execute via selected provider
    try {
      const response = await selected.provider.execute(request)

      // 5. Record response and calculate settlement
      await this.recordCompletion(providerRequest, response)

      return response
    } catch (error) {
      // 6. Handle failure - try fallback if available
      return this.handleFailure(providerRequest, request, error)
    }
  }

  private async getQuotes(request: ServiceRequest): Promise<ProviderQuote[]> {
    const quotes: ProviderQuote[] = []

    for (const [id, provider] of this.providers) {
      if (await provider.canHandle(request)) {
        const quote = await provider.getQuote(request)
        quotes.push({ ...quote, provider })
      }
    }

    return quotes
  }

  private selectProvider(quotes: ProviderQuote[], request: ServiceRequest): ProviderQuote {
    // Apply routing rules in priority order

    // 1. Operator-specified provider preference
    if (request.operatorPreferences?.length) {
      const preferred = this.findPreferredProvider(quotes, request.operatorPreferences)
      if (preferred) return preferred
    }

    // 2. Filter by jurisdiction match
    const jurisdictionMatches = quotes.filter((q) => q.jurisdictionMatch === true)

    // 3. Filter by specialty match
    const specialtyMatches = jurisdictionMatches.filter((q) => q.specialtyMatch === true)

    // 4. Sort by availability, quality, then price
    const sorted = (specialtyMatches.length ? specialtyMatches : quotes).sort((a, b) => {
      // Prioritize availability
      if (a.estimatedMinutes !== b.estimatedMinutes) {
        return a.estimatedMinutes - b.estimatedMinutes
      }
      // Then quality score
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence
      }
      // Finally price
      return a.estimatedCredits - b.estimatedCredits
    })

    return sorted[0]
  }

  private async handleFailure(
    originalRequest: ProviderRequest,
    request: ServiceRequest,
    error: Error
  ): Promise<ServiceResponse> {
    // Mark original as failed
    await prisma.providerRequest.update({
      where: { id: originalRequest.id },
      data: { status: 'FAILED' },
    })

    // Try fallback to BotEsq internal
    if (originalRequest.providerId !== 'botesq-internal') {
      const internalProvider = this.providers.get('botesq-internal')
      if (internalProvider && (await internalProvider.canHandle(request))) {
        return this.routeToProvider(internalProvider, request, 'fallback')
      }
    }

    // No fallback available - queue for human
    return this.queueForHumanReview(request)
  }
}
```

### External Provider Adapter

For third-party providers using webhooks:

```typescript
class ExternalProviderAdapter implements LegalServiceProvider {
  constructor(private provider: Provider) {}

  async execute(request: ServiceRequest): Promise<ServiceResponse> {
    // Send request to provider's webhook
    const payload = this.formatPayload(request)
    const signature = this.signPayload(payload)

    const response = await fetch(this.provider.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BotEsq-Signature': signature,
        'X-BotEsq-Request-Id': request.id,
      },
      body: JSON.stringify(payload),
    })

    if (response.status === 202) {
      // Async processing - provider will call back
      return {
        requestId: request.id,
        status: 'pending',
        processingTime: 0,
        actualCredits: 0,
      }
    }

    // Sync response
    const result = await response.json()
    return this.parseResponse(result)
  }

  private signPayload(payload: any): string {
    const hmac = crypto.createHmac('sha256', this.provider.webhookSecret)
    hmac.update(JSON.stringify(payload))
    return hmac.digest('hex')
  }
}
```

### Provider Webhook Handler

```typescript
// Handle callbacks from external providers
async function handleProviderWebhook(
  providerId: string,
  signature: string,
  payload: ProviderWebhookPayload
): Promise<void> {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
  })

  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', provider.webhookSecret)
    .update(JSON.stringify(payload))
    .digest('hex')

  if (signature !== expectedSignature) {
    throw new AuthError('INVALID_SIGNATURE', 'Webhook signature invalid')
  }

  // Process the callback
  const request = await prisma.providerRequest.findUnique({
    where: { externalId: payload.requestId },
  })

  if (payload.event === 'request.completed') {
    await prisma.providerRequest.update({
      where: { id: request.id },
      data: {
        status: 'COMPLETED',
        responsePayload: payload.response,
        responseAt: new Date(),
        slaMet: new Date() <= request.slaDeadline,
      },
    })

    // Calculate and record settlement
    await recordProviderEarnings(request, payload.response)

    // Notify the original requester
    await notifyRequestComplete(request)
  }
}
```

### Revenue Sharing

```typescript
async function recordProviderEarnings(request: ProviderRequest, response: any): Promise<void> {
  const provider = await prisma.provider.findUnique({
    where: { id: request.providerId },
  })

  const totalCredits = request.creditsCharged
  const providerShare = Math.floor(totalCredits * (provider.revenueSharePct / 100))
  const platformShare = totalCredits - providerShare

  await prisma.providerRequest.update({
    where: { id: request.id },
    data: {
      providerEarnings: providerShare,
    },
  })

  // Provider earnings will be settled monthly via ProviderSettlement
}
```

---

## Audit Logging

```typescript
async function logAudit(
  actorType: AuditActorType,
  actorId: string | null,
  action: string,
  resourceType: string,
  resourceId: string | null,
  details?: object,
  request?: FastifyRequest
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorType,
      actorId,
      action,
      resourceType,
      resourceId,
      details: details ? JSON.stringify(details) : null,
      ipAddress: request?.ip,
      userAgent: request?.headers['user-agent'],
    },
  })
}

// Usage examples
await logAudit('AGENT', session.agentId, 'CREATE_MATTER', 'matter', matter.id, {
  type: matter.type,
  title: matter.title,
})

await logAudit('ATTORNEY', attorney.id, 'APPROVE_RESPONSE', 'consultation', consultationId, {
  responseLength: response.length,
  timeSpent: timeSpentMinutes,
})
```

---

## Error Codes

```typescript
const ERROR_CODES = {
  // Authentication
  INVALID_API_KEY: { status: 401, message: 'Invalid API key' },
  INVALID_SESSION: { status: 401, message: 'Invalid session token' },
  SESSION_EXPIRED: { status: 401, message: 'Session has expired' },
  API_KEY_REVOKED: { status: 401, message: 'API key has been revoked' },
  OPERATOR_SUSPENDED: { status: 403, message: 'Operator account is suspended' },

  // Authorization
  UNAUTHORIZED: { status: 403, message: 'Not authorized for this action' },
  RETAINER_REQUIRED: { status: 403, message: 'Retainer agreement required' },

  // Rate Limiting
  RATE_LIMITED: { status: 429, message: 'Rate limit exceeded' },

  // Resources
  MATTER_NOT_FOUND: { status: 404, message: 'Matter not found' },
  DOCUMENT_NOT_FOUND: { status: 404, message: 'Document not found' },
  CONSULTATION_NOT_FOUND: { status: 404, message: 'Consultation not found' },
  RETAINER_NOT_FOUND: { status: 404, message: 'Retainer not found' },

  // Payments
  INSUFFICIENT_CREDITS: { status: 402, message: 'Insufficient credits' },
  PAYMENT_FAILED: { status: 402, message: 'Payment processing failed' },

  // Validation
  VALIDATION_ERROR: { status: 400, message: 'Validation error' },
  INVALID_FILE_TYPE: { status: 400, message: 'Unsupported file type' },
  FILE_TOO_LARGE: { status: 400, message: 'File exceeds size limit' },

  // System
  LLM_UNAVAILABLE: { status: 503, message: 'AI service temporarily unavailable' },
  INTERNAL_ERROR: { status: 500, message: 'Internal server error' },
}
```

---

## Database Indexes

Key indexes for performance:

```sql
-- Sessions (high-frequency lookups)
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Matters (operator filtering)
CREATE INDEX idx_matters_operator_status ON matters(operator_id, status);
CREATE INDEX idx_matters_external_id ON matters(external_id);

-- Consultations (queue management)
CREATE INDEX idx_consultations_status_created ON consultations(status, created_at);

-- Audit logs (compliance queries)
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_type, actor_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Credit transactions (balance history)
CREATE INDEX idx_credits_operator_created ON credit_transactions(operator_id, created_at);
```

---

## Data Retention

| Data Type           | Retention Period | Reason            |
| ------------------- | ---------------- | ----------------- |
| Matter data         | 7 years          | Legal requirement |
| Documents           | 7 years          | Legal requirement |
| Audit logs          | 7 years          | Compliance        |
| Sessions            | 30 days          | Operational       |
| Credit transactions | 7 years          | Financial records |
| API request logs    | 90 days          | Debugging         |

---

## Stripe Integration

### Environment Variables

```bash
# Required for payments
STRIPE_SECRET_KEY=sk_live_...       # or sk_test_... for development
STRIPE_WEBHOOK_SECRET=whsec_...     # Webhook signing secret

# Payment flow URLs
STRIPE_SUCCESS_URL=https://botesq.com/portal/billing?success=true
STRIPE_CANCEL_URL=https://botesq.com/portal/billing?canceled=true
```

### Webhook Endpoint

**URL:** `https://botesq.com/api/webhooks/stripe`

**File:** `apps/web/app/api/webhooks/stripe/route.ts`

### Handled Events

| Event                        | Description                        | Action                          |
| ---------------------------- | ---------------------------------- | ------------------------------- |
| `checkout.session.completed` | Customer completes credit purchase | Add credits to operator balance |
| `checkout.session.expired`   | Checkout session times out         | Mark payment as failed          |
| `transfer.created`           | Provider payout initiated          | Confirm settlement as PAID      |
| `transfer.reversed`          | Payout reversed                    | Mark settlement as FAILED       |
| `transfer.updated`           | Transfer status changed            | Update settlement if reversed   |

### Stripe Dashboard Setup

1. Go to https://dashboard.stripe.com/webhooks
2. Click **+ Add endpoint**
3. Configure:
   - **Endpoint URL:** `https://botesq.com/api/webhooks/stripe`
   - **Events to send:**
     - `checkout.session.completed`
     - `checkout.session.expired`
     - `transfer.created`
     - `transfer.reversed`
     - `transfer.updated`
4. Click **Add endpoint**
5. Copy the **Signing secret** (`whsec_...`) to `STRIPE_WEBHOOK_SECRET`

### Local Development with Stripe CLI

```bash
# Install Stripe CLI
# macOS: brew install stripe/stripe-cli/stripe
# Linux: see https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# The CLI will output a signing secret like:
# > Ready! Your webhook signing secret is whsec_xxxxx
# Use this for local STRIPE_WEBHOOK_SECRET

# In another terminal, trigger test events
stripe trigger checkout.session.completed
stripe trigger transfer.created
```

### Webhook Security

The webhook handler:

1. Reads raw request body (not JSON parsed)
2. Verifies signature using `stripe.webhooks.constructEvent()`
3. Rejects requests with invalid signatures (400 error)
4. Processes events idempotently (safe to replay)

```typescript
// Signature verification (handled automatically)
const event = stripe.webhooks.constructEvent(
  body, // Raw request body
  signature, // stripe-signature header
  webhookSecret // STRIPE_WEBHOOK_SECRET
)
```

### Credit Purchase Flow

```
1. Operator clicks "Buy Credits" → POST /api/portal/credits/purchase
2. Server creates Stripe Checkout Session
3. Server creates Payment record (status: PENDING)
4. Operator redirected to Stripe Checkout
5. Operator completes payment
6. Stripe sends checkout.session.completed webhook
7. Webhook handler adds credits to operator
8. Payment record updated (status: COMPLETED)
```

### Settlement Payout Flow

```
1. Admin generates settlements → POST /api/admin/settlements
2. Admin processes payout → POST /api/admin/settlements/:id/process
3. Server creates Stripe Transfer to provider's Connect account
4. Settlement updated (status: PROCESSING)
5. Stripe sends transfer.created webhook
6. Settlement confirmed (status: PAID)

If transfer fails or is reversed:
7. Stripe sends transfer.reversed webhook
8. Settlement marked (status: FAILED)
9. Admin can retry via dashboard
```

---

## Operator Webhooks

BotEsq sends webhook notifications to operators when async events complete, enabling real-time updates to agent systems.

### Configuration

Operators configure webhooks via:

- **Portal:** Settings → Webhooks
- **API:** `PUT /api/operator/webhook`

### URL Requirements

| Protocol             | Allowed | Notes                                       |
| -------------------- | ------- | ------------------------------------------- |
| `https://`           | ✅ Yes  | Required for production                     |
| `http://localhost:*` | ✅ Yes  | Development only                            |
| `http://127.0.0.1:*` | ✅ Yes  | Development only                            |
| `http://[::1]:*`     | ✅ Yes  | Development only (IPv6 localhost)           |
| `http://*` (other)   | ❌ No   | Rejected - sensitive data must be encrypted |

### Webhook Events

| Event                         | Trigger                          | Data Included                                                      |
| ----------------------------- | -------------------------------- | ------------------------------------------------------------------ |
| `consultation.completed`      | Attorney submits response        | `consultation_id`, `response`, `attorney_reviewed`, `completed_at` |
| `consultation.failed`         | Consultation cannot be fulfilled | `consultation_id`, `reason`                                        |
| `document.analysis_completed` | Document analysis finishes       | `document_id`, `filename`, `analysis_status`                       |

### Webhook Payload Format

```json
{
  "event": "consultation.completed",
  "timestamp": "2026-02-04T12:34:56.789Z",
  "data": {
    "consultation_id": "CONS-ABC12345",
    "matter_id": "MTR-XYZ98765",
    "status": "completed",
    "question": "What are the requirements for...",
    "response": "Based on applicable law...",
    "attorney_reviewed": true,
    "completed_at": "2026-02-04T12:34:56.789Z"
  }
}
```

### Webhook Security

Webhooks are signed using HMAC-SHA256. Verify signatures to ensure authenticity:

```typescript
import crypto from 'crypto'

function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  // Reject old timestamps (> 5 minutes)
  const timestampAge = Date.now() / 1000 - parseInt(timestamp)
  if (timestampAge > 300) {
    return false
  }

  // Verify signature
  const signaturePayload = `${timestamp}.${payload}`
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex')

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
}

// Express/Node.js handler example
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-botesq-signature']
  const timestamp = req.headers['x-botesq-timestamp']
  const payload = JSON.stringify(req.body)

  if (!verifyWebhookSignature(payload, signature, timestamp, WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  const event = req.body
  switch (event.event) {
    case 'consultation.completed':
      // Notify agent that response is ready
      notifyAgent(event.data.consultation_id, event.data.response)
      break
  }

  res.json({ received: true })
})
```

### Webhook Headers

| Header               | Description                                   |
| -------------------- | --------------------------------------------- |
| `Content-Type`       | `application/json`                            |
| `X-BotEsq-Signature` | HMAC-SHA256 signature of `{timestamp}.{body}` |
| `X-BotEsq-Timestamp` | Unix timestamp when webhook was sent          |

### Delivery Behavior

- **Timeout:** 10 seconds
- **Retries:** Currently no automatic retries (operator should poll as fallback)
- **Failures:** Logged but don't affect the main operation

### API Endpoints

| Method | Endpoint                | Description               |
| ------ | ----------------------- | ------------------------- |
| `GET`  | `/api/operator/webhook` | Get webhook configuration |
| `PUT`  | `/api/operator/webhook` | Update webhook URL        |
| `POST` | `/api/operator/webhook` | Regenerate webhook secret |

### Agent Integration Example

```typescript
// Agent polls for consultation result OR receives webhook
async function handleConsultation(consultationId: string) {
  // Option 1: Poll (fallback)
  const result = await mcpClient.call('get_consultation_result', {
    session_token: sessionToken,
    consultation_id: consultationId,
  })

  if (result.data.status === 'completed') {
    return result.data.response
  }

  // Option 2: Wait for webhook notification
  // Your system receives POST to configured webhook URL
  // when consultation.completed event fires
}
```
