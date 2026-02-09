// BotEsq - Agent Dispute Resolution Tools

import { registerAgentTool, handleRegisterAgent, registerAgentSchema } from './register-agent.js'
import type { RegisterAgentInput, RegisterAgentOutput } from './register-agent.js'

import { getAgentTrustTool, handleGetAgentTrust, getAgentTrustSchema } from './get-agent-trust.js'
import type { GetAgentTrustInput, GetAgentTrustOutput } from './get-agent-trust.js'

import {
  proposeTransactionTool,
  handleProposeTransaction,
  proposeTransactionSchema,
} from './propose-transaction.js'
import type { ProposeTransactionInput, ProposeTransactionOutput } from './propose-transaction.js'

import {
  respondToTransactionTool,
  handleRespondToTransaction,
  respondToTransactionSchema,
} from './respond-to-transaction.js'
import type {
  RespondToTransactionInput,
  RespondToTransactionOutput,
} from './respond-to-transaction.js'

import {
  completeTransactionTool,
  handleCompleteTransaction,
  completeTransactionSchema,
} from './complete-transaction.js'
import type { CompleteTransactionInput, CompleteTransactionOutput } from './complete-transaction.js'

import { fileDisputeTool, handleFileDispute, fileDisputeSchema } from './file-dispute.js'
import type { FileDisputeInput, FileDisputeOutput } from './file-dispute.js'

import {
  respondToDisputeTool,
  handleRespondToDispute,
  respondToDisputeSchema,
} from './respond-to-dispute.js'
import type { RespondToDisputeInput, RespondToDisputeOutput } from './respond-to-dispute.js'

import { getDisputeTool, handleGetDispute, getDisputeSchema } from './get-dispute.js'
import type { GetDisputeInput, GetDisputeOutput } from './get-dispute.js'

import { listDisputesTool, handleListDisputes, listDisputesSchema } from './list-disputes.js'
import type { ListDisputesInput, ListDisputesOutput } from './list-disputes.js'

import {
  submitEvidenceTool,
  handleSubmitEvidence,
  submitEvidenceSchema,
} from './submit-evidence.js'
import type { SubmitEvidenceInput, SubmitEvidenceOutput } from './submit-evidence.js'

import { getEvidenceTool, handleGetEvidence, getEvidenceSchema } from './get-evidence.js'
import type { GetEvidenceInput, GetEvidenceOutput } from './get-evidence.js'

import {
  acceptDecisionTool,
  handleAcceptDecision,
  acceptDecisionSchema,
} from './accept-decision.js'
import type { AcceptDecisionInput, AcceptDecisionOutput } from './accept-decision.js'

import {
  rejectDecisionTool,
  handleRejectDecision,
  rejectDecisionSchema,
} from './reject-decision.js'
import type { RejectDecisionInput, RejectDecisionOutput } from './reject-decision.js'

import { getDecisionTool, handleGetDecision, getDecisionSchema } from './get-decision.js'
import type { GetDecisionInput, GetDecisionOutput } from './get-decision.js'

import {
  requestEscalationTool,
  handleRequestEscalation,
  requestEscalationSchema,
} from './request-escalation.js'
import type { RequestEscalationInput, RequestEscalationOutput } from './request-escalation.js'

import {
  getEscalationStatusTool,
  handleGetEscalationStatus,
  getEscalationStatusSchema,
} from './get-escalation-status.js'
import type {
  GetEscalationStatusInput,
  GetEscalationStatusOutput,
} from './get-escalation-status.js'

import { fundEscrowTool, handleFundEscrow, fundEscrowSchema } from './fund-escrow.js'
import type { FundEscrowInput, FundEscrowOutput } from './fund-escrow.js'

import { releaseEscrowTool, handleReleaseEscrow, releaseEscrowSchema } from './release-escrow.js'
import type { ReleaseEscrowInput, ReleaseEscrowOutput } from './release-escrow.js'

import {
  getEscrowStatusTool,
  handleGetEscrowStatus,
  getEscrowStatusSchema,
} from './get-escrow-status.js'
import type { GetEscrowStatusInput, GetEscrowStatusOutput } from './get-escrow-status.js'

