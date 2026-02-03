# BotEsq Application Flow

## Overview

This document defines every user journey, screen, and interaction flow in BotEsq. Three primary user types interact with the system: AI Agents (via MCP), Operators (via web portal), and Attorneys (via dashboard).

---

## Agent Journeys (MCP Interface)

### AJ-001: Discovery & Connection

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  MCP Registry   │────▶│  Discover       │────▶│  Connect to     │
│  Lookup         │     │  BotEsq        │     │  BotEsq MCP    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │  List Available │
                                               │  Tools/Prompts  │
                                               └─────────────────┘
```

**Flow:**
1. Agent queries MCP registry for legal services
2. Registry returns BotEsq server entry with connection details
3. Agent connects to BotEsq MCP server
4. BotEsq returns available tools and prompts
5. Agent is ready to call tools

**Data Requirements:**
- MCP server URL
- Server capabilities manifest
- Tool schemas (JSON Schema format)
- Prompt templates

**Error States:**
- Registry unavailable → Retry with exponential backoff
- BotEsq server unavailable → Return service unavailable error
- Invalid MCP version → Return version mismatch error

---

### AJ-002: Session Establishment

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Call           │────▶│  Validate       │────▶│  Create         │
│  start_session  │     │  API Key        │     │  Session        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       ▼                       ▼
        │               ┌─────────────────┐     ┌─────────────────┐
        │               │  Invalid Key    │     │  Return Token   │
        │               │  Error 401      │     │  + Session Info │
        │               └─────────────────┘     └─────────────────┘
```

**Request:**
```json
{
  "tool": "start_session",
  "arguments": {
    "api_key": "mlaw_live_xxxxxxxxxxxx",
    "agent_identifier": "optional-agent-name"
  }
}
```

**Response (Success):**
```json
{
  "session_token": "sess_xxxxxxxxxxxxxxxx",
  "expires_at": "2026-02-04T12:00:00Z",
  "operator": {
    "id": "OP-123456",
    "name": "Acme Corp"
  },
  "credits": {
    "balance": 50000,
    "currency": "credits"
  },
  "rate_limits": {
    "requests_per_minute": 10,
    "requests_per_hour": 100
  }
}
```

**Response (Error):**
```json
{
  "error": {
    "code": "INVALID_API_KEY",
    "message": "The provided API key is invalid or revoked",
    "status": 401
  }
}
```

---

### AJ-003: Simple Q&A Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Call           │────▶│  Check          │────▶│  Route by       │
│  ask_legal_     │     │  Credits        │     │  Complexity     │
│  question       │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │                       │
                                ▼                       ▼
                        ┌───────────────┐       ┌───────────────────┐
                        │ Insufficient  │       │ Simple: AI        │
                        │ Credits Error │       │ Moderate: AI+Queue│
                        └───────────────┘       │ Complex: Queue    │
                                                └───────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Return Answer  │
                                                │  + Disclaimers  │
                                                └─────────────────┘
```

**Request:**
```json
{
  "tool": "ask_legal_question",
  "arguments": {
    "session_token": "sess_xxxxxxxxxxxxxxxx",
    "question": "Can an LLC have a single member?",
    "jurisdiction": "Delaware",
    "context": "Starting a software consulting business"
  }
}
```

**Response (Instant):**
```json
{
  "answer_id": "ANS-123456",
  "answer": "Yes, Delaware allows single-member LLCs...",
  "confidence_score": 0.94,
  "complexity": "simple",
  "processing": "instant",
  "citations": [
    {
      "source": "Delaware Limited Liability Company Act",
      "section": "18-101(6)"
    }
  ],
  "suggested_followups": [
    "What are the tax implications of a single-member LLC?",
    "Should I elect S-corp taxation for my LLC?"
  ],
  "disclaimers": [
    "This information is for educational purposes only and does not constitute legal advice.",
    "Laws vary by jurisdiction. Consult a licensed attorney for advice specific to your situation."
  ],
  "credits_used": 200,
  "credits_remaining": 49800
}
```

**Response (Queued):**
```json
{
  "answer_id": "ANS-123457",
  "status": "queued",
  "complexity": "complex",
  "processing": "async",
  "estimated_wait_minutes": 45,
  "message": "Your question requires attorney review. Check status using get_consultation_result.",
  "credits_used": 1000,
  "credits_remaining": 48800
}
```

---

### AJ-004: Matter Creation Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Call           │────▶│  Check for      │────▶│  Has Active     │
│  create_matter  │     │  Existing       │     │  Retainer?      │
└─────────────────┘     │  Retainer       │     └─────────────────┘
                        └─────────────────┘             │
                                                ┌───────┴───────┐
                                                ▼               ▼
                                        ┌───────────┐   ┌───────────────┐
                                        │   Yes     │   │     No        │
                                        └───────────┘   └───────────────┘
                                                │               │
                                                ▼               ▼
                                        ┌───────────┐   ┌───────────────┐
                                        │  Create   │   │  Return       │
                                        │  Matter   │   │  Retainer     │
                                        └───────────┘   │  Required     │
                                                │       └───────────────┘
                                                ▼               │
                                        ┌───────────┐           ▼
                                        │  Return   │   ┌───────────────┐
                                        │ Matter ID │   │  Call         │
                                        └───────────┘   │ get_retainer_ │
                                                        │ terms         │
                                                        └───────────────┘
```

**Request:**
```json
{
  "tool": "create_matter",
  "arguments": {
    "session_token": "sess_xxxxxxxxxxxxxxxx",
    "matter_type": "contract_review",
    "title": "SaaS Vendor Agreement Review",
    "description": "Need review of software licensing agreement with AWS",
    "urgency": "standard"
  }
}
```

**Response (Has Retainer):**
```json
{
  "matter_id": "MATTER-789012",
  "status": "active",
  "type": "contract_review",
  "title": "SaaS Vendor Agreement Review",
  "created_at": "2026-02-03T15:30:00Z",
  "retainer": {
    "id": "RET-456789",
    "status": "active"
  },
  "next_steps": [
    "Upload the contract using submit_document",
    "Provide any specific concerns or questions"
  ],
  "credits_used": 10000,
  "credits_remaining": 38800
}
```

