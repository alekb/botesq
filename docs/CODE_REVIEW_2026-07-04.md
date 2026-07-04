# BotEsq Backend Code Review — 2026-07-04

**Scope:** Committed backend surface as of `6073eb7` (working tree clean, no pending diff). Reviewed in full: `apps/mcp-server/src` (~4,500 lines — all services and tools), `packages/shared/src/env.ts`, and `packages/database/prisma/schema.prisma`. Every file handling auth, money, or documents was read end-to-end.

**Reviewer:** Claude (Principal Engineer / Security Architect review persona)

---

## 📊 Summary Verdict

**[CHANGES REQUESTED]**

The service layer has clean structure and consistent operator-scoping on reads, but the money paths are unsafe: every credit deduction is exposed to race conditions (three of four implementations can drive balances negative or corrupt the ledger), the Stripe webhook can double-credit, and a Prisma enum mismatch guarantees a runtime crash on the most common `ask_legal_question` path. Several security controls added in commit `128c6f8` (env validation) are dead code that nothing calls.

---

## 🚨 Critical Findings (P0/P1)

### P0-1: Guaranteed runtime crash — invalid `ConsultationComplexity` enum value

- **Severity:** [P0 - CRITICAL]
- **Location:** `apps/mcp-server/src/services/queue.service.ts` (Line 68), driven by `apps/mcp-server/src/tools/ask-legal-question.ts` (Lines 158, 185)
- **Symptom:** `queueForHumanReview` writes `complexity.toUpperCase() as 'SIMPLE' | 'STANDARD' | 'COMPLEX'`, but its input type is `'simple' | 'moderate' | 'complex'`. `'moderate'.toUpperCase()` → `'MODERATE'`, which is **not** in the `ConsultationComplexity` enum (`SIMPLE, STANDARD, COMPLEX, URGENT` — `schema.prisma:401-406`). Prisma rejects the write at runtime. `'moderate'` is the hard-coded complexity for the no-LLM path, the LLM-failure fallback, _and_ the most common bucket from `determineComplexity` — so `ask_legal_question` fails with `INTERNAL_ERROR` on its mainline queued path. The `as` cast silenced the compiler; no test covers this.
- **Suggested Fix:**

```typescript
// queue.service.ts
const COMPLEXITY_TO_ENUM = {
  simple: 'SIMPLE',
  moderate: 'STANDARD',
  complex: 'COMPLEX',
} as const satisfies Record<'simple' | 'moderate' | 'complex', ConsultationComplexity>

// in queueForHumanReview:
      complexity: COMPLEXITY_TO_ENUM[complexity],
```

---

### P0-2: Credit deduction race conditions — lost updates, negative balances, corrupt ledger

- **Severity:** [P0 - CRITICAL]
- **Location:** `apps/mcp-server/src/services/credit.service.ts` (Lines 70-109); `apps/mcp-server/src/tools/submit-document.ts` (Lines 97, 113-131); `apps/mcp-server/src/tools/request-consultation.ts` (Lines 45-47, 60-84); `apps/mcp-server/src/tools/ask-legal-question.ts` (Lines 215-249)
- **Symptom:** There are **four separate credit-deduction implementations**, and all are race-unsafe at PostgreSQL's default READ COMMITTED isolation (a `prisma.$transaction` callback does not lock rows it merely reads):
  1. `credit.service.ts#deductCredits` does read → check → `update({ creditBalance: balanceAfter })` with a _computed absolute value_. Two concurrent deductions both read 1000, both write 500 → one deduction is silently lost (direct revenue loss). `addCredits`/`refundCredits` have the same lost-update bug, so a concurrent purchase and deduction can erase each other.
  2. `submit-document.ts` and `request-consultation.ts` check the balance against the **operator snapshot fetched at session auth** (stale by seconds — an S3 upload happens in between) and then `decrement` unconditionally with **no in-transaction balance check**. Concurrent submissions drive `creditBalance` negative (no DB CHECK constraint exists), i.e., unlimited service on zero credits.
  3. All four write `balanceBefore`/`balanceAfter` ledger rows computed from stale reads, so `credit_transactions` — the financial audit trail for a law firm — records false balances under any concurrency.
