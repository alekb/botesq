import { prisma, ResolveTransactionStatus } from '@botesq/database'
import pino from 'pino'
import { ApiError } from '../types.js'
import {
  incrementTransactionCount,
  recordTransactionCompletion,
  getAgentByExternalId,
} from './resolve-agent.service.js'
import { generateTransactionId } from '../utils/secure-id.js'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

// Default transaction expiry: 7 days
const DEFAULT_EXPIRY_DAYS = 7

export interface ProposeTransactionParams {
  proposerAgentId: string
  receiverAgentExternalId: string
  title: string
  description?: string
  terms: Record<string, unknown>
  statedValue?: number // in cents
  statedValueCurrency?: string
  expiresInDays?: number
  metadata?: Record<string, unknown>
}

export interface TransactionInfo {
  id: string
  externalId: string
  proposerAgent: {
    externalId: string
    agentIdentifier: string
    displayName: string | null
    trustScore: number
  }
  receiverAgent: {
    externalId: string
    agentIdentifier: string
    displayName: string | null
    trustScore: number
  }
  title: string
  description: string | null
  terms: Record<string, unknown>
  statedValue: number | null
  statedValueCurrency: string
  status: ResolveTransactionStatus
  proposedAt: Date
  respondedAt: Date | null
  completedAt: Date | null
  expiresAt: Date
  hasDisputes: boolean
}

/**
 * Propose a new transaction between agents
 */
