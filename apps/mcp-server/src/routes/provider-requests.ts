import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma, Prisma } from '@botesq/database'
import type { ProviderRequestStatus } from '@botesq/database'
import { validateProviderSession } from './provider-auth.js'
import { logger } from '../lib/logger.js'
import { AuthError, ApiError } from '../types.js'

/**
 * List requests query schema
 */
const listRequestsSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

/**
 * Submit response schema
 */
const submitResponseSchema = z.object({
  status: z.enum(['COMPLETED', 'FAILED']),
  response: z
    .object({
      answer: z.string().optional(),
      analysis: z.string().optional(),
      summary: z.string().optional(),
      recommendations: z.array(z.string()).optional(),
      citations: z.array(z.string()).optional(),
      confidence: z.number().min(0).max(1).optional(),
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
})

/**
 * Extract and validate provider token from request
 */
async function getProviderFromRequest(request: FastifyRequest) {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('MISSING_TOKEN', 'Authorization token required')
  }

  const token = authHeader.slice(7)
  const session = await validateProviderSession(token)
  return session.provider
}

/**
 * Register provider requests routes (work queue)
 */
export function registerProviderRequestsRoutes(app: FastifyInstance): void {
  /**
   * GET /provider/requests — List work queue requests
   */
  app.get('/provider/requests', async (request: FastifyRequest, reply: FastifyReply) => {
    const provider = await getProviderFromRequest(request)
    const query = listRequestsSchema.parse(request.query)

    const where: Prisma.ProviderRequestWhereInput = {
      providerId: provider.id,
      ...(query.status && { status: query.status as ProviderRequestStatus }),
    }

    const [requests, total] = await Promise.all([
      prisma.providerRequest.findMany({
        where,
        orderBy: [{ status: 'asc' }, { slaDeadline: 'asc' }, { createdAt: 'asc' }],
        take: query.limit,
        skip: query.offset,
        select: {
          id: true,
          externalId: true,
          serviceType: true,
          status: true,
          requestPayload: true,
          slaDeadline: true,
          routingReason: true,
          createdAt: true,
          responseAt: true,
        },
      }),
      prisma.providerRequest.count({ where }),
    ])

    return reply.status(200).send({
      success: true,
      data: {
        requests: requests.map((r) => ({
          id: r.externalId || r.id,
          serviceType: r.serviceType,
          status: r.status,
          content: r.requestPayload,
          slaDeadline: r.slaDeadline?.toISOString(),
          routingReason: r.routingReason,
          createdAt: r.createdAt.toISOString(),
          responseAt: r.responseAt?.toISOString(),
        })),
        pagination: {
          total,
          limit: query.limit,
          offset: query.offset,
          hasMore: query.offset + requests.length < total,
        },
      },
    })
  })

  /**
   * GET /provider/requests/pending — Get pending requests count
   */
  app.get('/provider/requests/pending', async (request: FastifyRequest, reply: FastifyReply) => {
    const provider = await getProviderFromRequest(request)

    const [pendingCount, urgentCount] = await Promise.all([
      prisma.providerRequest.count({
        where: {
          providerId: provider.id,
          status: 'PENDING',
        },
      }),
      prisma.providerRequest.count({
        where: {
          providerId: provider.id,
          status: 'PENDING',
          slaDeadline: {
            lte: new Date(Date.now() + 60 * 60 * 1000), // Due within 1 hour
          },
        },
      }),
    ])

    return reply.status(200).send({
      success: true,
      data: {
        pending: pendingCount,
        urgent: urgentCount,
      },
    })
  })

  /**
   * GET /provider/requests/:requestId — Get request details
   */
  app.get('/provider/requests/:requestId', async (request: FastifyRequest, reply: FastifyReply) => {
    const provider = await getProviderFromRequest(request)
    const { requestId } = request.params as { requestId: string }

    const req = await prisma.providerRequest.findFirst({
      where: {
        providerId: provider.id,
        OR: [{ id: requestId }, { externalId: requestId }],
      },
    })

    if (!req) {
      throw new ApiError('REQUEST_NOT_FOUND', 'Request not found', 404)
    }

    return reply.status(200).send({
      success: true,
      data: {
        id: req.externalId || req.id,
        serviceType: req.serviceType,
        status: req.status,
        content: req.requestPayload,
        response: req.responsePayload,
        slaDeadline: req.slaDeadline?.toISOString(),
        routingReason: req.routingReason,
        creditsCharged: req.creditsCharged,
        providerEarnings: req.providerEarnings,
        createdAt: req.createdAt.toISOString(),
        responseAt: req.responseAt?.toISOString(),
      },
    })
  })

  /**
   * POST /provider/requests/:requestId/claim — Claim a pending request
   */
  app.post(
    '/provider/requests/:requestId/claim',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const provider = await getProviderFromRequest(request)
      const { requestId } = request.params as { requestId: string }

      // Find the request
      const req = await prisma.providerRequest.findFirst({
        where: {
          providerId: provider.id,
          OR: [{ id: requestId }, { externalId: requestId }],
        },
      })

      if (!req) {
        throw new ApiError('REQUEST_NOT_FOUND', 'Request not found', 404)
      }

      if (req.status !== 'PENDING') {
        throw new ApiError('INVALID_STATUS', `Request is already ${req.status.toLowerCase()}`, 400)
      }

      // Update to in_progress
      const updated = await prisma.providerRequest.update({
        where: { id: req.id },
        data: { status: 'IN_PROGRESS' },
      })

      logger.info({ providerId: provider.id, requestId: req.id }, 'Request claimed')

      return reply.status(200).send({
        success: true,
        data: {
          id: updated.externalId || updated.id,
          status: updated.status,
          content: updated.requestPayload,
          slaDeadline: updated.slaDeadline?.toISOString(),
        },
      })
    }
  )

  /**
   * POST /provider/requests/:requestId/response — Submit response for a request
   */
  app.post(
    '/provider/requests/:requestId/response',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const provider = await getProviderFromRequest(request)
      const { requestId } = request.params as { requestId: string }
      const body = submitResponseSchema.parse(request.body)

      // Find the request
      const req = await prisma.providerRequest.findFirst({
        where: {
          providerId: provider.id,
          OR: [{ id: requestId }, { externalId: requestId }],
        },
      })

      if (!req) {
        throw new ApiError('REQUEST_NOT_FOUND', 'Request not found', 404)
      }

      if (req.status === 'COMPLETED' || req.status === 'FAILED') {
        throw new ApiError('ALREADY_RESPONDED', 'Response has already been submitted', 400)
      }

      if (req.status === 'CANCELLED') {
        throw new ApiError('REQUEST_CANCELLED', 'Request has been cancelled', 400)
      }

      // Calculate earnings based on service type and provider pricing
      const service = await prisma.providerService.findUnique({
        where: {
          providerId_serviceType: {
            providerId: provider.id,
            serviceType: req.serviceType,
          },
        },
      })

      const providerEarnings = service ? service.basePrice : 0

      // Update the request with response
      const updated = await prisma.providerRequest.update({
        where: { id: req.id },
        data: {
          status: body.status as ProviderRequestStatus,
          responsePayload: (body.response as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          responseAt: new Date(),
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
        { providerId: provider.id, requestId: req.id, status: body.status },
        'Request response submitted'
      )

      return reply.status(200).send({
        success: true,
        data: {
          id: updated.externalId || updated.id,
          status: updated.status,
          providerEarnings: updated.providerEarnings,
          responseAt: updated.responseAt?.toISOString(),
        },
      })
    }
  )

  /**
   * POST /provider/requests/:requestId/escalate — Escalate a request
   */
  app.post(
    '/provider/requests/:requestId/escalate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const provider = await getProviderFromRequest(request)
      const { requestId } = request.params as { requestId: string }

      const schema = z.object({
        reason: z.string().min(10).max(500),
        suggestedAction: z.string().max(500).optional(),
      })

      const body = schema.parse(request.body)

      // Find the request
      const req = await prisma.providerRequest.findFirst({
        where: {
          providerId: provider.id,
          OR: [{ id: requestId }, { externalId: requestId }],
        },
      })

      if (!req) {
        throw new ApiError('REQUEST_NOT_FOUND', 'Request not found', 404)
      }

      if (req.status !== 'PENDING' && req.status !== 'IN_PROGRESS') {
        throw new ApiError(
          'INVALID_STATUS',
          `Cannot escalate request with status ${req.status}`,
          400
        )
      }

      // Update to escalated status (using FAILED with escalation info for now)
      const escalationPayload = {
        reason: body.reason,
        suggestedAction: body.suggestedAction,
        escalatedBy: provider.id,
        escalatedAt: new Date().toISOString(),
      }

      const updated = await prisma.providerRequest.update({
        where: { id: req.id },
        data: {
          status: 'FAILED',
          responsePayload: escalationPayload as unknown as Prisma.InputJsonValue,
          responseAt: new Date(),
        },
      })

      logger.info(
        { providerId: provider.id, requestId: req.id, reason: body.reason },
        'Request escalated'
      )

      return reply.status(200).send({
        success: true,
        data: {
          id: updated.externalId || updated.id,
          status: 'ESCALATED',
          escalation: escalationPayload,
        },
      })
    }
  )

  /**
   * GET /provider/earnings — Get earnings summary
   */
  app.get('/provider/earnings', async (request: FastifyRequest, reply: FastifyReply) => {
    const provider = await getProviderFromRequest(request)

    const querySchema = z.object({
      period: z.enum(['day', 'week', 'month', 'year']).default('month'),
    })

    const query = querySchema.parse(request.query)

    const now = new Date()
    let periodStart: Date

    switch (query.period) {
      case 'day':
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
        break
      case 'month':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'year':
        periodStart = new Date(now.getFullYear(), 0, 1)
        break
    }

    const [periodEarnings, pendingPayout, totalPaid] = await Promise.all([
      prisma.providerRequest.aggregate({
        where: {
          providerId: provider.id,
          status: 'COMPLETED',
          responseAt: { gte: periodStart },
        },
        _sum: { providerEarnings: true },
        _count: true,
      }),
      prisma.providerSettlement.aggregate({
        where: { providerId: provider.id, status: 'PENDING' },
        _sum: { providerShare: true },
      }),
      prisma.providerSettlement.aggregate({
        where: { providerId: provider.id, status: 'PAID' },
        _sum: { providerShare: true },
      }),
    ])

    return reply.status(200).send({
      success: true,
      data: {
        period: query.period,
        periodStart: periodStart.toISOString(),
        earnings: {
          periodAmount: periodEarnings._sum.providerEarnings || 0,
          periodRequests: periodEarnings._count,
          pendingPayout: pendingPayout._sum.providerShare || 0,
          totalPaid: totalPaid._sum.providerShare || 0,
        },
      },
    })
  })

  /**
   * GET /provider/settlements — List settlement history
   */
  app.get('/provider/settlements', async (request: FastifyRequest, reply: FastifyReply) => {
    const provider = await getProviderFromRequest(request)

    const querySchema = z.object({
      limit: z.coerce.number().int().min(1).max(100).default(12),
      offset: z.coerce.number().int().min(0).default(0),
    })

    const query = querySchema.parse(request.query)

    const [settlements, total] = await Promise.all([
      prisma.providerSettlement.findMany({
        where: { providerId: provider.id },
        orderBy: { periodStart: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.providerSettlement.count({
        where: { providerId: provider.id },
      }),
    ])

    return reply.status(200).send({
      success: true,
      data: {
        settlements: settlements.map((s) => ({
          id: s.id,
          periodStart: s.periodStart.toISOString(),
          periodEnd: s.periodEnd.toISOString(),
          totalCredits: s.totalCredits,
          platformShare: s.platformShare,
          providerShare: s.providerShare,
          totalRequests: s.totalRequests,
          status: s.status,
          paidAt: s.paidAt?.toISOString(),
        })),
        pagination: {
          total,
          limit: query.limit,
          offset: query.offset,
          hasMore: query.offset + settlements.length < total,
        },
      },
    })
  })

  logger.info('Provider requests routes registered')
}
