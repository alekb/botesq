import { chatCompletion, type ChatMessage } from './llm.service.js'
import { isLLMAvailable } from './llm.service.js'
import { updateDocumentAnalysis, getDocument } from './document.service.js'
import { refundCredits } from './credit.service.js'
import { DocumentAnalysisStatus, prisma } from '@botesq/database'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

const DOCUMENT_ANALYSIS_PROMPT = `You are BotEsq's document analysis AI. Analyze the provided document and extract key legal information.

ANALYSIS REQUIREMENTS:
1. Document Type: Identify the type of document (contract, agreement, policy, etc.)
2. Key Parties: List all parties mentioned and their roles
3. Key Terms: Extract important terms, conditions, and obligations
4. Key Dates: Identify important dates (effective date, expiration, deadlines)
5. Financial Terms: Extract any monetary amounts, payment terms, fees
6. Risk Assessment: Identify potential legal risks or red flags
7. Missing Elements: Note any standard clauses that appear to be missing
8. Recommendations: Provide actionable recommendations

CONFIDENCE RATING:
Rate your confidence in the analysis:
- HIGH (90-100%): Clear, well-structured document
- MEDIUM (70-89%): Some ambiguity but generally analyzable
- LOW (50-69%): Significant portions unclear or missing
- REQUIRES_REVIEW: Document needs attorney review

OUTPUT FORMAT:
Provide structured JSON output with the following schema:
{
  "documentType": "string",
  "summary": "string (2-3 sentences)",
  "parties": [{"name": "string", "role": "string"}],
  "keyTerms": [{"term": "string", "description": "string", "importance": "high|medium|low"}],
  "keyDates": [{"date": "string", "description": "string"}],
  "financialTerms": [{"item": "string", "amount": "string", "frequency": "string"}],
  "risks": [{"risk": "string", "severity": "high|medium|low", "recommendation": "string"}],
  "missingElements": ["string"],
  "recommendations": ["string"],
  "confidence": "HIGH|MEDIUM|LOW|REQUIRES_REVIEW",
  "confidenceScore": number (0-100),
  "attorneyReviewRecommended": boolean,
  "attorneyReviewReason": "string (if recommended)"
}`

export interface DocumentAnalysisResult {
  documentType: string
  summary: string
  parties: Array<{ name: string; role: string }>
  keyTerms: Array<{ term: string; description: string; importance: 'high' | 'medium' | 'low' }>
  keyDates: Array<{ date: string; description: string }>
  financialTerms: Array<{ item: string; amount: string; frequency?: string }>
  risks: Array<{ risk: string; severity: 'high' | 'medium' | 'low'; recommendation: string }>
  missingElements: string[]
  recommendations: string[]
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'REQUIRES_REVIEW'
  confidenceScore: number
  attorneyReviewRecommended: boolean
  attorneyReviewReason?: string
}

/**
 * Analyze a document using AI
 */
