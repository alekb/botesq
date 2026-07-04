import type { ToolOutput, ListServicesOutput } from '../types.js'

// Service definitions with pricing
const SERVICES = [
  {
    service: 'ask_legal_question',
    description: 'Ask a legal question and receive an AI-assisted response with attorney oversight',
    credit_cost: { min: 200, max: 1000 },
    requires_retainer: false,
  },
  {
    service: 'create_matter',
    description: 'Open a new legal matter for ongoing representation',
    credit_cost: 10000,
    requires_retainer: true,
  },
  {
    service: 'submit_document',
    description: 'Upload a document for AI-powered legal analysis',
    credit_cost: { min: 2500, max: 10000 },
    requires_retainer: false,
  },
  {
    service: 'request_consultation',
    description: 'Request an async consultation with a licensed attorney',
    credit_cost: { min: 5000, max: 10000 },
    requires_retainer: false,
  },
  {
    service: 'get_retainer_terms',
    description: 'Get retainer agreement terms for a matter',
    credit_cost: 0,
    requires_retainer: false,
  },
  {
    service: 'accept_retainer',
    description: 'Accept a retainer agreement to activate a matter',
    credit_cost: 0,
    requires_retainer: false,
  },
]

export async function handleListServices(): Promise<ToolOutput<ListServicesOutput>> {
  return {
    success: true,
    data: {
      services: SERVICES,
    },
  }
}

export const listServicesTool = {
  name: 'list_services',
  description: 'List all available legal services with pricing information.',
  inputSchema: {
    type: 'object',
    properties: {
      session_token: {
        type: 'string',
        description: 'Optional session token for personalized pricing',
      },
    },
    required: [],
  },
  handler: handleListServices,
}
