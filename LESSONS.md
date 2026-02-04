# BotEsq Lessons Learned

## Overview

This file tracks mistakes made, patterns discovered, and rules to prevent repeated errors. Updated after every correction. Reviewed at the start of every session.

---

## Format

Each entry follows this structure:

```
### [DATE] - [SHORT TITLE]

**What went wrong:**
[Description of the error]

**Why it happened:**
[Root cause analysis]

**Rule to prevent:**
[Specific rule to follow going forward]

**Related docs:**
[Links to relevant documentation]
```

---

## Lessons

### 2026-02-03 - Security Must Be Designed Upfront

**What went wrong:**
Security review revealed critical gaps in documentation - password hashing algorithms, S3 policies, and webhook validation were unspecified.

**Why it happened:**
Security was treated as implementation detail rather than design requirement.

**Rule to prevent:**

- Always specify: encryption (rest/transit), auth method, validation schema, signature validation
- Create `docs/SECURITY.md` for every project

**Related docs:**

- docs/SECURITY.md

---

### 2026-02-03 - Environment Variables Need Validation

**What went wrong:**
No mechanism to validate environment variables at startup. Could start with missing secrets.

**Rule to prevent:**

- Create `.env.example` with ALL variables
- Implement Zod validation that fails fast at startup
- Validate format, not just presence (e.g., Stripe keys must start with `sk_`)

**Related docs:**

- .env.example
- packages/shared/src/env.ts

---

### 2026-02-03 - Row-Level Security Pattern

**What went wrong:**
Database queries could potentially return other operators' data if ownership check forgotten.

**Rule to prevent:**
Every query returning user data MUST include ownership check:

```typescript
// CORRECT
const matter = await prisma.matter.findFirst({
  where: { id: matterId, operatorId: auth.operator.id },
})

// WRONG - allows cross-tenant access
const matter = await prisma.matter.findUnique({
  where: { id: matterId },
})
```

---

## Patterns Discovered

### Environment Validation Pattern

```typescript
const result = envSchema.safeParse(process.env)
if (!result.success) {
  console.error('Missing env vars:', result.error.format())
  process.exit(1) // Fail fast
}
```

### Webhook Signature Validation Pattern

```typescript
const expected = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex')

if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
  throw new Error('INVALID_SIGNATURE')
}
```

---

## Common Gotchas

### Stripe Webhooks

- Must use raw body for signature verification
- Must handle idempotency (Stripe retries)

### File Type Detection

- Never trust extension or Content-Type header
- Detect from magic bytes with `file-type` library

### Pre-Signed S3 URLs

- Always verify ownership BEFORE generating
- Short expiry (15 min)
- Log all generations for audit

---

## Review Checklist

Before starting each session, verify:

- [ ] Read all lessons from previous sessions
- [ ] Check if any lessons apply to current task
- [ ] Note any new patterns to watch for
