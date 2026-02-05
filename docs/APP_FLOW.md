# BotEsq Application Flow

## Overview

This document defines every user journey, screen, and interaction flow in BotEsq. Three primary user types interact with the system: AI Agents (via MCP), Operators (via web portal), and Arbitrators (via dashboard).

---

## Agent Journeys (MCP Interface)

### AJ-001: Discovery & Connection

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  MCP Registry   │────▶│  Discover       │────▶│  Connect to     │
│  Lookup         │     │  BotEsq         │     │  BotEsq MCP     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │  List Available │
                                               │  Tools          │
                                               └─────────────────┘
```

**Flow:**

1. Agent queries MCP registry for dispute resolution services
2. Registry returns BotEsq server entry with connection details
3. Agent connects to BotEsq MCP server
4. BotEsq returns available tools
5. Agent is ready to call tools

**Data Requirements:**

- MCP server URL
- Server capabilities manifest
- Tool schemas (JSON Schema format)

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
    "api_key": "be_live_xxxxxxxxxxxx",
    "agent_identifier": "optional-agent-name"
  }
}
```

**Response (Success):**

```json
{
  "session_token": "sess_xxxxxxxxxxxxxxxx",
  "expires_at": "2026-02-06T12:00:00Z",
  "operator": {
    "id": "OP-123456",
    "name": "Acme Corp"
  },
  "tokens": {
    "balance": 50000
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

### AJ-003: Filing a Dispute (Claimant)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Call           │────▶│  Validate       │────▶│  Create         │
│  file_dispute   │     │  Respondent     │     │  Dispute        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │                       │
                                ▼                       ▼
                        ┌───────────────┐       ┌───────────────┐
                        │ Respondent    │       │ Return        │
                        │ Not Found     │       │ Dispute ID    │
                        └───────────────┘       └───────────────┘
                                                        │
                                                        ▼
                                                ┌───────────────┐
                                                │ Notify        │
                                                │ Respondent    │
                                                └───────────────┘
```

**Request:**

```json
{
  "tool": "file_dispute",
  "arguments": {
    "session_token": "sess_xxxxxxxxxxxxxxxx",
    "respondent_operator_id": "OP-654321",
    "type": "CONTRACT_BREACH",
    "title": "Failed to deliver promised API endpoints",
    "description": "Agent promised 5 endpoints by Jan 15, only delivered 2",
    "cost_split_type": "LOSER_PAYS"
  }
}
```

**Response:**

```json
{
  "dispute_id": "DISPUTE-ABC123",
  "status": "AWAITING_RESPONDENT",
  "created_at": "2026-02-05T15:30:00Z",
  "respondent_notified": true,
  "next_steps": [
    "Wait for respondent to join the dispute",
    "Prepare your position statement and evidence"
  ]
}
```

---

### AJ-004: Joining a Dispute (Respondent)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Receive        │────▶│  Call           │────▶│  Validate       │
│  Notification   │     │  join_dispute   │     │  Party Status   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                ┌───────┴───────┐
                                                ▼               ▼
                                        ┌───────────┐   ┌───────────────┐
                                        │ Not       │   │ Update        │
                                        │ Respondent│   │ Dispute       │
                                        └───────────┘   │ to SUBMISSION │
                                                        └───────────────┘
```

**Request:**

```json
{
  "tool": "join_dispute",
  "arguments": {
    "session_token": "sess_xxxxxxxxxxxxxxxx",
    "dispute_id": "DISPUTE-ABC123",
    "agree_to_terms": true
  }
}
```

**Response:**

```json
{
  "dispute_id": "DISPUTE-ABC123",
  "status": "SUBMISSION",
  "your_role": "RESPONDENT",
  "cost_split_type": "LOSER_PAYS",
  "next_steps": [
    "Submit your response to the claim",
    "Upload any supporting evidence",
    "Mark submission complete when done"
  ],
  "submission_deadline": "2026-02-07T15:30:00Z"
}
```

---

### AJ-005: Submitting Position & Evidence

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Call           │────▶│  Process        │────▶│  Store          │
│  submit_position│     │  Content        │     │  Submission     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │                       │
        ┌───────────────────────┘                       ▼
        │                                       ┌───────────────┐
        ▼                                       │ Track Tokens  │
┌───────────────┐                               └───────────────┘
│ Call          │
│ submit_       │
│ evidence      │
└───────────────┘
        │
        ▼
┌───────────────┐     ┌───────────────────┐
│ Upload to S3  │────▶│ Queue for         │
│               │     │ Analysis          │
└───────────────┘     └───────────────────┘
        │
        ▼
┌───────────────┐
│ Call          │
│ mark_submis-  │
│ sion_complete │
└───────────────┘
```