export async function analyzeDocument(params: {
  documentId: string
  operatorId: string
  content: string
  filename: string
  documentType?: string
}): Promise<DocumentAnalysisResult | null> {
  const { documentId, operatorId, content, filename, documentType } = params

  if (!isLLMAvailable()) {
    logger.warn({ documentId }, 'LLM not available for document analysis')
    await markFailedAndRefund(documentId, operatorId)
    return null
  }

  // Mark as processing
  await updateDocumentAnalysis(documentId, {
    status: DocumentAnalysisStatus.PROCESSING,
  })

  try {
    const userMessage = `Analyze this document:

Filename: ${filename}
${documentType ? `Document Type Hint: ${documentType}` : ''}

Document Content:
---
${content.slice(0, 50000)} ${content.length > 50000 ? '\n\n[Content truncated due to length]' : ''}
---

Provide your analysis in the JSON format specified.`

    const messages: ChatMessage[] = [
      { role: 'system', content: DOCUMENT_ANALYSIS_PROMPT },
      { role: 'user', content: userMessage },
    ]

    const response = await chatCompletion(messages, {
      temperature: 0.2,
      maxTokens: 4096,
    })

    // Parse the JSON response
    let analysis: DocumentAnalysisResult

    try {
      // Try to extract JSON from the response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      analysis = JSON.parse(jsonMatch[0])
    } catch {
      logger.error({ documentId, response: response.content }, 'Failed to parse analysis response')

      // Create a fallback analysis
      analysis = {
        documentType: documentType ?? 'Unknown',
        summary: 'Document analysis completed but structured extraction failed.',
        parties: [],
        keyTerms: [],
        keyDates: [],
        financialTerms: [],
        risks: [
          {
            risk: 'Analysis parsing failed',
            severity: 'medium',
            recommendation: 'Request manual review',
          },
        ],
        missingElements: [],
        recommendations: ['Request attorney review for complete analysis'],
        confidence: 'LOW',
        confidenceScore: 50,
        attorneyReviewRecommended: true,
        attorneyReviewReason: 'Automated analysis was incomplete',
      }
    }

    // Update document with analysis results
    await updateDocumentAnalysis(documentId, {
      status: DocumentAnalysisStatus.COMPLETED,
      results: analysis,
      confidenceScore: analysis.confidenceScore,
      attorneyReviewRecommended: analysis.attorneyReviewRecommended,
    })

    logger.info(
      {
        documentId,
        operatorId,
        documentType: analysis.documentType,
        confidence: analysis.confidence,
        attorneyReviewRecommended: analysis.attorneyReviewRecommended,
      },
      'Document analysis completed'
    )

    return analysis
  } catch (error) {
    logger.error({ documentId, err: error }, 'Document analysis failed')

    await markFailedAndRefund(documentId, operatorId)

    return null
  }
}

/**
 * Mark a document's analysis FAILED and refund the submission charge —
 * the operator must not pay for undelivered analysis.
 */
async function markFailedAndRefund(documentId: string, operatorId: string): Promise<void> {
  try {
    await updateDocumentAnalysis(documentId, {
      status: DocumentAnalysisStatus.FAILED,
    })

    const deduction = await prisma.creditTransaction.findFirst({
      where: { operatorId, referenceType: 'document', referenceId: documentId, type: 'DEDUCTION' },
    })
    if (!deduction) {
      return
    }

    // Idempotency guard: never refund the same document twice.
    const alreadyRefunded = await prisma.creditTransaction.findFirst({
      where: { operatorId, referenceType: 'document', referenceId: documentId, type: 'REFUND' },
    })
    if (alreadyRefunded) {
      return
    }

    await refundCredits(
      operatorId,
      Math.abs(deduction.amount),
      'Document analysis failed',
      'document',
      documentId
    )
    logger.info({ documentId, credits: Math.abs(deduction.amount) }, 'Refunded failed analysis')
  } catch (error) {
    logger.error({ documentId, err: error }, 'Failed to mark/refund failed analysis')
  }
}

/**
 * Queue document for analysis (async, fire-and-forget)
 */
export function queueDocumentAnalysis(params: {
  documentId: string
  operatorId: string
  content: string
  filename: string
  documentType?: string
}): void {
  // TODO: replace with a real job queue. Binary formats (PDF/DOCX) need text
  // extraction before the LLM sees them — until then the analyzer receives
  // bytes decoded as UTF-8 and its low-confidence fallback flags the result
  // for attorney review.
  logger.info({ documentId: params.documentId }, 'Document queued for analysis')

  void analyzeDocument(params).catch((error) => {
    logger.error({ documentId: params.documentId, err: error }, 'Async document analysis failed')
  })
}

/**
 * Get analysis status
 */
export async function getAnalysisStatus(
  documentId: string,
  operatorId: string
): Promise<{
  status: DocumentAnalysisStatus
  analysis?: DocumentAnalysisResult
  analyzedAt?: Date
} | null> {
  const document = await getDocument(documentId, operatorId)
  if (!document) {
    return null
  }

  return {
    status: document.analysisStatus,
    analysis: document.analysis as DocumentAnalysisResult | undefined,
    analyzedAt: document.analyzedAt ?? undefined,
  }
}
