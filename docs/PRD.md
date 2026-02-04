# BotEsq Product Requirements Document

## Product Overview

**Product Name:** BotEsq
**Version:** 1.0.0
**Last Updated:** 2026-02-03

BotEsq is an MCP (Model Context Protocol) server that provides licensed legal services to AI agents. It enables AI agents to access real legal counsel on behalf of their human operators, with proper licensing, retainer agreements, and attorney oversight.

---

## Problem Statement

AI agents increasingly need to handle legal tasks for their human operators—reviewing contracts, answering compliance questions, navigating entity formation. Currently, agents either:

1. Hallucinate legal advice (dangerous)
2. Refuse to help (unhelpful)
3. Provide generic disclaimers (useless)

BotEsq solves this by giving AI agents access to licensed attorneys through a structured, API-first interface.

---

## Target Users

### Primary: AI Agents

- Autonomous agents operating on behalf of humans
- Agents integrated via MCP protocol
- Examples: personal assistants, business automation agents, developer tools

### Secondary: Operators

- Humans or companies deploying AI agents
- Responsible for billing, authorization, and matter oversight
- Register via Operator Portal

### Tertiary: Attorneys

- Licensed attorneys providing legal services
- Review AI-generated responses
- Handle complex matters requiring human judgment

---

## Features

### FEAT-001: MCP Server Core

**Priority:** P0
**Status:** Not Started

**Description:**
Core MCP server implementation exposing legal services as tools to AI agents.

**User Stories:**

- As an AI agent, I can discover BotEsq through the MCP registry
- As an AI agent, I can connect to BotEsq using standard MCP protocols
- As an AI agent, I can call BotEsq tools and receive structured responses

**Acceptance Criteria:**

- [ ] Server implements MCP SDK specification
- [ ] Server registers with MCP registry
- [ ] All 16 tools are exposed and callable
- [ ] All 5 prompts are available
- [ ] Server handles concurrent connections (minimum 100)
- [ ] Response times under 2 seconds for synchronous operations
- [ ] Graceful error handling with structured error responses

**MCP Tools:**

```
ask_legal_question      # Instant Q&A, returns answer + disclaimer
start_session           # Initialize authenticated session, returns token
get_session_info        # Check session status, credits, active matters
create_matter           # Open new legal matter (triggers retainer if needed)
get_matter_status       # Check status of existing matter
list_matters            # List all matters for this agent/operator
submit_document         # Upload document for review
get_document_analysis   # Retrieve analysis of submitted document
request_consultation    # Request async attorney consultation
get_consultation_result # Retrieve consultation response
get_retainer_terms      # Retrieve retainer agreement for review
accept_retainer         # Accept retainer (if pre-authorized)
check_credits           # Check credit balance
add_credits             # Initiate credit purchase (returns payment URL)
list_services           # List available services and pricing
get_disclaimers         # Get current legal disclaimers
```

**MCP Prompts:**

```
contract_review         # Template for contract review requests
entity_formation        # Template for business entity questions
compliance_check        # Template for regulatory compliance queries
ip_question             # Template for intellectual property questions
general_legal           # General legal question template
```

---

### FEAT-002: Agent Authentication & Sessions

**Priority:** P0
**Status:** Not Started

**Description:**
Secure authentication system for AI agents connecting to BotEsq.

**User Stories:**

- As an AI agent, I can authenticate using an API key
- As an AI agent, I can maintain a session across multiple requests
- As an AI agent, I can see my session status and remaining credits

**Acceptance Criteria:**

- [ ] API keys issued per operator (not per agent)
- [ ] Session tokens valid for 24 hours
- [ ] Session tokens rotate on each request (sliding window)
- [ ] Rate limiting enforced per session
- [ ] Sessions track: operator_id, agent_id, credits_used, active_matters
- [ ] Invalid sessions return 401 with clear error message
- [ ] Session info available via `get_session_info` tool

**Rate Limits:**

- 10 requests per minute per session
- 100 requests per hour per session
- 5 concurrent matters per session
- 20 document uploads per day per operator

---

### FEAT-003: Credit System & Payments

**Priority:** P0
**Status:** Not Started

**Description:**
Credit-based payment system for all BotEsq services.

**User Stories:**

- As an operator, I can purchase credits via Stripe
- As an AI agent, I can check my operator's credit balance
- As an AI agent, I can see the credit cost before initiating a request
- As an operator, I can set credit alerts and auto-reload thresholds

