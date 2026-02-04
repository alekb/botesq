import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma, Prisma } from '@botesq/database'
import type { ProviderRequestStatus } from '@botesq/database'
import { verifyWebhookSignature } from '../utils/webhook.js'
import { logger } from '../lib/logger.js'
import { ApiError } from '../types.js'

/**
 * Webhook callback payload schema
 */
const callbackSchema = z.object({
  requestId: z.string(),
  status: z.enum(['COMPLETED', 'FAILED', 'REQUIRES_ESCALATION']),
  content: z
    .object({
      answer: z.string().optional(),
      analysis: z.string().optional(),
      summary: z.string().optional(),
      recommendations: z.array(z.string()).optional(),
      citations: z.array(z.string()).optional(),
      confidence: z.number().min(0).max(1).optional(),
      complexity: z.enum(['SIMPLE', 'MODERATE', 'COMPLEX']).optional(),
    })
    .optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
  escalation: z
    .object({
      reason: z.string(),
      suggestedAction: z.string().optional(),
    })
    .optional(),
  creditsUsed: z.number().int().min(0).optional(),
  processingTimeMs: z.number().int().min(0).optional(),
})

/**
 * Register provider webhook routes (for external provider callbacks)
 */
export function registerProviderWebhookRoutes(app: FastifyInstance): void {
  /**
   * POST /api/provider/callback — Receive async response from external provider
   *
   * External providers call this endpoint when they complete processing a request.
   * The request must include a valid signature header.
   */
  app.post('/api/provider/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    // Get request ID from header
    const requestId = request.headers['x-botesq-request-id'] as string
    if (!requestId) {
      throw new ApiError('MISSING_REQUEST_ID', 'X-BotEsq-Request-Id header is required', 400)
    }

    // Find the provider request
    const providerRequest = await prisma.providerRequest.findFirst({
      where: {
        OR: [{ id: requestId }, { externalId: requestId }],
      },
      include: {
        provider: true,
      },
    })

    if (!providerRequest) {
      logger.warn({ requestId }, 'Callback received for unknown request')
      throw new ApiError('REQUEST_NOT_FOUND', 'Request not found', 404)
    }

    // Verify webhook signature
    const signature = request.headers['x-botesq-signature'] as string
    const timestamp = request.headers['x-botesq-timestamp'] as string

    if (!signature || !timestamp) {
      throw new ApiError('MISSING_SIGNATURE', 'Webhook signature headers are required', 401)
    }

    const rawBody = JSON.stringify(request.body)
    const secret = providerRequest.provider.webhookSecret || ''

    const isValid = verifyWebhookSignature(rawBody, secret, parseInt(timestamp, 10), signature)

    if (!isValid) {
      logger.warn(
        { requestId, providerId: providerRequest.providerId },
        'Invalid webhook signature'
      )
      throw new ApiError('INVALID_SIGNATURE', 'Invalid webhook signature', 401)
    }

    // Verify timestamp is recent (within 5 minutes)
    const timestampAge = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10))
    if (timestampAge > 300) {
      throw new ApiError('STALE_TIMESTAMP', 'Webhook timestamp is too old', 401)
    }

    // Parse and validate body
    const body = callbackSchema.parse(request.body)

    // Check if already processed
    if (providerRequest.status === 'COMPLETED' || providerRequest.status === 'FAILED') {
      logger.info({ requestId }, 'Callback received for already-processed request')
      return reply.status(200).send({
        success: true,
        message: 'Request already processed',
        status: providerRequest.status,
      })
    }

    // Map status
    const statusMap: Record<string, ProviderRequestStatus> = {
      COMPLETED: 'COMPLETED',
      FAILED: 'FAILED',
      REQUIRES_ESCALATION: 'COMPLETED', // We still mark as completed but flag escalation
    }

    const finalStatus = statusMap[body.status] || 'FAILED'

    // Calculate provider earnings
    const service = await prisma.providerService.findUnique({
      where: {
        providerId_serviceType: {
          providerId: providerRequest.providerId,
          serviceType: providerRequest.serviceType,
        },
      },
    })

    const providerEarnings = finalStatus === 'COMPLETED' && service ? service.basePrice : 0

    // Build response payload
    const responsePayload: Record<string, unknown> = {}
    if (body.content) {
      responsePayload.content = body.content
    }
    if (body.error) {
      responsePayload.error = body.error
    }
    if (body.escalation) {
      responsePayload.escalation = body.escalation
      responsePayload.requiresEscalation = true
    }
    if (body.creditsUsed !== undefined) {
      responsePayload.creditsUsed = body.creditsUsed
    }
    if (body.processingTimeMs !== undefined) {
      responsePayload.processingTimeMs = body.processingTimeMs
    }

    // Update the request
    const updated = await prisma.providerRequest.update({
      where: { id: providerRequest.id },
      data: {
        status: finalStatus,
        responsePayload: responsePayload as Prisma.InputJsonValue,
        responseAt: new Date(),
        creditsCharged: body.creditsUsed || 0,
        providerEarnings,
      },
    })

    // Update service current load
    if (service) {
      await prisma.providerService.update({
        where: { id: service.id },
        data: {
          currentLoad: { decrement: 1 },
        },
      })
    }

    logger.info(
      {
        requestId: providerRequest.id,
        providerId: providerRequest.providerId,
        status: finalStatus,
        hasEscalation: !!body.escalation,
      },
      'Provider callback processed'
    )

    // If there's a matter associated, we might need to update it
    if (providerRequest.matterId && finalStatus === 'COMPLETED') {
      // Could trigger matter update or notification here
      logger.debug(
        { matterId: providerRequest.matterId },
        'Request associated with matter completed'
      )
    }

    // If there's a consultation associated, update it
    if (providerRequest.consultationId && finalStatus === 'COMPLETED') {
      await prisma.consultation.update({
        where: { id: providerRequest.consultationId },
        data: {
          status: body.escalation ? 'PENDING_REVIEW' : 'COMPLETED',
          finalResponse: body.content?.answer,
          completedAt: body.escalation ? undefined : new Date(),
        },
      })
    }

    return reply.status(200).send({
      success: true,
      data: {
        requestId: updated.externalId || updated.id,
        status: updated.status,
        processedAt: updated.responseAt?.toISOString(),
      },
    })
  })

  /**
   * POST /api/provider/callback/health — Health check for callback endpoint
   *
   * External providers can use this to verify connectivity.
   */
  app.get(
    '/api/provider/callback/health',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.status(200).send({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version ?? '0.0.1',
      })
    }
  )

  /**
   * POST /api/provider/callback/test — Test webhook endpoint (only in development)
   *
   * Allows providers to test their webhook integration without affecting real data.
   */
  if (process.env.NODE_ENV !== 'production') {
    app.post(
      '/api/provider/callback/test',
      async (request: FastifyRequest, reply: FastifyReply) => {
        const signature = request.headers['x-botesq-signature'] as string
        const timestamp = request.headers['x-botesq-timestamp'] as string
        const providerId = request.headers['x-provider-id'] as string

        if (!providerId) {
          throw new ApiError(
            'MISSING_PROVIDER_ID',
            'X-Provider-Id header is required for testing',
            400
          )
        }

        // Find provider to get webhook secret
        const provider = await prisma.provider.findFirst({
          where: {
            OR: [{ id: providerId }, { externalId: providerId }],
          },
        })

        if (!provider) {
          throw new ApiError('PROVIDER_NOT_FOUND', 'Provider not found', 404)
        }

        // Verify signature if provided
        let signatureValid = false
        if (signature && timestamp) {
          const rawBody = JSON.stringify(request.body)
          signatureValid = verifyWebhookSignature(
            rawBody,
            provider.webhookSecret || '',
            parseInt(timestamp, 10),
            signature
          )
        }

        // Parse body to validate structure
        let bodyValid = false
        let bodyErrors: string[] = []
        try {
          callbackSchema.parse(request.body)
          bodyValid = true
        } catch (error) {
          if (error instanceof z.ZodError) {
            bodyErrors = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`)
          }
        }

        return reply.status(200).send({
          success: true,
          test: {
            signatureProvided: !!signature,
            signatureValid,
            timestampProvided: !!timestamp,
            timestampAge: timestamp ? Math.abs(Date.now() / 1000 - parseInt(timestamp, 10)) : null,
            bodyValid,
            bodyErrors: bodyErrors.length > 0 ? bodyErrors : undefined,
          },
          message:
            signatureValid && bodyValid
              ? 'Webhook integration test passed!'
              : 'Webhook integration test completed with issues',
        })
      }
    )

    logger.info('Provider webhook test endpoint enabled (development mode)')
  }

  logger.info('Provider webhook routes registered')
}
