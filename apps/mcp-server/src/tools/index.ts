import { startSessionTool, handleStartSession, startSessionSchema } from './start-session.js'
import { getSessionInfoTool, handleGetSessionInfo, getSessionInfoSchema } from './get-session-info.js'
import { listServicesTool, handleListServices } from './list-services.js'
import { getDisclaimersTool, handleGetDisclaimers } from './get-disclaimers.js'
import { checkCreditsTool, handleCheckCredits, checkCreditsSchema } from './check-credits.js'
import { askLegalQuestionTool, handleAskLegalQuestion, askLegalQuestionSchema } from './ask-legal-question.js'
import { createMatterTool, handleCreateMatter, createMatterSchema } from './create-matter.js'
import { getMatterStatusTool, handleGetMatterStatus, getMatterStatusSchema } from './get-matter-status.js'
import { listMattersTool, handleListMatters, listMattersSchema } from './list-matters.js'
import { getRetainerTermsTool, handleGetRetainerTerms, getRetainerTermsSchema } from './get-retainer-terms.js'
import { acceptRetainerTool, handleAcceptRetainer, acceptRetainerSchema } from './accept-retainer.js'
import { submitDocumentTool, handleSubmitDocument, submitDocumentSchema } from './submit-document.js'
import { getDocumentAnalysisTool, handleGetDocumentAnalysis, getDocumentAnalysisSchema } from './get-document-analysis.js'
import { ApiError } from '../types.js'
import { z } from 'zod'

// Tool definitions for MCP server
export const tools = [
  startSessionTool,
  getSessionInfoTool,
  listServicesTool,
  getDisclaimersTool,
  checkCreditsTool,
  askLegalQuestionTool,
  createMatterTool,
  getMatterStatusTool,
  listMattersTool,
  getRetainerTermsTool,
  acceptRetainerTool,
  submitDocumentTool,
  getDocumentAnalysisTool,
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
  ask_legal_question: async (input) => {
    const validated = askLegalQuestionSchema.parse(input)
    return handleAskLegalQuestion(validated)
  },
  create_matter: async (input) => {
    const validated = createMatterSchema.parse(input)
    return handleCreateMatter(validated)
  },
  get_matter_status: async (input) => {
    const validated = getMatterStatusSchema.parse(input)
    return handleGetMatterStatus(validated)
  },
  list_matters: async (input) => {
    const validated = listMattersSchema.parse(input)
    return handleListMatters(validated)
  },
  get_retainer_terms: async (input) => {
    const validated = getRetainerTermsSchema.parse(input)
    return handleGetRetainerTerms(validated)
  },
  accept_retainer: async (input) => {
    const validated = acceptRetainerSchema.parse(input)
    return handleAcceptRetainer(validated)
  },
  submit_document: async (input) => {
    const validated = submitDocumentSchema.parse(input)
    return handleSubmitDocument(validated)
  },
  get_document_analysis: async (input) => {
    const validated = getDocumentAnalysisSchema.parse(input)
    return handleGetDocumentAnalysis(validated)
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
  askLegalQuestionTool,
  createMatterTool,
  getMatterStatusTool,
  listMattersTool,
  getRetainerTermsTool,
  acceptRetainerTool,
  submitDocumentTool,
  getDocumentAnalysisTool,
}