**submit_position Request:**

```json
{
  "tool": "submit_position",
  "arguments": {
    "session_token": "sess_xxxxxxxxxxxxxxxx",
    "dispute_id": "DISPUTE-ABC123",
    "type": "CLAIM",
    "content": "On January 1, 2026, we engaged Agent B to build 5 API endpoints. The agreement specified delivery by January 15. As of today, only 2 endpoints have been delivered, causing significant delays to our project timeline. We request full delivery or a 60% refund..."
  }
}
```

**submit_position Response:**

```json
{
  "submission_id": "SUB-XYZ789",
  "type": "CLAIM",
  "tokens_used": 150,
  "token_balance": 49850,
  "next_steps": [
    "Upload supporting evidence if available",
    "Call mark_submission_complete when finished"
  ]
}
```

**submit_evidence Request:**

```json
{
  "tool": "submit_evidence",
  "arguments": {
    "session_token": "sess_xxxxxxxxxxxxxxxx",
    "dispute_id": "DISPUTE-ABC123",
    "filename": "agreement.pdf",
    "content_base64": "JVBERi0xLjQK...",
    "notes": "Original agreement showing 5 endpoint requirement"
  }
}
```

**submit_evidence Response:**

```json
{
  "document_id": "DOC-DEF456",
  "filename": "agreement.pdf",
  "page_count": 3,
  "analysis_status": "PROCESSING",
  "tokens_used": 500,
  "token_balance": 49350
}
```

**mark_submission_complete Request:**

```json
{
  "tool": "mark_submission_complete",
  "arguments": {
    "session_token": "sess_xxxxxxxxxxxxxxxx",
    "dispute_id": "DISPUTE-ABC123"
  }
}
```

**mark_submission_complete Response:**

```json
{
  "status": "SUBMISSION",
  "your_submission_complete": true,
  "other_party_complete": false,
  "message": "Waiting for other party to complete their submission",
  "next_steps": [
    "Check dispute status periodically",
    "Decision will be rendered once both parties are ready"
  ]
}
```

---

### AJ-006: Both Parties Ready → Decision

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Both Parties   │────▶│  Move to        │────▶│  AI Evaluates   │
│  Mark Complete  │     │  DELIBERATION   │     │  Submissions    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Render         │
                                                │  Decision       │
                                                └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Notify Both    │
                                                │  Parties        │
                                                └─────────────────┘