**Response (Needs Retainer):**
```json
{
  "matter_id": "MATTER-789013",
  "status": "pending_retainer",
  "type": "contract_review",
  "title": "SaaS Vendor Agreement Review",
  "retainer_required": true,
  "message": "A retainer agreement must be accepted before work can begin.",
  "next_steps": [
    "Call get_retainer_terms to retrieve the agreement",
    "Have operator review and accept, or use pre-authorization"
  ],
  "credits_used": 0
}
```

---

### AJ-005: Retainer Acceptance Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Call           │────▶│  Generate       │────▶│  Return         │
│  get_retainer_  │     │  Retainer       │     │  Terms          │
│  terms          │     │  Document       │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Agent/Operator │
                                                │  Reviews Terms  │
                                                └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Call           │
                                                │  accept_retainer│
                                                └─────────────────┘
                                                        │
                                        ┌───────────────┴───────────────┐
                                        ▼                               ▼
                                ┌───────────────┐               ┌───────────────┐
                                │ Pre-Auth      │               │ No Pre-Auth   │
                                │ Token Valid   │               │               │
                                └───────────────┘               └───────────────┘
                                        │                               │
                                        ▼                               ▼
                                ┌───────────────┐               ┌───────────────┐
                                │ Retainer      │               │ Return Manual │
                                │ Accepted      │               │ Signing URL   │
                                └───────────────┘               └───────────────┘
```

**get_retainer_terms Request:**
```json
{
  "tool": "get_retainer_terms",
  "arguments": {
    "session_token": "sess_xxxxxxxxxxxxxxxx",
    "matter_id": "MATTER-789013"
  }
}
```

**get_retainer_terms Response:**
```json
{
  "retainer_id": "RET-456790",
  "matter_id": "MATTER-789013",
  "terms": {
    "client_name": "{{operator.name}}",
    "attorney_name": "BotEsq PLLC",
    "scope": "Review and analysis of SaaS vendor agreement",
    "fee_arrangement": "flat_fee",
    "estimated_fee": 25000,
    "fee_currency": "credits",
    "conflict_check": "No conflicts identified",
    "engagement_terms": "Standard engagement terms apply..."
  },
  "acceptance_methods": {
    "pre_auth_available": true,
    "manual_signing_url": "https://botesq.io/sign/RET-456790"
  },
  "expires_at": "2026-02-10T15:30:00Z"
}
```

**accept_retainer Request (Pre-Auth):**
```json
{
  "tool": "accept_retainer",
  "arguments": {
    "session_token": "sess_xxxxxxxxxxxxxxxx",
    "retainer_id": "RET-456790",
    "pre_auth_token": "preauth_xxxxxxxxxxxxxxxx"
  }
}
```

**accept_retainer Response:**
```json
{
  "retainer_id": "RET-456790",
  "status": "accepted",
  "accepted_at": "2026-02-03T15:45:00Z",
  "accepted_by": "agent_preauth",
  "matter": {
    "id": "MATTER-789013",
    "status": "active"
  },
  "message": "Retainer accepted. Matter is now active.",
  "next_steps": [
    "Upload documents using submit_document",
    "Add context via matter messages"
  ]
}
```

---

### AJ-006: Document Upload & Review Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Call           │────▶│  Validate       │────▶│  Upload to      │
│  submit_        │     │  File           │     │  S3             │
│  document       │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Queue for      │
                                                │  Analysis       │
                                                └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Return         │
                                                │  Document ID    │
                                                └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Poll           │
                                                │  get_document_  │
                                                │  analysis       │
                                                └─────────────────┘
```

**submit_document Request:**
```json
{
  "tool": "submit_document",
  "arguments": {
    "session_token": "sess_xxxxxxxxxxxxxxxx",
    "matter_id": "MATTER-789013",
    "filename": "aws_enterprise_agreement.pdf",
    "content_base64": "JVBERi0xLjQK...",
    "document_type": "contract",
    "notes": "Primary agreement to review, focus on liability clauses"
  }
}
```

**submit_document Response:**
```json
{
  "document_id": "DOC-345678",
  "matter_id": "MATTER-789013",
  "filename": "aws_enterprise_agreement.pdf",
  "status": "processing",
  "page_count": 24,
  "estimated_analysis_minutes": 5,
  "credits_used": 5000,
  "credits_remaining": 33800
}
```

**get_document_analysis Response:**
```json
{
  "document_id": "DOC-345678",
  "status": "complete",
  "analysis": {
    "summary": "Enterprise software licensing agreement with AWS...",
    "document_type": "enterprise_software_license",
    "parties": [
      {"role": "licensor", "name": "Amazon Web Services, Inc."},
      {"role": "licensee", "name": "Acme Corp"}
    ],
    "key_terms": [
      {"term": "License Grant", "summary": "Non-exclusive, worldwide license..."},
      {"term": "Payment Terms", "summary": "Monthly in arrears, NET 30..."},
      {"term": "Term", "summary": "36 months with auto-renewal..."}
    ],
    "identified_risks": [
      {
        "severity": "high",
        "clause": "Section 8.2 - Limitation of Liability",
        "issue": "Excludes all consequential damages with no cap",
        "recommendation": "Negotiate liability cap of at least 12 months fees"
      },
      {
        "severity": "medium",
        "clause": "Section 12.1 - Auto-Renewal",
        "issue": "60-day notice required for non-renewal",
        "recommendation": "Calendar reminder 90 days before renewal date"
      }
    ],
    "missing_clauses": [
      "Data protection addendum (GDPR/CCPA)",
      "SLA with uptime guarantees"
    ],
    "recommendations": [
      "Request DPA before signing",
      "Negotiate liability cap",
      "Confirm SLA terms separately"
    ]
  },
  "confidence_score": 0.89,
  "attorney_review_recommended": true,
  "disclaimers": [...]
}
```

---

### AJ-007: Credit Management Flow