- **Suggested Fix:** One canonical, atomic implementation in `credit.service.ts`; delete the three copies and route all tools through it. The conditional `updateMany` takes the row lock and enforces the invariant in a single statement:

```typescript
export async function deductCredits(
  operatorId: string,
  amount: number,
  description: string,
  referenceType?: string,
  referenceId?: string
): Promise<{ newBalance: number }> {
  return await prisma.$transaction(async (tx) => {
    // Atomic check-and-decrement: only succeeds if balance is sufficient.
    const updated = await tx.operator.updateMany({
      where: { id: operatorId, creditBalance: { gte: amount } },
      data: { creditBalance: { decrement: amount } },
    })

    if (updated.count === 0) {
      const exists = await tx.operator.findUnique({
        where: { id: operatorId },
        select: { id: true },
      })
      if (!exists) throw new PaymentError('OPERATOR_NOT_FOUND', 'Operator not found')
      throw new PaymentError('INSUFFICIENT_CREDITS', 'Not enough credits')
    }

    // Row lock is held until commit, so this read is stable.
    const operator = await tx.operator.findUniqueOrThrow({
      where: { id: operatorId },
      select: { creditBalance: true },
    })

    await tx.creditTransaction.create({
      data: {
        operatorId,
        type: 'DEDUCTION',
        amount: -amount,
        balanceBefore: operator.creditBalance + amount,
        balanceAfter: operator.creditBalance,
        description,
        referenceType,
        referenceId,
      },
    })

    return { newBalance: operator.creditBalance }
  })
}
```

Additionally add a raw-SQL migration as a backstop:

```sql
ALTER TABLE operators ADD CONSTRAINT credit_balance_non_negative CHECK (credit_balance >= 0);
```

---

### P0-3: Stripe webhook double-credit race

- **Severity:** [P0 - CRITICAL]
- **Location:** `apps/mcp-server/src/services/stripe.service.ts` (Lines 175-211)
- **Symptom:** `handleCheckoutCompleted` does check-then-act: read `payment.status`, skip if `COMPLETED`, else `addCredits(...)` then mark `COMPLETED`. Stripe explicitly retries webhooks and deliveries can arrive concurrently — two deliveries both pass the `PENDING` check and both credit the operator (free money). Signature verification (line 149) is correctly implemented, but idempotency is not. Secondary issue: credits are taken from `session.metadata` (line 177) instead of the authoritative `payment.credits` record, and `session.amount_total` is never reconciled against `payment.amountUsd`.
- **Suggested Fix:**

```typescript
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { stripeCheckoutSessionId: session.id },
  })

  if (!payment) {
    console.error('Payment record not found for session:', session.id)
    return
  }

  // Atomically claim the payment — exactly one concurrent delivery wins.
  const claimed = await prisma.payment.updateMany({
    where: { id: payment.id, status: 'PENDING' },
    data: {
      status: 'COMPLETED',
      stripePaymentIntentId: session.payment_intent as string | undefined,
      completedAt: new Date(),
    },
  })

  if (claimed.count === 0) return // already processed

  // Credit from our own record, not Stripe metadata.
  await addCredits(
    payment.operatorId,
    payment.credits,
    `Credit purchase: $${payment.amountUsd / 100}`,
    'payment',
    payment.id
  )
}
```

