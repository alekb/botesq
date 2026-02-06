import { prisma, Prisma } from '@botesq/database'
import type {
  Provider,
  ProviderService,
  ProviderRequest,
  ProviderReview,
  ProviderSettlement,
  ProviderStatus,
  ProviderServiceType,
  ProviderRequestStatus,
  MatterType,
  PriceModel,
} from '@botesq/database'
import { hashPassword, verifyPassword } from './auth.service'
import { generateProviderId } from '../utils/secure-id.js'
import { generateWebhookSecret } from '../utils/webhook'
import { logger } from '../lib/logger'

// ==================== Provider CRUD ====================

export interface CreateProviderInput {
  name: string
  legalName: string
  description?: string
  email: string
  password: string
  jurisdictions: string[]
  specialties: MatterType[]
  serviceTypes: ProviderServiceType[]
}

export async function createProvider(input: CreateProviderInput): Promise<Provider> {
  const existingEmail = await prisma.provider.findUnique({
    where: { email: input.email },
  })

  if (existingEmail) {
    throw new Error('Email already registered')
  }

  const passwordHash = await hashPassword(input.password)
  const externalId = generateProviderId()
  const webhookSecret = generateWebhookSecret()

  const provider = await prisma.provider.create({
    data: {
      externalId,
      name: input.name,
      legalName: input.legalName,
      description: input.description,
      email: input.email,
      passwordHash,
      jurisdictions: input.jurisdictions,
      specialties: input.specialties,
      serviceTypes: input.serviceTypes,
      webhookSecret,
      status: 'PENDING_APPROVAL',
    },
  })

  logger.info({ providerId: provider.id, externalId }, 'Provider created')

  return provider
}

export async function getProviderById(id: string): Promise<Provider | null> {
  return prisma.provider.findUnique({
    where: { id },
    include: {
      services: true,
    },
  })
}

export async function getProviderByEmail(email: string): Promise<Provider | null> {
  return prisma.provider.findUnique({
    where: { email },
  })
}

export async function getProviderByExternalId(externalId: string): Promise<Provider | null> {
  return prisma.provider.findUnique({
    where: { externalId },
    include: {
      services: true,
    },
  })
}

export interface UpdateProviderInput {
  name?: string
  legalName?: string
  description?: string
  webhookUrl?: string
  jurisdictions?: string[]
  specialties?: MatterType[]
  maxConcurrent?: number
}

export async function updateProvider(id: string, input: UpdateProviderInput): Promise<Provider> {
  return prisma.provider.update({
    where: { id },
    data: input,
  })
}

export async function updateProviderStatus(id: string, status: ProviderStatus): Promise<Provider> {
  const data: { status: ProviderStatus; verifiedAt?: Date } = { status }

  if (status === 'ACTIVE') {
    data.verifiedAt = new Date()
  }

  return prisma.provider.update({
    where: { id },
    data,
  })
}

export async function regenerateWebhookSecret(id: string): Promise<string> {
  const newSecret = generateWebhookSecret()

  await prisma.provider.update({
    where: { id },
    data: { webhookSecret: newSecret },
  })

  return newSecret
}

// ==================== Provider Authentication ====================

export async function authenticateProvider(
  email: string,
  password: string
): Promise<Provider | null> {
  const provider = await prisma.provider.findUnique({
    where: { email },
  })

  if (!provider) {
    return null
  }

  const valid = await verifyPassword(password, provider.passwordHash)
  if (!valid) {
    return null
  }

  if (provider.status !== 'ACTIVE') {
    throw new Error(`Provider account is ${provider.status.toLowerCase()}`)
  }

  return provider
}

export async function updateProviderPassword(
  id: string,
  currentPassword: string,
  newPassword: string
): Promise<boolean> {
  const provider = await prisma.provider.findUnique({ where: { id } })
  if (!provider) {
    return false
  }

  const valid = await verifyPassword(currentPassword, provider.passwordHash)
  if (!valid) {
    return false
  }

  const newHash = await hashPassword(newPassword)
  await prisma.provider.update({
    where: { id },
    data: { passwordHash: newHash },
  })

  return true
}

// ==================== Provider Services ====================

export interface CreateProviderServiceInput {
  providerId: string
  serviceType: ProviderServiceType
  basePrice: number
  priceModel?: PriceModel
  pricePerUnit?: number
  maxConcurrent?: number
  targetResponseMins: number
}

export async function createProviderService(
  input: CreateProviderServiceInput
): Promise<ProviderService> {
  return prisma.providerService.create({
    data: {
      providerId: input.providerId,
      serviceType: input.serviceType,
      basePrice: input.basePrice,
      priceModel: input.priceModel || 'FLAT',
      pricePerUnit: input.pricePerUnit,
      maxConcurrent: input.maxConcurrent || 5,
      targetResponseMins: input.targetResponseMins,
    },
  })
}

export async function getProviderServices(providerId: string): Promise<ProviderService[]> {
  return prisma.providerService.findMany({
    where: { providerId },
    orderBy: { serviceType: 'asc' },
  })
}

export async function updateProviderService(
  providerId: string,
  serviceType: ProviderServiceType,
  data: {
    enabled?: boolean
    basePrice?: number
    priceModel?: PriceModel
    pricePerUnit?: number
    maxConcurrent?: number
    targetResponseMins?: number
  }
): Promise<ProviderService> {
  return prisma.providerService.update({
    where: {
      providerId_serviceType: { providerId, serviceType },
    },
    data,
  })
}

export async function deleteProviderService(
  providerId: string,
  serviceType: ProviderServiceType
): Promise<void> {
  await prisma.providerService.delete({
    where: {
      providerId_serviceType: { providerId, serviceType },
    },
  })
}

