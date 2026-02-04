import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma } from '@botesq/database'
import type { PriceModel, ProviderServiceType } from '@botesq/database'
import { validateProviderSession } from './provider-auth.js'
import { generateWebhookSecret } from '../utils/webhook.js'
import { logger } from '../lib/logger.js'
import { AuthError, ApiError } from '../types.js'

/**
 * Valid MatterType values for specialties
 */
const matterTypeValues = [
  'CONTRACT_REVIEW',
  'ENTITY_FORMATION',
  'COMPLIANCE',
  'IP_TRADEMARK',
  'IP_COPYRIGHT',
  'GENERAL_CONSULTATION',
  'LITIGATION_CONSULTATION',
] as const

/**
 * Profile update schema
 */
const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  legalName: z.string().min(2).max(200).optional(),
  description: z.string().max(1000).optional(),
  webhookUrl: z.string().url().optional().nullable(),
  jurisdictions: z.array(z.string()).min(1).optional(),
  specialties: z.array(z.enum(matterTypeValues)).min(1).optional(),
  maxConcurrent: z.number().int().min(1).max(100).optional(),
})

/**
 * Service creation schema
 */
const createServiceSchema = z.object({
  serviceType: z.enum([
    'LEGAL_QA',
    'DOCUMENT_REVIEW',
    'CONSULTATION',
    'CONTRACT_DRAFTING',
    'ENTITY_FORMATION',
    'TRADEMARK',
    'LITIGATION',
  ]),
  basePrice: z.number().int().min(0),
  priceModel: z.enum(['FLAT', 'PER_PAGE', 'PER_HOUR', 'COMPLEXITY_BASED']).default('FLAT'),
  pricePerUnit: z.number().int().min(0).optional(),
  maxConcurrent: z.number().int().min(1).max(50).default(5),
  targetResponseMins: z.number().int().min(1).max(10080), // Max 7 days in minutes
})

/**
 * Service update schema
 */