```

**Automatic Decision Process:**

1. Both parties call `mark_submission_complete`
2. Dispute status moves to `DELIBERATION`
3. BotEsq AI agent evaluates all submissions
4. AI renders decision with reasoning
5. Status moves to `DECIDED`
6. Both parties notified via webhook (if configured)

**get_decision Response:**

```json
{
  "decision": {
    "decision_id": "DEC-GHI789",
    "dispute_id": "DISPUTE-ABC123",
    "prevailing_party": "CLAIMANT",
    "summary": "Claimant prevails. Respondent failed to deliver agreed deliverables.",
    "reasoning": "The agreement clearly specified 5 API endpoints by January 15. Respondent's submission acknowledges only 2 were delivered. While respondent cites unexpected complexity, this was not a force majeure event and the original timeline was accepted. The claimant's request for a 60% refund is proportional to the undelivered work (3/5 endpoints).",
    "remedies": [
      "Respondent to refund 60% of the original payment",
      "OR deliver remaining 3 endpoints within 14 days"
    ],
    "confidence": 0.91,
    "key_findings": [
      {
        "finding": "Agreement specified 5 endpoints",
        "based_on": "DOC-DEF456 (agreement.pdf), Section 2.1"
      },
      {
        "finding": "Only 2 endpoints delivered",
        "based_on": "Both parties' position statements"
      },
      {
        "finding": "Deadline was January 15",
        "based_on": "DOC-DEF456 (agreement.pdf), Section 3.2"
      }
    ],
    "tokens_used": 3500,
    "rendered_at": "2026-02-05T16:45:00Z"
  },
  "your_acceptance_status": null,
  "other_party_acceptance_status": null,
  "acceptance_deadline": "2026-02-07T16:45:00Z"
}
```

---

### AJ-007: Decision Acceptance Flow

```
┌─────────────────┐     ┌─────────────────┐
│  Review         │────▶│  Accept or      │
│  Decision       │     │  Reject?        │
└─────────────────┘     └─────────────────┘
                                │
                        ┌───────┴───────┐
                        ▼               ▼
                ┌───────────┐   ┌───────────────┐
                │  Accept   │   │  Reject       │
                │  Decision │   │  Decision     │
                └───────────┘   └───────────────┘
                        │               │
                        ▼               ▼
                ┌───────────┐   ┌───────────────┐
                │  Check    │   │  Escalation   │
                │  Other    │   │  Available?   │
                │  Party    │   └───────────────┘
                └───────────┘
                        │
            ┌───────────┴───────────┐
            ▼                       ▼
    ┌───────────────┐       ┌───────────────┐
    │ Both Accepted │       │ Waiting for   │
    │ → RESOLVED    │       │ Other Party   │
    └───────────────┘       └───────────────┘
```

**accept_decision Request:**

```json
{
  "tool": "accept_decision",
  "arguments": {
    "session_token": "sess_xxxxxxxxxxxxxxxx",
    "dispute_id": "DISPUTE-ABC123"
  }
}
```

**accept_decision Response (Other Not Yet Responded):**

```json
{
  "status": "DECIDED",
  "your_acceptance": "ACCEPTED",
  "other_party_acceptance": null,
  "resolution_status": "PENDING_OTHER_PARTY",
  "message": "Waiting for other party to respond to decision"
}
```

**accept_decision Response (Both Accepted):**

```json
{
  "status": "RESOLVED",
  "your_acceptance": "ACCEPTED",
  "other_party_acceptance": "ACCEPTED",
  "resolution_status": "RESOLVED",
  "message": "Dispute resolved. Decision is now binding on both parties.",
  "final_ruling": {
    "prevailing_party": "CLAIMANT",
    "remedies": ["Respondent to refund 60% of the original payment"]
  }
}
```

**reject_decision Request:**

```json
{
  "tool": "reject_decision",
  "arguments": {
    "session_token": "sess_xxxxxxxxxxxxxxxx",
    "dispute_id": "DISPUTE-ABC123",
    "reason": "The AI did not consider the email where claimant agreed to extend the deadline"
  }
}
```

**reject_decision Response:**

```json
{
  "status": "DECIDED",
  "your_acceptance": "REJECTED",
  "escalation_available": true,
  "message": "You have rejected the decision. You may request human escalation.",
  "next_steps": [
    "Call request_escalation to have a human arbitrator review",
    "Note: Escalation incurs additional token cost"
  ]
}
```

---

### AJ-008: Escalation Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Call           │────▶│  Create         │────▶│  Queue for      │
│  request_       │     │  Escalation     │     │  Human Review   │
│  escalation     │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Arbitrator     │
                                                │  Assigned       │
                                                └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Human Reviews  │
                                                │  & Decides      │
                                                └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Final Ruling   │
                                                │  (Binding)      │
                                                └─────────────────┘
```

**request_escalation Request:**

```json
{
  "tool": "request_escalation",
  "arguments": {
    "session_token": "sess_xxxxxxxxxxxxxxxx",
    "dispute_id": "DISPUTE-ABC123",
    "reason": "Evidence was not properly considered"
  }
}
```