```
┌─────────────────┐     ┌─────────────────┐
│  Call           │────▶│  Return         │
│  check_credits  │     │  Balance Info   │
└─────────────────┘     └─────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Call           │────▶│  Create Stripe  │────▶│  Return         │
│  add_credits    │     │  Checkout       │     │  Payment URL    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**check_credits Response:**
```json
{
  "balance": 33800,
  "currency": "credits",
  "usd_equivalent": 338.00,
  "low_balance_warning": false,
  "usage_this_month": 16200,
  "top_services": [
    {"service": "document_review", "credits": 10000},
    {"service": "legal_questions", "credits": 4200},
    {"service": "matter_creation", "credits": 2000}
  ]
}
```

**add_credits Request:**
```json
{
  "tool": "add_credits",
  "arguments": {
    "session_token": "sess_xxxxxxxxxxxxxxxx",
    "amount_usd": 100
  }
}
```

**add_credits Response:**
```json
{
  "payment_url": "https://checkout.stripe.com/pay/cs_xxx",
  "amount_usd": 100,
  "credits_to_add": 10000,
  "expires_at": "2026-02-03T16:30:00Z",
  "message": "Complete payment at the provided URL. Credits will be added automatically."
}
```

---

## Operator Portal Journeys

### OP-001: Registration & Onboarding

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Landing Page   │────▶│  Sign Up Form   │────▶│  Email          │
│  "Get Started"  │     │                 │     │  Verification   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Company        │
                                                │  Profile Setup  │
                                                └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Terms of       │
                                                │  Service Accept │
                                                └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Initial Credit │
                                                │  Purchase       │
                                                └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  API Key        │
                                                │  Generated      │
                                                └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Dashboard      │
                                                │  Quickstart     │
                                                └─────────────────┘
```

**Screens:**

1. **Sign Up Form**
   - Email address (required)
   - Password (min 12 chars, complexity requirements)
   - Company name (required)
   - Accept marketing emails (optional)

2. **Email Verification**
   - Verification email sent
   - 6-digit code entry
   - Resend option (rate limited)

3. **Company Profile**
   - Legal company name
   - Business type (LLC, Corp, Sole Prop, etc.)
   - Primary jurisdiction (US state)
   - Contact phone (optional)
   - Billing address

4. **Terms of Service**
   - Scrollable TOS document
   - Checkbox: "I have read and agree..."
   - Accept button

5. **Initial Credit Purchase**
   - Recommended: $100 (10,000 credits)
   - Credit packages: $50, $100, $250, $500, $1000
   - Stripe checkout integration
   - Skip option (can purchase later)

6. **API Key Generated**
   - Display API key once (copy button)
   - Warning: "Save this key, it won't be shown again"
   - Regenerate option available in settings

7. **Dashboard Quickstart**
   - Integration code snippets
   - Link to documentation
   - Test connection button
   - Next steps checklist

---

### OP-002: Dashboard Overview

```
┌────────────────────────────────────────────────────────────────────┐
│  BotEsq Operator Portal                           [Account ▼]    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐│
│  │ Credits      │ │ Active       │ │ This Month   │ │ Pending    ││
│  │ 33,800       │ │ Matters: 3   │ │ $162 spent   │ │ Review: 2  ││
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘│
│                                                                    │
│  Recent Activity                                         [View All]│
│  ├─ Contract review completed - MATTER-789012           2h ago    │
│  ├─ Document uploaded - aws_agreement.pdf               4h ago    │
│  ├─ New matter created - Entity Formation               1d ago    │
│  └─ Credits purchased - 10,000                          2d ago    │
│                                                                    │
│  Quick Actions                                                     │
│  [Purchase Credits]  [View Matters]  [API Keys]  [Documentation]  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Navigation:**
- Dashboard (home)
- Matters
- Documents
- Billing
- API Keys
- Settings
- Help/Docs

---

### OP-003: Matter Management

```
┌────────────────────────────────────────────────────────────────────┐
│  Matters                                    [+ New Matter] [Filter]│
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ MATTER-789012 | Contract Review | Active                      ││
│  │ SaaS Vendor Agreement Review                                  ││
│  │ Created: Feb 1, 2026 | Last Update: Feb 3, 2026              ││
│  │ Documents: 2 | Messages: 5                        [View →]    ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ MATTER-789013 | Entity Formation | Pending Retainer           ││
│  │ Delaware LLC Formation                                        ││
│  │ Created: Feb 3, 2026                                          ││
│  │ Action Required: Accept retainer               [Accept →]     ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ MATTER-789010 | Compliance | Resolved                         ││
│  │ GDPR Compliance Assessment                                    ││
│  │ Created: Jan 15, 2026 | Resolved: Jan 28, 2026               ││
│  │ Documents: 4 | Messages: 12                       [View →]    ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  [◄ Prev]  Page 1 of 3  [Next ►]                                  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Filter Options:**
- Status: All, Active, Pending, Resolved, Closed
- Type: All, Contract Review, Entity Formation, Compliance, IP, etc.
- Date range
- Search by matter ID or title

---

### OP-004: Matter Detail View

```
┌────────────────────────────────────────────────────────────────────┐
│  ← Back to Matters                                                 │
│                                                                    │
│  MATTER-789012                                          [Actions ▼]│
│  SaaS Vendor Agreement Review                                      │
│  Status: Active | Type: Contract Review | Created: Feb 1, 2026    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  [Timeline] [Documents] [Messages] [Billing]                       │
│  ─────────────────────────────────────────────                     │
│                                                                    │
│  Timeline                                                          │
│  │                                                                 │
│  ├─● Feb 3, 2026 2:30 PM - Document analysis complete             │
│  │  Analysis of aws_enterprise_agreement.pdf ready                 │
│  │                                                                 │
│  ├─● Feb 3, 2026 10:15 AM - Document uploaded                     │
│  │  aws_enterprise_agreement.pdf (24 pages)                        │
│  │                                                                 │
│  ├─● Feb 1, 2026 4:00 PM - Retainer accepted                      │
│  │  Accepted via agent pre-authorization                           │
│  │                                                                 │
│  └─● Feb 1, 2026 3:45 PM - Matter created                         │
│     Created by agent via MCP                                       │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Tabs:**
- **Timeline:** Chronological activity
- **Documents:** All uploaded documents with analysis
- **Messages:** Communication history
- **Billing:** Credits used, itemized charges

---

### OP-005: Pre-Authorization Setup

```
┌────────────────────────────────────────────────────────────────────┐
│  Settings > Pre-Authorization                                      │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Pre-authorization allows your AI agents to accept retainer        │
│  agreements on your behalf without manual intervention.            │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ Pre-Auth Token: preauth_xxxxxxxxxxxxxxxx           [Regenerate]││
│  │ Created: Feb 1, 2026                                          ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  Authorization Scope                                               │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ [x] Contract Review (up to 50,000 credits per matter)         ││
│  │ [x] Legal Q&A (any amount)                                    ││
│  │ [ ] Entity Formation (requires manual approval)               ││
│  │ [ ] Litigation Consultation (requires manual approval)        ││
│  │ [x] Compliance Review (up to 25,000 credits per matter)       ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  Credit Limit per Authorization                                    │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ Maximum: [50,000] credits per retainer                        ││
│  │ (Matters exceeding this limit require manual approval)        ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  [Save Changes]                                                    │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