**Acceptance Criteria:**

- [ ] Credits mapped 1:1 to USD cents ($1.00 = 100 credits)
- [ ] All service costs deducted in credits
- [ ] Pre-flight credit check before expensive operations
- [ ] Failed operations refund credits
- [ ] Credit history maintained with full audit trail
- [ ] Low-credit warnings at 10% and 5% thresholds
- [ ] Auto-reload optional (requires Stripe payment method on file)

**Pricing Structure:**
| Service | Credit Cost | Notes |
|---------|-------------|-------|
| ask_legal_question | 200-1000 | Based on complexity |
| submit_document | 2500-10000 | Based on page count |
| request_consultation | 5000+ | Minimum, complexity-based |
| create_matter | 10000 | One-time setup fee |

---

### FEAT-004: Matter Management

**Priority:** P0
**Status:** Not Started

**Description:**
Legal matter lifecycle management for ongoing legal engagements.

**User Stories:**

- As an AI agent, I can create a new legal matter for my operator
- As an AI agent, I can track the status of existing matters
- As an AI agent, I can communicate within a matter context
- As an operator, I can view all matters in my portal

**Acceptance Criteria:**

- [ ] Matters have unique IDs (MATTER-XXXXXX format)
- [ ] Matters track: type, status, created_at, updated_at, messages
- [ ] Matter statuses: pending_retainer, active, on_hold, resolved, closed
- [ ] Matters require accepted retainer before work begins
- [ ] Matter messages preserve full conversation history
- [ ] Matters linked to specific operator and optionally to agent

**Matter Types:**

- contract_review
- entity_formation
- compliance
- ip_trademark
- ip_copyright
- general_consultation
- litigation_consultation

---

### FEAT-005: Retainer Agreement Flow

**Priority:** P0
**Status:** Not Started

**Description:**
Electronic retainer agreement system for establishing attorney-client relationships.

**User Stories:**

- As an AI agent, I can retrieve retainer terms for my operator to review
- As an AI agent, I can accept a retainer if my operator has pre-authorized
- As an operator, I can pre-authorize my agents to accept retainers
- As an operator, I can review and sign retainers manually if preferred

**Acceptance Criteria:**

- [ ] Retainer terms returned as structured document
- [ ] Retainers include: scope, fee structure, conflict check, engagement letter
- [ ] Pre-authorization tokens issued via Operator Portal
- [ ] Pre-auth tokens are matter-type specific or blanket
- [ ] Manual signing via unique URL with e-signature
- [ ] Signed retainers stored with timestamp and IP
- [ ] Retainers reference specific matter ID

**Retainer Fields:**

- operator_id
- matter_id
- scope_of_representation
- fee_arrangement (hourly, flat, contingent)
- estimated_cost_range
- conflict_disclosure
- accepted_at
- accepted_by (agent or operator)
- signature_method (pre_auth, click_through, manual)

---

### FEAT-006: Legal Q&A (Instant)

**Priority:** P0
**Status:** Not Started

**Description:**
Instant legal question answering with AI-generated responses reviewed for common patterns.

**User Stories:**

- As an AI agent, I can ask a legal question and get an instant response
- As an AI agent, I receive appropriate disclaimers with every response
- As an AI agent, I can understand when a question needs human review

**Acceptance Criteria:**

- [ ] Responses generated by Internal Legal AI (FEAT-009)
- [ ] All responses include jurisdiction disclaimer
- [ ] All responses include "not legal advice" disclaimer
- [ ] Complex questions flagged for human review
- [ ] Response includes confidence score
- [ ] Response includes suggested follow-up questions
- [ ] Response time under 5 seconds for 95th percentile

**Complexity Routing:**
| Complexity | Handling | Credits |
|------------|----------|---------|
| Simple | AI instant | 200 |
| Moderate | AI with review queue | 500 |
| Complex | Queued for attorney | 1000+ |

---

### FEAT-007: Async Consultation Requests

**Priority:** P0
**Status:** Not Started

**Description:**
Asynchronous consultation requests for complex legal questions requiring attorney review.

**User Stories:**

- As an AI agent, I can submit a consultation request for complex matters
- As an AI agent, I can check the status of pending consultations
- As an AI agent, I receive a webhook or can poll for results