// ==================== Provider Requests (Work Queue) ====================

export interface ListProviderRequestsOptions {
  providerId: string
  status?: ProviderRequestStatus
  limit?: number
  offset?: number
}

export async function listProviderRequests(
  options: ListProviderRequestsOptions
): Promise<{ requests: ProviderRequest[]; total: number }> {
  const where = {
    providerId: options.providerId,
    ...(options.status && { status: options.status }),
  }

  const [requests, total] = await Promise.all([
    prisma.providerRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit || 20,
      skip: options.offset || 0,
    }),
    prisma.providerRequest.count({ where }),
  ])

  return { requests, total }
}

export async function getProviderRequest(
  providerId: string,
  requestId: string
): Promise<ProviderRequest | null> {
  return prisma.providerRequest.findFirst({
    where: {
      providerId,
      id: requestId,
    },
  })
}

export async function updateProviderRequestStatus(
  requestId: string,
  status: ProviderRequestStatus,
  response?: {
    responsePayload?: Prisma.InputJsonValue
    creditsCharged?: number
    providerEarnings?: number
  }
): Promise<ProviderRequest> {
  return prisma.providerRequest.update({
    where: { id: requestId },
    data: {
      status,
      responseAt: status === 'COMPLETED' ? new Date() : undefined,
      responsePayload: response?.responsePayload ?? Prisma.JsonNull,
      creditsCharged: response?.creditsCharged,
      providerEarnings: response?.providerEarnings,
    },
  })
}

// ==================== Provider Reviews ====================

export async function getProviderReviews(
  providerId: string,
  publicOnly = true
): Promise<ProviderReview[]> {
  return prisma.providerReview.findMany({
    where: {
      providerId,
      ...(publicOnly && { isPublic: true }),
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getProviderAverageRating(providerId: string): Promise<number | null> {
  const result = await prisma.providerReview.aggregate({
    where: { providerId },
    _avg: { rating: true },
  })

  return result._avg.rating
}

// ==================== Provider Settlements ====================

export async function getProviderSettlements(
  providerId: string,
  limit = 12
): Promise<ProviderSettlement[]> {
  return prisma.providerSettlement.findMany({
    where: { providerId },
    orderBy: { periodStart: 'desc' },
    take: limit,
  })
}

export async function getProviderEarningsSummary(providerId: string): Promise<{
  totalEarnings: number
  pendingPayout: number
  thisMonthEarnings: number
  totalRequests: number
}> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [totalSettlements, pendingSettlements, thisMonthRequests] = await Promise.all([
    prisma.providerSettlement.aggregate({
      where: { providerId, status: 'PAID' },
      _sum: { providerShare: true },
    }),
    prisma.providerSettlement.aggregate({
      where: { providerId, status: 'PENDING' },
      _sum: { providerShare: true },
    }),
    prisma.providerRequest.aggregate({
      where: {
        providerId,
        status: 'COMPLETED',
        createdAt: { gte: monthStart },
      },
      _sum: { providerEarnings: true },
      _count: true,
    }),
  ])

  const totalRequests = await prisma.providerRequest.count({
    where: { providerId, status: 'COMPLETED' },
  })

  return {
    totalEarnings: totalSettlements._sum.providerShare || 0,
    pendingPayout: pendingSettlements._sum.providerShare || 0,
    thisMonthEarnings: thisMonthRequests._sum.providerEarnings || 0,
    totalRequests,
  }
}

// ==================== Provider Listing (for operators) ====================

export interface ListProvidersOptions {
  serviceType?: ProviderServiceType
  jurisdiction?: string
  specialty?: MatterType
  limit?: number
  offset?: number
}

export async function listActiveProviders(
  options: ListProvidersOptions = {}
): Promise<{ providers: Provider[]; total: number }> {
  const where = {
    status: 'ACTIVE' as const,
    ...(options.serviceType && {
      services: {
        some: {
          serviceType: options.serviceType,
          enabled: true,
        },
      },
    }),
    ...(options.jurisdiction && {
      jurisdictions: { has: options.jurisdiction },
    }),
    ...(options.specialty && {
      specialties: { has: options.specialty },
    }),
  }

  const [providers, total] = await Promise.all([
    prisma.provider.findMany({
      where,
      include: {
        services: {
          where: { enabled: true },
        },
      },
      orderBy: { qualityScore: 'desc' },
      take: options.limit || 20,
      skip: options.offset || 0,
    }),
    prisma.provider.count({ where }),
  ])

  return { providers, total }
}

// ==================== Operator Provider Preferences ====================

export async function getOperatorProviderPreferences(operatorId: string) {
  return prisma.operatorProviderPreference.findMany({
    where: { operatorId },
    include: {
      provider: {
        include: { services: true },
      },
    },
  })
}

export async function setOperatorProviderPreference(
  operatorId: string,
  providerId: string,
  data: {
    enabled?: boolean
    priority?: number
    serviceTypes?: ProviderServiceType[]
  }
) {
  return prisma.operatorProviderPreference.upsert({
    where: {
      operatorId_providerId: { operatorId, providerId },
    },
    create: {
      operatorId,
      providerId,
      enabled: data.enabled ?? true,
      priority: data.priority ?? 0,
      serviceTypes: data.serviceTypes || [],
    },
    update: data,
  })
}

export async function removeOperatorProviderPreference(
  operatorId: string,
  providerId: string
): Promise<void> {
  await prisma.operatorProviderPreference.delete({
    where: {
      operatorId_providerId: { operatorId, providerId },
    },
  })
}
