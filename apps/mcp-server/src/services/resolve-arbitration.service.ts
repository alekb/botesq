import { ResolveDisputeStatus } from '@botesq/database'
import type { ResolveDisputeRuling, ResolveDisputeClaimType } from '@botesq/database'
import pino from 'pino'
import { ApiError } from '../types.js'
import { chatCompletion, isLLMAvailable } from './llm.service.js'
import {
  getDisputeById,
  recordRuling,
  listDisputesPendingArbitration,
} from './resolve-dispute.service.js'
import {
  updateTrustScore,
  updateDisputeOutcome,
  calculateTrustImpact,
} from './resolve-agent.service.js'
import { prisma } from '@botesq/database'
import { getCalibrationContext } from './feedback.service.js'
import { getPrecedentProvider, formatPrecedentContext } from './precedent-provider.js'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

export interface ArbitrationInput {
  disputeId: string
  transactionTitle: string
  transactionDescription: string | null
  transactionTerms: Record<string, unknown>
  claimType: ResolveDisputeClaimType
  claimSummary: string
  claimDetails: string | null
  requestedResolution: string
  responseSummary: string | null
  responseDetails: string | null
  claimantTrustScore: number
  respondentTrustScore: number
  evidence: Array<{
    submittedBy: 'CLAIMANT' | 'RESPONDENT'
    evidenceType: string
    title: string
    content: string
  }>
}

export interface ArbitrationResult {
  ruling: ResolveDisputeRuling
  reasoning: string
  details: {
    confidence: number
    keyFactors: string[]
    mitigatingFactors: string[]
    recommendation: string
  }
  /** Precedent cases that were provided as context for this decision */
  precedentCitations?: Array<{
    caseId: string
    relevanceScore: number
    source: string
  }>
}

const ARBITRATION_SYSTEM_PROMPT = `You are an AI arbitrator for BotEsq, a neutral dispute resolution service for AI agent transactions.

Your role is to analyze disputes between AI agents and render fair, impartial rulings based on the evidence provided.

RULING OPTIONS:
- CLAIMANT: The claimant wins. Use when the evidence clearly supports their claim.
- RESPONDENT: The respondent wins. Use when the claim is not substantiated or the respondent's defense is stronger.
- SPLIT: Both parties share responsibility. Use when both parties contributed to the issue.
- DISMISSED: The claim is frivolous or lacks merit. Use sparingly, only for clearly baseless claims.

EVALUATION CRITERIA:
1. Transaction Terms: Did both parties understand and agree to the terms?
2. Performance: Was the agreed work/service delivered as specified?
3. Evidence Quality: Which party provides more credible, specific evidence?
4. Trust Scores: Consider historical reliability (higher scores indicate better track record)
5. Proportionality: Is the claim proportionate to the alleged harm?

IMPORTANT GUIDELINES:
- Be objective and impartial
- Base decisions on evidence, not assumptions
- Consider both perspectives fairly
- Provide clear reasoning for your ruling
- Identify specific factors that influenced your decision

Respond with valid JSON in this exact format:
{
  "ruling": "CLAIMANT" | "RESPONDENT" | "SPLIT" | "DISMISSED",
  "reasoning": "Clear explanation of the ruling (2-4 sentences)",
  "details": {
    "confidence": 0.0-1.0,
    "keyFactors": ["factor1", "factor2"],
    "mitigatingFactors": ["factor1"],
    "recommendation": "Specific recommendation for resolution"
  }
}`

/**
 * Perform AI arbitration on a dispute
 */
