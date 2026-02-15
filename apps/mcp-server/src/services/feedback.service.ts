import { prisma, ResolveDisputeStatus } from '@botesq/database'
import type { ResolveEvidenceSubmitter } from '@botesq/database'
import pino from 'pino'
import { ApiError } from '../types.js'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

// Feedback window: 30 days after dispute closure
const FEEDBACK_WINDOW_DAYS = 30

interface FeedbackInput {
  disputeId: string
  agentId: string
  fairnessRating: number
  reasoningRating: number
  evidenceRating: number
  comment?: string
}

/**
 * Submit post-resolution feedback for a dispute
 */
export async function submitFeedback(input: FeedbackInput): Promise<{
  id: string
  partyRole: ResolveEvidenceSubmitter
  wasWinner: boolean
}> {
  const dispute = await prisma.resolveDispute.findUnique({
    where: { externalId: input.disputeId },
  })

  if (!dispute) {
    throw new ApiError('DISPUTE_NOT_FOUND', 'Dispute not found', 404)
  }

  // Must be closed or escalation completed
  if (dispute.status !== ResolveDisputeStatus.CLOSED) {
    throw new ApiError('INVALID_STATUS', 'Feedback can only be submitted for closed disputes', 400)
  }

  // Must be a party
  const isClaimant = dispute.claimantAgentId === input.agentId
  const isRespondent = dispute.respondentAgentId === input.agentId
  if (!isClaimant && !isRespondent) {
    throw new ApiError('NOT_PARTY', 'You are not a party to this dispute', 403)
  }

  // Check feedback window
  if (dispute.closedAt) {
    const windowEnd = new Date(dispute.closedAt)
    windowEnd.setDate(windowEnd.getDate() + FEEDBACK_WINDOW_DAYS)
    if (new Date() > windowEnd) {
      throw new ApiError(
        'FEEDBACK_WINDOW_CLOSED',
        'The feedback window for this dispute has expired',
        400
      )
    }
  }

  const partyRole: ResolveEvidenceSubmitter = isClaimant ? 'CLAIMANT' : 'RESPONDENT'
  const wasWinner =
    (dispute.ruling === 'CLAIMANT' && isClaimant) ||
    (dispute.ruling === 'RESPONDENT' && isRespondent)

  const feedback = await prisma.resolveDecisionFeedback.create({
    data: {
      disputeId: dispute.id,
      agentId: input.agentId,
      partyRole,
      wasWinner,
      fairnessRating: input.fairnessRating,
      reasoningRating: input.reasoningRating,
      evidenceRating: input.evidenceRating,
      comment: input.comment,
    },
  })

  logger.info(
    { disputeId: input.disputeId, agentId: input.agentId, partyRole, wasWinner },
    'Decision feedback submitted'
  )

  return { id: feedback.id, partyRole, wasWinner }
}

/**
 * Auto-generate AI vs Human accuracy comparison when an escalation completes
 */
export async function createAccuracyComparison(
  disputeId: string,
  escalationId: string
): Promise<void> {
  const dispute = await prisma.resolveDispute.findUnique({
    where: { id: disputeId },
    include: { escalation: true },
  })

  if (!dispute?.escalation?.arbitratorRuling) {
    logger.warn({ disputeId, escalationId }, 'Cannot create accuracy comparison: missing data')
    return
  }

  const rulingDetails = dispute.rulingDetails as {
    confidence: number
    keyFactors: string[]
  } | null

  await prisma.resolveAIAccuracyComparison.create({
    data: {
      disputeId,
      escalationId: dispute.escalation.id,
      aiRuling: dispute.ruling!,
      aiConfidence: rulingDetails?.confidence ?? 0.5,
      aiKeyFactors: rulingDetails?.keyFactors ?? [],
      aiReasoning: dispute.rulingReasoning!,
      humanRuling: dispute.escalation.arbitratorRuling,
      humanReasoning: dispute.escalation.arbitratorRulingReasoning ?? '',
      rulingAgreed: dispute.ruling === dispute.escalation.arbitratorRuling,
      disputeType: dispute.claimType,
      statedValue: dispute.statedValue,
    },
  })

  logger.info(
    {
      disputeId: dispute.externalId,
      aiRuling: dispute.ruling,
      humanRuling: dispute.escalation.arbitratorRuling,
      agreed: dispute.ruling === dispute.escalation.arbitratorRuling,
    },
    'AI accuracy comparison created'
  )
}