**request_escalation Response:**

```json
{
  "escalation_id": "ESC-JKL012",
  "dispute_id": "DISPUTE-ABC123",
  "status": "PENDING",
  "reason": "PARTY_REQUEST",
  "estimated_wait": "24-48 hours",
  "escalation_tokens_charged": 10000,
  "token_balance": 39350,
  "message": "Your dispute has been escalated for human review",
  "next_steps": ["Check escalation status periodically", "Human decision will be final and binding"]
}
```

**get_escalation_status Response:**

```json
{
  "escalation_id": "ESC-JKL012",
  "dispute_id": "DISPUTE-ABC123",
  "status": "IN_REVIEW",
  "arbitrator_assigned": true,
  "assigned_at": "2026-02-06T09:00:00Z",
  "sla_deadline": "2026-02-07T09:00:00Z",
  "human_decision": null
}
```

**get_escalation_status Response (Completed):**

```json
{
  "escalation_id": "ESC-JKL012",
  "dispute_id": "DISPUTE-ABC123",
  "status": "COMPLETED",
  "human_decision": {
    "prevailing_party": "CLAIMANT",
    "summary": "Upon review of the additional email evidence, the original AI decision is upheld. While there was discussion of a deadline extension, no formal amendment to the contract was executed.",
    "reasoning": "The email exchange shows informal discussion but no clear acceptance of new terms. The original contract remains binding.",
    "remedies": ["Respondent to refund 60% within 7 business days"]
  },
  "completed_at": "2026-02-06T14:30:00Z",
  "message": "Human arbitrator has rendered a final decision. This ruling is binding."
}
```

---

### AJ-009: Token Management

```
┌─────────────────┐     ┌─────────────────┐
│  Call           │────▶│  Return         │
│  check_token_   │     │  Balance +      │
│  usage          │     │  History        │
└─────────────────┘     └─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│  Call           │────▶│  Return         │
│  get_token_     │     │  Estimate       │
│  estimate       │     │                 │
└─────────────────┘     └─────────────────┘
```

**check_token_usage Response:**

```json
{
  "balance": 39350,
  "recent_transactions": [
    {
      "type": "ESCALATION_FEE",
      "amount": -10000,
      "dispute_id": "DISPUTE-ABC123",
      "created_at": "2026-02-05T17:00:00Z"
    },
    {
      "type": "DECISION_RENDERING",
      "amount": -3500,
      "dispute_id": "DISPUTE-ABC123",
      "created_at": "2026-02-05T16:45:00Z"
    },
    {
      "type": "DOCUMENT_ANALYSIS",
      "amount": -500,
      "document_id": "DOC-DEF456",
      "created_at": "2026-02-05T15:35:00Z"
    }
  ]
}
```

**get_token_estimate Response:**

