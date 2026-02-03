import { z } from 'zod'
import { authenticateSession } from '../services/auth.service.js'
import { checkRateLimit } from '../services/rate-limit.service.js'
import { submitDocument } from '../services/document.service.js'
import { queueDocumentAnalysis } from '../services/document-analysis.service.js'
import { PaymentError } from '../types.js'
import { prisma } from '@botesq/database'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

// Pricing: base + per page
const PRICING = {
  base: 2500,
  perPage: 100,
  max: 10000,
}

export const submitDocumentSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  matter_id: z.string().optional(),
  filename: z.string().min(1, 'Filename is required'),
  content_base64: z.string().min(1, 'Content is required'),
  document_type: z.string().optional(),
  notes: z.string().max(2000).optional(),
})

export type SubmitDocumentInput = z.infer<typeof submitDocumentSchema>

export interface SubmitDocumentOutput {
  document_id: string
  matter_id?: string
  filename: string
  file_size: number
  analysis_status: string
  estimated_analysis_time_minutes: number
  credits_used: number
  credits_remaining: number
}

/**
 * Calculate document cost based on estimated page count
 */
function calculateCost(fileSize: number, mimeType: string): number {
  let estimatedPages = 1

  if (mimeType === 'application/pdf') {
    // Rough estimate: ~3KB per page for typical PDF
    estimatedPages = Math.max(1, Math.ceil(fileSize / 3000))
  } else if (
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    // Word docs: ~5KB per page
    estimatedPages = Math.max(1, Math.ceil(fileSize / 5000))
  }

  const cost = PRICING.base + estimatedPages * PRICING.perPage
  return Math.min(cost, PRICING.max)
}

/**
 * Detect MIME type from filename
 */
function detectMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
  }
  return mimeMap[ext ?? ''] ?? 'application/octet-stream'
}

export async function handleSubmitDocument(
  input: SubmitDocumentInput
): Promise<{ success: boolean; data?: SubmitDocumentOutput; error?: { code: string; message: string } }> {
  // Authenticate session
  const session = await authenticateSession(input.session_token)
  const operator = session.apiKey.operator

  // Check rate limits
  checkRateLimit(input.session_token)

  // Decode base64 content
  const content = Buffer.from(input.content_base64, 'base64')
  const mimeType = detectMimeType(input.filename)

  // Calculate cost
  const creditsUsed = calculateCost(content.length, mimeType)

  // Check credits
  if (operator.creditBalance < creditsUsed) {
    throw new PaymentError('INSUFFICIENT_CREDITS', 'Not enough credits for document submission')
  }

  // Submit the document
  const document = await submitDocument({
    operatorId: operator.id,
    matterId: input.matter_id,
    filename: input.filename,
    mimeType,
    content,
    documentType: input.document_type,
    notes: input.notes,
  })

  // Deduct credits
  await prisma.$transaction(async (tx) => {
    await tx.operator.update({
      where: { id: operator.id },
      data: { creditBalance: { decrement: creditsUsed } },
    })

    await tx.creditTransaction.create({
      data: {
        operatorId: operator.id,
        type: 'DEDUCTION',
        amount: -creditsUsed,
        balanceBefore: operator.creditBalance,
        balanceAfter: operator.creditBalance - creditsUsed,
        description: `Document submission: ${document.externalId}`,
        referenceType: 'document',
        referenceId: document.id,
      },
    })
  })

  // Queue for analysis
  await queueDocumentAnalysis({
    documentId: document.id,
    operatorId: operator.id,
  })

  logger.info(
    {
      operatorId: operator.id,
      documentId: document.externalId,
      filename: document.filename,
      fileSize: document.fileSize,
      creditsUsed,
    },
    'Document submitted successfully'
  )

  // Estimate analysis time based on file size
  const estimatedMinutes = Math.max(1, Math.ceil(content.length / 100000))

  return {
    success: true,
    data: {
      document_id: document.externalId,
      matter_id: document.matterId ?? undefined,
      filename: document.filename,
      file_size: document.fileSize,
      analysis_status: document.analysisStatus,
      estimated_analysis_time_minutes: estimatedMinutes,
      credits_used: creditsUsed,
      credits_remaining: operator.creditBalance - creditsUsed,
    },
  }
}

export const submitDocumentTool = {
  name: 'submit_document',
  description:
    'Submit a document for storage and AI analysis. Documents can be associated with a matter. Supported formats: PDF, Word, TXT, PNG, JPEG.',
  inputSchema: {
    type: 'object',
    properties: {
      session_token: {
        type: 'string',
        description: 'Your session token from start_session',
      },
      matter_id: {
        type: 'string',
        description: 'Optional matter ID to associate the document with',
      },
      filename: {
        type: 'string',
        description: 'Original filename with extension (e.g., "contract.pdf")',
      },
      content_base64: {
        type: 'string',
        description: 'File content encoded as base64',
      },
      document_type: {
        type: 'string',
        description: 'Type of document (e.g., "contract", "agreement", "policy")',
      },
      notes: {
        type: 'string',
        description: 'Additional notes about the document',
      },
    },
    required: ['session_token', 'filename', 'content_base64'],
  },
  handler: handleSubmitDocument,
}
