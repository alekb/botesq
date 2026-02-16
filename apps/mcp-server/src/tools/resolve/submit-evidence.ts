import { z } from 'zod'
import { ResolveEvidenceType } from '@botesq/database'
import { authenticateSession } from '../../services/auth.service.js'
import { checkRateLimit } from '../../services/rate-limit.service.js'
import { getAgentTrust } from '../../services/resolve-agent.service.js'
import { addEvidence } from '../../services/resolve-dispute.service.js'
import { extractTextFromFile } from '../../services/pdf-extract.service.js'
import { ApiError } from '../../types.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

// Max file size: 10MB base64-encoded (~7.5MB raw)
const MAX_BASE64_SIZE = 10 * 1024 * 1024

export const submitEvidenceSchema = z
  .object({
    session_token: z.string().min(1, 'Session token is required'),
    dispute_id: z.string().min(1, 'Dispute ID is required'),
    agent_id: z.string().min(1, 'Agent ID is required'),
    evidence_type: z.enum([
      'TEXT_STATEMENT',
      'COMMUNICATION_LOG',
      'AGREEMENT_EXCERPT',
      'TIMELINE',
      'OTHER',
    ]),
    title: z.string().min(1, 'Title is required').max(200),
    // Text content — required unless submitting a file
    content: z.string().min(10, 'Content must be at least 10 characters').max(50000).optional(),
    // File-based evidence (PDF, TXT, etc.)
    content_base64: z.string().max(MAX_BASE64_SIZE).optional(),
    filename: z.string().min(1).max(255).optional(),
  })
  .refine((data) => data.content || data.content_base64, {
    message: 'Either content (text) or content_base64 (file) must be provided',
  })
  .refine((data) => !data.content_base64 || data.filename, {
    message: 'filename is required when submitting content_base64',
  })

export type SubmitEvidenceInput = z.infer<typeof submitEvidenceSchema>

export interface SubmitEvidenceOutput {
  evidence_id: string
  dispute_id: string
  evidence_type: string
  title: string
  submitted_by_role: 'claimant' | 'respondent'
  source_filename?: string
  page_count?: number
  content_truncated?: boolean
  message: string
}

export async function handleSubmitEvidence(input: SubmitEvidenceInput): Promise<{
  success: boolean
  data?: SubmitEvidenceOutput
  error?: { code: string; message: string }
}> {
  const session = await authenticateSession(input.session_token)
  const operator = session.apiKey.operator

  checkRateLimit(input.session_token)

  // Verify agent belongs to this operator
  const agent = await getAgentTrust(operator.id, input.agent_id)
  if (!agent) {
    throw new ApiError('AGENT_NOT_FOUND', 'Agent not found or does not belong to your account', 404)
  }

  let evidenceContent: string
  let sourceFilename: string | undefined
  let pageCount: number | undefined
  let contentTruncated: boolean | undefined

  if (input.content_base64 && input.filename) {
    // File-based evidence: decode and extract text
    const buffer = Buffer.from(input.content_base64, 'base64')

    if (buffer.length === 0) {
      throw new ApiError('INVALID_FILE', 'File content is empty', 400)
    }

    try {
      const extraction = await extractTextFromFile(buffer, input.filename)

      if (!extraction.text || extraction.text.length < 10) {
        throw new ApiError(
          'EXTRACTION_FAILED',
          'Could not extract sufficient text from the file. The PDF may be image-based (scanned). ' +
            'Please submit the content as text instead.',
          400
        )
      }

      evidenceContent = extraction.text
      sourceFilename = input.filename
      pageCount = extraction.pageCount
      contentTruncated = extraction.truncated
    } catch (error) {
      if (error instanceof ApiError) throw error
      logger.error({ error, filename: input.filename }, 'Failed to extract text from file')
      throw new ApiError(
        'EXTRACTION_FAILED',
        `Failed to extract text from ${input.filename}. Ensure the file is a valid PDF or text file.`,
        400
      )
    }
  } else {
    // Text-based evidence (original behavior)
    evidenceContent = input.content!
  }

  const result = await addEvidence({
    disputeExternalId: input.dispute_id,
    submittingAgentId: agent.id,
    evidenceType: input.evidence_type as ResolveEvidenceType,
    title: input.title,
    content: evidenceContent,
  })

  logger.info(
    {
      operatorId: operator.id,
      disputeId: input.dispute_id,
      evidenceId: result.evidenceId,
      agentId: agent.externalId,
      sourceFilename,
      pageCount,
    },
    'Evidence submitted'
  )

  return {
    success: true,
    data: {
      evidence_id: result.evidenceId,
      dispute_id: input.dispute_id,
      evidence_type: input.evidence_type,
      title: input.title,
      submitted_by_role: 'claimant', // The service determines this from agent ID
      source_filename: sourceFilename,
      page_count: pageCount,
      content_truncated: contentTruncated,
      message: sourceFilename
        ? `Evidence extracted from ${sourceFilename} (${pageCount} page${pageCount !== 1 ? 's' : ''}) and submitted successfully.${contentTruncated ? ' Note: content was truncated to fit within limits.' : ''} ` +
          'Use get_evidence to review all submissions. Call mark_submission_complete when done.'
        : 'Evidence submitted successfully. Use get_evidence to review all submissions from both parties. ' +
          "You can submit additional evidence to rebut the other party's claims. " +
          'When you are done submitting evidence, call mark_submission_complete. ' +
          'Arbitration begins once both parties mark complete, or after a 24-hour review period.',
    },
  }
}

export const submitEvidenceTool = {
  name: 'submit_evidence',
  description:
    'Submit evidence to support your position in a dispute. ' +
    'Evidence can be submitted by either party until arbitration begins. ' +
    'Supports both text content and file uploads (PDF, TXT). ' +
    'For files, provide content_base64 and filename — text will be extracted automatically. ' +
    'Types include TEXT_STATEMENT, COMMUNICATION_LOG, AGREEMENT_EXCERPT, TIMELINE, or OTHER.',
  inputSchema: {
    type: 'object',
    properties: {
      session_token: {
        type: 'string',
        description: 'Your session token from start_session',
      },
      dispute_id: {
        type: 'string',
        description: 'Dispute ID (RDISP-XXXX format)',
      },
      agent_id: {
        type: 'string',
        description: 'Your agent ID (must be a party to the dispute)',
      },
      evidence_type: {
        type: 'string',
        enum: ['TEXT_STATEMENT', 'COMMUNICATION_LOG', 'AGREEMENT_EXCERPT', 'TIMELINE', 'OTHER'],
        description: 'Type of evidence being submitted',
      },
      title: {
        type: 'string',
        description: 'Brief title for this evidence (up to 200 characters)',
      },
      content: {
        type: 'string',
        description:
          'Text evidence content (10-50000 characters). Required unless content_base64 is provided.',
      },
      content_base64: {
        type: 'string',
        description:
          'File content encoded as base64. Supported formats: PDF, TXT, CSV, JSON, Markdown. ' +
          'Text is extracted automatically. Must also provide filename.',
      },
      filename: {
        type: 'string',
        description:
          'Original filename with extension (e.g., "contract.pdf"). Required when using content_base64.',
      },
    },
    required: ['session_token', 'dispute_id', 'agent_id', 'evidence_type', 'title'],
  },
  handler: handleSubmitEvidence,
}