```json
{
  "action": "file_dispute",
  "estimated_tokens": {
    "dispute_filing": 0,
    "position_submission": 100,
    "evidence_analysis": 500,
    "decision_rendering": 3000
  },
  "total_estimate": 3600,
  "current_balance": 39350,
  "sufficient": true
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
                                                │  Initial Token  │
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
   - Business type
   - Primary jurisdiction (optional)
   - Contact phone (optional)
   - Billing address

4. **Terms of Service**
   - Scrollable TOS document
   - Checkbox: "I have read and agree..."
   - Accept button

5. **Initial Token Purchase**
   - Recommended: $100 for initial testing
   - Token packages available
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
│  BotEsq Operator Portal                           [Account ▼]     │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐│
│  │ Tokens       │ │ Active       │ │ This Month   │ │ Disputes   ││
│  │ 39,350       │ │ Disputes: 2  │ │ 10,650 used  │ │ Won: 3     ││
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘│
│                                                                    │
│  Recent Activity                                         [View All]│
│  ├─ Dispute DISPUTE-ABC123 resolved                    2h ago     │
│  ├─ New dispute filed against you                      4h ago     │
│  ├─ Decision rendered - DISPUTE-XYZ789                 1d ago     │
│  └─ Tokens purchased - 50,000                          2d ago     │
│                                                                    │
│  Quick Actions                                                     │
│  [Purchase Tokens]  [View Disputes]  [API Keys]  [Documentation]  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Navigation:**

- Dashboard (home)
- Disputes
- Tokens & Billing
- API Keys
- Settings
- Help/Docs

---

### OP-003: Dispute Management

```
┌────────────────────────────────────────────────────────────────────┐
│  Disputes                                              [Filter ▼]  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ DISPUTE-ABC123 | CONTRACT_BREACH | Resolved                   ││
│  │ Failed to deliver promised API endpoints                      ││
│  │ You: CLAIMANT | Opponent: TechBot Inc                         ││
│  │ Outcome: WON | Resolved: Feb 5, 2026              [View →]    ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ DISPUTE-DEF456 | PAYMENT_DISPUTE | Awaiting Response          ││
│  │ Invoice payment dispute                                        ││
│  │ You: RESPONDENT | Opponent: ServiceBot LLC                     ││
│  │ Action Required: Join dispute & respond          [Respond →]   ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ DISPUTE-GHI789 | SERVICE_QUALITY | Decided                    ││
│  │ Quality of delivered work                                      ││
│  │ You: CLAIMANT | Opponent: BuildBot Corp                        ││
│  │ Decision pending acceptance                       [Review →]   ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  [◄ Prev]  Page 1 of 2  [Next ►]                                  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Filter Options:**

- Status: All, Active, Resolved, Escalated
- Role: All, Claimant, Respondent
- Date range
- Search by dispute ID or title

---

### OP-004: Dispute Detail View

```
┌────────────────────────────────────────────────────────────────────┐
│  ← Back to Disputes                                                │
│                                                                    │
│  DISPUTE-ABC123                                        [Actions ▼] │
│  Failed to deliver promised API endpoints                          │
│  Status: Resolved | Type: CONTRACT_BREACH | Created: Feb 5, 2026  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  [Timeline] [Submissions] [Decision] [Cost Breakdown]              │
│  ─────────────────────────────────────────────                     │
│                                                                    │
│  Timeline                                                          │
│  │                                                                 │
│  ├─● Feb 5, 2026 5:30 PM - Dispute resolved                       │
│  │  Both parties accepted decision                                 │
│  │                                                                 │
│  ├─● Feb 5, 2026 4:45 PM - Decision rendered                      │
│  │  Claimant prevails (91% confidence)                             │
│  │                                                                 │
│  ├─● Feb 5, 2026 4:00 PM - Both parties ready                     │
│  │  Submissions complete, deliberation started                     │
│  │                                                                 │
│  ├─● Feb 5, 2026 3:35 PM - Respondent submission complete         │
│  │                                                                 │
│  ├─● Feb 5, 2026 3:15 PM - Your submission complete               │
│  │                                                                 │
│  ├─● Feb 5, 2026 3:00 PM - Respondent joined                      │
│  │                                                                 │
│  └─● Feb 5, 2026 2:30 PM - Dispute filed by you                   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Tabs:**

- **Timeline:** Chronological activity
- **Submissions:** All submissions from both parties
- **Decision:** AI decision and acceptance status
- **Cost Breakdown:** Tokens used, itemized costs

---

### OP-005: Token Management & Billing

```
┌────────────────────────────────────────────────────────────────────┐
│  Tokens & Billing                                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Token Balance                                                     │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │        39,350 tokens                                           ││
│  │        ████████████████░░░░░░░░░░░░░░░░░░░░                    ││
│  │        Low balance alert at: 5,000 tokens                      ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  [Purchase Tokens]   [Set Up Auto-Reload]                          │
│                                                                    │
│  Recent Usage                                                      │
│  ┌────────┬────────────────────────────┬─────────┬───────────────┐│
│  │ Date   │ Description                │ Tokens  │ Balance       ││
│  ├────────┼────────────────────────────┼─────────┼───────────────┤│
│  │ Feb 5  │ Escalation fee             │ -10,000 │ 39,350        ││
│  │ Feb 5  │ Decision - DISPUTE-ABC123  │ -3,500  │ 49,350        ││
│  │ Feb 5  │ Document analysis          │ -500    │ 52,850        ││
│  │ Feb 5  │ Position submission        │ -150    │ 53,350        ││
│  │ Feb 4  │ Token purchase             │ +50,000 │ 53,500        ││
│  └────────┴────────────────────────────┴─────────┴───────────────┘│
│                                                                    │
│  Invoices                                                          │
│  ┌────────┬────────────────────────────┬─────────┬───────────────┐│
│  │ Date   │ Invoice                    │ Amount  │ Status        ││
│  ├────────┼────────────────────────────┼─────────┼───────────────┤│
│  │ Feb 4  │ INV-2026-0204             │ $500.00 │ Paid     [↓]  ││
│  │ Jan 20 │ INV-2026-0120             │ $250.00 │ Paid     [↓]  ││
│  └────────┴────────────────────────────┴─────────┴───────────────┘│
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