const updateServiceSchema = z.object({
  enabled: z.boolean().optional(),
  basePrice: z.number().int().min(0).optional(),
  priceModel: z.enum(['FLAT', 'PER_PAGE', 'PER_HOUR', 'COMPLEXITY_BASED']).optional(),
  pricePerUnit: z.number().int().min(0).optional().nullable(),
  maxConcurrent: z.number().int().min(1).max(50).optional(),
  targetResponseMins: z.number().int().min(1).max(10080).optional(),
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
 * Register provider profile routes
 */
export function registerProviderProfileRoutes(app: FastifyInstance): void {
  /**
   * GET /provider/profile — Get provider profile
   */
  app.get('/provider/profile', async (request: FastifyRequest, reply: FastifyReply) => {
    const provider = await getProviderFromRequest(request)

    // Get full provider with services
    const fullProvider = await prisma.provider.findUnique({
      where: { id: provider.id },
      include: {
        services: {
          orderBy: { serviceType: 'asc' },
        },
      },
    })

    if (!fullProvider) {
      throw new ApiError('PROVIDER_NOT_FOUND', 'Provider not found', 404)
    }

    return reply.status(200).send({
      success: true,
      data: {
        id: fullProvider.externalId,
        name: fullProvider.name,
        legalName: fullProvider.legalName,
        email: fullProvider.email,
        description: fullProvider.description,
        status: fullProvider.status,
        jurisdictions: fullProvider.jurisdictions,
        specialties: fullProvider.specialties,
        webhookUrl: fullProvider.webhookUrl,
        maxConcurrent: fullProvider.maxConcurrent,
        qualityScore: fullProvider.qualityScore,
        avgResponseMins: fullProvider.avgResponseMins,
        verifiedAt: fullProvider.verifiedAt?.toISOString(),
        createdAt: fullProvider.createdAt.toISOString(),
        services: fullProvider.services.map((s) => ({
          serviceType: s.serviceType,
          enabled: s.enabled,
          basePrice: s.basePrice,
          priceModel: s.priceModel,
          pricePerUnit: s.pricePerUnit,
          maxConcurrent: s.maxConcurrent,
          targetResponseMins: s.targetResponseMins,
          currentLoad: s.currentLoad,
        })),
      },
    })
  })

  /**
   * PATCH /provider/profile — Update provider profile
   */
  app.patch('/provider/profile', async (request: FastifyRequest, reply: FastifyReply) => {
    const provider = await getProviderFromRequest(request)
    const body = updateProfileSchema.parse(request.body)

    const updated = await prisma.provider.update({
      where: { id: provider.id },
      data: body,
    })

    logger.info({ providerId: provider.id }, 'Provider profile updated')

    return reply.status(200).send({
      success: true,
      data: {
        id: updated.externalId,
        name: updated.name,
        legalName: updated.legalName,
        description: updated.description,
        jurisdictions: updated.jurisdictions,
        specialties: updated.specialties,
        webhookUrl: updated.webhookUrl,
        maxConcurrent: updated.maxConcurrent,
      },
    })
  })

  /**
   * POST /provider/webhook-secret/regenerate — Regenerate webhook secret
   */
  app.post(
    '/provider/webhook-secret/regenerate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const provider = await getProviderFromRequest(request)

      const newSecret = generateWebhookSecret()

      await prisma.provider.update({
        where: { id: provider.id },
        data: { webhookSecret: newSecret },
      })

      logger.info({ providerId: provider.id }, 'Provider webhook secret regenerated')

      return reply.status(200).send({
        success: true,
        data: {
          webhookSecret: newSecret,
          message: 'Webhook secret regenerated. Update your systems with the new secret.',
        },
      })
    }
  )

  /**
   * GET /provider/services — List provider services
   */
  app.get('/provider/services', async (request: FastifyRequest, reply: FastifyReply) => {
    const provider = await getProviderFromRequest(request)

    const services = await prisma.providerService.findMany({
      where: { providerId: provider.id },
      orderBy: { serviceType: 'asc' },
    })

    return reply.status(200).send({
      success: true,
      data: services.map((s) => ({
        serviceType: s.serviceType,
        enabled: s.enabled,
        basePrice: s.basePrice,
        priceModel: s.priceModel,
        pricePerUnit: s.pricePerUnit,
        maxConcurrent: s.maxConcurrent,
        targetResponseMins: s.targetResponseMins,
        currentLoad: s.currentLoad,
      })),
    })
  })

  /**
   * POST /provider/services — Create a new service offering
   */
  app.post('/provider/services', async (request: FastifyRequest, reply: FastifyReply) => {
    const provider = await getProviderFromRequest(request)
    const body = createServiceSchema.parse(request.body)

    // Check if service already exists
    const existing = await prisma.providerService.findUnique({
      where: {
        providerId_serviceType: {
          providerId: provider.id,
          serviceType: body.serviceType as ProviderServiceType,
        },
      },
    })

    if (existing) {
      throw new ApiError('SERVICE_EXISTS', 'Service offering already exists', 409)
    }

    const service = await prisma.providerService.create({
      data: {
        providerId: provider.id,
        serviceType: body.serviceType as ProviderServiceType,
        basePrice: body.basePrice,
        priceModel: body.priceModel as PriceModel,
        pricePerUnit: body.pricePerUnit,
        maxConcurrent: body.maxConcurrent,
        targetResponseMins: body.targetResponseMins,
      },
    })

    // Also add to provider's serviceTypes array if not present
    const currentTypes = provider.serviceTypes || []
    if (!currentTypes.includes(body.serviceType as ProviderServiceType)) {
      await prisma.provider.update({
        where: { id: provider.id },
        data: {
          serviceTypes: [...currentTypes, body.serviceType as ProviderServiceType],
        },
      })
    }

    logger.info(
      { providerId: provider.id, serviceType: body.serviceType },
      'Provider service created'
    )

    return reply.status(201).send({
      success: true,
      data: {
        serviceType: service.serviceType,
        enabled: service.enabled,
        basePrice: service.basePrice,
        priceModel: service.priceModel,
        pricePerUnit: service.pricePerUnit,
        maxConcurrent: service.maxConcurrent,
        targetResponseMins: service.targetResponseMins,
      },
    })
  })

  /**
   * PATCH /provider/services/:serviceType — Update a service offering
   */
  app.patch(
    '/provider/services/:serviceType',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const provider = await getProviderFromRequest(request)
      const { serviceType } = request.params as { serviceType: string }
      const body = updateServiceSchema.parse(request.body)

      // Check if service exists
      const existing = await prisma.providerService.findUnique({
        where: {
          providerId_serviceType: {
            providerId: provider.id,
            serviceType: serviceType as ProviderServiceType,
          },
        },
      })

      if (!existing) {
        throw new ApiError('SERVICE_NOT_FOUND', 'Service offering not found', 404)
      }

      const updated = await prisma.providerService.update({
        where: {
          providerId_serviceType: {
            providerId: provider.id,
            serviceType: serviceType as ProviderServiceType,
          },
        },
        data: {
          enabled: body.enabled,
          basePrice: body.basePrice,
          priceModel: body.priceModel as PriceModel | undefined,
          pricePerUnit: body.pricePerUnit,
          maxConcurrent: body.maxConcurrent,
          targetResponseMins: body.targetResponseMins,
        },
      })

      logger.info({ providerId: provider.id, serviceType }, 'Provider service updated')

      return reply.status(200).send({
        success: true,
        data: {
          serviceType: updated.serviceType,
          enabled: updated.enabled,
          basePrice: updated.basePrice,
          priceModel: updated.priceModel,
          pricePerUnit: updated.pricePerUnit,
          maxConcurrent: updated.maxConcurrent,
          targetResponseMins: updated.targetResponseMins,
        },
      })
    }
  )

  /**
   * DELETE /provider/services/:serviceType — Delete a service offering
   */
  app.delete(
    '/provider/services/:serviceType',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const provider = await getProviderFromRequest(request)
      const { serviceType } = request.params as { serviceType: string }

      // Check if service exists
      const existing = await prisma.providerService.findUnique({
        where: {
          providerId_serviceType: {
            providerId: provider.id,
            serviceType: serviceType as ProviderServiceType,
          },
        },
      })

      if (!existing) {
        throw new ApiError('SERVICE_NOT_FOUND', 'Service offering not found', 404)
      }

      // Check for pending requests
      const pendingRequests = await prisma.providerRequest.count({
        where: {
          providerId: provider.id,
          serviceType: serviceType as ProviderServiceType,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      })

      if (pendingRequests > 0) {
        throw new ApiError(
          'HAS_PENDING_REQUESTS',
          `Cannot delete service with ${pendingRequests} pending requests`,
          400
        )
      }

      await prisma.providerService.delete({
        where: {
          providerId_serviceType: {
            providerId: provider.id,
            serviceType: serviceType as ProviderServiceType,
          },
        },
      })

      // Also remove from provider's serviceTypes array
      const updatedTypes = (provider.serviceTypes || []).filter((t) => t !== serviceType)
      await prisma.provider.update({
        where: { id: provider.id },
        data: { serviceTypes: updatedTypes },
      })

      logger.info({ providerId: provider.id, serviceType }, 'Provider service deleted')

      return reply.status(200).send({
        success: true,
        message: 'Service deleted successfully',
      })
    }
  )

  /**
   * GET /provider/stats — Get provider statistics
   */
  app.get('/provider/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const provider = await getProviderFromRequest(request)

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    // Get various statistics
    const [
      totalRequests,
      thisMonthRequests,
      lastMonthRequests,
      completedRequests,
      avgRating,
      pendingSettlements,
      totalEarnings,
    ] = await Promise.all([
      prisma.providerRequest.count({
        where: { providerId: provider.id },
      }),
      prisma.providerRequest.count({
        where: {
          providerId: provider.id,
          createdAt: { gte: monthStart },
        },
      }),
      prisma.providerRequest.count({
        where: {
          providerId: provider.id,
          createdAt: { gte: lastMonthStart, lt: monthStart },
        },
      }),
      prisma.providerRequest.count({
        where: { providerId: provider.id, status: 'COMPLETED' },
      }),
      prisma.providerReview.aggregate({
        where: { providerId: provider.id },
        _avg: { rating: true },
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

    const completionRate = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0

    return reply.status(200).send({
      success: true,
      data: {
        requests: {
          total: totalRequests,
          thisMonth: thisMonthRequests,
          lastMonth: lastMonthRequests,
          completionRate: Math.round(completionRate * 10) / 10,
        },
        reviews: {
          count: avgRating._count,
          averageRating: avgRating._avg.rating ? Math.round(avgRating._avg.rating * 10) / 10 : null,
        },
        earnings: {
          total: totalEarnings._sum.providerShare || 0,
          pending: pendingSettlements._sum.providerShare || 0,
        },
        qualityScore: provider.qualityScore,
      },
    })
  })

  logger.info('Provider profile routes registered')
}
