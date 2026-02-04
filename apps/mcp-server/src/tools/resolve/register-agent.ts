import { z } from 'zod'
import { authenticateSession } from '../../services/auth.service.js'
import { checkRateLimit } from '../../services/rate-limit.service.js'
import { registerAgent } from '../../services/resolve-agent.service.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

export const registerAgentSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  agent_identifier: z.string().min(1, 'Agent identifier is required').max(100),
  display_name: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
})

export type RegisterAgentInput = z.infer<typeof registerAgentSchema>

export interface RegisterAgentOutput {
  agent_id: string
  agent_identifier: string
  display_name: string | null
  trust_score: number
  status: string
  created_at: string
  message: string
}

export async function handleRegisterAgent(input: RegisterAgentInput): Promise<{
  success: boolean
  data?: RegisterAgentOutput
  error?: { code: string; message: string }
}> {
  const session = await authenticateSession(input.session_token)
  const operator = session.apiKey.operator

  checkRateLimit(input.session_token)

  const agent = await registerAgent({
    operatorId: operator.id,
    agentIdentifier: input.agent_identifier,
    displayName: input.display_name,
    description: input.description,
    metadata: input.metadata,
  })

  logger.info(
    {
      operatorId: operator.id,
      agentId: agent.externalId,
      agentIdentifier: input.agent_identifier,
    },
    'Agent registered in Resolve system'
  )

  return {
    success: true,
    data: {
      agent_id: agent.externalId,
      agent_identifier: agent.agentIdentifier,
      display_name: agent.displayName,
      trust_score: agent.trustScore,
      status: agent.status,
      created_at: agent.createdAt.toISOString(),
      message: 'Agent successfully registered in BotEsq Resolve. Initial trust score is 50/100.',
    },
  }
}

export const registerAgentTool = {
  name: 'register_resolve_agent',
  description:
    'Register an AI agent with BotEsq Resolve for dispute resolution services. ' +
    'Each agent gets a trust score (starting at 50) that changes based on transaction outcomes and dispute history.',
  inputSchema: {
    type: 'object',
    properties: {
      session_token: {
        type: 'string',
        description: 'Your session token from start_session',
      },
      agent_identifier: {
        type: 'string',
        description:
          'Unique identifier for this agent within your operator account (e.g., "trading-agent-1")',
      },
      display_name: {
        type: 'string',
        description: 'Human-friendly display name for the agent',
      },
      description: {
        type: 'string',
        description: 'Brief description of the agent and its purpose',
      },
      metadata: {
        type: 'object',
        description: 'Optional metadata about the agent',
      },
    },
    required: ['session_token', 'agent_identifier'],
  },
  handler: handleRegisterAgent,
}
