import {
  prisma,
  ResolveDisputeStatus,
  ResolveDisputeClaimType,
  ResolveEvidenceType,
  ResolveEvidenceSubmitter,
  ResolveTransactionStatus,
} from '@botesq/database'
import type { ResolveDisputeRuling } from '@botesq/database'
import pino from 'pino'
import { ApiError } from '../types.js'
import { deductCredits } from './credit.service.js'
import { checkDisputeLimit, incrementDisputeCount } from './resolve-agent.service.js'
import {
  getTransactionByExternalId,
  markTransactionDisputed,
} from './resolve-transaction.service.js'
import { generateDisputeId, generateEscalationId } from '../utils/secure-id.js'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

// Response deadline: 72 hours
const RESPONSE_DEADLINE_HOURS = 72

// Pricing constants
const FREE_VALUE_THRESHOLD_CENTS = 10000 // $100
const FREE_MONTHLY_DISPUTES = 5
const BASE_DISPUTE_COST = 500 // credits
const VALUE_MULTIPLIER = 100 // credits per $1000 of value
const MAX_DISPUTE_COST = 5000 // credits

export interface FileDisputeParams {
  transactionExternalId: string
  claimantAgentId: string
  claimType: ResolveDisputeClaimType
  claimSummary: string
  claimDetails?: string
  requestedResolution: string
  operatorId: string
}

export interface DisputeInfo {
  id: string
  externalId: string
  transaction: {
    externalId: string
    title: string
    statedValue: number | null
  }
  claimantAgent: {
    externalId: string
    agentIdentifier: string
    displayName: string | null
    trustScore: number
  }
  respondentAgent: {
    externalId: string
    agentIdentifier: string
    displayName: string | null
    trustScore: number
  }
  claimType: ResolveDisputeClaimType
  claimSummary: string
  claimDetails: string | null
  requestedResolution: string
  responseSummary: string | null
  responseDetails: string | null
  responseDeadline: Date
  responseSubmittedAt: Date | null
  status: ResolveDisputeStatus
  ruling: ResolveDisputeRuling | null
  rulingReasoning: string | null
  rulingDetails: Record<string, unknown> | null
  ruledAt: Date | null
  claimantScoreChange: number | null
  respondentScoreChange: number | null
  statedValue: number | null
  creditsCharged: number
  wasFree: boolean
  claimantAccepted: boolean | null
  respondentAccepted: boolean | null
  claimantDecisionAt: Date | null
  respondentDecisionAt: Date | null
  decisionDeadline: Date | null
  closedAt: Date | null
  createdAt: Date
  evidenceCount: number
}

/**
 * Check if a dispute can be filed for a transaction
 */
export async function canFileDispute(
  transactionExternalId: string,
  claimantAgentId: string
): Promise<{
  canFile: boolean
  reason?: string
  estimatedCost: number
  isFree: boolean
}> {
  const transaction = await getTransactionByExternalId(transactionExternalId)

  if (!transaction) {
    return { canFile: false, reason: 'Transaction not found', estimatedCost: 0, isFree: false }
  }

  // Check if claimant is a party to the transaction
  const isParty =
    transaction.proposerAgentId === claimantAgentId ||
    transaction.receiverAgentId === claimantAgentId

  if (!isParty) {
    return {
      canFile: false,
      reason: 'You are not a party to this transaction',
      estimatedCost: 0,
      isFree: false,
    }
  }

  // Check transaction status allows disputes
  const allowedStatuses: ResolveTransactionStatus[] = [
    ResolveTransactionStatus.ACCEPTED,
    ResolveTransactionStatus.IN_PROGRESS,
    ResolveTransactionStatus.COMPLETED,
  ]

  if (!allowedStatuses.includes(transaction.status as ResolveTransactionStatus)) {
    return {
      canFile: false,
      reason: `Cannot file dispute for transaction in ${transaction.status} status`,
      estimatedCost: 0,
      isFree: false,
    }
  }

  // Check existing disputes
  const existingDispute = await prisma.resolveDispute.findFirst({
    where: {
      transactionId: transaction.id,
      claimantAgentId,
      status: {
        notIn: [ResolveDisputeStatus.CLOSED, ResolveDisputeStatus.RULED],
      },
    },
  })

  if (existingDispute) {
    return {
      canFile: false,
      reason: 'You already have an active dispute for this transaction',
      estimatedCost: 0,
      isFree: false,
    }
  }

  // Check monthly dispute limit
  const limitCheck = await checkDisputeLimit(claimantAgentId)
  const { estimatedCost, isFree } = calculateDisputeCost(
    transaction.statedValue,
    limitCheck.disputesThisMonth
  )

  return {
    canFile: true,
    estimatedCost,
    isFree,
  }
}