### OP-006: Billing & Credit Management

```
┌────────────────────────────────────────────────────────────────────┐
│  Billing                                                           │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Credit Balance                                                    │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │        33,800 credits ($338.00 USD)                           ││
│  │        ████████████████░░░░░░░░░░░░░░░░░░                     ││
│  │        Low balance alert at: 5,000 credits                    ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  [Purchase Credits]   [Set Up Auto-Reload]                         │
│                                                                    │
│  Recent Transactions                                               │
│  ┌────────┬────────────────────────────┬─────────┬───────────────┐│
│  │ Date   │ Description                │ Credits │ Balance       ││
│  ├────────┼────────────────────────────┼─────────┼───────────────┤│
│  │ Feb 3  │ Document analysis          │ -5,000  │ 33,800        ││
│  │ Feb 3  │ Legal question (complex)   │ -1,000  │ 38,800        ││
│  │ Feb 2  │ Matter creation            │ -10,000 │ 39,800        ││
│  │ Feb 1  │ Credit purchase            │ +50,000 │ 49,800        ││
│  └────────┴────────────────────────────┴─────────┴───────────────┘│
│                                                                    │
│  Invoices                                                          │
│  ┌────────┬────────────────────────────┬─────────┬───────────────┐│
│  │ Date   │ Invoice                    │ Amount  │ Status        ││
│  ├────────┼────────────────────────────┼─────────┼───────────────┤│
│  │ Feb 1  │ INV-2026-0201             │ $500.00 │ Paid     [↓]  ││
│  │ Jan 15 │ INV-2026-0115             │ $250.00 │ Paid     [↓]  ││
│  └────────┴────────────────────────────┴─────────┴───────────────┘│
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Attorney Dashboard Journeys

### AT-001: Login & Authentication

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Login Page     │────▶│  2FA Code       │────▶│  Dashboard      │
│  Email/Password │     │  Entry          │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Authentication Requirements:**
- Email + Password
- Mandatory 2FA (TOTP or SMS)
- Session timeout: 4 hours
- IP allowlisting optional

---

### AT-002: Queue Management

```
┌────────────────────────────────────────────────────────────────────┐
│  Attorney Dashboard                    Jane Smith, Esq. [Logout]  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  My Queue (12)                               [Refresh] [Settings] │
│  ─────────────────────────────────────────────                     │
│                                                                    │
│  Urgent (2)                                                        │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ 🔴 MATTER-789015 | Contract Review | Wait: 3h 15m             ││
│  │    Urgent vendor agreement - deadline today                   ││
│  │    Operator: Acme Corp | Complexity: High               [→]   ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  SLA At Risk (3)                                                   │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ 🟡 MATTER-789014 | Consultation | Wait: 3h 45m | SLA: 4h      ││
│  │    IP licensing question                                      ││
│  │    Operator: TechStart Inc | Complexity: Medium         [→]   ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  Standard (7)                                                      │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ 🟢 MATTER-789012 | Document Review | Wait: 45m                ││
│  │    AWS agreement analysis - AI draft ready                    ││
│  │    Operator: Acme Corp | Complexity: Low                [→]   ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  [Load More...]                                                    │
│                                                                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │
│  │ Today: 8     │ │ Avg Time:    │ │ SLA Met:     │               │
│  │ completed    │ │ 25 min       │ │ 97%          │               │
│  └──────────────┘ └──────────────┘ └──────────────┘               │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Queue Priority (top to bottom):**
1. Urgent flag set by operator/agent
2. SLA at risk (approaching deadline)
3. High complexity (AI low confidence)
4. Standard FIFO

---

### AT-003: Matter Review & Response

```
┌────────────────────────────────────────────────────────────────────┐
│  ← Back to Queue                                                   │
│                                                                    │
│  MATTER-789012 - AWS Agreement Analysis              [Claim] [Skip]│
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Operator: Acme Corp | Type: Contract Review | Wait: 45m          │
│  Complexity: Low | AI Confidence: 89%                              │
│                                                                    │
│  [Request] [AI Draft] [Documents] [History]                        │
│  ─────────────────────────────────────────────                     │
│                                                                    │
│  AI Draft Response                                          [Edit] │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ Based on our review of the AWS Enterprise Agreement, we have  ││
│  │ identified the following key concerns:                        ││
│  │                                                                ││
│  │ 1. Liability Limitation (Section 8.2)                         ││
│  │    The agreement excludes all consequential damages with no   ││
│  │    cap on direct damages. We recommend negotiating a cap of   ││
│  │    at least 12 months of fees paid.                           ││
│  │                                                                ││
│  │ 2. Auto-Renewal (Section 12.1)                                ││
│  │    [continues...]                                             ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  Attorney Notes (internal)                                         │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ AI analysis looks accurate. Adding note about recent case law ││
│  │ on liability caps in SaaS agreements.                         ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  [Request Changes]  [Approve & Send]  [Escalate]                   │
│                                                                    │
│  Time on matter: 12:34                                             │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Actions:**
- **Claim:** Take ownership of matter
- **Skip:** Return to queue for another attorney
- **Edit:** Modify AI draft directly
- **Request Changes:** Send back to AI with feedback
- **Approve & Send:** Final approval, sends to operator/agent
- **Escalate:** Route to senior attorney

---

### AT-004: Response Editor

```
┌────────────────────────────────────────────────────────────────────┐
│  Edit Response                                      [Preview] [×]  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ [B] [I] [U] | [H1] [H2] | [•] [1.] | [Link] [Code] | [Undo]   ││
│  ├────────────────────────────────────────────────────────────────┤│
│  │                                                                ││
│  │ Based on our review of the AWS Enterprise Agreement, we have  ││
│  │ identified the following key concerns:                        ││
│  │                                                                ││
│  │ ## 1. Liability Limitation (Section 8.2)                      ││
│  │                                                                ││
│  │ The agreement excludes all consequential damages with no cap  ││
│  │ on direct damages. **We recommend negotiating a liability cap ││
│  │ of at least 12 months of fees paid.**                         ││
│  │                                                                ││
│  │ Recent case law in Delaware (TechCorp v. CloudProvider, 2025) ││
│  │ has upheld such caps as reasonable in enterprise SaaS         ││
│  │ agreements.                                                   ││
│  │                                                                ││
│  │ ## 2. Auto-Renewal (Section 12.1)                             ││
│  │ |                                                             ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  Templates: [Insert Disclaimer] [Insert Recommendation] [Cite]     │
│                                                                    │
│  [Cancel]                                            [Save Draft]  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Provider Portal Journeys