export async function arbitrateDispute(input: ArbitrationInput): Promise<ArbitrationResult> {
  if (!isLLMAvailable()) {
    throw new ApiError('LLM_NOT_AVAILABLE', 'AI arbitration is currently unavailable', 503)
  }

  const userPrompt = buildArbitrationPrompt(input)

  // Enrich system prompt with calibration notes from historical feedback
  let systemPrompt = ARBITRATION_SYSTEM_PROMPT
  try {
    const calibration = await getCalibrationContext()
    if (calibration) {
      systemPrompt += calibration
    }
  } catch (err) {
    logger.warn({ error: err }, 'Failed to fetch calibration context, proceeding without it')
  }

  // Retrieve relevant precedent from the configured provider
  let precedentContext = ''
  let precedentCitations: ArbitrationResult['precedentCitations']
  const provider = getPrecedentProvider()
  try {
    const isAvailable = await provider.isAvailable()
    if (isAvailable) {
      const precedentResult = await provider.findRelevantPrecedent(input, 5)
      precedentContext = formatPrecedentContext(precedentResult)
      if (precedentResult.cases.length > 0) {
        precedentCitations = precedentResult.cases.map((c) => ({
          caseId: c.caseId,
          relevanceScore: c.relevanceScore,
          source: precedentResult.source,
        }))
        logger.info(
          {
            disputeId: input.disputeId,
            provider: provider.name,
            precedentCount: precedentResult.cases.length,
          },
          'Precedent retrieved for arbitration'
        )
      }
    }
  } catch (err) {
    logger.warn(
      { error: err, provider: provider.name },
      'Failed to retrieve precedent, proceeding without it'
    )
  }

  // Append precedent context to the system prompt (after calibration notes)
  if (precedentContext) {
    systemPrompt += precedentContext
  }

  try {
    const response = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        model: 'gpt-4-turbo',
        temperature: 0.2, // Low temperature for consistent, logical decisions
        maxTokens: 1024,
        timeoutMs: 60000,
      }
    )

    const result = parseArbitrationResponse(response.content)

    // Attach precedent citations to the result
    if (precedentCitations && precedentCitations.length > 0) {
      result.precedentCitations = precedentCitations
    }

    logger.info(
      {
        disputeId: input.disputeId,
        ruling: result.ruling,
        confidence: result.details.confidence,
        precedentUsed: precedentCitations?.length ?? 0,
      },
      'Arbitration completed'
    )

    return result
  } catch (error) {
    logger.error({ error, disputeId: input.disputeId }, 'Arbitration failed')
    throw error
  }
}

/**
 * Build the arbitration prompt from dispute data
 */
function buildArbitrationPrompt(input: ArbitrationInput): string {
  const evidenceSection =
    input.evidence.length > 0
      ? input.evidence
          .map(
            (e, i) =>
              `Evidence ${i + 1} (${e.submittedBy}):\n` +
              `  Type: ${e.evidenceType}\n` +
              `  Title: ${e.title}\n` +
              `  Content: ${e.content}`
          )
          .join('\n\n')
      : 'No additional evidence submitted.'

  return `
DISPUTE CASE FOR ARBITRATION

=== TRANSACTION DETAILS ===
Title: ${input.transactionTitle}
Description: ${input.transactionDescription ?? 'Not provided'}
Terms: ${JSON.stringify(input.transactionTerms, null, 2)}

=== CLAIM ===
Type: ${input.claimType}
Summary: ${input.claimSummary}
Details: ${input.claimDetails ?? 'Not provided'}
Requested Resolution: ${input.requestedResolution}
Claimant Trust Score: ${input.claimantTrustScore}/100

=== RESPONSE ===
${
  input.responseSummary
    ? `Summary: ${input.responseSummary}
Details: ${input.responseDetails ?? 'Not provided'}`
    : 'No response submitted (respondent did not reply within deadline)'
}
Respondent Trust Score: ${input.respondentTrustScore}/100

=== EVIDENCE ===
${evidenceSection}

Please analyze this dispute and provide your ruling.`
}

/**
 * Parse the LLM response into a structured result
 */
function parseArbitrationResponse(content: string): ArbitrationResult {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Validate ruling
    const validRulings = ['CLAIMANT', 'RESPONDENT', 'SPLIT', 'DISMISSED']
    if (!validRulings.includes(parsed.ruling)) {
      throw new Error(`Invalid ruling: ${parsed.ruling}`)
    }

    // Ensure all required fields exist with defaults
    return {
      ruling: parsed.ruling as ResolveDisputeRuling,
      reasoning: parsed.reasoning || 'Ruling based on available evidence.',
      details: {
        confidence: Math.max(0, Math.min(1, parsed.details?.confidence ?? 0.7)),
        keyFactors: Array.isArray(parsed.details?.keyFactors) ? parsed.details.keyFactors : [],
        mitigatingFactors: Array.isArray(parsed.details?.mitigatingFactors)
          ? parsed.details.mitigatingFactors
          : [],
        recommendation: parsed.details?.recommendation || 'Follow the ruling as stated.',
      },
    }
  } catch (error) {
    logger.error({ error, content }, 'Failed to parse arbitration response')

    // Return a default "cannot determine" response
    return {
      ruling: 'SPLIT' as ResolveDisputeRuling,
      reasoning:
        'Unable to make a clear determination based on the evidence provided. ' +
        'Both parties should work together to resolve the dispute.',
      details: {
        confidence: 0.5,
        keyFactors: ['Insufficient evidence for clear ruling'],
        mitigatingFactors: [],
        recommendation: 'Parties should attempt to negotiate a resolution.',
      },
    }
  }
}

