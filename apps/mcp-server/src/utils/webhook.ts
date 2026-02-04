import { createHmac, timingSafeEqual, randomBytes } from 'crypto'

/**
 * Webhook signature validation error
 */
export class WebhookError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message)
    this.name = 'WebhookError'
  }
}

/**
 * Maximum age for webhook timestamps (5 minutes in milliseconds)
 */
const WEBHOOK_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000

/**
 * Verify a provider webhook signature using HMAC-SHA256
 *
 * Signature format: t=<timestamp>,v1=<hmac_hex>
 * The HMAC is computed over: <timestamp>.<payload>
 *
 * @param payload - Raw webhook payload (string or Buffer)
 * @param signature - Signature header value
 * @param secret - Webhook secret for this provider
 * @throws WebhookError if signature is invalid or expired
 */
export function verifyProviderWebhook(
  payload: string | Buffer,
  signature: string,
  secret: string
): { timestamp: number; verified: boolean } {
  // Parse signature header
  const parts = signature.split(',')
  const timestampPart = parts.find((p) => p.startsWith('t='))
  const signaturePart = parts.find((p) => p.startsWith('v1='))

  if (!timestampPart || !signaturePart) {
    throw new WebhookError('INVALID_SIGNATURE_FORMAT', 'Invalid webhook signature format')
  }

  const timestamp = parseInt(timestampPart.slice(2), 10)
  const providedSignature = signaturePart.slice(3)

  if (isNaN(timestamp)) {
    throw new WebhookError('INVALID_TIMESTAMP', 'Invalid webhook timestamp')
  }

  // Check timestamp is within tolerance (prevent replay attacks)
  const now = Date.now()
  const webhookTime = timestamp * 1000 // Convert to milliseconds

  if (Math.abs(now - webhookTime) > WEBHOOK_TIMESTAMP_TOLERANCE_MS) {
    throw new WebhookError(
      'WEBHOOK_EXPIRED',
      'Webhook timestamp is too old or too far in the future'
    )
  }

  // Compute expected signature
  const payloadString = typeof payload === 'string' ? payload : payload.toString('utf8')
  const signedPayload = `${timestamp}.${payloadString}`

  const expectedSignature = createHmac('sha256', secret).update(signedPayload).digest('hex')

  // Use timing-safe comparison to prevent timing attacks
  const providedBuffer = Buffer.from(providedSignature, 'hex')
  const expectedBuffer = Buffer.from(expectedSignature, 'hex')

  if (providedBuffer.length !== expectedBuffer.length) {
    throw new WebhookError('INVALID_SIGNATURE', 'Invalid webhook signature')
  }

  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    throw new WebhookError('INVALID_SIGNATURE', 'Invalid webhook signature')
  }

  return { timestamp, verified: true }
}

/**
 * Generate a webhook signature for outbound webhooks
 * Use this when BotEsq needs to send webhooks to operators
 *
 * @param payload - Payload to sign
 * @param secret - Webhook secret
 * @param timestamp - Optional timestamp (defaults to current time)
 * @returns Signature header value in format: t=<timestamp>,v1=<signature>
 */
export function generateWebhookSignature(
  payload: string | Buffer,
  secret: string,
  timestamp?: number
): string {
  const ts = timestamp ?? Math.floor(Date.now() / 1000)
  const payloadString = typeof payload === 'string' ? payload : payload.toString('utf8')
  const signedPayload = `${ts}.${payloadString}`

  const signature = createHmac('sha256', secret).update(signedPayload).digest('hex')

  return `t=${ts},v1=${signature}`
}

/**
 * Generate a secure webhook secret for a provider
 * @returns A 32-byte hex-encoded secret with whsec_ prefix
 */
export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(32).toString('hex')}`
}