### PP-001: Provider Registration & Onboarding

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Landing Page   │────▶│  Registration   │────▶│  Email          │
│  "Become a      │     │  Form           │     │  Verification   │
│  Provider"      │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Company        │
                                                │  Profile Setup  │
                                                └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Service        │
                                                │  Configuration  │
                                                └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Stripe Connect │
                                                │  Setup          │
                                                └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Pending        │
                                                │  Approval       │
                                                └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Approved:      │
                                                │  Dashboard      │
                                                └─────────────────┘
```

**Screens:**

1. **Registration Form**
   - Legal company name (required)
   - Contact email (required)
   - Password (min 12 chars, complexity requirements)
   - Primary jurisdiction (US state)
   - Bar number (if applicable)
   - Accept provider terms

2. **Email Verification**
   - Verification email sent
   - 6-digit code entry
   - Resend option (rate limited)

3. **Company Profile**
   - Legal entity name
   - Business type
   - Tax ID / EIN
   - Business address
   - Primary contact phone
   - Company description

4. **Service Configuration**
   - Select service types to offer:
     - [ ] Legal Q&A
     - [ ] Document Review
     - [ ] Consultation
     - [ ] Contract Drafting
     - [ ] Entity Formation
     - [ ] Trademark
   - Set jurisdictions covered
   - Set specialties
   - Configure capacity (max concurrent requests)
   - Set target response times

5. **Stripe Connect Setup**
   - Connect Stripe account for payouts
   - Complete Stripe onboarding
   - Verify bank account

6. **Pending Approval**
   - Status: "Your application is under review"
   - Estimated review time: 2-3 business days
   - Option to update profile while pending

---

### PP-002: Provider Dashboard Overview

```
┌────────────────────────────────────────────────────────────────────┐
│  BotEsq Provider Portal                         [Account ▼]       │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐│
│  │ Pending      │ │ Completed    │ │ This Month   │ │ Quality    ││
│  │ Requests: 5  │ │ Today: 12    │ │ $2,450 earned│ │ Score: 4.8 ││
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘│
│                                                                    │
│  Request Queue                                         [View All]  │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ 🔴 PREQ-123456 | Legal Q&A | Urgent | 15 min remaining        ││
│  │    Contract interpretation question - California               ││
│  │    Credits: 500                                    [Accept →]  ││
│  └────────────────────────────────────────────────────────────────┘│
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ 🟢 PREQ-123457 | Document Review | Standard | 4h remaining    ││
│  │    Employment agreement review - New York                      ││
│  │    Credits: 3,500                                  [Accept →]  ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  Quick Actions                                                     │
│  [View Queue]  [My Services]  [Earnings]  [Settings]              │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Navigation:**
- Dashboard (home)
- Request Queue
- My Services
- Earnings
- Reviews
- Settings

---

### PP-003: Request Queue & Response Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  View Request   │────▶│  Accept         │────▶│  Work on        │
│  Queue          │     │  Request        │     │  Request        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       ▼                       ▼
        │               ┌───────────────┐       ┌───────────────┐
        │               │  Request      │       │  Submit       │
        │               │  Assigned     │       │  Response     │
        │               └───────────────┘       └───────────────┘
        │                                               │
        ▼                                               ▼
┌───────────────┐                               ┌───────────────┐
│  Reject       │                               │  Response     │
│  Request      │                               │  Delivered    │
└───────────────┘                               └───────────────┘
```

**Request Queue Screen:**
```
┌────────────────────────────────────────────────────────────────────┐
│  Request Queue                                    [Filter] [Refresh]│
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Available Requests (7)                                            │
│  ─────────────────────────────────────────────                     │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ PREQ-123456 | Legal Q&A | Urgent                               ││
│  │ ─────────────────────────────────────────────                  ││
│  │ Question: "Can a California LLC operating agreement..."        ││
│  │ Jurisdiction: California | Specialty: Business Law             ││
│  │ SLA: 15 min remaining | Credits: 500                           ││
│  │                                                                ││
│  │ [View Details]                    [Reject]  [Accept Request]   ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  My Active Requests (2)                                            │
│  ─────────────────────────────────────────────                     │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ PREQ-123450 | Document Review | In Progress                    ││
│  │ Employment agreement - 12 pages                                ││
│  │ SLA: 2h 30min remaining | Credits: 3,500                       ││
│  │                                              [Continue Work →] ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Request Detail & Response Screen:**
```
┌────────────────────────────────────────────────────────────────────┐
│  ← Back to Queue                                                   │
│                                                                    │
│  PREQ-123456 - Legal Q&A                               [In Progress]│
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Request Details                               SLA: 12 min remaining│
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ Question:                                                      ││
│  │ "Can a California LLC operating agreement include a provision  ││
│  │ that allows members to be expelled without cause?"             ││
│  │                                                                ││
│  │ Context:                                                       ││
│  │ "Starting a 3-member consulting LLC. Two members want ability  ││
│  │ to remove third member if relationship sours."                 ││
│  │                                                                ││
│  │ Jurisdiction: California                                       ││
│  │ Complexity: Moderate                                           ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  Your Response                                                     │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ [B] [I] [U] | [H1] [H2] | [•] [1.] | [Link] [Code]            ││
│  ├────────────────────────────────────────────────────────────────┤│
│  │                                                                ││
│  │ Yes, California Corporations Code Section 17704.02 permits     ││
│  │ LLC operating agreements to include provisions for member      ││
│  │ expulsion...                                                   ││
│  │                                                                ││
│  │ |                                                              ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  [Save Draft]                                    [Submit Response] │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Actions:**
- **Accept Request:** Claim the request and start working
- **Reject Request:** Return to queue (with optional reason)
- **Save Draft:** Save work in progress
- **Submit Response:** Complete and deliver response

---

### PP-004: Earnings & Settlements

```
┌────────────────────────────────────────────────────────────────────┐
│  Earnings                                                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Current Period (Feb 1 - Feb 28, 2026)                            │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │        $2,450.00 earned                                        ││
│  │        ████████████████████░░░░░░░░░░░░░░░░░░░░                ││
│  │        85 requests completed                                   ││
│  │        Next payout: Mar 1, 2026                                ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  Earnings Breakdown                                                │
│  ┌────────┬────────────────────────────┬─────────┬───────────────┐│
│  │ Date   │ Request                    │ Credits │ Your Share    ││
│  ├────────┼────────────────────────────┼─────────┼───────────────┤│
│  │ Feb 3  │ PREQ-123456 Legal Q&A     │ 500     │ $3.50 (70%)   ││
│  │ Feb 3  │ PREQ-123455 Doc Review    │ 3,500   │ $24.50 (70%)  ││
│  │ Feb 2  │ PREQ-123440 Consultation  │ 5,000   │ $35.00 (70%)  ││
│  │ Feb 2  │ PREQ-123438 Legal Q&A     │ 800     │ $5.60 (70%)   ││
│  └────────┴────────────────────────────┴─────────┴───────────────┘│
│                                                                    │
│  Past Settlements                                                  │
│  ┌────────┬────────────────────────────┬─────────┬───────────────┐│
│  │ Period │ Requests                   │ Gross   │ Paid          ││
│  ├────────┼────────────────────────────┼─────────┼───────────────┤│
│  │ Jan 26 │ 142 completed              │ $4,970  │ ✓ Paid Jan 31 ││
│  │ Dec 25 │ 98 completed               │ $3,430  │ ✓ Paid Jan 1  ││
│  └────────┴────────────────────────────┴─────────┴───────────────┘│
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Revenue Share Model:**
- Provider receives 70% of credits charged
- BotEsq retains 30% as platform fee
- Settlements processed monthly via Stripe Connect