/**
 * Aggregate decision metrics for a given time period
 */
export async function aggregateMetrics(periodStart: Date, periodEnd: Date): Promise<void> {
  // All disputes ruled in this period
  const ruledDisputes = await prisma.resolveDispute.findMany({
    where: {
      ruledAt: { gte: periodStart, lt: periodEnd },
      status: {
        in: [
          ResolveDisputeStatus.RULED,
          ResolveDisputeStatus.CLOSED,
          ResolveDisputeStatus.ESCALATED,
        ],
      },
    },
    select: {
      id: true,
      claimType: true,
      ruling: true,
      rulingDetails: true,
      claimantAccepted: true,
      respondentAccepted: true,
      claimantRejectionReason: true,
      respondentRejectionReason: true,
      status: true,
    },
  })

  const totalDecisions = ruledDisputes.length
  if (totalDecisions === 0) {
    logger.info({ periodStart, periodEnd }, 'No decisions in period, skipping metrics')
    return
  }

  // Acceptance rates
  const bothAccepted = ruledDisputes.filter(
    (d) => d.claimantAccepted === true && d.respondentAccepted === true
  ).length

  const escalated = ruledDisputes.filter((d) => d.status === ResolveDisputeStatus.ESCALATED).length

  // AI vs Human comparisons in this period
  const comparisons = await prisma.resolveAIAccuracyComparison.findMany({
    where: { createdAt: { gte: periodStart, lt: periodEnd } },
    select: { rulingAgreed: true, aiConfidence: true, disputeType: true },
  })

  const totalEscalations = comparisons.length
  const agreed = comparisons.filter((c) => c.rulingAgreed).length

  // Confidence stats
  const confidences = ruledDisputes
    .map((d) => (d.rulingDetails as { confidence?: number } | null)?.confidence)
    .filter((c): c is number => c != null)

  const avgConfidence =
    confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0.5

  const agreedConfidences = comparisons.filter((c) => c.rulingAgreed).map((c) => c.aiConfidence)
  const disagreedConfidences = comparisons.filter((c) => !c.rulingAgreed).map((c) => c.aiConfidence)

  // Feedback ratings in this period
  const feedbacks = await prisma.resolveDecisionFeedback.findMany({
    where: { createdAt: { gte: periodStart, lt: periodEnd } },
    select: { fairnessRating: true, reasoningRating: true, evidenceRating: true },
  })

  // Rejection reasons
  const rejectionReasons: string[] = []
  for (const d of ruledDisputes) {
    if (d.claimantRejectionReason) rejectionReasons.push(d.claimantRejectionReason)
    if (d.respondentRejectionReason) rejectionReasons.push(d.respondentRejectionReason)
  }
  const reasonCounts = rejectionReasons.reduce(
    (acc, r) => ({ ...acc, [r]: (acc[r] ?? 0) + 1 }),
    {} as Record<string, number>
  )
  const topRejectionReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({ reason, count }))

  // Metrics by dispute type
  const typeGroups = new Map<string, typeof ruledDisputes>()
  for (const d of ruledDisputes) {
    const group = typeGroups.get(d.claimType) ?? []
    group.push(d)
    typeGroups.set(d.claimType, group)
  }

  const metricsByDisputeType: Record<
    string,
    { total: number; escalationRate: number; acceptanceRate: number }
  > = {}
  for (const [type, disputes] of typeGroups) {
    const typeEscalated = disputes.filter((d) => d.status === ResolveDisputeStatus.ESCALATED).length
    const typeBothAccepted = disputes.filter(
      (d) => d.claimantAccepted === true && d.respondentAccepted === true
    ).length
    metricsByDisputeType[type] = {
      total: disputes.length,
      escalationRate: disputes.length > 0 ? typeEscalated / disputes.length : 0,
      acceptanceRate: disputes.length > 0 ? typeBothAccepted / disputes.length : 0,
    }
  }

  const avg = (nums: number[]) =>
    nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : null

  await prisma.resolveDecisionEngineMetrics.create({
    data: {
      periodStart,
      periodEnd,
      totalDecisions,
      totalEscalations,
      bothAcceptedRate: totalDecisions > 0 ? bothAccepted / totalDecisions : 0,
      escalationRate: totalDecisions > 0 ? escalated / totalDecisions : 0,
      humanAgreementRate: totalEscalations > 0 ? agreed / totalEscalations : null,
      avgConfidence,
      avgConfidenceWhenAgreed: avg(agreedConfidences),
      avgConfidenceWhenDisagreed: avg(disagreedConfidences),
      avgFairnessRating: avg(feedbacks.map((f) => f.fairnessRating)),
      avgReasoningRating: avg(feedbacks.map((f) => f.reasoningRating)),
      avgEvidenceRating: avg(feedbacks.map((f) => f.evidenceRating)),
      metricsByDisputeType,
      topRejectionReasons,
    },
  })

  logger.info(
    {
      periodStart,
      periodEnd,
      totalDecisions,
      totalEscalations,
      bothAcceptedRate: bothAccepted / totalDecisions,
    },
    'Decision engine metrics aggregated'
  )
}