/**
 * Process arbitration for a dispute (full workflow)
 */
export async function processArbitration(disputeId: string): Promise<ArbitrationResult> {
  // Get full dispute data
  const dispute = await getDisputeById(disputeId)

  if (!dispute) {
    throw new ApiError('DISPUTE_NOT_FOUND', 'Dispute not found', 404)
  }

  // Verify status allows arbitration
  const allowedStatuses: ResolveDisputeStatus[] = [
    ResolveDisputeStatus.AWAITING_RESPONSE,
    ResolveDisputeStatus.RESPONSE_RECEIVED,
    ResolveDisputeStatus.IN_ARBITRATION,
  ]

  if (!allowedStatuses.includes(dispute.status as ResolveDisputeStatus)) {
    throw new ApiError(
      'INVALID_STATUS',
      `Cannot arbitrate dispute in ${dispute.status} status`,
      400
    )
  }

  // Mark as in arbitration
  await prisma.resolveDispute.update({
    where: { id: disputeId },
    data: { status: ResolveDisputeStatus.IN_ARBITRATION },
  })

  // Perform arbitration
  const result = await arbitrateDispute({
    disputeId,
    transactionTitle: dispute.transaction.title,
    transactionDescription: dispute.transaction.description,
    transactionTerms: dispute.transaction.terms as Record<string, unknown>,
    claimType: dispute.claimType,
    claimSummary: dispute.claimSummary,
    claimDetails: dispute.claimDetails,
    requestedResolution: dispute.requestedResolution,
    responseSummary: dispute.responseSummary,
    responseDetails: dispute.responseDetails,
    claimantTrustScore: dispute.claimantAgent.trustScore,
    respondentTrustScore: dispute.respondentAgent.trustScore,
    evidence: dispute.evidence.map((e) => ({
      submittedBy: e.submittedBy,
      evidenceType: e.evidenceType,
      title: e.title,
      content: e.content,
    })),
  })

  // Calculate trust score changes
  const claimantWon = result.ruling === 'CLAIMANT'
  const respondentWon = result.ruling === 'RESPONDENT'
  const isDismissed = result.ruling === 'DISMISSED'

  const claimantScoreChange = calculateTrustImpact(result.ruling, dispute.statedValue, claimantWon)

  const respondentScoreChange = isDismissed
    ? 0 // Respondent not penalized for dismissed claims
    : calculateTrustImpact(result.ruling, dispute.statedValue, respondentWon)

  // Record ruling
  await recordRuling({
    disputeId,
    ruling: result.ruling,
    rulingReasoning: result.reasoning,
    rulingDetails: result.details,
    claimantScoreChange,
    respondentScoreChange,
  })

  // Update trust scores
  if (claimantScoreChange !== 0) {
    await updateTrustScore(
      dispute.claimantAgentId,
      claimantScoreChange,
      `Dispute ruling: ${result.ruling}`,
      'dispute',
      dispute.externalId
    )
  }

  if (respondentScoreChange !== 0) {
    await updateTrustScore(
      dispute.respondentAgentId,
      respondentScoreChange,
      `Dispute ruling: ${result.ruling}`,
      'dispute',
      dispute.externalId
    )
  }

  // Update win/loss counters
  if (claimantWon) {
    await updateDisputeOutcome(dispute.claimantAgentId, true)
    await updateDisputeOutcome(dispute.respondentAgentId, false)
  } else if (respondentWon || isDismissed) {
    await updateDisputeOutcome(dispute.claimantAgentId, false)
    await updateDisputeOutcome(dispute.respondentAgentId, true)
  }
  // For SPLIT ruling, neither wins

  logger.info(
    {
      disputeId: dispute.externalId,
      ruling: result.ruling,
      claimantScoreChange,
      respondentScoreChange,
    },
    'Dispute arbitration processed'
  )

  return result
}

/**
 * Process all pending disputes (for scheduled job)
 */
export async function processAllPendingDisputes(): Promise<{
  processed: number
  failed: number
}> {
  const pendingDisputes = await listDisputesPendingArbitration()

  let processed = 0
  let failed = 0

  for (const dispute of pendingDisputes) {
    try {
      await processArbitration(dispute.id)
      processed++
    } catch (error) {
      logger.error({ error, disputeId: dispute.externalId }, 'Failed to process dispute')
      failed++
    }
  }

  logger.info({ processed, failed }, 'Pending disputes batch processed')

  return { processed, failed }
}
