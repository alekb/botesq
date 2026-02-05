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
]
