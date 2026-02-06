import { z } from 'zod'
import { authenticateSession } from '../../services/auth.service.js'
import { checkRateLimit } from '../../services/rate-limit.service.js'
import { getAgentTrust, getTrustHistory } from '../../services/resolve-agent.service.js'
import { ApiError } from '../../types.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

export const getAgentTrustSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  agent_reference: z
    .string()
    .min(1, 'Agent reference is required')
    .describe('Agent external ID (RAGENT-XXXX) or agent identifier'),
  include_history: z.boolean().optional().default(false),
})

export type GetAgentTrustInput = z.infer<typeof getAgentTrustSchema>

export interface GetAgentTrustOutput {
  agent_id: string
  agent_identifier: string
  display_name: string | null
  trust_score: number
  trust_level: 'low' | 'moderate' | 'good' | 'excellent'
  statistics: {
    total_transactions: number
    completed_transactions: number
    completion_rate: number
    disputes_as_claimant: number
    disputes_as_respondent: number
    disputes_won: number
    disputes_lost: number
    win_rate: number
  }
  status: string
  history?: Array<{
    previous_score: number
    new_score: number
    change: number
    reason: string
    timestamp: string
  }>
}

function getTrustLevel(score: number): 'low' | 'moderate' | 'good' | 'excellent' {
  if (score >= 80) return 'excellent'
  if (score >= 60) return 'good'
  if (score >= 40) return 'moderate'
  return 'low'
}

export async function handleGetAgentTrust(input: GetAgentTrustInput): Promise<{
  success: boolean
  data?: GetAgentTrustOutput
  error?: { code: string; message: string }
}> {
  const session = await authenticateSession(input.session_token)
  const operator = session.apiKey.operator

  checkRateLimit(input.session_token)

  const agent = await getAgentTrust(operator.id, input.agent_reference)

  if (!agent) {
    throw new ApiError('AGENT_NOT_FOUND', 'Agent not found', 404)
  }

  const totalDisputeOutcomes = agent.disputesWon + agent.disputesLost

  let history: GetAgentTrustOutput['history'] | undefined

  if (input.include_history) {
    const historyRecords = await getTrustHistory(agent.id, 10)
    history = historyRecords.map((h) => ({
      previous_score: h.previousScore,
      new_score: h.newScore,
      change: h.changeAmount,
      reason: h.reason,
      timestamp: h.createdAt.toISOString(),
    }))
  }

  logger.debug(
    {
      operatorId: operator.id,
      agentId: agent.externalId,
    },
    'Agent trust retrieved'
  )

  return {
    success: true,
    data: {
      agent_id: agent.externalId,
      agent_identifier: agent.agentIdentifier,
      display_name: agent.displayName,
      trust_score: agent.trustScore,
      trust_level: getTrustLevel(agent.trustScore),
      statistics: {
        total_transactions: agent.totalTransactions,
        completed_transactions: agent.completedTransactions,
        completion_rate:
          agent.totalTransactions > 0
            ? Math.round((agent.completedTransactions / agent.totalTransactions) * 100)
            : 0,
        disputes_as_claimant: agent.disputesAsClaimant,
        disputes_as_respondent: agent.disputesAsRespondent,
        disputes_won: agent.disputesWon,
        disputes_lost: agent.disputesLost,
        win_rate:
          totalDisputeOutcomes > 0
            ? Math.round((agent.disputesWon / totalDisputeOutcomes) * 100)
            : 0,
      },
      status: agent.status,
      history,
    },
  }
}

export const getAgentTrustTool = {
  name: 'get_agent_trust',
  description:
    'Get trust score and statistics for a registered agent. ' +
    "Use this to check an agent's reputation before entering a transaction.",
  inputSchema: {
    type: 'object',
    properties: {
      session_token: {
        type: 'string',
        description: 'Your session token from start_session',
      },
      agent_reference: {
        type: 'string',
        description: 'Agent external ID (e.g., "RAGENT-ABCD1234") or agent identifier',
      },
      include_history: {
        type: 'boolean',
        description: 'Include recent trust score change history (default: false)',
      },
    },
    required: ['session_token', 'agent_reference'],
  },
  handler: handleGetAgentTrust,
}
