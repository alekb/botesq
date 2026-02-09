// MCP Prompts for dispute resolution scenarios
// These provide structured prompts for common dispute and transaction workflows

export const prompts = [
  {
    name: 'dispute_filing',
    description: 'File a dispute against another agent for a failed transaction',
    arguments: [
      {
        name: 'transaction_id',
        description: 'The transaction ID (RTXN-XXXX format) to dispute',
        required: true,
      },
      {
        name: 'claim_type',
        description:
          'Type of claim (NON_PERFORMANCE, PARTIAL_PERFORMANCE, QUALITY_ISSUE, PAYMENT_DISPUTE, MISREPRESENTATION, BREACH_OF_TERMS, OTHER)',
        required: true,
      },
      {
        name: 'issue_description',
        description: 'Description of what went wrong',
        required: true,
      },
      {
        name: 'desired_outcome',
        description: 'What resolution you are seeking (e.g., refund, completion, compensation)',
        required: true,
      },
    ],
  },
  {
    name: 'evidence_submission',
    description: 'Submit evidence to support your position in a dispute',
    arguments: [
      {
        name: 'dispute_id',
        description: 'The dispute ID (RDISP-XXXX format)',
        required: true,
      },
      {
        name: 'evidence_type',
        description:
          'Type of evidence (TEXT_STATEMENT, COMMUNICATION_LOG, AGREEMENT_EXCERPT, TIMELINE, OTHER)',
        required: true,
      },
      {
        name: 'evidence_content',
        description: 'The evidence content (logs, statements, excerpts, etc.)',
        required: true,
      },
      {
        name: 'context',
        description: 'Additional context about how this evidence supports your position',
        required: false,
      },
    ],
  },
  {
    name: 'dispute_response',
    description: 'Respond to a dispute filed against your agent',
    arguments: [
      {
        name: 'dispute_id',
        description: 'The dispute ID (RDISP-XXXX format) to respond to',
        required: true,
      },
      {
        name: 'position',
        description:
          'Your position on the claim (e.g., deny, partial acknowledgment, counter-claim)',
        required: true,
      },
      {
        name: 'explanation',
        description: 'Detailed explanation of your side of the story',
        required: true,
      },
      {
        name: 'mitigating_factors',
        description: 'Any mitigating circumstances or context',
        required: false,
      },
    ],
  },
  {
    name: 'escalation_request',
    description: 'Request escalation of a dispute to a human arbitrator',
    arguments: [
      {
        name: 'dispute_id',
        description: 'The dispute ID (RDISP-XXXX format) to escalate',
        required: true,
      },
      {
        name: 'rejection_reason',
        description:
          'Why you rejected the AI decision (FACTUAL_ERROR, EVIDENCE_IGNORED, REASONING_FLAWED, BIAS_DETECTED, RULING_DISPROPORTIONATE, OTHER)',
        required: true,
      },
      {
        name: 'detailed_reason',
        description: 'Detailed explanation of why you believe the AI ruling was incorrect',
        required: true,
      },
    ],
  },
  {
    name: 'transaction_proposal',
    description: 'Propose a transaction between two agents',
    arguments: [
      {
        name: 'receiver_agent_id',
        description: 'The other agent ID (RAGENT-XXXX format)',
        required: true,
      },
      {
        name: 'service_description',
        description: 'Description of the service or goods being exchanged',
        required: true,
      },
      {
        name: 'terms',
        description: 'Key terms of the transaction (deliverables, deadlines, payment)',
        required: true,
      },
      {
        name: 'value',
        description: 'Transaction value in USD (e.g., "100.00")',
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
    case 'dispute_filing':
      return `I need to file a dispute for transaction ${args.transaction_id}.
Claim type: ${args.claim_type}

Issue: ${args.issue_description}

Desired outcome: ${args.desired_outcome}

Please help me:
1. Draft a clear and factual claim summary (max 500 characters)
2. Identify the key facts that support my claim
3. Suggest what evidence I should gather
4. Recommend an appropriate requested resolution`

    case 'evidence_submission':
      return `I need to submit evidence for dispute ${args.dispute_id}.
Evidence type: ${args.evidence_type}

Evidence content:
${args.evidence_content}
${args.context ? `\nContext: ${args.context}` : ''}

Please help me:
1. Organize this evidence clearly
2. Highlight the most relevant facts
3. Suggest a compelling title for this evidence
4. Identify any gaps that additional evidence could fill`

    case 'dispute_response':
      return `I need to respond to dispute ${args.dispute_id}.
My position: ${args.position}

Explanation: ${args.explanation}
${args.mitigating_factors ? `\nMitigating factors: ${args.mitigating_factors}` : ''}

Please help me:
1. Draft a clear response summary (max 500 characters)
2. Structure my detailed response logically
3. Identify evidence I should submit to support my position
4. Suggest how to address the claimant's specific allegations`

    case 'escalation_request':
      return `I want to escalate dispute ${args.dispute_id} to a human arbitrator.
Rejection reason: ${args.rejection_reason}

Detailed reason: ${args.detailed_reason}

Please help me:
1. Draft a compelling escalation reason (20-2000 characters)
2. Identify the specific flaws in the AI ruling
3. Suggest what additional evidence or arguments to highlight
4. Prepare for the human arbitrator review process`

    case 'transaction_proposal':
      return `I want to propose a transaction to agent ${args.receiver_agent_id}.
Service: ${args.service_description}
Terms: ${args.terms}
${args.value ? `Value: $${args.value} USD` : ''}

Please help me:
1. Draft a clear transaction title (max 200 characters)
2. Structure the terms as key-value pairs
3. Suggest appropriate expiration timeline
4. Recommend whether to use escrow for this transaction`

    default:
      return null
  }
}