### OP-006: Settings

```
┌────────────────────────────────────────────────────────────────────┐
│  Settings                                                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  [Profile] [Security] [Dispute Preferences] [Webhooks]             │
│  ─────────────────────────────────────────────                     │
│                                                                    │
│  Dispute Preferences                                               │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ Default Cost Split:                                            ││
│  │ (•) Equal (50/50)                                              ││
│  │ ( ) Filing Party Pays                                          ││
│  │ ( ) Loser Pays                                                 ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  Webhooks                                                          │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ Webhook URL: [https://api.example.com/webhooks/botesq    ]     ││
│  │ Secret: ••••••••••••••••                    [Regenerate]       ││
│  │                                                                ││
│  │ Events:                                                        ││
│  │ [x] dispute.filed                                              ││
│  │ [x] dispute.joined                                             ││
│  │ [x] dispute.decided                                            ││
│  │ [x] dispute.resolved                                           ││
│  │ [x] escalation.completed                                       ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  [Save Changes]                                                    │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Arbitrator Dashboard Journeys

### AR-001: Login & Authentication

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Login Page     │────▶│  2FA Code       │────▶│  Dashboard      │
│  Email/Password │     │  Entry          │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Authentication Requirements:**

- Email + Password
- Mandatory 2FA (TOTP)
- Session timeout: 4 hours

---

### AR-002: Queue Management

```
┌────────────────────────────────────────────────────────────────────┐
│  Arbitrator Dashboard                  Jane Smith [Logout]         │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Escalation Queue (8)                        [Refresh] [Settings]  │
│  ─────────────────────────────────────────────                     │
│                                                                    │
│  Urgent (2)                                                        │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ 🔴 ESC-JKL012 | CONTRACT_BREACH | Wait: 18h | SLA: 6h left    ││
│  │    Failed to deliver API endpoints                             ││
│  │    Reason: Party rejected AI decision                   [→]    ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  Standard (6)                                                      │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ 🟢 ESC-MNO345 | PAYMENT_DISPUTE | Wait: 2h | SLA: 46h left    ││
│  │    Invoice payment dispute                                     ││
│  │    Reason: Low AI confidence (72%)                      [→]    ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  [Load More...]                                                    │
│                                                                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │
│  │ Today: 5     │ │ Avg Time:    │ │ SLA Met:     │               │
│  │ completed    │ │ 35 min       │ │ 94%          │               │
│  └──────────────┘ └──────────────┘ └──────────────┘               │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Queue Priority:**

1. Urgent (SLA at risk)
2. Standard FIFO

---

### AR-003: Escalation Review & Decision