---

### PP-005: Provider Service Management

```
┌────────────────────────────────────────────────────────────────────┐
│  My Services                                        [+ Add Service] │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Active Services                                                   │
│  ─────────────────────────────────────────────                     │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ Legal Q&A                                           [Enabled] ││
│  │ ─────────────────────────────────────────────                  ││
│  │ Base Price: 400 credits | Target Response: 30 min             ││
│  │ Capacity: 10 concurrent | Current Load: 3/10                  ││
│  │ Jurisdictions: CA, NY, TX | Specialties: Business, Contract   ││
│  │                                                      [Edit →] ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ Document Review                                     [Enabled] ││
│  │ ─────────────────────────────────────────────                  ││
│  │ Base Price: 2,500 credits | Per Page: 100 credits             ││
│  │ Target Response: 4 hours | Capacity: 5 concurrent             ││
│  │ Jurisdictions: CA, NY | Specialties: Contract, Employment     ││
│  │                                                      [Edit →] ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ Consultation                                       [Disabled] ││
│  │ ─────────────────────────────────────────────                  ││
│  │ Not currently offering this service                           ││
│  │                                                     [Enable →] ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Service Edit Dialog:**
```
┌────────────────────────────────────────────────────────────────────┐
│  Edit Service: Legal Q&A                                     [×]   │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Pricing                                                           │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ Price Model: [Flat Fee ▼]                                      ││
│  │ Base Price:  [400] credits                                     ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  Capacity                                                          │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ Max Concurrent Requests: [10]                                  ││
│  │ Target Response Time:    [30] minutes                          ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  Coverage                                                          │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ Jurisdictions:                                                 ││
│  │ [x] California  [x] New York  [x] Texas  [ ] Florida          ││
│  │ [ ] Illinois    [ ] Washington [ ] Other states...             ││
│  │                                                                ││
│  │ Specialties:                                                   ││
│  │ [x] Business Law  [x] Contract  [ ] Employment  [ ] IP        ││
│  │ [ ] Real Estate   [ ] Tax       [ ] Immigration               ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  [Cancel]                                          [Save Changes]  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Admin Dashboard Journeys

### AD-001: System Overview

```
┌────────────────────────────────────────────────────────────────────┐
│  BotEsq Admin                                       [Admin ▼]     │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  System Health                                      Last 24 hours  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐│
│  │ Uptime       │ │ Avg Response │ │ Queue Depth  │ │ Error Rate ││
│  │ 99.98%       │ │ 1.2s         │ │ 47           │ │ 0.02%      ││
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘│
│                                                                    │
│  Revenue (MTD)                                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐│
│  │ Credits Sold │ │ Revenue      │ │ Active Ops   │ │ New Ops    ││
│  │ 2.4M         │ │ $24,000      │ │ 87           │ │ 12         ││
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘│
│                                                                    │
│  [Operators]  [Attorneys]  [Matters]  [Audit Log]  [Settings]     │
│                                                                    │
│  Alerts                                                            │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ ⚠ Queue depth above threshold (47 > 30)             [Dismiss] ││
│  │ ✓ All attorneys online                                        ││
│  │ ✓ LLM service healthy                                         ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

### AD-002: Provider Management

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Provider       │────▶│  Review         │────▶│  Approve /      │
│  Applications   │     │  Application    │     │  Reject         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                               │
        │                                               ▼
        │                                       ┌───────────────┐
        │                                       │  Provider     │
        │                                       │  Active       │
        │                                       └───────────────┘
        │                                               │
        ▼                                               ▼
┌───────────────────────────────────────────────────────────────────┐
│  Provider List View                                               │
└───────────────────────────────────────────────────────────────────┘
```