/**
 * Calculate the cost to file a dispute
 */
export function calculateDisputeCost(
  statedValue: number | null,
  disputesThisMonth: number
): { estimatedCost: number; isFree: boolean } {
  const value = statedValue ?? 0

  // Free if value < $100 OR < 5 disputes this month
  if (value < FREE_VALUE_THRESHOLD_CENTS || disputesThisMonth < FREE_MONTHLY_DISPUTES) {
    return { estimatedCost: 0, isFree: true }
  }

  // Calculate cost: base + (value/1000 * multiplier), max 5000
  const valueDollars = value / 100
  const cost = Math.min(
    MAX_DISPUTE_COST,
    BASE_DISPUTE_COST + Math.floor((valueDollars / 1000) * VALUE_MULTIPLIER)
  )

  return { estimatedCost: cost, isFree: false }
}

/**
 * File a new dispute
 */
export async function fileDispute(params: FileDisputeParams): Promise<DisputeInfo> {
  const {
    transactionExternalId,
    claimantAgentId,
    claimType,
    claimSummary,
    claimDetails,
    requestedResolution,
    operatorId,
  } = params

  // Verify can file
  const canFileResult = await canFileDispute(transactionExternalId, claimantAgentId)
  if (!canFileResult.canFile) {
    throw new ApiError('CANNOT_FILE_DISPUTE', canFileResult.reason ?? 'Cannot file dispute', 400)
  }

  const transaction = await getTransactionByExternalId(transactionExternalId)
  if (!transaction) {
    throw new ApiError('TRANSACTION_NOT_FOUND', 'Transaction not found', 404)
  }

  // Determine respondent
  const respondentAgentId =
    transaction.proposerAgentId === claimantAgentId
      ? transaction.receiverAgentId
      : transaction.proposerAgentId

  // Calculate cost and charge if not free
  const { estimatedCost, isFree } = canFileResult
  if (!isFree && estimatedCost > 0) {
    await deductCredits(
      operatorId,
      estimatedCost,
      `Dispute filing fee for transaction ${transactionExternalId}`,
      'dispute',
      undefined
    )
  }

  // Calculate response deadline
  const responseDeadline = new Date()
  responseDeadline.setHours(responseDeadline.getHours() + RESPONSE_DEADLINE_HOURS)

  // Create dispute
  const dispute = await prisma.resolveDispute.create({
    data: {
      externalId: generateDisputeId(),
      transactionId: transaction.id,
      claimantAgentId,
      respondentAgentId,
      claimType,
      claimSummary,
      claimDetails,
      requestedResolution,
      responseDeadline,
      statedValue: transaction.statedValue,
      creditsCharged: estimatedCost,
      wasFree: isFree,
      status: ResolveDisputeStatus.AWAITING_RESPONSE,
    },
    include: {
      transaction: {
        select: {
          externalId: true,
          title: true,
          statedValue: true,
        },
      },
      claimantAgent: {
        select: {
          externalId: true,
          agentIdentifier: true,
          displayName: true,
          trustScore: true,
        },
      },
      respondentAgent: {
        select: {
          externalId: true,
          agentIdentifier: true,
          displayName: true,
          trustScore: true,
        },
      },
      _count: {
        select: { evidence: true },
      },
    },
  })

  // Update transaction status
  await markTransactionDisputed(transaction.id)

  // Increment dispute counts
  await Promise.all([
    incrementDisputeCount(claimantAgentId, true),
    incrementDisputeCount(respondentAgentId, false),
  ])

  logger.info(
    {
      disputeId: dispute.externalId,
      transactionId: transactionExternalId,
      claimType,
      creditsCharged: estimatedCost,
    },
    'Dispute filed'
  )

  return mapToDisputeInfo(dispute)
}

/**
 * Respond to a dispute
 */
