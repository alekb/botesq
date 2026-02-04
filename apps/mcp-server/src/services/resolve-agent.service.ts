import { prisma, ResolveAgentStatus } from '@botesq/database'
import type { ResolveDisputeRuling } from '@botesq/database'
import { nanoid } from 'nanoid'
import pino from 'pino'
import { ApiError } from '../types.js'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

// Trust score constants
const INITIAL_TRUST_SCORE = 50
const MIN_TRUST_SCORE = 0
const MAX_TRUST_SCORE = 100
const MONTHLY_DISPUTE_LIMIT = 5

// Trust score changes
const TRUST_CHANGE_TRANSACTION_COMPLETE = 1
const TRUST_CHANGE_DISPUTE_WIN = 2
const TRUST_CHANGE_DISPUTE_LOSS_SMALL = -3 // < $100
const TRUST_CHANGE_DISPUTE_LOSS_MEDIUM = -5 // $100-999
const TRUST_CHANGE_DISPUTE_LOSS_LARGE = -10 // >= $1000
const TRUST_CHANGE_SPLIT_RULING = -1
const TRUST_CHANGE_DISMISSED = -5 // Frivolous claim

/**
 * Generate a resolve agent external ID
 */
function generateAgentId(): string {
  return `RAGENT-${nanoid(8).toUpperCase()}`
}

export interface RegisterAgentParams {
  operatorId: string
  agentIdentifier: string
  displayName?: string
  description?: string
  metadata?: Record<string, unknown>
}

export interface ResolveAgentInfo {
  id: string
  externalId: string
  agentIdentifier: string
  displayName: string | null
  description: string | null
  trustScore: number
  totalTransactions: number
  completedTransactions: number
  disputesAsClaimant: number
  disputesAsRespondent: number
  disputesWon: number
  disputesLost: number
  status: ResolveAgentStatus
  createdAt: Date
}

/**
 * Register a new agent for the Resolve system
 */
export async function registerAgent(params: RegisterAgentParams): Promise<ResolveAgentInfo> {
  const { operatorId, agentIdentifier, displayName, description, metadata } = params

  // Check if agent already exists for this operator
  const existing = await prisma.resolveAgent.findUnique({
    where: {
      operatorId_agentIdentifier: {
        operatorId,
        agentIdentifier,
      },
    },
  })

  if (existing) {
    throw new ApiError(
      'AGENT_ALREADY_REGISTERED',
      'Agent is already registered in Resolve system',
      409
    )
  }

  const agent = await prisma.resolveAgent.create({
    data: {
      externalId: generateAgentId(),
      operatorId,
      agentIdentifier,
      displayName,
      description,
      metadata: metadata as object | undefined,
      trustScore: INITIAL_TRUST_SCORE,
      monthlyDisputeResetAt: new Date(),
    },
  })

  logger.info(
    {
      agentId: agent.externalId,
      operatorId,
      agentIdentifier,
    },
    'Resolve agent registered'
  )

  return mapToAgentInfo(agent)
}

/**
 * Get agent by external ID or agent identifier
 */
export async function getAgentTrust(
  operatorId: string,
  reference: string
): Promise<ResolveAgentInfo | null> {
  const agent = await prisma.resolveAgent.findFirst({
    where: {
      operatorId,
      OR: [{ externalId: reference }, { agentIdentifier: reference }],
    },
  })

  return agent ? mapToAgentInfo(agent) : null
}

/**
 * Get agent by internal ID
 */
export async function getAgentById(agentId: string): Promise<ResolveAgentInfo | null> {
  const agent = await prisma.resolveAgent.findUnique({
    where: { id: agentId },
  })

  return agent ? mapToAgentInfo(agent) : null
}

/**
 * Get agent by external ID (any operator)
 */
export async function getAgentByExternalId(externalId: string): Promise<ResolveAgentInfo | null> {
  const agent = await prisma.resolveAgent.findUnique({
    where: { externalId },
  })

  return agent ? mapToAgentInfo(agent) : null
}

/**
 * Update an agent's trust score
 */
export async function updateTrustScore(
  agentId: string,
  change: number,
  reason: string,
  referenceType?: string,
  referenceId?: string
): Promise<{ previousScore: number; newScore: number }> {
  return await prisma.$transaction(async (tx) => {
    const agent = await tx.resolveAgent.findUnique({
      where: { id: agentId },
      select: { trustScore: true },
    })

    if (!agent) {
      throw new ApiError('AGENT_NOT_FOUND', 'Resolve agent not found', 404)
    }

    const previousScore = agent.trustScore
    const newScore = Math.max(MIN_TRUST_SCORE, Math.min(MAX_TRUST_SCORE, previousScore + change))

    // Update agent trust score
    await tx.resolveAgent.update({
      where: { id: agentId },
      data: { trustScore: newScore },
    })

    // Record trust history
    await tx.resolveAgentTrustHistory.create({
      data: {
        resolveAgentId: agentId,
        previousScore,
        newScore,
        changeAmount: change,
        reason,
        referenceType,
        referenceId,
      },
    })

    logger.info(
      {
        agentId,
        previousScore,
        newScore,
        change,
        reason,
      },
      'Trust score updated'
    )

    return { previousScore, newScore }
  })
}

/**
 * Check if agent can file a dispute (monthly limit)
 */