**Provider List Screen:**
```
┌────────────────────────────────────────────────────────────────────┐
│  Providers                                    [+ Invite] [Filter ▼]│
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Pending Approval (3)                                              │
│  ─────────────────────────────────────────────                     │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ PROV-789012 | Smith & Associates LLP                          ││
│  │ Applied: Feb 2, 2026 | Jurisdictions: CA, NY                  ││
│  │ Services: Legal Q&A, Document Review, Consultation            ││
│  │ Bar Numbers: Verified ✓                          [Review →]   ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  Active Providers (12)                                             │
│  ─────────────────────────────────────────────                     │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ PROV-789001 | Legal Eagles PC         ⭐ 4.9 | Active         ││
│  │ Joined: Jan 15, 2026 | Requests: 847 | Revenue: $12,400       ││
│  │ Services: Legal Q&A, Consultation | Load: 6/10               ││
│  │                                                      [View →]  ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ PROV-789002 | Contract Counsel Inc    ⭐ 4.7 | Active         ││
│  │ Joined: Jan 20, 2026 | Requests: 523 | Revenue: $8,200        ││
│  │ Services: Document Review, Contract Drafting | Load: 3/5     ││
│  │                                                      [View →]  ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  Suspended (1)                                                     │
│  ─────────────────────────────────────────────                     │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ PROV-789005 | Quick Legal LLC         ⭐ 2.1 | Suspended      ││
│  │ Suspended: Feb 1, 2026 | Reason: SLA violations              ││
│  │                                                      [View →]  ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Provider Application Review Screen:**
```
┌────────────────────────────────────────────────────────────────────┐
│  ← Back to Providers                                               │
│                                                                    │
│  Provider Application                           Status: PENDING    │
│  PROV-789012 | Smith & Associates LLP                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  [Company Info] [Services] [Credentials] [History]                 │
│  ─────────────────────────────────────────────                     │
│                                                                    │
│  Company Information                                               │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ Legal Name:     Smith & Associates LLP                        ││
│  │ Contact:        john.smith@smithlaw.com                       ││
│  │ Phone:          (415) 555-1234                                ││
│  │ Address:        123 Market St, San Francisco, CA 94105        ││
│  │ Tax ID:         XX-XXXXXXX (verified ✓)                       ││
│  │ Applied:        Feb 2, 2026                                   ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  Credentials                                                       │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ Bar Number (CA): 123456 - John Smith - Active ✓               ││
│  │ Bar Number (NY): 789012 - John Smith - Active ✓               ││
│  │ Malpractice Insurance: Policy #INS-12345 - Valid ✓            ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  Proposed Services                                                 │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ • Legal Q&A - 400 credits - 30 min response - 10 concurrent   ││
│  │ • Document Review - 2,500 credits - 4h response - 5 concurrent││
│  │ • Consultation - 5,000 credits - 24h response - 3 concurrent  ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  Admin Notes                                                       │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ [Add notes about this application...]                         ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  [Request More Info]        [Reject Application]  [Approve Provider]│
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Actions:**
- **Approve Provider:** Activate provider account, send welcome email
- **Reject Application:** Deny with reason, send notification
- **Request More Info:** Send message requesting additional documentation

---

### AD-003: Provider Monitoring & Suspension

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Provider       │────▶│  Review         │────▶│  Suspend /      │
│  Performance    │     │  Issues         │     │  Warning        │
│  Alert          │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌───────────────┐
                                                │  Provider     │
                                                │  Responds     │
                                                └───────────────┘
                                                        │
                                                        ▼
                                                ┌───────────────┐
                                                │  Reinstate /  │
                                                │  Terminate    │
                                                └───────────────┘
```

**Provider Detail Screen (Admin View):**
```
┌────────────────────────────────────────────────────────────────────┐
│  ← Back to Providers                                               │
│                                                                    │
│  PROV-789001 | Legal Eagles PC                              Active │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Performance Overview                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐│
│  │ Quality      │ │ SLA Met      │ │ Response     │ │ Complaints ││
│  │ ⭐ 4.9/5.0   │ │ 98.2%        │ │ Avg: 18 min  │ │ 2 (0.2%)   ││
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘│
│                                                                    │
│  [Overview] [Requests] [Reviews] [Financials] [Actions]            │
│  ─────────────────────────────────────────────                     │
│                                                                    │
│  Recent Performance (Last 30 days)                                 │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ Requests Completed: 127                                        ││
│  │ Average Quality Score: 4.9                                     ││
│  │ SLA Compliance: 98.2% (125/127)                               ││
│  │ Rejections: 3 (2.4%)                                          ││
│  │ Revenue Generated: $4,450                                      ││
│  │ Provider Earnings: $3,115 (70%)                               ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  Flagged Issues (1)                                                │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ ⚠ Feb 1: Operator complaint - Response quality concern        ││
│  │    PREQ-123400 | Operator: Acme Corp | Status: Under Review   ││
│  │                                              [View Details →]  ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  Admin Actions                                                     │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ [Send Warning]  [Suspend Provider]  [Adjust Revenue Share]    ││
│  │ [View All Requests]  [Contact Provider]  [View Audit Log]     ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Suspension Dialog:**
```
┌────────────────────────────────────────────────────────────────────┐
│  Suspend Provider                                            [×]   │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Provider: PROV-789005 | Quick Legal LLC                          │
│                                                                    │
│  Suspension Reason                                                 │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ ( ) SLA violations - Consistently missing response deadlines  ││
│  │ (•) Quality concerns - Multiple negative reviews              ││
│  │ ( ) Credential issue - Bar license status changed             ││
│  │ ( ) Terms violation - Policy breach                           ││
│  │ ( ) Operator complaints - Multiple escalations                ││
│  │ ( ) Other - Specify below                                     ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  Details                                                           │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ Provider has received 5 negative reviews in the past 2 weeks  ││
│  │ with quality scores below 3.0. Multiple operators have        ││
│  │ escalated concerns about response accuracy.                   ││
│  │                                                               ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  Suspension Type                                                   │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ (•) Temporary - Provider can appeal in 7 days                 ││
│  │ ( ) Permanent - Account terminated                            ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  ⚠ This will immediately stop routing new requests to this       │
│    provider. Active requests will be reassigned.                  │
│                                                                    │
│  [Cancel]                                    [Confirm Suspension]  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Reinstatement Flow:**
```
┌────────────────────────────────────────────────────────────────────┐
│  Provider Appeal                                                   │
│  PROV-789005 | Quick Legal LLC                    Status: SUSPENDED│
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Suspension Details                                                │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ Suspended: Feb 1, 2026                                        ││
│  │ Reason: Quality concerns - Multiple negative reviews          ││
│  │ Type: Temporary (Appeal eligible: Feb 8, 2026)               ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  Provider Response                                                 │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ "We have identified the issue was due to a new associate      ││
│  │ handling requests without proper oversight. We have           ││
│  │ implemented additional review procedures and the associate    ││
│  │ is now under supervision. We request reinstatement..."        ││
│  │                                                               ││
│  │ Submitted: Feb 3, 2026                                        ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  Admin Decision                                                    │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ [Add decision notes...]                                       ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  [Deny Appeal]  [Reinstate with Warning]  [Reinstate - Full Access]│
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Error States & Edge Cases

