// MCP Prompts for legal domains
// These provide structured prompts for common legal scenarios

export const prompts = [
  {
    name: 'contract_review',
    description: 'Review a contract for key terms, risks, and recommendations',
    arguments: [
      {
        name: 'contract_type',
        description: 'Type of contract (e.g., employment, NDA, SaaS, lease)',
        required: true,
      },
      {
        name: 'party_role',
        description: 'Your role in the contract (e.g., buyer, seller, employee, landlord)',
        required: true,
      },
      {
        name: 'jurisdiction',
        description: 'Governing jurisdiction',
        required: false,
      },
      {
        name: 'concerns',
        description: 'Specific concerns or areas to focus on',
        required: false,
      },
    ],
  },
  {
    name: 'entity_formation',
    description: 'Get guidance on forming a business entity',
    arguments: [
      {
        name: 'business_type',
        description: 'Type of business (e.g., tech startup, restaurant, consulting)',
        required: true,
      },
      {
        name: 'state',
        description: 'State of formation',
        required: true,
      },
      {
        name: 'owners',
        description: 'Number and type of owners (e.g., single founder, 3 co-founders, investors)',
        required: true,
      },
      {
        name: 'funding',
        description: 'Planned funding approach (bootstrapped, angel, VC)',
        required: false,
      },
    ],
  },
  {
    name: 'compliance_check',
    description: 'Check compliance requirements for a business activity',
    arguments: [
      {
        name: 'activity',
        description: 'Business activity to check (e.g., data collection, hiring, advertising)',
        required: true,
      },
      {
        name: 'industry',
        description: 'Industry sector (e.g., healthcare, finance, retail)',
        required: true,
      },
      {
        name: 'jurisdictions',
        description: 'Relevant jurisdictions (can be multiple)',
        required: true,
      },
    ],
  },
  {
    name: 'ip_question',
    description: 'Ask about intellectual property protection',
    arguments: [
      {
        name: 'ip_type',
        description: 'Type of IP (trademark, copyright, patent, trade secret)',
        required: true,
      },
      {
        name: 'asset_description',
        description: 'Description of the asset to protect',
        required: true,
      },
      {
        name: 'current_status',
        description: 'Current protection status (unprotected, pending, registered)',
        required: false,
      },
      {
        name: 'concern',
        description: 'Specific concern (registration, infringement, licensing)',
        required: false,
      },
    ],
  },
  {
    name: 'general_legal',
    description: 'Ask a general legal question',
    arguments: [
      {
        name: 'topic',
        description: 'Legal topic area',
        required: true,
      },
      {
        name: 'question',
        description: 'Your specific question',
        required: true,
      },
      {
        name: 'jurisdiction',
        description: 'Relevant jurisdiction',
        required: false,
      },
      {
        name: 'urgency',
        description: 'Urgency level (routine, time-sensitive, urgent)',
        required: false,
      },
    ],
  },
]

/**
 * Get prompt template by name
 */
export function getPromptTemplate(name: string): (typeof prompts)[0] | undefined {
  return prompts.find((p) => p.name === name)
}

/**
 * Build a prompt from template and arguments
 */
export function buildPrompt(name: string, args: Record<string, string>): string | null {
  const template = getPromptTemplate(name)
  if (!template) return null

  // Validate required arguments
  for (const arg of template.arguments) {
    if (arg.required && !args[arg.name]) {
      return null
    }
  }

  // Build the prompt based on template
  switch (name) {
    case 'contract_review':
      return `Please review a ${args.contract_type} contract where I am the ${args.party_role}.
${args.jurisdiction ? `Jurisdiction: ${args.jurisdiction}` : ''}
${args.concerns ? `Specific concerns: ${args.concerns}` : ''}

Please analyze:
1. Key terms and obligations
2. Potential risks and red flags
3. Missing or unclear provisions
4. Recommendations for negotiation`

    case 'entity_formation':
      return `I need guidance on forming a business entity for a ${args.business_type} in ${args.state}.
Ownership structure: ${args.owners}
${args.funding ? `Funding approach: ${args.funding}` : ''}

Please advise on:
1. Recommended entity type and why
2. Formation steps and timeline
3. Initial compliance requirements
4. Tax considerations`

    case 'compliance_check':
      return `Please check compliance requirements for ${args.activity} in the ${args.industry} industry.
Jurisdictions: ${args.jurisdictions}

Please identify:
1. Applicable regulations and laws
2. Required permits or licenses
3. Key compliance obligations
4. Potential penalties for non-compliance`

    case 'ip_question':
      return `I have a question about ${args.ip_type} protection for: ${args.asset_description}
${args.current_status ? `Current status: ${args.current_status}` : ''}
${args.concern ? `Specific concern: ${args.concern}` : ''}

Please advise on:
1. Protection options available
2. Registration process and timeline
3. Scope of protection
4. Enforcement considerations`

    case 'general_legal':
      return `Legal topic: ${args.topic}
${args.jurisdiction ? `Jurisdiction: ${args.jurisdiction}` : ''}
${args.urgency ? `Urgency: ${args.urgency}` : ''}

Question: ${args.question}`

    default:
      return null
  }
}