export async function proposeTransaction(
  params: ProposeTransactionParams
): Promise<TransactionInfo> {
  const {
    proposerAgentId,
    receiverAgentExternalId,
    title,
    description,
    terms,
    statedValue,
    statedValueCurrency = 'USD',
    expiresInDays = DEFAULT_EXPIRY_DAYS,
    metadata,
  } = params

  // Validate receiver exists
  const receiverAgent = await getAgentByExternalId(receiverAgentExternalId)
  if (!receiverAgent) {
    throw new ApiError('RECEIVER_NOT_FOUND', 'Receiver agent not found', 404)
  }

  // Cannot propose to self
  const proposerAgent = await prisma.resolveAgent.findUnique({
    where: { id: proposerAgentId },
  })

  if (!proposerAgent) {
    throw new ApiError('PROPOSER_NOT_FOUND', 'Proposer agent not found', 404)
  }

  if (proposerAgent.externalId === receiverAgentExternalId) {
    throw new ApiError('SELF_TRANSACTION', 'Cannot propose a transaction to yourself', 400)
  }

  // Check agent statuses
  if (proposerAgent.status !== 'ACTIVE') {
    throw new ApiError('PROPOSER_NOT_ACTIVE', 'Proposer agent is not active', 403)
  }

  if (receiverAgent.status !== 'ACTIVE') {
    throw new ApiError('RECEIVER_NOT_ACTIVE', 'Receiver agent is not active', 403)
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  const transaction = await prisma.resolveTransaction.create({
    data: {
      externalId: generateTransactionId(),
      proposerAgentId,
      receiverAgentId: receiverAgent.id,
      title,
      description,
      terms: terms as object,
      statedValue,
      statedValueCurrency,
      expiresAt,
      metadata: metadata as object | undefined,
    },
    include: {
      proposerAgent: {
        select: {
          externalId: true,
          agentIdentifier: true,
          displayName: true,
          trustScore: true,
        },
      },
      receiverAgent: {
        select: {
          externalId: true,
          agentIdentifier: true,
          displayName: true,
          trustScore: true,
        },
      },
      _count: {
        select: { disputes: true },
      },
    },
  })

  // Increment transaction count for proposer
  await incrementTransactionCount(proposerAgentId)

  logger.info(
    {
      transactionId: transaction.externalId,
      proposerAgentId: transaction.proposerAgent.externalId,
      receiverAgentId: transaction.receiverAgent.externalId,
    },
    'Transaction proposed'
  )

  return mapToTransactionInfo(transaction)
}

/**
 * Respond to a transaction proposal (accept or reject)
 */
export async function respondToTransaction(
  transactionExternalId: string,
  respondingAgentId: string,
  response: 'accept' | 'reject'
): Promise<TransactionInfo> {
  const transaction = await prisma.resolveTransaction.findUnique({
    where: { externalId: transactionExternalId },
    include: {
      proposerAgent: true,
      receiverAgent: true,
    },
  })

  if (!transaction) {
    throw new ApiError('TRANSACTION_NOT_FOUND', 'Transaction not found', 404)
  }

  // Only receiver can respond
  if (transaction.receiverAgentId !== respondingAgentId) {
    throw new ApiError('NOT_RECEIVER', 'Only the receiver can respond to this transaction', 403)
  }

  // Must be in PROPOSED status
  if (transaction.status !== ResolveTransactionStatus.PROPOSED) {
    throw new ApiError(
      'INVALID_STATUS',
      `Cannot respond to transaction in ${transaction.status} status`,
      400
    )
  }

  // Check if expired
  if (transaction.expiresAt < new Date()) {
    await prisma.resolveTransaction.update({
      where: { id: transaction.id },
      data: { status: ResolveTransactionStatus.EXPIRED },
    })
    throw new ApiError('TRANSACTION_EXPIRED', 'Transaction has expired', 400)
  }

  const newStatus =
    response === 'accept' ? ResolveTransactionStatus.ACCEPTED : ResolveTransactionStatus.REJECTED

  const updated = await prisma.resolveTransaction.update({
    where: { id: transaction.id },
    data: {
      status: newStatus,
      respondedAt: new Date(),
    },
    include: {
      proposerAgent: {
        select: {
          externalId: true,
          agentIdentifier: true,
          displayName: true,
          trustScore: true,
        },
      },
      receiverAgent: {
        select: {
          externalId: true,
          agentIdentifier: true,
          displayName: true,
          trustScore: true,
        },
      },
      _count: {
        select: { disputes: true },
      },
    },
  })

  // Increment transaction count for receiver on acceptance
  if (response === 'accept') {
    await incrementTransactionCount(respondingAgentId)
  }

  logger.info(
    {
      transactionId: transaction.externalId,
      response,
      newStatus,
    },
    'Transaction response received'
  )

  return mapToTransactionInfo(updated)
}

/**
 * Complete a transaction (either party can mark it complete)
 */
export async function completeTransaction(
  transactionExternalId: string,
  completingAgentId: string
): Promise<TransactionInfo> {
  const transaction = await prisma.resolveTransaction.findUnique({
    where: { externalId: transactionExternalId },
    include: {
      proposerAgent: true,
      receiverAgent: true,
    },
  })

  if (!transaction) {
    throw new ApiError('TRANSACTION_NOT_FOUND', 'Transaction not found', 404)
  }

  // Only parties to the transaction can complete it
  const isParty =
    transaction.proposerAgentId === completingAgentId ||
    transaction.receiverAgentId === completingAgentId

  if (!isParty) {
    throw new ApiError('NOT_PARTY', 'Only transaction parties can complete it', 403)
  }

  // Must be in ACCEPTED or IN_PROGRESS status
  if (
    transaction.status !== ResolveTransactionStatus.ACCEPTED &&
    transaction.status !== ResolveTransactionStatus.IN_PROGRESS
  ) {
    throw new ApiError(
      'INVALID_STATUS',
      `Cannot complete transaction in ${transaction.status} status`,
      400
    )
  }

  const updated = await prisma.resolveTransaction.update({
    where: { id: transaction.id },
    data: {
      status: ResolveTransactionStatus.COMPLETED,
      completedAt: new Date(),
    },
    include: {
      proposerAgent: {
        select: {
          externalId: true,
          agentIdentifier: true,
          displayName: true,
          trustScore: true,
        },
      },
      receiverAgent: {
        select: {
          externalId: true,
          agentIdentifier: true,
          displayName: true,
          trustScore: true,
        },
      },
      _count: {
        select: { disputes: true },
      },
    },
  })

  // Record completion for both parties (trust score increase)
  await Promise.all([
    recordTransactionCompletion(transaction.proposerAgentId),
    recordTransactionCompletion(transaction.receiverAgentId),
  ])

  logger.info(
    {
      transactionId: transaction.externalId,
      completedBy: completingAgentId,
    },
    'Transaction completed'
  )

  return mapToTransactionInfo(updated)
}

/**
 * Get a transaction with party verification
 */
export async function getTransaction(
  transactionExternalId: string,
  agentId: string
): Promise<TransactionInfo | null> {
  const transaction = await prisma.resolveTransaction.findUnique({
    where: { externalId: transactionExternalId },
    include: {
      proposerAgent: {
        select: {
          externalId: true,
          agentIdentifier: true,
          displayName: true,
          trustScore: true,
        },
      },
      receiverAgent: {
        select: {
          externalId: true,
          agentIdentifier: true,
          displayName: true,
          trustScore: true,
        },
      },
      _count: {
        select: { disputes: true },
      },
    },
  })

  if (!transaction) {
    return null
  }

  // Verify caller is a party to the transaction
  const isParty =
    transaction.proposerAgent.externalId === agentId ||
    transaction.receiverAgent.externalId === agentId ||
    transaction.proposerAgentId === agentId ||
    transaction.receiverAgentId === agentId

  if (!isParty) {
    throw new ApiError('NOT_PARTY', 'You are not a party to this transaction', 403)
  }

  return mapToTransactionInfo(transaction)
}

/**
 * List transactions for an agent
 */
export async function listAgentTransactions(
  agentId: string,
  options: {
    status?: ResolveTransactionStatus
    role?: 'proposer' | 'receiver' | 'both'
    limit?: number
    offset?: number
  } = {}
): Promise<{
  transactions: TransactionInfo[]
  total: number
  hasMore: boolean
}> {
  const { status, role = 'both', limit = 20, offset = 0 } = options

  // Get internal agent ID if external ID was provided
  let internalAgentId = agentId
  const agentByExternal = await prisma.resolveAgent.findUnique({
    where: { externalId: agentId },
    select: { id: true },
  })
  if (agentByExternal) {
    internalAgentId = agentByExternal.id
  }

  const roleCondition =
    role === 'proposer'
      ? { proposerAgentId: internalAgentId }
      : role === 'receiver'
        ? { receiverAgentId: internalAgentId }
        : {
            OR: [{ proposerAgentId: internalAgentId }, { receiverAgentId: internalAgentId }],
          }

  const where = {
    ...roleCondition,
    ...(status && { status }),
  }

  const [transactions, total] = await Promise.all([
    prisma.resolveTransaction.findMany({
      where,
      include: {
        proposerAgent: {
          select: {
            externalId: true,
            agentIdentifier: true,
            displayName: true,
            trustScore: true,
          },
        },
        receiverAgent: {
          select: {
            externalId: true,
            agentIdentifier: true,
            displayName: true,
            trustScore: true,
          },
        },
        _count: {
          select: { disputes: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.resolveTransaction.count({ where }),
  ])

  return {
    transactions: transactions.map(mapToTransactionInfo),
    total,
    hasMore: offset + transactions.length < total,
  }
}

/**
 * Expire stale transactions
 */
export async function expireStaleTransactions(): Promise<number> {
  const result = await prisma.resolveTransaction.updateMany({
    where: {
      status: ResolveTransactionStatus.PROPOSED,
      expiresAt: { lt: new Date() },
    },
    data: {
      status: ResolveTransactionStatus.EXPIRED,
    },
  })

  if (result.count > 0) {
    logger.info({ count: result.count }, 'Expired stale transactions')
  }

  return result.count
}

/**
 * Mark transaction as disputed
 */
export async function markTransactionDisputed(transactionId: string): Promise<void> {
  await prisma.resolveTransaction.update({
    where: { id: transactionId },
    data: { status: ResolveTransactionStatus.DISPUTED },
  })
}

/**
 * Get transaction by internal ID
 */
export async function getTransactionById(transactionId: string): Promise<{
  id: string
  externalId: string
  proposerAgentId: string
  receiverAgentId: string
  title: string
  description: string | null
  terms: unknown
  statedValue: number | null
  status: ResolveTransactionStatus
} | null> {
  return await prisma.resolveTransaction.findUnique({
    where: { id: transactionId },
  })
}

/**
 * Get transaction by external ID
 */
export async function getTransactionByExternalId(externalId: string): Promise<{
  id: string
  externalId: string
  proposerAgentId: string
  receiverAgentId: string
  title: string
  description: string | null
  terms: unknown
  statedValue: number | null
  status: ResolveTransactionStatus
} | null> {
  return await prisma.resolveTransaction.findUnique({
    where: { externalId },
  })
}

/**
 * Map database model to API response
 */
function mapToTransactionInfo(transaction: {
  id: string
  externalId: string
  proposerAgent: {
    externalId: string
    agentIdentifier: string
    displayName: string | null
    trustScore: number
  }
  receiverAgent: {
    externalId: string
    agentIdentifier: string
    displayName: string | null
    trustScore: number
  }
  title: string
  description: string | null
  terms: unknown
  statedValue: number | null
  statedValueCurrency: string
  status: ResolveTransactionStatus
  proposedAt: Date
  respondedAt: Date | null
  completedAt: Date | null
  expiresAt: Date
  _count: { disputes: number }
}): TransactionInfo {
  return {
    id: transaction.id,
    externalId: transaction.externalId,
    proposerAgent: transaction.proposerAgent,
    receiverAgent: transaction.receiverAgent,
    title: transaction.title,
    description: transaction.description,
    terms: transaction.terms as Record<string, unknown>,
    statedValue: transaction.statedValue,
    statedValueCurrency: transaction.statedValueCurrency,
    status: transaction.status,
    proposedAt: transaction.proposedAt,
    respondedAt: transaction.respondedAt,
    completedAt: transaction.completedAt,
    expiresAt: transaction.expiresAt,
    hasDisputes: transaction._count.disputes > 0,
  }
}