export async function respondToDispute(params: {
  disputeExternalId: string
  respondentAgentId: string
  responseSummary: string
  responseDetails?: string
}): Promise<DisputeInfo> {
  const { disputeExternalId, respondentAgentId, responseSummary, responseDetails } = params

  const dispute = await prisma.resolveDispute.findUnique({
    where: { externalId: disputeExternalId },
    include: {
      transaction: true,
      claimantAgent: true,
      respondentAgent: true,
    },
  })

  if (!dispute) {
    throw new ApiError('DISPUTE_NOT_FOUND', 'Dispute not found', 404)
  }

  // Verify respondent
  if (dispute.respondentAgentId !== respondentAgentId) {
    throw new ApiError('NOT_RESPONDENT', 'Only the respondent can respond to this dispute', 403)
  }

  // Check status
  if (dispute.status !== ResolveDisputeStatus.AWAITING_RESPONSE) {
    throw new ApiError(
      'INVALID_STATUS',
      `Cannot respond to dispute in ${dispute.status} status`,
      400
    )
  }

  // Check deadline
  if (dispute.responseDeadline < new Date()) {
    // Auto-proceed to arbitration if deadline passed
    await prisma.resolveDispute.update({
      where: { id: dispute.id },
      data: { status: ResolveDisputeStatus.IN_ARBITRATION },
    })
    throw new ApiError('RESPONSE_DEADLINE_PASSED', 'Response deadline has passed', 400)
  }

  const updated = await prisma.resolveDispute.update({
    where: { id: dispute.id },
    data: {
      responseSummary,
      responseDetails,
      responseSubmittedAt: new Date(),
      status: ResolveDisputeStatus.RESPONSE_RECEIVED,
    },
    include: {
      transaction: {
        select: {
          externalId: true,
          title: true,
          statedValue: true,
        },
      },
      claimantAgent: {
        select: {
          externalId: true,
          agentIdentifier: true,
          displayName: true,
          trustScore: true,
        },
      },
      respondentAgent: {
        select: {
          externalId: true,
          agentIdentifier: true,
          displayName: true,
          trustScore: true,
        },
      },
      _count: {
        select: { evidence: true },
      },
    },
  })

  logger.info(
    {
      disputeId: dispute.externalId,
      respondentAgentId,
    },
    'Dispute response submitted'
  )

  return mapToDisputeInfo(updated)
}

/**
 * Get a dispute with party verification
 */
export async function getDispute(
  disputeExternalId: string,
  agentId: string
): Promise<DisputeInfo | null> {
  const dispute = await prisma.resolveDispute.findUnique({
    where: { externalId: disputeExternalId },
    include: {
      transaction: {
        select: {
          externalId: true,
          title: true,
          statedValue: true,
        },
      },
      claimantAgent: {
        select: {
          externalId: true,
          agentIdentifier: true,
          displayName: true,
          trustScore: true,
        },
      },
      respondentAgent: {
        select: {
          externalId: true,
          agentIdentifier: true,
          displayName: true,
          trustScore: true,
        },
      },
      _count: {
        select: { evidence: true },
      },
    },
  })

  if (!dispute) {
    return null
  }

  // Verify caller is a party
  const isParty =
    dispute.claimantAgent.externalId === agentId ||
    dispute.respondentAgent.externalId === agentId ||
    dispute.claimantAgentId === agentId ||
    dispute.respondentAgentId === agentId

  if (!isParty) {
    throw new ApiError('NOT_PARTY', 'You are not a party to this dispute', 403)
  }

  return mapToDisputeInfo(dispute)
}

/**
 * Get dispute by internal ID (for arbitration)
 */
export async function getDisputeById(disputeId: string): Promise<{
  id: string
  externalId: string
  transactionId: string
  claimantAgentId: string
  respondentAgentId: string
  claimType: ResolveDisputeClaimType
  claimSummary: string
  claimDetails: string | null
  requestedResolution: string
  responseSummary: string | null
  responseDetails: string | null
  status: ResolveDisputeStatus
  statedValue: number | null
  transaction: {
    title: string
    description: string | null
    terms: unknown
  }
  claimantAgent: {
    externalId: string
    trustScore: number
  }
  respondentAgent: {
    externalId: string
    trustScore: number
  }
  evidence: Array<{
    submittedBy: ResolveEvidenceSubmitter
    evidenceType: ResolveEvidenceType
    title: string
    content: string
  }>
} | null> {
  return await prisma.resolveDispute.findUnique({
    where: { id: disputeId },
    include: {
      transaction: {
        select: {
          title: true,
          description: true,
          terms: true,
        },
      },
      claimantAgent: {
        select: {
          externalId: true,
          trustScore: true,
        },
      },
      respondentAgent: {
        select: {
          externalId: true,
          trustScore: true,
        },
      },
      evidence: {
        select: {
          submittedBy: true,
          evidenceType: true,
          title: true,
          content: true,
        },
      },
    },
  })
}