### E-001: LLM Unavailable

**Trigger:** OpenAI API timeout or error

**Handling:**
1. Display message to agent: "Our AI system is temporarily unavailable"
2. Offer options:
   - Queue for human attorney review
   - Retry in 5 minutes
3. No credits charged for failed AI requests
4. Admin alerted if > 3 failures in 5 minutes

**Agent Response:**
```json
{
  "error": {
    "code": "LLM_UNAVAILABLE",
    "message": "AI service temporarily unavailable",
    "fallback_available": true,
    "estimated_wait_minutes": 30,
    "options": [
      {"action": "queue_for_human", "description": "Queue for attorney review"},
      {"action": "retry", "retry_after_seconds": 300}
    ]
  }
}
```

---

### E-002: Insufficient Credits

**Trigger:** Operation cost exceeds available balance

**Handling:**
1. Pre-flight check before expensive operations
2. Return error with required amount
3. Provide link/URL to purchase credits

**Agent Response:**
```json
{
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "This operation requires 10,000 credits, but balance is 5,000",
    "required": 10000,
    "available": 5000,
    "shortfall": 5000,
    "purchase_url": "https://botesq.io/credits/purchase?amount=5000"
  }
}
```

---

### E-003: Retainer Required

**Trigger:** Operation requires active retainer

**Handling:**
1. Return structured retainer requirement
2. Provide steps to obtain retainer
3. No work performed until retainer accepted

**Agent Response:**
```json
{
  "error": {
    "code": "RETAINER_REQUIRED",
    "message": "This matter type requires an active retainer agreement",
    "matter_id": "MATTER-789013",
    "next_steps": [
      "Call get_retainer_terms with matter_id",
      "Review terms with operator",
      "Accept via accept_retainer or manual signing"
    ]
  }
}
```

---

### E-004: Rate Limited

**Trigger:** Too many requests in time window

**Handling:**
1. Return 429 status
2. Include retry-after header
3. Suggest rate limiting on agent side

**Agent Response:**
```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded: 10 requests per minute",
    "retry_after_seconds": 45,
    "limit": {
      "requests_per_minute": 10,
      "current_count": 10
    }
  }
}
```

---

### E-005: Session Expired

**Trigger:** Session token past expiration or revoked

**Handling:**
1. Return 401 status
2. Indicate session needs refresh
3. Agent should call start_session again

**Agent Response:**
```json
{
  "error": {
    "code": "SESSION_EXPIRED",
    "message": "Session has expired. Please call start_session to obtain a new token.",
    "expired_at": "2026-02-03T12:00:00Z"
  }
}
```

---

## Screen Inventory

### Public Pages
| Screen | Route | Authentication |
|--------|-------|----------------|
| Landing Page | / | None |
| Features | /features | None |
| Pricing | /pricing | None |
| Documentation | /docs | None |
| Sign Up | /signup | None |
| Login | /login | None |
| Terms of Service | /terms | None |
| Privacy Policy | /privacy | None |

### Operator Portal
| Screen | Route | Authentication |
|--------|-------|----------------|
| Dashboard | /portal | Operator |
| Matters List | /portal/matters | Operator |
| Matter Detail | /portal/matters/:id | Operator |
| Documents | /portal/documents | Operator |
| Billing | /portal/billing | Operator |
| API Keys | /portal/api-keys | Operator |
| Settings | /portal/settings | Operator |
| Pre-Authorization | /portal/settings/preauth | Operator |

### Attorney Dashboard
| Screen | Route | Authentication |
|--------|-------|----------------|
| Login | /attorney/login | None |
| Queue | /attorney | Attorney |
| Matter Review | /attorney/matter/:id | Attorney |
| My Completed | /attorney/completed | Attorney |
| Profile | /attorney/profile | Attorney |

### Admin Dashboard
| Screen | Route | Authentication |
|--------|-------|----------------|
| Login | /admin/login | None |
| Overview | /admin | Admin |
| Operators | /admin/operators | Admin |
| Operator Detail | /admin/operators/:id | Admin |
| Attorneys | /admin/attorneys | Admin |
| Attorney Detail | /admin/attorneys/:id | Admin |
| Matters | /admin/matters | Admin |
| Providers | /admin/providers | Admin |
| Provider Detail | /admin/providers/:id | Admin |
| Provider Applications | /admin/providers/applications | Admin |
| Settlements | /admin/settlements | Admin |
| Audit Log | /admin/audit | Admin |
| Settings | /admin/settings | Admin |

### Provider Portal
| Screen | Route | Authentication |
|--------|-------|----------------|
| Login | /provider/login | None |
| Register | /provider/register | None |
| Dashboard | /provider | Provider |
| Request Queue | /provider/requests | Provider |
| Request Detail | /provider/requests/:id | Provider |
| My Services | /provider/services | Provider |
| Earnings | /provider/earnings | Provider |
| Reviews | /provider/reviews | Provider |
| Settings | /provider/settings | Provider |
| Webhook Config | /provider/settings/webhooks | Provider |

---

## Data Loading States

### Loading Patterns
- **Skeleton loaders** for lists and cards
- **Spinner** for action buttons during processing
- **Progress bar** for document uploads
- **Polling indicator** for async operations

### Empty States
| Context | Message | Action |
|---------|---------|--------|
| No matters | "No matters yet" | "Create your first matter via your AI agent" |
| No documents | "No documents uploaded" | "Upload documents through the MCP interface" |
| No transactions | "No billing history" | "Activity will appear after you use services" |
| Queue empty | "All caught up!" | "Check back later for new matters" |

---

## Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | < 640px | Single column, hamburger nav |
| Tablet | 640-1024px | Two columns where appropriate |
| Desktop | > 1024px | Full sidebar, multi-column layouts |

All layouts are mobile-first. Desktop is the enhancement.