**Acceptance Criteria:**

- [ ] Consultation requests queued for attorney review
- [ ] Estimated wait time provided at submission
- [ ] Status updates: queued, in_review, needs_info, completed
- [ ] Completed consultations retrievable via `get_consultation_result`
- [ ] Webhook notification optional (operator configures endpoint)
- [ ] SLA: 4 hours for urgent, 24 hours for standard, 72 hours for complex

---

### FEAT-008: Document Upload & Review

**Priority:** P1
**Status:** Not Started

**Description:**
Document upload and analysis system for contract review and document-based legal work.

**User Stories:**

- As an AI agent, I can upload a document for legal review
- As an AI agent, I can retrieve the analysis of an uploaded document
- As an operator, I can view all documents in my portal

**Acceptance Criteria:**

- [ ] Supported formats: PDF, DOCX, TXT, MD
- [ ] Maximum file size: 50MB
- [ ] Documents stored in S3 with encryption at rest
- [ ] Document analysis includes: summary, key terms, risks, recommendations
- [ ] Documents linked to matters when applicable
- [ ] Document retention: 7 years (legal requirement)
- [ ] Documents deletable only by operator (soft delete)

**Document Analysis Output:**

```json
{
  "document_id": "DOC-XXXXXX",
  "filename": "contract.pdf",
  "page_count": 12,
  "analysis": {
    "summary": "...",
    "document_type": "services_agreement",
    "key_terms": [...],
    "identified_risks": [...],
    "recommendations": [...],
    "missing_clauses": [...]
  },
  "confidence_score": 0.87,
  "attorney_review_recommended": true,
  "disclaimers": [...]
}
```

---

### FEAT-009: Internal Legal AI Agent

**Priority:** P0
**Status:** Not Started

**Description:**
Internal AI system that powers legal analysis, document review, and Q&A responses.

**User Stories:**

- As the system, I can generate accurate legal responses using LLM
- As the system, I can gracefully degrade when LLM is unavailable
- As an attorney, I can review and approve AI-generated responses

**Acceptance Criteria:**

- [ ] Primary LLM: OpenAI GPT-4 Turbo
- [ ] System prompts encode legal reasoning patterns
- [ ] Responses cite relevant statutes and case law when applicable
- [ ] Hallucination detection via confidence scoring
- [ ] Low-confidence responses auto-queued for human review
- [ ] Fallback behavior: queue for human when LLM unavailable
- [ ] Response templates ensure consistent formatting
- [ ] All responses logged for audit trail

**Fallback Behavior:**

1. Primary LLM timeout (30s) → retry once
2. Second timeout → queue for human attorney
3. Return to agent: estimated wait time + status check endpoint
4. Send webhook when human response ready

---

### FEAT-010: Attorney Dashboard

**Priority:** P0
**Status:** Not Started

**Description:**
Web dashboard for attorneys to review, respond to, and manage legal matters.

**User Stories:**

- As an attorney, I can log in and see my queue of pending matters
- As an attorney, I can review AI-generated responses before approval
- As an attorney, I can draft and send responses to consultation requests
- As an attorney, I can escalate matters to senior attorneys

**Acceptance Criteria:**

- [ ] Attorney authentication via email + password + 2FA
- [ ] Queue view shows: matter ID, type, priority, wait time, complexity score
- [ ] Matter detail view shows: full history, documents, AI draft
- [ ] Response editor with legal formatting tools
- [ ] Approval workflow: review → edit → approve → send
- [ ] Time tracking per matter for billing
- [ ] Attorney workload dashboard
- [ ] Reassignment capability

**Queue Prioritization:**

1. Urgent (flagged by agent or operator)
2. SLA at risk (approaching deadline)
3. High complexity (AI low confidence)
4. Standard FIFO

---

### FEAT-011: Operator Portal

**Priority:** P1
**Status:** Not Started

**Description:**
Self-service portal for operators to manage their BotEsq integration.

**User Stories:**

- As an operator, I can register and create my account
- As an operator, I can generate and manage API keys
- As an operator, I can view and manage my matters
- As an operator, I can purchase credits and view billing history

**Acceptance Criteria:**