/**
 * Generate calibration context for the arbitration system prompt
 * based on the latest aggregated metrics
 */
export async function getCalibrationContext(): Promise<string> {
  const latest = await prisma.resolveDecisionEngineMetrics.findFirst({
    orderBy: { periodStart: 'desc' },
  })

  if (!latest) return ''

  const lines: string[] = []

  // Confidence calibration
  if (latest.avgConfidenceWhenDisagreed != null && latest.avgConfidenceWhenDisagreed > 0.7) {
    lines.push(
      '- Historical data shows you tend to be overconfident. Be more cautious with confidence scores above 0.85.'
    )
  }

  // Dispute type warnings
  const typeMetrics = latest.metricsByDisputeType as Record<
    string,
    { total: number; escalationRate: number; acceptanceRate: number }
  > | null
  if (typeMetrics) {
    for (const [type, data] of Object.entries(typeMetrics)) {
      if (data.escalationRate > 0.3 && data.total >= 5) {
        lines.push(
          `- For ${type} disputes, decisions are frequently escalated. Exercise extra caution and weigh evidence more carefully.`
        )
      }
    }
  }

  // Common rejection reasons
  const topReasons = latest.topRejectionReasons as Array<{ reason: string; count: number }> | null
  if (topReasons && topReasons.length > 0) {
    const top3 = topReasons.slice(0, 3).map((r) => r.reason.replace(/_/g, ' ').toLowerCase())
    lines.push(
      `- Common agent complaints about decisions: ${top3.join(', ')}. Pay attention to these areas.`
    )
  }

  // Low feedback ratings
  if (latest.avgEvidenceRating != null && latest.avgEvidenceRating < 3.0) {
    lines.push(
      '- Agents rate evidence consideration poorly. Cite specific evidence for each key finding.'
    )
  }
  if (latest.avgReasoningRating != null && latest.avgReasoningRating < 3.0) {
    lines.push(
      '- Agents rate reasoning quality poorly. Provide more detailed reasoning with clear logical steps.'
    )
  }

  if (lines.length === 0) return ''

  return '\n\n=== CALIBRATION NOTES ===\n' + lines.join('\n')
}
