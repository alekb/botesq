import { z } from 'zod'
import { authenticateSession } from '../services/auth.service.js'
import { getSessionInfo } from '../services/session.service.js'
import { checkRateLimit } from '../services/rate-limit.service.js'
import type { ToolOutput, GetSessionInfoOutput } from '../types.js'

export const getSessionInfoSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
})

export type GetSessionInfoInput = z.infer<typeof getSessionInfoSchema>

export async function handleGetSessionInfo(
  input: GetSessionInfoInput
): Promise<ToolOutput<GetSessionInfoOutput>> {
  // Authenticate session
  const session = await authenticateSession(input.session_token)

  // Check rate limits
  checkRateLimit(input.session_token)

  // Get session info
  const result = await getSessionInfo(input.session_token, session, session.apiKey.operator)

  return {
    success: true,
    data: result,
  }
}

export const getSessionInfoTool = {
  name: 'get_session_info',
  description:
    'Get information about the current session including credits, active matters, and rate limit status.',
  inputSchema: {
    type: 'object',
    properties: {
      session_token: {
        type: 'string',
        description: 'Your session token from start_session',
      },
    },
    required: ['session_token'],
  },
  handler: handleGetSessionInfo,
}
