import { prisma } from '@botesq/database'
import type { SettlementStatus } from '@botesq/database'
import { createTransfer, creditsToUsdCents } from './stripe-connect.service.js'
import { logger } from '../lib/logger.js'

// ==================== Types ====================

export interface SettlementSummary {
  id: string
  providerId: string
  provider: {
    id: string
    name: string
    email: string
    stripeConnectId: string | null
  }
  periodStart: Date
  periodEnd: Date
  totalRequests: number
  totalCredits: number
  providerShare: number
  platformShare: number
  status: SettlementStatus
  stripeTransferId: string | null
  paidAt: Date | null
  createdAt: Date
}

export interface GenerateSettlementsResult {
  generated: number
  skipped: number
  errors: Array<{ providerId: string; error: string }>
}

export interface ProcessSettlementResult {
  success: boolean
  transferId?: string
  error?: string
}

// ==================== Settlement Generation ====================

/**
 * Generate monthly settlements for all providers with completed requests in a given period
 */
export async function generateMonthlySettlements(
  year: number,
  month: number
): Promise<GenerateSettlementsResult> {
  const periodStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
  const periodEnd = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0))

  logger.info({ year, month, periodStart, periodEnd }, 'Generating monthly settlements')

  // Find all providers with COMPLETED requests in this period
  const providersWithRequests = await prisma.providerRequest.groupBy({
    by: ['providerId'],
    where: {
      status: 'COMPLETED',
      responseAt: {
        gte: periodStart,
        lt: periodEnd,
      },
    },
  })

  const providerIds = providersWithRequests.map((p) => p.providerId)

  // Check which providers already have a settlement for this period
  const existingSettlements = await prisma.providerSettlement.findMany({
    where: {
      providerId: { in: providerIds },
      periodStart: { gte: periodStart },
      periodEnd: { lte: periodEnd },
    },
    select: { providerId: true },
  })

  const providersWithSettlements = new Set(existingSettlements.map((s) => s.providerId))

  let generated = 0
  let skipped = 0
  const errors: Array<{ providerId: string; error: string }> = []

  for (const providerId of providerIds) {
    // Skip if already has settlement for this period
    if (providersWithSettlements.has(providerId)) {
      skipped++
      continue
    }

    try {
      await createSettlementForProvider(providerId, periodStart, periodEnd)
      generated++
    } catch (error) {
      errors.push({
        providerId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      logger.error({ error, providerId, periodStart, periodEnd }, 'Failed to create settlement')
    }
  }

  logger.info(
    { generated, skipped, errors: errors.length, year, month },
    'Monthly settlements generation complete'
  )

  return { generated, skipped, errors }
}

/**
 * Create a settlement for a specific provider and period
 */
async function createSettlementForProvider(
  providerId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<void> {
  // Get all completed requests for this provider in the period
  const requests = await prisma.providerRequest.findMany({
    where: {
      providerId,
      status: 'COMPLETED',
      responseAt: {
        gte: periodStart,
        lt: periodEnd,
      },
    },
    select: {
      id: true,
      creditsCharged: true,
      providerEarnings: true,
    },
  })

  if (requests.length === 0) {
    return // No requests to settle
  }

  // Calculate totals
  const totalRequests = requests.length
  const totalCredits = requests.reduce((sum, r) => sum + r.creditsCharged, 0)
  const providerShare = requests.reduce((sum, r) => sum + r.providerEarnings, 0)
  const platformShare = totalCredits - providerShare

  // Create the settlement record
  await prisma.providerSettlement.create({
    data: {
      providerId,
      periodStart,
      periodEnd,
      totalRequests,
      totalCredits,
      providerShare,
      platformShare,
      status: 'PENDING',
    },
  })

  logger.info(
    {
      providerId,
      periodStart,
      periodEnd,
      totalRequests,
      totalCredits,
      providerShare,
      platformShare,
    },
    'Settlement created for provider'
  )
}

// ==================== Settlement Processing ====================

/**
 * Process a pending settlement - create Stripe transfer to pay the provider
 */
export async function processSettlement(settlementId: string): Promise<ProcessSettlementResult> {
  const settlement = await prisma.providerSettlement.findUnique({
    where: { id: settlementId },
    include: {
      provider: {
        select: {
          id: true,
          name: true,
          email: true,
          stripeConnectId: true,
          status: true,
        },
      },
    },
  })

  if (!settlement) {
    return { success: false, error: 'Settlement not found' }
  }

  if (settlement.status !== 'PENDING') {
    return { success: false, error: `Settlement is already ${settlement.status.toLowerCase()}` }
  }

  if (!settlement.provider.stripeConnectId) {
    return {
      success: false,
      error: 'Provider does not have Stripe Connect configured',
    }
  }

  if (settlement.provider.status !== 'ACTIVE') {
    return { success: false, error: 'Provider is not active' }
  }

  // Update to PROCESSING
  await prisma.providerSettlement.update({
    where: { id: settlementId },
    data: { status: 'PROCESSING' },
  })

  try {
    // Create Stripe transfer
    const amountCents = creditsToUsdCents(settlement.providerShare)

    const { transferId } = await createTransfer(settlement.provider.stripeConnectId, amountCents, {
      settlementId: settlement.id,
      providerId: settlement.providerId,
      periodStart: settlement.periodStart.toISOString(),
      periodEnd: settlement.periodEnd.toISOString(),
    })

    // Update settlement as paid
    await prisma.providerSettlement.update({
      where: { id: settlementId },
      data: {
        status: 'PAID',
        stripeTransferId: transferId,
        paidAt: new Date(),
      },
    })

    logger.info(
      { settlementId, transferId, amountCents, providerId: settlement.providerId },
      'Settlement processed successfully'
    )

    return { success: true, transferId }
  } catch (error) {
    // Update settlement as failed
    await prisma.providerSettlement.update({
      where: { id: settlementId },
      data: { status: 'FAILED' },
    })

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error({ error, settlementId }, 'Failed to process settlement')

    return { success: false, error: errorMessage }
  }
}

/**
 * Retry a failed settlement
 */
export async function retryFailedSettlement(
  settlementId: string
): Promise<ProcessSettlementResult> {
  const settlement = await prisma.providerSettlement.findUnique({
    where: { id: settlementId },
  })

  if (!settlement) {
    return { success: false, error: 'Settlement not found' }
  }

  if (settlement.status !== 'FAILED') {
    return { success: false, error: 'Only failed settlements can be retried' }
  }

  // Reset to PENDING and process
  await prisma.providerSettlement.update({
    where: { id: settlementId },
    data: { status: 'PENDING' },
  })

  return processSettlement(settlementId)
}

// ==================== Settlement Queries ====================

export interface ListSettlementsOptions {
  providerId?: string
  status?: SettlementStatus
  periodStart?: Date
  periodEnd?: Date
  limit?: number
  offset?: number
}

/**
 * List settlements with optional filters
 */
export async function listSettlements(
  options: ListSettlementsOptions = {}
): Promise<{ settlements: SettlementSummary[]; total: number }> {
  const { providerId, status, periodStart, periodEnd, limit = 20, offset = 0 } = options

  const where: Record<string, unknown> = {}

  if (providerId) {
    where.providerId = providerId
  }

  if (status) {
    where.status = status
  }

  if (periodStart) {
    where.periodStart = { gte: periodStart }
  }

  if (periodEnd) {
    where.periodEnd = { lte: periodEnd }
  }

  const [settlements, total] = await Promise.all([
    prisma.providerSettlement.findMany({
      where,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
            stripeConnectId: true,
          },
        },
      },
      orderBy: [{ periodEnd: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip: offset,
    }),
    prisma.providerSettlement.count({ where }),
  ])

  return {
    settlements: settlements.map(formatSettlementSummary),
    total,
  }
}

/**
 * Get a settlement by ID
 */
export async function getSettlementById(id: string): Promise<SettlementSummary | null> {
  const settlement = await prisma.providerSettlement.findUnique({
    where: { id },
    include: {
      provider: {
        select: {
          id: true,
          name: true,
          email: true,
          stripeConnectId: true,
        },
      },
    },
  })

  if (!settlement) {
    return null
  }

  return formatSettlementSummary(settlement)
}

/**
 * Get settlement stats for admin dashboard
 */
export async function getSettlementStats(): Promise<{
  totalPending: number
  totalPendingAmount: number
  totalPaid: number
  totalPaidAmount: number
  totalFailed: number
}> {
  const [pendingStats, paidStats, failedCount] = await Promise.all([
    prisma.providerSettlement.aggregate({
      where: { status: 'PENDING' },
      _count: true,
      _sum: { providerShare: true },
    }),
    prisma.providerSettlement.aggregate({
      where: { status: 'PAID' },
      _count: true,
      _sum: { providerShare: true },
    }),
    prisma.providerSettlement.count({
      where: { status: 'FAILED' },
    }),
  ])

  return {
    totalPending: pendingStats._count,
    totalPendingAmount: pendingStats._sum.providerShare || 0,
    totalPaid: paidStats._count,
    totalPaidAmount: paidStats._sum.providerShare || 0,
    totalFailed: failedCount,
  }
}

// ==================== Helpers ====================

function formatSettlementSummary(settlement: {
  id: string
  providerId: string
  periodStart: Date
  periodEnd: Date
  totalRequests: number
  totalCredits: number
  providerShare: number
  platformShare: number
  status: SettlementStatus
  stripeTransferId: string | null
  paidAt: Date | null
  createdAt: Date
  provider: {
    id: string
    name: string
    email: string
    stripeConnectId: string | null
  }
}): SettlementSummary {
  return {
    id: settlement.id,
    providerId: settlement.providerId,
    provider: {
      id: settlement.provider.id,
      name: settlement.provider.name,
      email: settlement.provider.email,
      stripeConnectId: settlement.provider.stripeConnectId,
    },
    periodStart: settlement.periodStart,
    periodEnd: settlement.periodEnd,
    totalRequests: settlement.totalRequests,
    totalCredits: settlement.totalCredits,
    providerShare: settlement.providerShare,
    platformShare: settlement.platformShare,
    status: settlement.status,
    stripeTransferId: settlement.stripeTransferId,
    paidAt: settlement.paidAt,
    createdAt: settlement.createdAt,
  }
}