- [ ] Registration with email verification
- [ ] Company profile management
- [ ] API key generation (up to 5 active keys)
- [ ] API key rotation without downtime
- [ ] Matter list with filtering and search
- [ ] Document library view
- [ ] Credit purchase via Stripe
- [ ] Billing history and invoices
- [ ] Pre-authorization token management
- [ ] Webhook configuration

---

### FEAT-012: Admin Dashboard

**Priority:** P0
**Status:** Not Started

**Description:**
Administrative dashboard for BotEsq operations team.

**User Stories:**

- As an admin, I can view all operators, agents, and matters
- As an admin, I can manage attorney accounts
- As an admin, I can view system health and metrics
- As an admin, I can handle escalations and disputes

**Acceptance Criteria:**

- [ ] Admin authentication with role-based access
- [ ] Operator management: view, suspend, delete
- [ ] Attorney management: create, assign, deactivate
- [ ] Matter oversight: view any matter, reassign, close
- [ ] Financial dashboard: revenue, credits, refunds
- [ ] System metrics: uptime, response times, queue depth
- [ ] Audit log viewer with filtering
- [ ] Dispute resolution workflow

---

### FEAT-013: Billing & Invoicing

**Priority:** P1
**Status:** Not Started

**Description:**
Automated billing system for operator accounts.

**User Stories:**

- As an operator, I can view my credit usage history
- As an operator, I can download invoices for my records
- As an operator, I can set up automatic billing

**Acceptance Criteria:**

- [ ] Monthly invoices generated automatically
- [ ] Invoice includes: credit purchases, service usage, matter details
- [ ] Invoices downloadable as PDF
- [ ] Stripe integration for recurring billing
- [ ] Credit top-up with minimum amounts
- [ ] Refund processing within 48 hours
- [ ] Invoice sent via email

---

### FEAT-014: Marketing Website

**Priority:** P1
**Status:** Not Started

**Description:**
Public-facing marketing website for BotEsq.

**User Stories:**

- As a potential operator, I can learn about BotEsq services
- As a potential operator, I can view pricing information
- As a potential operator, I can sign up for an account

**Acceptance Criteria:**

- [ ] Landing page with value proposition
- [ ] Feature overview with use cases
- [ ] Pricing page with calculator
- [ ] Documentation section
- [ ] Sign-up flow leading to Operator Portal
- [ ] Contact form
- [ ] Legal pages: Terms of Service, Privacy Policy
- [ ] Mobile-responsive design

---

### FEAT-015: API Documentation

**Priority:** P0
**Status:** Not Started

**Description:**
Comprehensive documentation for BotEsq MCP tools and REST API.

**User Stories:**

- As a developer, I can understand how to integrate BotEsq
- As a developer, I can find examples for every tool
- As a developer, I can troubleshoot issues using docs

**Acceptance Criteria:**

- [ ] MCP tool reference with all parameters
- [ ] Request/response examples for every tool
- [ ] Error code reference
- [ ] Authentication guide
- [ ] Rate limiting documentation
- [ ] Webhook integration guide
- [ ] SDK examples (Python, TypeScript)
- [ ] Quickstart guide
- [ ] Interactive API explorer (if feasible)

---

## Non-Functional Requirements

### Security

- All data encrypted in transit (TLS 1.3)
- All data encrypted at rest (AES-256)
- API keys hashed with bcrypt
- Session tokens use cryptographically secure random generation
- Attorney-client privilege protections enforced
- GDPR and CCPA compliance
- SOC 2 Type II certification roadmap

### Performance

- API response time: < 2 seconds (p95)
- LLM response time: < 5 seconds (p95)
- Uptime target: 99.9%
- Concurrent connections: 1000+

### Scalability

- Horizontal scaling via EC2 Auto Scaling Groups
- Database read replicas for query distribution
- Queue-based async processing for heavy operations

### Compliance

- Legal compliance with bar rules (jurisdiction-specific)
- Attorney supervision requirements maintained
- Unauthorized practice of law (UPL) guardrails
- Record retention per legal requirements (7 years)

---

## Success Metrics

| Metric                | Target         | Measurement                  |
| --------------------- | -------------- | ---------------------------- |
| Active Operators      | 100 in Y1      | Monthly count                |
| Monthly Active Agents | 1,000 in Y1    | Unique agent sessions        |
| Revenue               | $50K MRR in Y1 | Stripe dashboard             |
| Response Accuracy     | 95%+           | Attorney review sampling     |
| Agent Satisfaction    | 4.5+ rating    | Post-interaction survey      |
| Attorney Efficiency   | 3x throughput  | Matters per attorney per day |