/**
 * Add evidence to a dispute
 */
export async function addEvidence(params: {
  disputeExternalId: string
  submittingAgentId: string
  evidenceType: ResolveEvidenceType
  title: string
  content: string
}): Promise<{ evidenceId: string }> {
  const { disputeExternalId, submittingAgentId, evidenceType, title, content } = params

  const dispute = await prisma.resolveDispute.findUnique({
    where: { externalId: disputeExternalId },
  })

  if (!dispute) {
    throw new ApiError('DISPUTE_NOT_FOUND', 'Dispute not found', 404)
  }

  // Determine submitter role
  let submittedBy: ResolveEvidenceSubmitter
  if (dispute.claimantAgentId === submittingAgentId) {
    submittedBy = ResolveEvidenceSubmitter.CLAIMANT
  } else if (dispute.respondentAgentId === submittingAgentId) {
    submittedBy = ResolveEvidenceSubmitter.RESPONDENT
  } else {
    throw new ApiError('NOT_PARTY', 'Only dispute parties can submit evidence', 403)
  }

  // Check dispute status allows evidence
  const allowedEvidenceStatuses: ResolveDisputeStatus[] = [
    ResolveDisputeStatus.AWAITING_RESPONSE,
    ResolveDisputeStatus.RESPONSE_RECEIVED,
  ]

  if (!allowedEvidenceStatuses.includes(dispute.status as ResolveDisputeStatus)) {
    throw new ApiError(
      'EVIDENCE_NOT_ALLOWED',
      `Cannot submit evidence for dispute in ${dispute.status} status`,
      400
    )
  }

  const evidence = await prisma.resolveEvidence.create({
    data: {
      disputeId: dispute.id,
      submittedBy,
      submittedByAgentId: submittingAgentId,
      evidenceType,
      title,
      content,
    },
  })

  logger.info(
    {
      disputeId: disputeExternalId,
      evidenceId: evidence.id,
      submittedBy,
    },
    'Evidence submitted'
  )

  return { evidenceId: evidence.id }
}

/**
 * Get evidence for a dispute
 */
export async function getEvidenceForDispute(
  disputeExternalId: string,
  viewerAgentId: string
): Promise<
  Array<{
    id: string
    submittedBy: ResolveEvidenceSubmitter
    submittedByAgentId: string
    evidenceType: ResolveEvidenceType
    title: string
    content: string
    createdAt: Date
  }>
> {
  const dispute = await prisma.resolveDispute.findUnique({
    where: { externalId: disputeExternalId },
  })

  if (!dispute) {
    throw new ApiError('DISPUTE_NOT_FOUND', 'Dispute not found', 404)
  }

  // Verify viewer is a party
  const isParty =
    dispute.claimantAgentId === viewerAgentId || dispute.respondentAgentId === viewerAgentId

  if (!isParty) {
    throw new ApiError('NOT_PARTY', 'Only dispute parties can view evidence', 403)
  }

  return await prisma.resolveEvidence.findMany({
    where: { disputeId: dispute.id },
    orderBy: { createdAt: 'asc' },
  })
}

/**
 * Update dispute with ruling
 */
export async function recordRuling(params: {
  disputeId: string
  ruling: ResolveDisputeRuling
  rulingReasoning: string
  rulingDetails: Record<string, unknown>
  claimantScoreChange: number
  respondentScoreChange: number
}): Promise<void> {
  const {
    disputeId,
    ruling,
    rulingReasoning,
    rulingDetails,
    claimantScoreChange,
    respondentScoreChange,
  } = params

  const decisionDeadline = new Date()
  decisionDeadline.setDate(decisionDeadline.getDate() + DECISION_DEADLINE_DAYS)

  await prisma.resolveDispute.update({
    where: { id: disputeId },
    data: {
      ruling,
      rulingReasoning,
      rulingDetails: rulingDetails as object,
      ruledAt: new Date(),
      claimantScoreChange,
      respondentScoreChange,
      decisionDeadline,
      status: ResolveDisputeStatus.RULED,
    },
  })
}

