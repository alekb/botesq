import { z } from 'zod'
import { authenticateSession } from '../services/auth.service.js'
import { checkRateLimit } from '../services/rate-limit.service.js'
import { getDocument } from '../services/document.service.js'
import { getAnalysisStatus, type DocumentAnalysisResult } from '../services/document-analysis.service.js'
import { ApiError } from '../types.js'

export const getDocumentAnalysisSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
  document_id: z.string().min(1, 'Document ID is required'),
})

export type GetDocumentAnalysisInput = z.infer<typeof getDocumentAnalysisSchema>

export interface GetDocumentAnalysisOutput {
  document_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  analysis?: {
    document_type: string
    summary: string
    parties: Array<{ name: string; role: string }>
    key_terms: Array<{ term: string; description: string; importance: string }>
    key_dates: Array<{ date: string; description: string }>
    financial_terms: Array<{ item: string; amount: string; frequency?: string }>
    risks: Array<{ risk: string; severity: string; recommendation: string }>
    missing_elements: string[]
    recommendations: string[]
    confidence: string
    confidence_score: number
  }
  attorney_review_recommended: boolean
  attorney_review_reason?: string
  analyzed_at?: string
}

/**
 * Convert analysis result to output format (snake_case)
 */
function formatAnalysis(analysis: DocumentAnalysisResult): GetDocumentAnalysisOutput['analysis'] {
  return {
    document_type: analysis.documentType,
    summary: analysis.summary,
    parties: analysis.parties,
    key_terms: analysis.keyTerms.map((t) => ({
      term: t.term,
      description: t.description,
      importance: t.importance,
    })),
    key_dates: analysis.keyDates,
    financial_terms: analysis.financialTerms,
    risks: analysis.risks.map((r) => ({
      risk: r.risk,
      severity: r.severity,
      recommendation: r.recommendation,
    })),
    missing_elements: analysis.missingElements,
    recommendations: analysis.recommendations,
    confidence: analysis.confidence,
    confidence_score: analysis.confidenceScore,
  }
}

export async function handleGetDocumentAnalysis(
  input: GetDocumentAnalysisInput
): Promise<{ success: boolean; data?: GetDocumentAnalysisOutput; error?: { code: string; message: string } }> {
  // Authenticate session
  const session = await authenticateSession(input.session_token)
  const operator = session.apiKey.operator

  // Check rate limits
  checkRateLimit(input.session_token)

  // Get the document
  const document = await getDocument(input.document_id, operator.id)
  if (!document) {
    throw new ApiError('DOCUMENT_NOT_FOUND', 'Document not found', 404)
  }

  // Get analysis status
  const analysisResult = await getAnalysisStatus(input.document_id, operator.id)
  if (!analysisResult) {
    throw new ApiError('DOCUMENT_NOT_FOUND', 'Document not found', 404)
  }

  // Map status to output format
  const statusMap: Record<string, GetDocumentAnalysisOutput['status']> = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
  }

  const status = statusMap[analysisResult.status] ?? 'pending'

  return {
    success: true,
    data: {
      document_id: document.externalId,
      status,
      analysis: analysisResult.analysis ? formatAnalysis(analysisResult.analysis) : undefined,
      attorney_review_recommended: document.attorneyReviewRecommended,
      attorney_review_reason: analysisResult.analysis?.attorneyReviewReason,
      analyzed_at: analysisResult.analyzedAt?.toISOString(),
    },
  }
}

export const getDocumentAnalysisTool = {
  name: 'get_document_analysis',
  description:
    'Get the AI analysis results for a submitted document. Returns document type, key terms, risks, and recommendations.',
  inputSchema: {
    type: 'object',
    properties: {
      session_token: {
        type: 'string',
        description: 'Your session token from start_session',
      },
      document_id: {
        type: 'string',
        description: 'The document ID from submit_document',
      },
    },
    required: ['session_token', 'document_id'],
  },
  handler: handleGetDocumentAnalysis,
}
