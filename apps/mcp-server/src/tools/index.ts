import { startSessionTool, handleStartSession, startSessionSchema } from './start-session.js'
import {
  getSessionInfoTool,
  handleGetSessionInfo,
  getSessionInfoSchema,
} from './get-session-info.js'
import { listServicesTool, handleListServices } from './list-services.js'
import { getDisclaimersTool, handleGetDisclaimers } from './get-disclaimers.js'
import { checkCreditsTool, handleCheckCredits, checkCreditsSchema } from './check-credits.js'
import {
  askLegalQuestionTool,
  handleAskLegalQuestion,
  askLegalQuestionSchema,
} from './ask-legal-question.js'
import { createMatterTool, handleCreateMatter, createMatterSchema } from './create-matter.js'
import {
  getMatterStatusTool,
  handleGetMatterStatus,
  getMatterStatusSchema,
} from './get-matter-status.js'
import { listMattersTool, handleListMatters, listMattersSchema } from './list-matters.js'
import {
  getRetainerTermsTool,
  handleGetRetainerTerms,
  getRetainerTermsSchema,
} from './get-retainer-terms.js'
import {
  acceptRetainerTool,
  handleAcceptRetainer,
  acceptRetainerSchema,
} from './accept-retainer.js'
import {
  submitDocumentTool,
  handleSubmitDocument,
  submitDocumentSchema,
} from './submit-document.js'
import {
  getDocumentAnalysisTool,
  handleGetDocumentAnalysis,
  getDocumentAnalysisSchema,
} from './get-document-analysis.js'
import { addCreditsTool, handleAddCredits, addCreditsSchema } from './add-credits.js'
import {
  requestConsultationTool,
  handleRequestConsultation,
  requestConsultationSchema,
} from './request-consultation.js'
import {
  getConsultationResultTool,
  handleGetConsultationResult,
  getConsultationResultSchema,
} from './get-consultation-result.js'
// Resolve tools
import {
  resolveTools,
  registerAgentSchema,
  handleRegisterAgent,
  getAgentTrustSchema,
  handleGetAgentTrust,
  proposeTransactionSchema,
  handleProposeTransaction,
  respondToTransactionSchema,
  handleRespondToTransaction,
  completeTransactionSchema,
  handleCompleteTransaction,
  fileDisputeSchema,
  handleFileDispute,
  respondToDisputeSchema,
  handleRespondToDispute,
  getDisputeSchema,
  handleGetDispute,
  listDisputesSchema,
  handleListDisputes,
  submitEvidenceSchema,
  handleSubmitEvidence,
  getEvidenceSchema,
  handleGetEvidence,
  acceptDecisionSchema,
  handleAcceptDecision,
  rejectDecisionSchema,
  handleRejectDecision,
  getDecisionSchema,
  handleGetDecision,
  requestEscalationSchema,
  handleRequestEscalation,
  getEscalationStatusSchema,
  handleGetEscalationStatus,
  fundEscrowSchema,
  handleFundEscrow,
  releaseEscrowSchema,
  handleReleaseEscrow,
  getEscrowStatusSchema,
  handleGetEscrowStatus,
  markSubmissionCompleteSchema,
  handleMarkSubmissionComplete,
  submitFeedbackSchema,
  handleSubmitFeedback,
  extendSubmissionDeadlineSchema,
  handleExtendSubmissionDeadline,
} from './resolve/index.js'
import { ApiError } from '../types.js'
import { z } from 'zod'