(Ideally the claim and `addCredits` share one transaction so a crash between them can't strand a paid-but-uncredited payment; at minimum, log loudly if `addCredits` throws after a successful claim.)

---

### P1-1: Retainer pre-authorization bypass + plaintext token with non-constant-time compare

- **Severity:** [P1 - MAJOR]
- **Location:** `apps/mcp-server/src/tools/accept-retainer.ts` (Lines 84-92); `apps/mcp-server/src/services/retainer.service.ts` (Lines 285-294)
- **Symptom:** Pre-authorization bypass on a **legally binding contract**. If the operator has a `preAuthToken` configured but the agent provides none, the tool sets `signatureMethod = 'agent_preauth'` and calls `acceptRetainer` with `preAuthToken: undefined` — and the service only validates the token `if (preAuthToken)` is truthy. So possession of the token is never demonstrated; any session under that operator can execute a retainer agreement. The token exists precisely to gate which agents may contractually bind the operator. Compounding: the token is stored in **plaintext** (`operators.pre_auth_token`) and compared with `!==` (non-constant-time) at `retainer.service.ts:291`, while API keys are correctly SHA-256-hashed — inconsistent secret handling.
- **Suggested Fix:**

```typescript
// accept-retainer.ts — pre-auth acceptance always requires presenting the token
if (!providedPreAuth) {
  return {
    /* existing 'pending_manual' response from lines 54-75 */
  }
}
const signatureMethod = 'agent_preauth'
const acceptedBy = `agent:${session.agentId ?? 'unknown'}`
```

```typescript
// retainer.service.ts — constant-time comparison (and store a hash, not the token)
import { createHash, timingSafeEqual } from 'crypto'

const expected = createHash('sha256')
  .update(operator?.preAuthToken ?? '')
  .digest()
const provided = createHash('sha256').update(preAuthToken).digest()
if (!operator?.preAuthToken || !timingSafeEqual(expected, provided)) {
  throw new Error('Invalid pre-authorization token')
}
```

---

### P1-2: Paid document analysis never runs

- **Severity:** [P1 - MAJOR]
- **Location:** `apps/mcp-server/src/services/document-analysis.service.ts` (Lines 179-197); `apps/mcp-server/src/tools/submit-document.ts` (Lines 134-137, 151)
- **Symptom:** Customers are charged for a service that never runs. `queueDocumentAnalysis` is a logging stub — it queues nothing and `analyzeDocument` has zero callers in the codebase. Yet `submit_document` deducts 2,500–10,000 credits and returns `estimated_analysis_time_minutes`, promising a result. Every submitted document stays `PENDING` forever; `get_document_analysis` will report "pending" indefinitely. This is billing for undelivered work, which for a legal-services product is also a professional-responsibility problem.
- **Suggested Fix:** Until a real worker exists, either (a) invoke `analyzeDocument` inline/fire-and-forget from `queueDocumentAnalysis` (content is already in memory at submit time), or (b) stop charging at submission and charge on analysis completion. Minimal (a):

```typescript
export async function queueDocumentAnalysis(params: {
  documentId: string
  operatorId: string
  content: string
  filename: string
  documentType?: string
}): Promise<void> {
  // TODO: replace with real job queue. Fire-and-forget so the tool call returns fast.
  void analyzeDocument(params).catch((error) => {
    logger.error({ documentId: params.documentId, error }, 'Async document analysis failed')
  })
}
```

---

### P1-3: LLM-failure catch swallows non-LLM errors — duplicate consultations, bypassed pricing check

- **Severity:** [P1 - MAJOR]
- **Location:** `apps/mcp-server/src/tools/ask-legal-question.ts` (Lines 78-177)
- **Symptom:** The `catch` at line 149 wraps far more than the LLM call. Two concrete failures: (1) if `queueForHumanReview` (line 96) succeeds but `deductCredits` (line 107) throws, the catch queues a **second, duplicate consultation** and deducts again — an attorney answers the same question twice and the customer may be charged twice; (2) the `PaymentError` thrown at line 91 (insufficient credits for the actual complexity) is swallowed and converted into a _cheaper_ queued consultation instead of being surfaced — the pricing check is bypassable by design of the control flow.
- **Suggested Fix:** Scope the `try` strictly to `generateLegalResponse`, and rethrow non-LLM errors:

```typescript
let legalResponse: LegalResponse | null = null
if (isLLMAvailable()) {
  try {
    legalResponse = await generateLegalResponse({
      question: input.question,
      jurisdiction: input.jurisdiction,
      context: input.context,
    })
  } catch (error) {
    logger.warn({ error }, 'LLM failed, falling back to human queue')
    legalResponse = null // fall through to the queue path below
  }
}
// Single post-LLM flow: pricing check, queue-or-answer, deduct — outside any catch.
```

---

### P1-4: Rate limiting trivially bypassed; `start_session` unthrottled

- **Severity:** [P1 - MAJOR]
- **Location:** `apps/mcp-server/src/services/rate-limit.service.ts` (Lines 18-58); `apps/mcp-server/src/tools/start-session.ts` (whole file)
- **Symptom:** Rate limiting is keyed by **session token**, and `start_session` is the only tool with no rate limit at all. Any agent can mint a fresh session (`session.service.ts:46` — unlimited, no per-operator session cap) whenever it hits a limit, resetting its windows; effective rate limit is therefore infinite. Worse, the unthrottled, unauthenticated `start_session` is the API-key brute-force surface. The in-memory store also silently resets on restart and cannot work multi-instance (comment acknowledges this, but the key choice is the exploitable part).
- **Suggested Fix:** Key the windows by `operatorId` (available post-auth in every handler: `checkRateLimit(operator.id)`), and add a separate, stricter limiter for `start_session` keyed by a hash of the presented API key, applied _before_ the DB lookup.

---

### P1-5: Secrets/PII logged at debug level; raw internal errors returned to clients

- **Severity:** [P1 - MAJOR]
- **Location:** `apps/mcp-server/src/server.ts` (Lines 81, 153-169)
- **Symptom:** `logger.debug({ tool: name, args }, 'Executing tool')` logs **raw tool arguments**, which include the operator's `api_key` on `start_session`, session tokens on every call, full base64 document content, and privileged legal questions. Debug level is active whenever `NODE_ENV !== 'production'` — i.e., staging and any prod box with a missing env var writes credentials to logs. Separately, the unknown-error handler (line 154) returns raw `error.message` to the client — Prisma validation errors embed schema/field details (the P0-1 enum bug would leak the internal model shape to every caller).
- **Suggested Fix:**

```typescript
const REDACTED_KEYS = new Set(['api_key', 'session_token', 'content_base64', 'pre_auth_token'])
function redact(args: unknown): unknown {
  if (!args || typeof args !== 'object') return args
  return Object.fromEntries(
    Object.entries(args as Record<string, unknown>).map(([k, v]) => [
      k,
      REDACTED_KEYS.has(k) ? '[REDACTED]' : v,
    ])
  )
}
logger.debug({ tool: name, args: redact(args) }, 'Executing tool')
```

```typescript
// Unknown error: log the real error, return a generic message
logger.error({ tool: name, error }, 'Tool execution failed')
text: JSON.stringify({
  success: false,
  error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
})
```

---

### P1-6: Session revocation doesn't exist — `endedAt` never checked

- **Severity:** [P1 - MAJOR]
- **Location:** `apps/mcp-server/src/services/auth.service.ts` (Lines 70-107); `apps/mcp-server/src/services/session.service.ts` (Lines 113-118)
- **Symptom:** `endSession` sets `endedAt`, but `authenticateSession` never checks it — an "ended" session authenticates until its 24h TTL. Today this is masked only because `endSession` has zero callers (itself dead code — no `end_session` tool is registered despite the session lifecycle implying one). There is no way to kill a leaked session token short of revoking the whole API key.
- **Suggested Fix:**

```typescript
if (session.endedAt) {
  throw new AuthError('SESSION_ENDED', 'Session has been ended')
}
```

…and either register an `end_session` tool or delete `endSession`.

---

### P1-7: `env.ts` validation is dead code; unbounded base64 decode before size check

- **Severity:** [P1 - MAJOR]
- **Location:** `packages/shared/src/env.ts` (whole file); `apps/mcp-server/src/config.ts` (Lines 3-29); `apps/mcp-server/src/tools/submit-document.ts` (Line 90)
- **Symptom:** Two related gaps from the security commit (`128c6f8`): (1) `validateEnv()` is **dead code** — nothing outside `packages/shared` imports it; the MCP server uses its own weaker schema in `config.ts` where every secret is `optional()`, and the two schemas conflict (`S3_BUCKET` vs `AWS_S3_BUCKET`, `PORT` 3000 vs 3001, `API_KEY_SALT` defined but never used by `auth.service`), so wiring it later will misconfigure silently. (2) `submit_document` decodes unbounded `content_base64` into memory _before_ any size check — the 10MB `MAX_FILE_SIZE` in `storage.service.ts:254` runs only after full decode, so a multi-hundred-MB payload is fully buffered (memory DoS), and cost is capped at 10,000 credits regardless of size. MIME type is derived from the filename extension only (magic-byte validation is tracked as pending in PROGRESS.md — confirmed not yet implemented anywhere).
- **Suggested Fix:** Call `validateEnv()` from `apps/mcp-server/src/index.ts` and make `config.ts` consume it (delete the duplicate schema). In `submit-document.ts`, bound the input before decoding:

```typescript
const MAX_BASE64_LENGTH = Math.ceil((MAX_FILE_SIZE * 4) / 3) + 4
// in schema:
  content_base64: z.string().min(1, 'Content is required').max(MAX_BASE64_LENGTH, 'File too large'),
```

---

### P1-8: TOTP QR code sitting in Dropbox-synced repo directory

- **Severity:** [P1 - MAJOR]
- **Location:** `admin-totp-qr.png` (untracked, repo root)
- **Symptom:** A TOTP provisioning QR code encodes the shared TOTP secret in cleartext. This file is sitting in a **Dropbox-synced** project directory, is not covered by `.gitignore`, and is one careless `git add .` away from being committed to history. If it's the admin account's 2FA secret, anyone with Dropbox access to this folder can mint valid TOTP codes.
- **Suggested Fix:** Delete the file after enrollment (the secret now lives in the authenticator app); if a backup is needed, store it in a password manager. Add an explicit `admin-totp-qr.png` entry (or root-level `*.png`) to `.gitignore` as a guard. Rotate the TOTP secret if this file has already synced anywhere shared.

---

## 💡 Suggestions & Code Health (P2)

### Instant Q&A answers never persisted; `AuditLog` model never written

- **Location:** `apps/mcp-server/src/tools/ask-legal-question.ts` (Lines 124-127)
- **Critique:** Instant Q&A answers are never persisted — the only record is a `creditTransaction` with `referenceId: instant_${Date.now()}` (collision-prone under concurrency). For a firm rendering legal information, there is no audit trail of what was actually told to the client. The schema has an `AuditLog` model (`schema.prisma:539`) that **nothing writes to**.
- **Example:** Persist instant answers (question, answer, confidence, disclaimers shown) to a table or the existing `Consultation` model with a `status: 'INSTANT_COMPLETED'`, and use `nanoid()` instead of `Date.now()` for IDs.

### Legacy `ml_live_` API key prefix survived the MoltLaw → BotEsq rename

- **Location:** `apps/mcp-server/src/services/auth.service.ts` (Lines 16-27)
- **Critique:** API keys are still generated with the legacy `ml_live_` (MoltLaw) prefix despite the BotEsq rename in `5625b49`/`eeab4b5` — new keys will carry the wrong brand forever, and changing later invalidates prefix-based recognition. Also `prefix` the constant (`'ml_live_'`, 8 chars) and `prefix` the returned field (`key.slice(0, 16)`) are different things sharing a name.
- **Example:** `const KEY_PREFIX = 'besq_live_'` now, before any real keys are issued; return `{ key, displayPrefix: key.slice(0, 16), hash }`.

### Brittle string-matching error dispatch; untyped service errors; accept race

- **Location:** `apps/mcp-server/src/tools/accept-retainer.ts` (Lines 140-150)
- **Critique:** Error dispatch via `message.includes('expired')` / `message.includes('Invalid pre-authorization')` is brittle string matching on `Error.message`; a rewording in `retainer.service.ts` silently changes API error codes. The service also throws bare `Error` while the rest of the codebase uses typed `ApiError`s, and `acceptRetainer`'s status check → update is itself a small read-then-write race (two concurrent accepts both succeed).
- **Example:** Throw `ApiError('RETAINER_EXPIRED', …)` from the service and let it propagate; guard acceptance with `updateMany({ where: { id, status: 'PENDING' }, … })`.

### Fragile success URL concatenation; `amountUsd` column stores cents

- **Location:** `apps/mcp-server/src/services/stripe.service.ts` (Line 102); `packages/database/prisma/schema.prisma` (Line 495)
- **Critique:** `${config.stripe.successUrl}&session_id=...` assumes the configured URL already contains a query string — a plain URL yields a malformed `...&session_id=...`. And `Payment.amountUsd` stores **cents** (`amountUsd: amountCents`), a naming trap that already forces `/ 100` at call sites.
- **Example:** `const sep = successUrl.includes('?') ? '&' : '?'`; rename the column to `amountCents` while there's no production data.

### Test coverage limited to pure conversion functions

- **Location:** `apps/mcp-server/src/__tests__/credit.service.test.ts` (whole file)
- **Critique:** The only backend tests cover pure USD↔credit conversion. None of the failure modes found above — concurrent deduction, webhook idempotency, the `MODERATE` enum path, pre-auth acceptance — has coverage; each P0 here is reachable by a two-line integration test with a test database.
- **Example:** `await Promise.all([deductCredits(op, 600), deductCredits(op, 600)])` against a seeded balance of 1000 must yield exactly one `INSUFFICIENT_CREDITS` and a final balance of 400.

### Fabricated rate-limit counts in `get_session_info`; un-unref'd interval

- **Location:** `apps/mcp-server/src/services/session.service.ts` (Lines 89-92); `apps/mcp-server/src/services/rate-limit.service.ts` (Line 108)
- **Critique:** `getSessionInfo` reports `requests_this_minute` as `min(total requestCount, limit)` — fabricated numbers presented as fact to API consumers (the real limiter state in `getRateLimitStatus` exists but isn't used here). The cleanup `setInterval` is never `unref()`'d, which keeps test processes and graceful shutdowns hanging.
- **Example:** Use `getRateLimitStatus(sessionToken)` for the counts; `setInterval(...).unref()`.

---

## Cross-Cutting Observations

- The four-way duplication of credit deduction (P0-2) is the biggest architectural smell — consolidating it fixes correctness, ledger integrity, and the `creditsCharged` inconsistency (set by `request_consultation`, never by `ask_legal_question`'s queued path) in one move.
- The read-path tenancy story is genuinely solid: every `get*/list*` service function scopes by `operatorId`, external/internal ID lookup is consistent, and webhook signature verification and S3 presigning are correctly implemented.
- All issues above are concentrated in write paths and concurrency, and all are fixable without architectural change.

## Suggested Fix Order

1. **P0-1** enum crash (one-line fix, unblocks the core product path)
2. **P0-2** consolidate credit deduction + DB CHECK constraint
3. **P0-3** webhook idempotency claim
4. **P1-1** pre-auth bypass (legal exposure)
5. **P1-3** catch-scope fix in `ask_legal_question` (depends on P0-2's shared `deductCredits`)
6. Remaining P1s (analysis worker, rate-limit rekey, log redaction, `endedAt` check, env wiring, upload bounds, TOTP file cleanup)
7. P2 cleanups + integration tests locking in the P0 fixes