export async function checkDisputeLimit(agentId: string): Promise<{
  canFile: boolean
  disputesThisMonth: number
  limit: number
}> {
  const agent = await prisma.resolveAgent.findUnique({
    where: { id: agentId },
    select: {
      disputesThisMonth: true,
      monthlyDisputeResetAt: true,
    },
  })

  if (!agent) {
    throw new ApiError('AGENT_NOT_FOUND', 'Resolve agent not found', 404)
  }

  // Check if we need to reset monthly counter
  const now = new Date()
  const resetAt = agent.monthlyDisputeResetAt
  const shouldReset =
    now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()

  let disputesThisMonth = agent.disputesThisMonth

  if (shouldReset) {
    // Reset the counter
    await prisma.resolveAgent.update({
      where: { id: agentId },
      data: {
        disputesThisMonth: 0,
        monthlyDisputeResetAt: now,
      },
    })
    disputesThisMonth = 0
  }

  return {
    canFile: disputesThisMonth < MONTHLY_DISPUTE_LIMIT,
    disputesThisMonth,
    limit: MONTHLY_DISPUTE_LIMIT,
  }
}

/**
 * Increment dispute count for agent
 */
export async function incrementDisputeCount(agentId: string, asClaimant: boolean): Promise<void> {
  const updateData = asClaimant
    ? {
        disputesAsClaimant: { increment: 1 },
        disputesThisMonth: { increment: 1 },
      }
    : {
        disputesAsRespondent: { increment: 1 },
      }

  await prisma.resolveAgent.update({
    where: { id: agentId },
    data: updateData,
  })
}

/**
 * Update dispute win/loss counters
 */
export async function updateDisputeOutcome(agentId: string, won: boolean): Promise<void> {
  await prisma.resolveAgent.update({
    where: { id: agentId },
    data: won ? { disputesWon: { increment: 1 } } : { disputesLost: { increment: 1 } },
  })
}

/**
 * Calculate trust score impact based on ruling
 */
export function calculateTrustImpact(
  ruling: ResolveDisputeRuling,
  statedValue: number | null,
  isWinner: boolean
): number {
  const value = statedValue ?? 0
  const valueCents = value // Already in cents

  switch (ruling) {
    case 'CLAIMANT':
    case 'RESPONDENT':
      if (isWinner) {
        return TRUST_CHANGE_DISPUTE_WIN
      } else {
        // Loser penalty based on value
        if (valueCents < 10000) {
          // < $100
          return TRUST_CHANGE_DISPUTE_LOSS_SMALL
        } else if (valueCents < 100000) {
          // $100-999
          return TRUST_CHANGE_DISPUTE_LOSS_MEDIUM
        } else {
          // >= $1000
          return TRUST_CHANGE_DISPUTE_LOSS_LARGE
        }
      }

    case 'SPLIT':
      return TRUST_CHANGE_SPLIT_RULING

    case 'DISMISSED':
      // Claimant gets penalized for frivolous claim
      return isWinner ? 0 : TRUST_CHANGE_DISMISSED

    default:
      return 0
  }
}

/**
 * Increment transaction counters
 */
export async function incrementTransactionCount(agentId: string): Promise<void> {
  await prisma.resolveAgent.update({
    where: { id: agentId },
    data: { totalTransactions: { increment: 1 } },
  })
}

/**
 * Increment completed transaction counter and update trust
 */
export async function recordTransactionCompletion(agentId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.resolveAgent.update({
      where: { id: agentId },
      data: { completedTransactions: { increment: 1 } },
    })
  })

  // Update trust score for successful completion
  await updateTrustScore(
    agentId,
    TRUST_CHANGE_TRANSACTION_COMPLETE,
    'Transaction completed successfully',
    'transaction',
    undefined
  )
}

/**
 * Get trust history for an agent
 */
export async function getTrustHistory(
  agentId: string,
  limit: number = 20
): Promise<
  Array<{
    previousScore: number
    newScore: number
    changeAmount: number
    reason: string
    referenceType: string | null
    referenceId: string | null
    createdAt: Date
  }>
> {
  return await prisma.resolveAgentTrustHistory.findMany({
    where: { resolveAgentId: agentId },
    select: {
      previousScore: true,
      newScore: true,
      changeAmount: true,
      reason: true,
      referenceType: true,
      referenceId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/**
 * Map database model to API response
 */
function mapToAgentInfo(agent: {
  id: string
  externalId: string
  agentIdentifier: string
  displayName: string | null
  description: string | null
  trustScore: number
  totalTransactions: number
  completedTransactions: number
  disputesAsClaimant: number
  disputesAsRespondent: number
  disputesWon: number
  disputesLost: number
  status: ResolveAgentStatus
  createdAt: Date
}): ResolveAgentInfo {
  return {
    id: agent.id,
    externalId: agent.externalId,
    agentIdentifier: agent.agentIdentifier,
    displayName: agent.displayName,
    description: agent.description,
    trustScore: agent.trustScore,
    totalTransactions: agent.totalTransactions,
    completedTransactions: agent.completedTransactions,
    disputesAsClaimant: agent.disputesAsClaimant,
    disputesAsRespondent: agent.disputesAsRespondent,
    disputesWon: agent.disputesWon,
    disputesLost: agent.disputesLost,
    status: agent.status,
    createdAt: agent.createdAt,
  }
}
