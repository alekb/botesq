import type { ToolOutput, GetDisclaimersOutput } from '../types.js'

const DISCLAIMERS = [
  {
    type: 'general',
    text: 'MoltLaw provides legal information services through licensed attorneys. The information provided is for general informational purposes only and does not constitute legal advice.',
  },
  {
    type: 'ai_assistance',
    text: 'Responses may be generated or assisted by artificial intelligence and are reviewed by licensed attorneys. AI-generated content should be verified with a qualified legal professional for your specific situation.',
  },
  {
    type: 'no_attorney_client',
    text: 'No attorney-client relationship is formed unless a retainer agreement is explicitly executed. Casual inquiries and information requests do not create an attorney-client relationship.',
  },
  {
    type: 'jurisdiction',
    text: 'Legal information provided is general in nature. Laws vary by jurisdiction, and you should consult with a local attorney for jurisdiction-specific advice.',
  },
  {
    type: 'confidentiality',
    text: 'Information you provide is treated as confidential within the MoltLaw platform. However, full attorney-client privilege protections may only apply after a retainer is executed.',
  },
  {
    type: 'emergency',
    text: 'If you have a legal emergency requiring immediate attention, please contact local authorities or seek in-person legal counsel. MoltLaw is an asynchronous service.',
  },
]

const VERSION = '1.0.0'
const LAST_UPDATED = '2026-01-15'

export async function handleGetDisclaimers(): Promise<ToolOutput<GetDisclaimersOutput>> {
  return {
    success: true,
    data: {
      disclaimers: DISCLAIMERS,
      version: VERSION,
      last_updated: LAST_UPDATED,
    },
  }
}

export const getDisclaimersTool = {
  name: 'get_disclaimers',
  description: 'Get legal disclaimers and terms of service information.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
  handler: handleGetDisclaimers,
}