/**
 * List disputes for an agent
 */
export async function listDisputesForAgent(
  agentId: string,
  options?: {
    status?: ResolveDisputeStatus
    role?: 'claimant' | 'respondent' | 'any'
    limit?: number
    offset?: number
  }
): Promise<{
  disputes: DisputeInfo[]
  total: number
  limit: number
  offset: number
}> {
  const { status, role = 'any', limit = 20, offset = 0 } = options ?? {}

  const where: {
    status?: ResolveDisputeStatus
    claimantAgentId?: string
    respondentAgentId?: string
    OR?: Array<{ claimantAgentId: string } | { respondentAgentId: string }>
  } = {}

  if (status) {
    where.status = status
  }

  if (role === 'claimant') {
    where.claimantAgentId = agentId
  } else if (role === 'respondent') {
    where.respondentAgentId = agentId
  } else {
    where.OR = [{ claimantAgentId: agentId }, { respondentAgentId: agentId }]
  }

  const [disputes, total] = await Promise.all([
    prisma.resolveDispute.findMany({
      where,
      include: {
        transaction: {
          select: {
            externalId: true,
            title: true,
            statedValue: true,
          },
        },
        claimantAgent: {
          select: {
            externalId: true,
            agentIdentifier: true,
            displayName: true,
            trustScore: true,
          },
        },
        respondentAgent: {
          select: {
            externalId: true,
            agentIdentifier: true,
            displayName: true,
            trustScore: true,
          },
        },
        _count: {
          select: { evidence: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.resolveDispute.count({ where }),
  ])

  return {
    disputes: disputes.map(mapToDisputeInfo),
    total,
    limit,
    offset,
  }
}

/**
 * List disputes pending arbitration
 */
export async function listDisputesPendingArbitration(): Promise<
  Array<{
    id: string
    externalId: string
    responseDeadline: Date
    status: ResolveDisputeStatus
  }>
> {
  const now = new Date()

  return await prisma.resolveDispute.findMany({
    where: {
      OR: [
        // Response received, ready for arbitration
        { status: ResolveDisputeStatus.RESPONSE_RECEIVED },
        // Awaiting response but deadline passed
        {
          status: ResolveDisputeStatus.AWAITING_RESPONSE,
          responseDeadline: { lt: now },
        },
      ],
    },
    select: {
      id: true,
      externalId: true,
      responseDeadline: true,
      status: true,
    },
  })
}

// Decision acceptance deadline: 7 days from ruling
const DECISION_DEADLINE_DAYS = 7

// Escalation cost: 2000 credits
const ESCALATION_COST = 2000

/**
 * Accept the AI ruling on a dispute
 */
export async function acceptDecision(
  disputeExternalId: string,
  agentId: string
): Promise<DisputeInfo> {
  const dispute = await prisma.resolveDispute.findUnique({
    where: { externalId: disputeExternalId },
  })

  if (!dispute) {
    throw new ApiError('DISPUTE_NOT_FOUND', 'Dispute not found', 404)
  }

  if (dispute.status !== ResolveDisputeStatus.RULED) {
    throw new ApiError(
      'INVALID_STATUS',
      `Cannot accept decision for dispute in ${dispute.status} status`,
      400
    )
  }

  // Determine party role
  const isClaimant = dispute.claimantAgentId === agentId
  const isRespondent = dispute.respondentAgentId === agentId

  if (!isClaimant && !isRespondent) {
    throw new ApiError('NOT_PARTY', 'You are not a party to this dispute', 403)
  }

  // Check if already responded
  if (isClaimant && dispute.claimantAccepted !== null) {
    throw new ApiError('ALREADY_RESPONDED', 'You have already responded to this decision', 400)
  }
  if (isRespondent && dispute.respondentAccepted !== null) {
    throw new ApiError('ALREADY_RESPONDED', 'You have already responded to this decision', 400)
  }

  const updateData: Record<string, unknown> = {}
  if (isClaimant) {
    updateData.claimantAccepted = true
    updateData.claimantDecisionAt = new Date()
  } else {
    updateData.respondentAccepted = true
    updateData.respondentDecisionAt = new Date()
  }

  // Check if both parties have now accepted
  const otherAccepted = isClaimant ? dispute.respondentAccepted : dispute.claimantAccepted
  if (otherAccepted === true) {
    updateData.status = ResolveDisputeStatus.CLOSED
    updateData.closedAt = new Date()
  }

  const updated = await prisma.resolveDispute.update({
    where: { id: dispute.id },
    data: updateData,
    include: {
      transaction: {
        select: { externalId: true, title: true, statedValue: true },
      },
      claimantAgent: {
        select: { externalId: true, agentIdentifier: true, displayName: true, trustScore: true },
      },
      respondentAgent: {
        select: { externalId: true, agentIdentifier: true, displayName: true, trustScore: true },
      },
      _count: { select: { evidence: true } },
    },
  })

  logger.info({ disputeId: disputeExternalId, agentId, action: 'accept' }, 'Decision accepted')

  return mapToDisputeInfo(updated)
}

/**
 * Reject the AI ruling on a dispute
 */
export async function rejectDecision(
  disputeExternalId: string,
  agentId: string
): Promise<DisputeInfo> {
  const dispute = await prisma.resolveDispute.findUnique({
    where: { externalId: disputeExternalId },
  })

  if (!dispute) {
    throw new ApiError('DISPUTE_NOT_FOUND', 'Dispute not found', 404)
  }

  if (dispute.status !== ResolveDisputeStatus.RULED) {
    throw new ApiError(
      'INVALID_STATUS',
      `Cannot reject decision for dispute in ${dispute.status} status`,
      400
    )
  }

  const isClaimant = dispute.claimantAgentId === agentId
  const isRespondent = dispute.respondentAgentId === agentId

  if (!isClaimant && !isRespondent) {
    throw new ApiError('NOT_PARTY', 'You are not a party to this dispute', 403)
  }

  if (isClaimant && dispute.claimantAccepted !== null) {
    throw new ApiError('ALREADY_RESPONDED', 'You have already responded to this decision', 400)
  }
  if (isRespondent && dispute.respondentAccepted !== null) {
    throw new ApiError('ALREADY_RESPONDED', 'You have already responded to this decision', 400)
  }

  const updateData: Record<string, unknown> = {}
  if (isClaimant) {
    updateData.claimantAccepted = false
    updateData.claimantDecisionAt = new Date()
  } else {
    updateData.respondentAccepted = false
    updateData.respondentDecisionAt = new Date()
  }

  const updated = await prisma.resolveDispute.update({
    where: { id: dispute.id },
    data: updateData,
    include: {
      transaction: {
        select: { externalId: true, title: true, statedValue: true },
      },
      claimantAgent: {
        select: { externalId: true, agentIdentifier: true, displayName: true, trustScore: true },
      },
      respondentAgent: {
        select: { externalId: true, agentIdentifier: true, displayName: true, trustScore: true },
      },
      _count: { select: { evidence: true } },
    },
  })

  logger.info({ disputeId: disputeExternalId, agentId, action: 'reject' }, 'Decision rejected')

  return mapToDisputeInfo(updated)
}

/**
 * Get decision details for a dispute
 */
export async function getDecision(
  disputeExternalId: string,
  agentId: string
): Promise<{
  dispute_id: string
  status: string
  ruling: ResolveDisputeRuling | null
  ruling_reasoning: string | null
  ruling_details: Record<string, unknown> | null
  ruled_at: Date | null
  claimant_score_change: number | null
  respondent_score_change: number | null
  claimant_accepted: boolean | null
  respondent_accepted: boolean | null
  claimant_decision_at: Date | null
  respondent_decision_at: Date | null
  decision_deadline: Date | null
  can_escalate: boolean
}> {
  const dispute = await prisma.resolveDispute.findUnique({
    where: { externalId: disputeExternalId },
    include: {
      escalation: true,
    },
  })

  if (!dispute) {
    throw new ApiError('DISPUTE_NOT_FOUND', 'Dispute not found', 404)
  }

  const isParty = dispute.claimantAgentId === agentId || dispute.respondentAgentId === agentId
  if (!isParty) {
    throw new ApiError('NOT_PARTY', 'You are not a party to this dispute', 403)
  }

  if (!dispute.ruling) {
    throw new ApiError('NO_RULING', 'This dispute has not been ruled on yet', 400)
  }

  // Can escalate if: status is RULED, the agent rejected the decision, and no escalation exists yet
  const isClaimant = dispute.claimantAgentId === agentId
  const agentRejected = isClaimant
    ? dispute.claimantAccepted === false
    : dispute.respondentAccepted === false
  const canEscalate =
    dispute.status === ResolveDisputeStatus.RULED && agentRejected && !dispute.escalation

  return {
    dispute_id: dispute.externalId,
    status: dispute.status,
    ruling: dispute.ruling as ResolveDisputeRuling,
    ruling_reasoning: dispute.rulingReasoning,
    ruling_details: dispute.rulingDetails as Record<string, unknown> | null,
    ruled_at: dispute.ruledAt,
    claimant_score_change: dispute.claimantScoreChange,
    respondent_score_change: dispute.respondentScoreChange,
    claimant_accepted: dispute.claimantAccepted,
    respondent_accepted: dispute.respondentAccepted,
    claimant_decision_at: dispute.claimantDecisionAt,
    respondent_decision_at: dispute.respondentDecisionAt,
    decision_deadline: dispute.decisionDeadline,
    can_escalate: canEscalate,
  }
}

/**
 * Request escalation to a human arbitrator
 */
export async function requestEscalation(params: {
  disputeExternalId: string
  agentId: string
  reason: string
  operatorId: string
}): Promise<{
  escalation_id: string
  dispute_id: string
  status: string
  reason: string
  credits_charged: number
  requested_at: Date
}> {
  const { disputeExternalId, agentId, reason, operatorId } = params

  const dispute = await prisma.resolveDispute.findUnique({
    where: { externalId: disputeExternalId },
    include: { escalation: true },
  })

  if (!dispute) {
    throw new ApiError('DISPUTE_NOT_FOUND', 'Dispute not found', 404)
  }

  if (dispute.status !== ResolveDisputeStatus.RULED) {
    throw new ApiError('INVALID_STATUS', `Cannot escalate dispute in ${dispute.status} status`, 400)
  }

  // Verify agent is a party and has rejected
  const isClaimant = dispute.claimantAgentId === agentId
  const isRespondent = dispute.respondentAgentId === agentId

  if (!isClaimant && !isRespondent) {
    throw new ApiError('NOT_PARTY', 'You are not a party to this dispute', 403)
  }

  const agentRejected = isClaimant
    ? dispute.claimantAccepted === false
    : dispute.respondentAccepted === false

  if (!agentRejected) {
    throw new ApiError(
      'MUST_REJECT_FIRST',
      'You must reject the AI decision before requesting escalation',
      400
    )
  }

  if (dispute.escalation) {
    throw new ApiError('ALREADY_ESCALATED', 'This dispute has already been escalated', 400)
  }

  // Charge escalation fee
  await deductCredits(
    operatorId,
    ESCALATION_COST,
    `Escalation fee for dispute ${disputeExternalId}`,
    'escalation',
    undefined
  )

  // Create escalation and update dispute status
  const escalation = await prisma.resolveEscalation.create({
    data: {
      externalId: generateEscalationId(),
      disputeId: dispute.id,
      requestedByAgentId: agentId,
      reason,
      creditsCharged: ESCALATION_COST,
    },
  })

  await prisma.resolveDispute.update({
    where: { id: dispute.id },
    data: { status: ResolveDisputeStatus.ESCALATED },
  })

  logger.info(
    {
      escalationId: escalation.externalId,
      disputeId: disputeExternalId,
      agentId,
      creditsCharged: ESCALATION_COST,
    },
    'Escalation requested'
  )

  return {
    escalation_id: escalation.externalId,
    dispute_id: disputeExternalId,
    status: escalation.status,
    reason: escalation.reason,
    credits_charged: ESCALATION_COST,
    requested_at: escalation.requestedAt,
  }
}

/**
 * Get escalation status for a dispute
 */
export async function getEscalationStatus(
  disputeExternalId: string,
  agentId: string
): Promise<{
  escalation_id: string
  dispute_id: string
  status: string
  reason: string
  requested_by: string
  arbitrator_ruling: ResolveDisputeRuling | null
  arbitrator_ruling_reasoning: string | null
  arbitrator_notes: string | null
  credits_charged: number
  requested_at: Date
  assigned_at: Date | null
  decided_at: Date | null
  closed_at: Date | null
}> {
  const dispute = await prisma.resolveDispute.findUnique({
    where: { externalId: disputeExternalId },
    include: {
      escalation: {
        include: {
          requestedByAgent: {
            select: { externalId: true },
          },
        },
      },
    },
  })

  if (!dispute) {
    throw new ApiError('DISPUTE_NOT_FOUND', 'Dispute not found', 404)
  }

  const isParty = dispute.claimantAgentId === agentId || dispute.respondentAgentId === agentId
  if (!isParty) {
    throw new ApiError('NOT_PARTY', 'You are not a party to this dispute', 403)
  }

  if (!dispute.escalation) {
    throw new ApiError('NO_ESCALATION', 'No escalation exists for this dispute', 404)
  }

  const escalation = dispute.escalation

  return {
    escalation_id: escalation.externalId,
    dispute_id: disputeExternalId,
    status: escalation.status,
    reason: escalation.reason,
    requested_by: escalation.requestedByAgent.externalId,
    arbitrator_ruling: escalation.arbitratorRuling as ResolveDisputeRuling | null,
    arbitrator_ruling_reasoning: escalation.arbitratorRulingReasoning,
    arbitrator_notes: escalation.arbitratorNotes,
    credits_charged: escalation.creditsCharged,
    requested_at: escalation.requestedAt,
    assigned_at: escalation.assignedAt,
    decided_at: escalation.decidedAt,
    closed_at: escalation.closedAt,
  }
}

/**
 * Map database model to API response
 */
function mapToDisputeInfo(dispute: {
  id: string
  externalId: string
  transaction: {
    externalId: string
    title: string
    statedValue: number | null
  }
  claimantAgent: {
    externalId: string
    agentIdentifier: string
    displayName: string | null
    trustScore: number
  }
  respondentAgent: {
    externalId: string
    agentIdentifier: string
    displayName: string | null
    trustScore: number
  }
  claimType: ResolveDisputeClaimType
  claimSummary: string
  claimDetails: string | null
  requestedResolution: string
  responseSummary: string | null
  responseDetails: string | null
  responseDeadline: Date
  responseSubmittedAt: Date | null
  status: ResolveDisputeStatus
  ruling: ResolveDisputeRuling | null
  rulingReasoning: string | null
  rulingDetails: unknown
  ruledAt: Date | null
  claimantScoreChange: number | null
  respondentScoreChange: number | null
  statedValue: number | null
  creditsCharged: number
  wasFree: boolean
  claimantAccepted: boolean | null
  respondentAccepted: boolean | null
  claimantDecisionAt: Date | null
  respondentDecisionAt: Date | null
  decisionDeadline: Date | null
  closedAt: Date | null
  createdAt: Date
  _count: { evidence: number }
}): DisputeInfo {
  return {
    id: dispute.id,
    externalId: dispute.externalId,
    transaction: dispute.transaction,
    claimantAgent: dispute.claimantAgent,
    respondentAgent: dispute.respondentAgent,
    claimType: dispute.claimType,
    claimSummary: dispute.claimSummary,
    claimDetails: dispute.claimDetails,
    requestedResolution: dispute.requestedResolution,
    responseSummary: dispute.responseSummary,
    responseDetails: dispute.responseDetails,
    responseDeadline: dispute.responseDeadline,
    responseSubmittedAt: dispute.responseSubmittedAt,
    status: dispute.status,
    ruling: dispute.ruling,
    rulingReasoning: dispute.rulingReasoning,
    rulingDetails: dispute.rulingDetails as Record<string, unknown> | null,
    ruledAt: dispute.ruledAt,
    claimantScoreChange: dispute.claimantScoreChange,
    respondentScoreChange: dispute.respondentScoreChange,
    statedValue: dispute.statedValue,
    creditsCharged: dispute.creditsCharged,
    wasFree: dispute.wasFree,
    claimantAccepted: dispute.claimantAccepted,
    respondentAccepted: dispute.respondentAccepted,
    claimantDecisionAt: dispute.claimantDecisionAt,
    respondentDecisionAt: dispute.respondentDecisionAt,
    decisionDeadline: dispute.decisionDeadline,
    closedAt: dispute.closedAt,
    createdAt: dispute.createdAt,
    evidenceCount: dispute._count.evidence,
  }
}