import {
  submitFeedbackTool,
  handleSubmitFeedback,
  submitFeedbackSchema,
} from './submit-feedback.js'
import type { SubmitFeedbackInput, SubmitFeedbackOutput } from './submit-feedback.js'

// Re-export all
export {
  registerAgentTool,
  handleRegisterAgent,
  registerAgentSchema,
  getAgentTrustTool,
  handleGetAgentTrust,
  getAgentTrustSchema,
  proposeTransactionTool,
  handleProposeTransaction,
  proposeTransactionSchema,
  respondToTransactionTool,
  handleRespondToTransaction,
  respondToTransactionSchema,
  completeTransactionTool,
  handleCompleteTransaction,
  completeTransactionSchema,
  fileDisputeTool,
  handleFileDispute,
  fileDisputeSchema,
  respondToDisputeTool,
  handleRespondToDispute,
  respondToDisputeSchema,
  getDisputeTool,
  handleGetDispute,
  getDisputeSchema,
  listDisputesTool,
  handleListDisputes,
  listDisputesSchema,
  submitEvidenceTool,
  handleSubmitEvidence,
  submitEvidenceSchema,
  getEvidenceTool,
  handleGetEvidence,
  getEvidenceSchema,
  acceptDecisionTool,
  handleAcceptDecision,
  acceptDecisionSchema,
  rejectDecisionTool,
  handleRejectDecision,
  rejectDecisionSchema,
  getDecisionTool,
  handleGetDecision,
  getDecisionSchema,
  requestEscalationTool,
  handleRequestEscalation,
  requestEscalationSchema,
  getEscalationStatusTool,
  handleGetEscalationStatus,
  getEscalationStatusSchema,
  fundEscrowTool,
  handleFundEscrow,
  fundEscrowSchema,
  releaseEscrowTool,
  handleReleaseEscrow,
  releaseEscrowSchema,
  getEscrowStatusTool,
  handleGetEscrowStatus,
  getEscrowStatusSchema,
  submitFeedbackTool,
  handleSubmitFeedback,
  submitFeedbackSchema,
}

export type {
  RegisterAgentInput,
  RegisterAgentOutput,
  GetAgentTrustInput,
  GetAgentTrustOutput,
  ProposeTransactionInput,
  ProposeTransactionOutput,
  RespondToTransactionInput,
  RespondToTransactionOutput,
  CompleteTransactionInput,
  CompleteTransactionOutput,
  FileDisputeInput,
  FileDisputeOutput,
  RespondToDisputeInput,
  RespondToDisputeOutput,
  GetDisputeInput,
  GetDisputeOutput,
  ListDisputesInput,
  ListDisputesOutput,
  SubmitEvidenceInput,
  SubmitEvidenceOutput,
  GetEvidenceInput,
  GetEvidenceOutput,
  AcceptDecisionInput,
  AcceptDecisionOutput,
  RejectDecisionInput,
  RejectDecisionOutput,
  GetDecisionInput,
  GetDecisionOutput,
  RequestEscalationInput,
  RequestEscalationOutput,
  GetEscalationStatusInput,
  GetEscalationStatusOutput,
  FundEscrowInput,
  FundEscrowOutput,
  ReleaseEscrowInput,
  ReleaseEscrowOutput,
  GetEscrowStatusInput,
  GetEscrowStatusOutput,
  SubmitFeedbackInput,
  SubmitFeedbackOutput,
}

// All resolve tools for easy registration
export const resolveTools = [
  registerAgentTool,
  getAgentTrustTool,
  proposeTransactionTool,
  respondToTransactionTool,
  completeTransactionTool,
  fileDisputeTool,
  respondToDisputeTool,
  getDisputeTool,
  listDisputesTool,
  submitEvidenceTool,
  getEvidenceTool,
  acceptDecisionTool,
  rejectDecisionTool,
  getDecisionTool,
  requestEscalationTool,
  getEscalationStatusTool,
  fundEscrowTool,
  releaseEscrowTool,
  getEscrowStatusTool,
  submitFeedbackTool,
]
