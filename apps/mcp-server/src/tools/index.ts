import { startSessionTool, handleStartSession, startSessionSchema } from './start-session.js'
import { getSessionInfoTool, handleGetSessionInfo, getSessionInfoSchema } from './get-session-info.js'
import { listServicesTool, handleListServices } from './list-services.js'
import { getDisclaimersTool, handleGetDisclaimers } from './get-disclaimers.js'
import { checkCreditsTool, handleCheckCredits, checkCreditsSchema } from './check-credits.js'
import { ApiError } from '../types.js'
import { z } from 'zod'

// Tool definitions for MCP server
export const tools = [
  startSessionTool,
  getSessionInfoTool,
  listServicesTool,
  getDisclaimersTool,
  checkCreditsTool,
]

// Tool handler map
const handlers: Record<string, (input: unknown) => Promise<unknown>> = {
  start_session: async (input) => {
    const validated = startSessionSchema.parse(input)
    return handleStartSession(validated)
  },
  get_session_info: async (input) => {
    const validated = getSessionInfoSchema.parse(input)
    return handleGetSessionInfo(validated)
  },
  list_services: async () => {
    return handleListServices()
  },
  get_disclaimers: async () => {
    return handleGetDisclaimers()
  },
  check_credits: async (input) => {
    const validated = checkCreditsSchema.parse(input)
    return handleCheckCredits(validated)
  },
}

/**
 * Execute a tool by name with the given input
 */
export async function executeTool(name: string, input: unknown): Promise<unknown> {
  const handler = handlers[name]

  if (!handler) {
    throw new ApiError('UNKNOWN_TOOL', `Unknown tool: ${name}`, 400)
  }

  try {
    return await handler(input)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid input', 400, error.errors)
    }
    throw error
  }
}

export {
  startSessionTool,
  getSessionInfoTool,
  listServicesTool,
  getDisclaimersTool,
  checkCreditsTool,
}