---

---

### FEAT-016: Provider Integration Framework

**Priority:** P1
**Status:** Not Started

**Description:**
Extensible architecture allowing third-party legal service providers to integrate with BotEsq and offer services through the platform.

**User Stories:**

- As a third-party legal provider, I can register my services on BotEsq
- As a third-party legal provider, I can receive and respond to legal requests
- As an operator, I can choose which providers handle my matters
- As an operator, I can see a marketplace of available legal providers
- As an AI agent, I can specify provider preferences for requests

**Acceptance Criteria:**

- [ ] Provider registration and onboarding flow
- [ ] Standardized Provider API specification
- [ ] Provider service catalog with capabilities
- [ ] Request routing based on jurisdiction, specialty, availability
- [ ] Provider quality scoring and reviews
- [ ] Revenue sharing and settlement system
- [ ] Provider dashboard for managing services
- [ ] Operator provider selection and preferences
- [ ] SLA enforcement across providers
- [ ] Fallback routing when primary provider unavailable

**Provider API Contract:**

```typescript
interface ProviderCapabilities {
  provider_id: string
  name: string
  jurisdictions: string[]
  specialties: MatterType[]
  services: ServiceOffering[]
  sla_tiers: SLATier[]
  pricing: PricingModel
}

interface ServiceOffering {
  service_type: string // 'legal_qa', 'document_review', 'consultation'
  enabled: boolean
  capacity: number // concurrent requests
  avg_response_time: number
}

interface ProviderWebhook {
  event: 'request.new' | 'request.updated' | 'request.cancelled'
  payload: RequestPayload
  signature: string // HMAC signature for verification
}
```

**Routing Logic:**
| Priority | Criteria |
|----------|----------|
| 1 | Operator-specified provider preference |
| 2 | Jurisdiction match |
| 3 | Specialty match |
| 4 | Current availability/capacity |
| 5 | Quality score |
| 6 | Price (if operator has preference) |

---

### FEAT-017: Provider Marketplace

**Priority:** P2
**Status:** Not Started

**Description:**
Marketplace where operators can discover, compare, and enable third-party legal service providers.

**User Stories:**

- As an operator, I can browse available legal providers
- As an operator, I can compare provider pricing and specialties
- As an operator, I can read reviews from other operators
- As an operator, I can enable/disable providers for my account

**Acceptance Criteria:**

- [ ] Provider directory with search and filtering
- [ ] Provider profile pages with capabilities
- [ ] Pricing comparison tools
- [ ] Review and rating system
- [ ] One-click provider enablement
- [ ] Provider performance metrics visibility

---

## Out of Scope (V1)

- Multi-language support (English only)
- International jurisdictions (US only initially)
- Real-time chat interface
- Native mobile apps
- White-label solutions
- On-premise deployment

---

## Dependencies

| Dependency   | Type           | Status    |
| ------------ | -------------- | --------- |
| OpenAI API   | External       | Available |
| Stripe       | External       | Available |
| AWS EC2      | Infrastructure | Available |
| AWS S3       | Infrastructure | Available |
| PostgreSQL   | Database       | Available |
| MCP Registry | External       | Available |

---

## Risks & Mitigations

| Risk                  | Impact   | Likelihood | Mitigation                                |
| --------------------- | -------- | ---------- | ----------------------------------------- |
| LLM outage            | High     | Medium     | Queue fallback to human attorneys         |
| Bar compliance issues | High     | Low        | Attorney review of all substantive advice |
| Data breach           | Critical | Low        | Encryption, access controls, auditing     |
| UPL claims            | High     | Low        | Clear disclaimers, attorney supervision   |
| Stripe downtime       | Medium   | Low        | Maintain credit buffer, manual processing |

---

## Glossary

| Term     | Definition                                          |
| -------- | --------------------------------------------------- |
| Agent    | AI system connecting to BotEsq via MCP              |
| Operator | Human or company deploying an AI agent              |
| Matter   | Legal engagement with defined scope                 |
| Retainer | Agreement establishing attorney-client relationship |
| Credits  | Internal currency (100 credits = $1.00 USD)         |
| MCP      | Model Context Protocol                              |
| UPL      | Unauthorized Practice of Law                        |