```
┌────────────────────────────────────────────────────────────────────┐
│  ← Back to Queue                                                   │
│                                                                    │
│  ESC-JKL012 - CONTRACT_BREACH                    [Claim] [Release] │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Parties: Acme Corp (Claimant) vs TechBot Inc (Respondent)        │
│  Escalation Reason: Party rejected AI decision                     │
│  SLA: 6 hours remaining                                            │
│                                                                    │
│  [AI Decision] [Claimant Submissions] [Respondent Submissions]     │
│  ─────────────────────────────────────────────                     │
│                                                                    │
│  AI Decision (Rejected by Respondent)                              │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ Prevailing Party: CLAIMANT                                     ││
│  │ Confidence: 91%                                                ││
│  │                                                                ││
│  │ Summary: Claimant prevails. Respondent failed to deliver       ││
│  │ agreed deliverables.                                           ││
│  │                                                                ││
│  │ Reasoning: The agreement clearly specified 5 API endpoints     ││
│  │ by January 15. Respondent acknowledges only 2 delivered...     ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  Rejection Reason                                                  │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ "The AI did not consider the email where claimant agreed to    ││
│  │ extend the deadline"                                           ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  Your Decision                                                     │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ Prevailing Party: [CLAIMANT ▼]                                 ││
│  │                                                                ││
│  │ Decision Summary:                                              ││
│  │ ┌──────────────────────────────────────────────────────────┐  ││
│  │ │ Upon review of the additional email evidence, the        │  ││
│  │ │ original AI decision is upheld...                        │  ││
│  │ └──────────────────────────────────────────────────────────┘  ││
│  │                                                                ││
│  │ Detailed Reasoning:                                            ││
│  │ ┌──────────────────────────────────────────────────────────┐  ││
│  │ │ [Rich text editor]                                       │  ││
│  │ └──────────────────────────────────────────────────────────┘  ││
│  │                                                                ││
│  │ Remedies:                                                      ││
│  │ ┌──────────────────────────────────────────────────────────┐  ││
│  │ │ 1. Respondent to refund 60% within 7 business days       │  ││
│  │ │ [+ Add Remedy]                                           │  ││
│  │ └──────────────────────────────────────────────────────────┘  ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  [Save Draft]                                     [Submit Decision] │
│                                                                    │
│  Time on case: 28:45                                               │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Actions:**

- **Claim:** Take ownership of escalation
- **Release:** Return to queue for another arbitrator
- **Save Draft:** Save work in progress
- **Submit Decision:** Finalize and deliver ruling

---

## Admin Dashboard Journeys

### AD-001: System Overview

```
┌────────────────────────────────────────────────────────────────────┐
│  BotEsq Admin                                       [Admin ▼]      │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  System Health                                      Last 24 hours  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐│
│  │ Uptime       │ │ Avg Response │ │ Escalation   │ │ Error Rate ││
│  │ 99.98%       │ │ 1.8s         │ │ Queue: 8     │ │ 0.02%      ││
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘│
│                                                                    │
│  Disputes (MTD)                                                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐│
│  │ Total Filed  │ │ Resolved     │ │ Escalated    │ │ Accept Rate││
│  │ 847          │ │ 792 (93%)    │ │ 41 (5%)      │ │ 86%        ││
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘│
│                                                                    │
│  Revenue (MTD)                                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐│
│  │ Token Sales  │ │ Revenue      │ │ Active Ops   │ │ New Ops    ││
│  │ 4.2M         │ │ $42,000      │ │ 87           │ │ 12         ││
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘│
│                                                                    │
│  [Operators]  [Arbitrators]  [Disputes]  [Audit Log]  [Settings]  │
│                                                                    │
│  Alerts                                                            │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ ⚠ Escalation queue above threshold (8 > 5)         [Dismiss]  ││
│  │ ✓ All arbitrators online                                       ││
│  │ ✓ LLM service healthy                                          ││
│  └────────────────────────────────────────────────────────────────┘│
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
   - Queue for human arbitrator review
   - Retry in 5 minutes
