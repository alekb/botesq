/**
 * Operator Webhook Service
 *
 * Sends webhook notifications to operators for async events like:
 * - Consultation completed
 * - Document analysis completed
 * - Matter status changes
 */

import crypto from 'crypto'
import { prisma } from '@botesq/database'
import { logger } from '../lib/logger.js'

// Webhook event types
export type WebhookEventType =
  | 'consultation.completed'
  | 'consultation.failed'
  | 'document.analysis_completed'
  | 'matter.status_changed'

export interface WebhookPayload {
  event: WebhookEventType
  timestamp: string
  data: Record<string, unknown>
}

interface WebhookDeliveryResult {
  success: boolean
  statusCode?: number
  error?: string
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

/**
 * Send a webhook notification to an operator
 */
async function sendWebhook(
  webhookUrl: string,
  webhookSecret: string,
  payload: WebhookPayload
): Promise<WebhookDeliveryResult> {
  const body = JSON.stringify(payload)
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signaturePayload = `${timestamp}.${body}`
  const signature = generateSignature(signaturePayload, webhookSecret)

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BotEsq-Signature': signature,
        'X-BotEsq-Timestamp': timestamp,
      },
      body,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })

    if (response.ok) {
      logger.info(
        {
          url: webhookUrl,
          event: payload.event,
          statusCode: response.status,
        },
        'Webhook delivered successfully'
      )
      return { success: true, statusCode: response.status }
    } else {
      logger.warn(
        {
          url: webhookUrl,
          event: payload.event,
          statusCode: response.status,
        },
        'Webhook delivery failed'
      )
      return { success: false, statusCode: response.status }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error(
      {
        url: webhookUrl,
        event: payload.event,
        error: errorMessage,
      },
      'Webhook delivery error'
    )
    return { success: false, error: errorMessage }
  }
}

/**
 * Notify operator when a consultation is completed
 */
export async function notifyConsultationCompleted(
  operatorId: string,
  consultationData: {
    consultationId: string
    externalId: string
    matterId: string
    status: string
    question: string
    response: string | null
    attorneyReviewed: boolean
    completedAt: Date | null
  }
): Promise<void> {
  const operator = await prisma.operator.findUnique({
    where: { id: operatorId },
    select: { webhookUrl: true, webhookSecret: true },
  })

  if (!operator?.webhookUrl || !operator?.webhookSecret) {
    logger.debug({ operatorId }, 'Operator has no webhook configured')
    return
  }

  const payload: WebhookPayload = {
    event: 'consultation.completed',
    timestamp: new Date().toISOString(),
    data: {
      consultation_id: consultationData.externalId,
      internal_id: consultationData.consultationId,
      matter_id: consultationData.matterId,
      status: consultationData.status.toLowerCase(),
      question: consultationData.question,
      response: consultationData.response,
      attorney_reviewed: consultationData.attorneyReviewed,
      completed_at: consultationData.completedAt?.toISOString(),
    },
  }

  await sendWebhook(operator.webhookUrl, operator.webhookSecret, payload)
}

/**
 * Notify operator when a consultation fails
 */
export async function notifyConsultationFailed(
  operatorId: string,
  consultationData: {
    consultationId: string
    externalId: string
    matterId: string
    question: string
    reason: string
  }
): Promise<void> {
  const operator = await prisma.operator.findUnique({
    where: { id: operatorId },
    select: { webhookUrl: true, webhookSecret: true },
  })

  if (!operator?.webhookUrl || !operator?.webhookSecret) {
    return
  }

  const payload: WebhookPayload = {
    event: 'consultation.failed',
    timestamp: new Date().toISOString(),
    data: {
      consultation_id: consultationData.externalId,
      internal_id: consultationData.consultationId,
      matter_id: consultationData.matterId,
      question: consultationData.question,
      reason: consultationData.reason,
    },
  }

  await sendWebhook(operator.webhookUrl, operator.webhookSecret, payload)
}

/**
 * Notify operator when document analysis is completed
 */
export async function notifyDocumentAnalysisCompleted(
  operatorId: string,
  documentData: {
    documentId: string
    externalId: string
    matterId: string
    filename: string
    analysisStatus: string
  }
): Promise<void> {
  const operator = await prisma.operator.findUnique({
    where: { id: operatorId },
    select: { webhookUrl: true, webhookSecret: true },
  })

  if (!operator?.webhookUrl || !operator?.webhookSecret) {
    return
  }

  const payload: WebhookPayload = {
    event: 'document.analysis_completed',
    timestamp: new Date().toISOString(),
    data: {
      document_id: documentData.externalId,
      internal_id: documentData.documentId,
      matter_id: documentData.matterId,
      filename: documentData.filename,
      analysis_status: documentData.analysisStatus.toLowerCase(),
    },
  }

  await sendWebhook(operator.webhookUrl, operator.webhookSecret, payload)
}

/**
 * Generate a new webhook secret for an operator
 */
export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString('hex')}`
}

/**
 * Update operator webhook configuration
 */
export async function updateOperatorWebhook(
  operatorId: string,
  webhookUrl: string | null
): Promise<{ webhookUrl: string | null; webhookSecret: string | null }> {
  if (!webhookUrl) {
    // Clear webhook configuration
    await prisma.operator.update({
      where: { id: operatorId },
      data: { webhookUrl: null, webhookSecret: null },
    })
    return { webhookUrl: null, webhookSecret: null }
  }

  // Validate URL
  try {
    new URL(webhookUrl)
  } catch {
    throw new Error('Invalid webhook URL')
  }

  // Check if operator already has a secret
  const operator = await prisma.operator.findUnique({
    where: { id: operatorId },
    select: { webhookSecret: true },
  })

  const webhookSecret = operator?.webhookSecret || generateWebhookSecret()

  await prisma.operator.update({
    where: { id: operatorId },
    data: { webhookUrl, webhookSecret },
  })

  return { webhookUrl, webhookSecret }
}

/**
 * Regenerate webhook secret for an operator
 */
export async function regenerateWebhookSecret(operatorId: string): Promise<string> {
  const webhookSecret = generateWebhookSecret()

  await prisma.operator.update({
    where: { id: operatorId },
    data: { webhookSecret },
  })

  return webhookSecret
}

/**
 * Get operator webhook configuration
 */
export async function getOperatorWebhookConfig(
  operatorId: string
): Promise<{ webhookUrl: string | null; hasSecret: boolean }> {
  const operator = await prisma.operator.findUnique({
    where: { id: operatorId },
    select: { webhookUrl: true, webhookSecret: true },
  })

  return {
    webhookUrl: operator?.webhookUrl || null,
    hasSecret: !!operator?.webhookSecret,
  }
}