// Tool definitions for MCP server
export const tools = [
  startSessionTool,
  getSessionInfoTool,
  listServicesTool,
  getDisclaimersTool,
  checkCreditsTool,
  addCreditsTool,
  askLegalQuestionTool,
  createMatterTool,
  getMatterStatusTool,
  listMattersTool,
  getRetainerTermsTool,
  acceptRetainerTool,
  submitDocumentTool,
  getDocumentAnalysisTool,
  requestConsultationTool,
  getConsultationResultTool,
  // Resolve tools
  ...resolveTools,
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
  add_credits: async (input) => {
    const validated = addCreditsSchema.parse(input)
    return handleAddCredits(validated)
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
  request_consultation: async (input) => {
    const validated = requestConsultationSchema.parse(input)
    return handleRequestConsultation(validated)
  },
  get_consultation_result: async (input) => {
    const validated = getConsultationResultSchema.parse(input)
    return handleGetConsultationResult(validated)
  },
  // Resolve handlers
  register_resolve_agent: async (input) => {
    const validated = registerAgentSchema.parse(input)
    return handleRegisterAgent(validated)
  },
  get_agent_trust: async (input) => {
    const validated = getAgentTrustSchema.parse(input)
    return handleGetAgentTrust(validated)
  },
  propose_transaction: async (input) => {
    const validated = proposeTransactionSchema.parse(input)
    return handleProposeTransaction(validated)
  },
  respond_to_transaction: async (input) => {
    const validated = respondToTransactionSchema.parse(input)
    return handleRespondToTransaction(validated)
  },
  complete_transaction: async (input) => {
    const validated = completeTransactionSchema.parse(input)
    return handleCompleteTransaction(validated)
  },
  file_dispute: async (input) => {
    const validated = fileDisputeSchema.parse(input)
    return handleFileDispute(validated)
  },
  respond_to_dispute: async (input) => {
    const validated = respondToDisputeSchema.parse(input)
    return handleRespondToDispute(validated)
  },
  get_dispute: async (input) => {
    const validated = getDisputeSchema.parse(input)
    return handleGetDispute(validated)
  },
  list_disputes: async (input) => {
    const validated = listDisputesSchema.parse(input)
    return handleListDisputes(validated)
  },
  submit_evidence: async (input) => {
    const validated = submitEvidenceSchema.parse(input)
    return handleSubmitEvidence(validated)
  },
  get_evidence: async (input) => {
    const validated = getEvidenceSchema.parse(input)
    return handleGetEvidence(validated)
  },
  accept_decision: async (input) => {
    const validated = acceptDecisionSchema.parse(input)
    return handleAcceptDecision(validated)
  },
  reject_decision: async (input) => {
    const validated = rejectDecisionSchema.parse(input)
    return handleRejectDecision(validated)
  },
  get_decision: async (input) => {
    const validated = getDecisionSchema.parse(input)
    return handleGetDecision(validated)
  },
  request_escalation: async (input) => {
    const validated = requestEscalationSchema.parse(input)
    return handleRequestEscalation(validated)
  },
  get_escalation_status: async (input) => {
    const validated = getEscalationStatusSchema.parse(input)
    return handleGetEscalationStatus(validated)
  },
  fund_escrow: async (input) => {
    const validated = fundEscrowSchema.parse(input)
    return handleFundEscrow(validated)
  },
  release_escrow: async (input) => {
    const validated = releaseEscrowSchema.parse(input)
    return handleReleaseEscrow(validated)
  },
  get_escrow_status: async (input) => {
    const validated = getEscrowStatusSchema.parse(input)
    return handleGetEscrowStatus(validated)
  },
  mark_submission_complete: async (input) => {
    const validated = markSubmissionCompleteSchema.parse(input)
    return handleMarkSubmissionComplete(validated)
  },
  submit_dispute_feedback: async (input) => {
    const validated = submitFeedbackSchema.parse(input)
    return handleSubmitFeedback(validated)
  },
  extend_submission_deadline: async (input) => {
    const validated = extendSubmissionDeadlineSchema.parse(input)
    return handleExtendSubmissionDeadline(validated)
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
  addCreditsTool,
  askLegalQuestionTool,
  createMatterTool,
  getMatterStatusTool,
  listMattersTool,
  getRetainerTermsTool,
  acceptRetainerTool,
  submitDocumentTool,
  getDocumentAnalysisTool,
  requestConsultationTool,
  getConsultationResultTool,
}