3. No tokens charged for failed AI operations
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
      { "action": "queue_for_human", "description": "Queue for arbitrator review" },
      { "action": "retry", "retry_after_seconds": 300 }
    ]
  }
}
```

---

### E-002: Insufficient Tokens

**Trigger:** Operation cost exceeds available balance

**Handling:**

1. Pre-flight check before expensive operations
2. Return error with required amount
3. Provide link/URL to purchase tokens

**Agent Response:**

```json
{
  "error": {
    "code": "INSUFFICIENT_TOKENS",
    "message": "This operation requires 10,000 tokens, but balance is 5,000",
    "required": 10000,
    "available": 5000,
    "shortfall": 5000,
    "purchase_url": "https://botesq.io/tokens/purchase?amount=5000"
  }
}
```

---

### E-003: Respondent Timeout

**Trigger:** Respondent doesn't join within deadline

**Handling:**

1. Dispute expires after configurable timeout (default: 7 days)
2. Claimant notified
3. Option to refile or get refund

**Agent Response:**

```json
{
  "error": {
    "code": "DISPUTE_EXPIRED",
    "message": "Respondent did not join within the deadline",
    "dispute_id": "DISPUTE-ABC123",
    "expired_at": "2026-02-12T15:30:00Z",
    "options": [
      { "action": "refile", "description": "File a new dispute" },
      { "action": "refund", "description": "Get tokens refunded" }
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

## Screen Inventory

### Public Pages

| Screen           | Route     | Authentication |
| ---------------- | --------- | -------------- |
| Landing Page     | /         | None           |
| Features         | /features | None           |
| Pricing          | /pricing  | None           |
| Documentation    | /docs     | None           |
| Sign Up          | /signup   | None           |
| Login            | /login    | None           |
| Terms of Service | /terms    | None           |
| Privacy Policy   | /privacy  | None           |

### Operator Portal

| Screen           | Route                     | Authentication |
| ---------------- | ------------------------- | -------------- |
| Dashboard        | /portal                   | Operator       |
| Disputes List    | /portal/disputes          | Operator       |
| Dispute Detail   | /portal/disputes/:id      | Operator       |
| Tokens & Billing | /portal/billing           | Operator       |
| API Keys         | /portal/api-keys          | Operator       |
| Settings         | /portal/settings          | Operator       |
| Webhooks         | /portal/settings/webhooks | Operator       |

### Arbitrator Dashboard

| Screen            | Route                      | Authentication |
| ----------------- | -------------------------- | -------------- |
| Login             | /arbitrator/login          | None           |
| Queue             | /arbitrator                | Arbitrator     |
| Escalation Review | /arbitrator/escalation/:id | Arbitrator     |
| My Completed      | /arbitrator/completed      | Arbitrator     |
| Stats             | /arbitrator/stats          | Arbitrator     |
| Profile           | /arbitrator/profile        | Arbitrator     |

### Admin Dashboard

| Screen            | Route                  | Authentication |
| ----------------- | ---------------------- | -------------- |
| Login             | /admin/login           | None           |
| Overview          | /admin                 | Admin          |
| Operators         | /admin/operators       | Admin          |
| Operator Detail   | /admin/operators/:id   | Admin          |
| Arbitrators       | /admin/arbitrators     | Admin          |
| Arbitrator Detail | /admin/arbitrators/:id | Admin          |
| Disputes          | /admin/disputes        | Admin          |
| Dispute Detail    | /admin/disputes/:id    | Admin          |
| Escalations       | /admin/escalations     | Admin          |
| Audit Log         | /admin/audit           | Admin          |
| Settings          | /admin/settings        | Admin          |

---

## Data Loading States

### Loading Patterns

- **Skeleton loaders** for lists and cards
- **Spinner** for action buttons during processing
- **Progress bar** for document uploads
- **Polling indicator** for async operations

### Empty States

| Context         | Message                 | Action                                                    |
| --------------- | ----------------------- | --------------------------------------------------------- |
| No disputes     | "No disputes yet"       | "Your agents haven't filed or been named in any disputes" |
| No documents    | "No documents uploaded" | "Documents will appear when you submit evidence"          |
| No transactions | "No token history"      | "Activity will appear after you use services"             |
| Queue empty     | "All caught up!"        | "Check back later for new escalations"                    |

---

## Responsive Breakpoints

| Breakpoint | Width      | Layout Changes                     |
| ---------- | ---------- | ---------------------------------- |
| Mobile     | < 640px    | Single column, hamburger nav       |
| Tablet     | 640-1024px | Two columns where appropriate      |
| Desktop    | > 1024px   | Full sidebar, multi-column layouts |

All layouts are mobile-first. Desktop is the enhancement.
