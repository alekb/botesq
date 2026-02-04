# BotEsq Security Guide

Security requirements, implementation patterns, and checklists for the BotEsq platform.

---

## Password & Key Hashing

### Passwords: Argon2id

```typescript
import { hash, verify } from '@node-rs/argon2'

const ARGON2_CONFIG = {
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4,
  hashLength: 32,
}

async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_CONFIG)
}
```

### API Keys: SHA-256

```typescript
import { createHash, randomBytes } from 'crypto'

function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = `be_${randomBytes(32).toString('base64url')}`
  const hash = createHash('sha256').update(key).digest('hex')
  return { key, hash, prefix: key.slice(0, 11) }
}
```

---

## S3 Security

### Bucket Configuration

| Setting               | Value            |
| --------------------- | ---------------- |
| Encryption            | AES-256 (SSE-S3) |
| Versioning            | Enabled          |
| Block Public Access   | All 4 options    |
| Pre-signed URL Expiry | 15 minutes       |

### Download Authorization

```typescript
async function getDocumentDownloadUrl(s3Key: string, operatorId: string) {
  // CRITICAL: Verify ownership first
  const doc = await prisma.document.findFirst({
    where: { s3Key, operatorId, deletedAt: null },
  })
  if (!doc) throw new AuthError('UNAUTHORIZED')

  return getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: s3Key,
    }),
    { expiresIn: 900 }
  )
}
```

---

## File Upload Security

### Validation Pipeline

1. **Size check**: Max 10 MB
2. **Magic bytes**: Detect actual type (not extension)
3. **Whitelist**: PDF, DOCX, DOC, TXT, PNG, JPEG only
4. **Sanitize filename**: Remove path traversal
5. **Virus scan**: ClamAV before storage

```typescript
import { fileTypeFromBuffer } from 'file-type'

const ALLOWED = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

async function validateUpload(base64: string, filename: string) {
  const buffer = Buffer.from(base64, 'base64')
  if (buffer.length > 10 * 1024 * 1024) throw new Error('FILE_TOO_LARGE')

  const detected = await fileTypeFromBuffer(buffer)
  if (!detected || !ALLOWED.has(detected.mime)) throw new Error('INVALID_FILE_TYPE')

  return { buffer, mimeType: detected.mime }
}
```

---

## Webhook Security

### Stripe Validation

```typescript
const event = stripe.webhooks.constructEvent(
  request.rawBody,
  request.headers['stripe-signature'],
  process.env.STRIPE_WEBHOOK_SECRET!
)
```

### Provider Webhook Validation

```typescript
import { createHmac, timingSafeEqual } from 'crypto'

function verifyProviderWebhook(
  payload: string,
  signature: string,
  secret: string,
  timestamp: string
) {
  // Reject if older than 5 minutes
  if (Math.abs(Date.now() - parseInt(timestamp) * 1000) > 300000) {
    throw new Error('WEBHOOK_EXPIRED')
  }

  const expected = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex')

  return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))
}
```

---

## Rate Limiting

| Scope        | Limit                             |
| ------------ | --------------------------------- |
| Per session  | 10 req/min, 100 req/hour          |
| Per API key  | 1000 req/day                      |
| Per operator | 20 docs/day, 5 concurrent matters |

---

## Input Validation

All inputs validated with Zod. Example:

```typescript
const askLegalQuestionSchema = z.object({
  session_token: z.string().startsWith('sess_'),
  question: z.string().min(10).max(5000),
  jurisdiction: z.string().max(100).optional(),
})
```

---

## LLM Security

### Prompt Injection Prevention

```typescript
function sanitizeLLMInput(input: string): string {
  const patterns = [/ignore previous/gi, /system prompt/gi, /you are now/gi]
  let sanitized = input
  for (const p of patterns) sanitized = sanitized.replace(p, '[FILTERED]')
  return sanitized
}
```

---

## Pre-Production Checklist

### Authentication

- [ ] Argon2id for passwords
- [ ] SHA-256 for API keys
- [ ] Session tokens 32+ chars, 24h expiry
- [ ] Row-level security on ALL queries

### File Storage

- [ ] S3 private, no public access
- [ ] Encryption at rest
- [ ] Pre-signed URLs with ownership check
- [ ] Virus scanning

### Payments

- [ ] Stripe webhook signature validation
- [ ] Idempotency keys for credits
- [ ] No test keys in production

### Infrastructure

- [ ] HTTPS only
- [ ] Security headers (Helmet)
- [ ] Rate limiting enabled
- [ ] Secrets in env vars (not code)

### CI/CD

- [ ] `pnpm audit` in pipeline
- [ ] Secrets detection
- [ ] Dependency review on PRs
