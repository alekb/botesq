import { z } from 'zod'
import { startSession } from '../services/session.service.js'
import { hashApiKey } from '../services/auth.service.js'
import { checkRateLimit } from '../services/rate-limit.service.js'
import type { ToolOutput, StartSessionOutput } from '../types.js'

export const startSessionSchema = z.object({
  api_key: z.string().min(1, 'API key is required'),
  agent_identifier: z.string().optional(),
})

export type StartSessionInput = z.infer<typeof startSessionSchema>

export async function handleStartSession(
  input: StartSessionInput
): Promise<ToolOutput<StartSessionOutput>> {
  // Throttle before touching the database, keyed by the presented key's hash:
  // repeated tries of one key (brute-force confirmation, session minting to
  // reset per-operator windows) are limited without letting one caller's
  // garbage keys exhaust a global bucket for every other operator.
  checkRateLimit(`start_session:${hashApiKey(input.api_key)}`)

  const result = await startSession(input)

  return {
    success: true,
    data: result,
  }
}

export const startSessionTool = {
  name: 'start_session',
  description:
    'Start a new session with an API key. Returns a session token for subsequent requests.',
  inputSchema: {
    type: 'object',
    properties: {
      api_key: {
        type: 'string',
        description: 'Your BotEsq API key',
      },
      agent_identifier: {
        type: 'string',
        description: 'Optional identifier for the AI agent making requests',
      },
    },
    required: ['api_key'],
  },
  handler: handleStartSession,
}
