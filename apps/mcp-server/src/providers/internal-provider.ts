import type {
  LegalServiceProvider,
  ProviderCapabilities,
  ProviderHealthStatus,
  ProviderServiceRequest,
  ProviderServiceResponse,
} from './types'
import { generateLegalResponse, type LegalResponse } from '../services/legal-ai.service'
import { analyzeDocument } from '../services/document-analysis.service'
import { logger } from '../lib/logger'

/**
 * Internal BotEsq provider using AI for legal services
 */
class InternalProvider implements LegalServiceProvider {
  readonly id = 'internal'
  readonly name = 'BotEsq AI'
  readonly isInternal = true

  private requestCount = 0
  private errorCount = 0
  private totalResponseTimeMs = 0

  async getCapabilities(): Promise<ProviderCapabilities> {
    return {
      serviceTypes: [
        'LEGAL_QA',
        'DOCUMENT_REVIEW',
        'CONSULTATION',
        'CONTRACT_DRAFTING',
        'ENTITY_FORMATION',
        'TRADEMARK',
      ],
      jurisdictions: ['US', 'US-CA', 'US-NY', 'US-TX', 'US-FL', 'US-DE'],
      specialties: [
        'CONTRACT_REVIEW',
        'ENTITY_FORMATION',
        'COMPLIANCE',
        'IP_TRADEMARK',
        'IP_COPYRIGHT',
        'GENERAL_CONSULTATION',
      ],
      maxConcurrentRequests: 100,
      averageResponseMinutes: 1,
      supportsUrgent: true,
      supportsAsync: false, // Internal provider is always sync
    }
  }

  async checkHealth(): Promise<ProviderHealthStatus> {
    const avgResponseMs = this.requestCount > 0 ? this.totalResponseTimeMs / this.requestCount : 0
    const errorRate = this.requestCount > 0 ? this.errorCount / this.requestCount : 0

    return {
      healthy: errorRate < 0.1, // Healthy if less than 10% error rate
      currentLoad: 0, // AI provider has no meaningful load tracking
      maxCapacity: 100,
      averageResponseMs: avgResponseMs,
      errorRate,
      lastChecked: new Date(),
    }
  }

  async processRequest(request: ProviderServiceRequest): Promise<ProviderServiceResponse> {
    const startTime = Date.now()
    this.requestCount++

    try {
      let response: ProviderServiceResponse

      switch (request.serviceType) {
        case 'LEGAL_QA':
          response = await this.handleLegalQA(request)
          break
        case 'DOCUMENT_REVIEW':
          response = await this.handleDocumentReview(request)
          break
        case 'CONSULTATION':
          response = await this.handleConsultation(request)
          break
        default:
          response = await this.handleGenericRequest(request)
      }

      this.totalResponseTimeMs += Date.now() - startTime
      response.processingTimeMs = Date.now() - startTime

      return response
    } catch (error) {
      this.errorCount++
      this.totalResponseTimeMs += Date.now() - startTime

      logger.error({ error, requestId: request.requestId }, 'Internal provider error')

      return {
        requestId: request.requestId,
        status: 'FAILED',
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        },
        processingTimeMs: Date.now() - startTime,
      }
    }
  }

  private async handleLegalQA(request: ProviderServiceRequest): Promise<ProviderServiceResponse> {
    if (!request.content.question) {
      return {
        requestId: request.requestId,
        status: 'FAILED',
        error: { code: 'MISSING_QUESTION', message: 'Question is required for Legal Q&A' },
      }
    }

    const result = await generateLegalResponse({
      question: request.content.question,
      context: request.content.context,
      jurisdiction: request.content.jurisdiction,
    })

    // Check if escalation is needed based on confidence
    if (result.confidenceScore < 60) {
      return {
        requestId: request.requestId,
        status: 'REQUIRES_ESCALATION',
        content: {
          answer: result.answer,
          confidence: result.confidenceScore / 100,
          complexity: this.normalizeComplexity(result.complexity),
          citations: result.citations.map((c) => c.source),
        },
        escalation: {
          reason: 'Low confidence response - human review recommended',
          suggestedAction: 'Route to human attorney for verification',
        },
      }
    }

    return {
      requestId: request.requestId,
      status: 'COMPLETED',
      content: {
        answer: result.answer,
        confidence: result.confidenceScore / 100,
        complexity: this.normalizeComplexity(result.complexity),
        citations: result.citations.map((c) => c.source),
      },
      creditsUsed: this.calculateCredits(request, result.complexity),
    }
  }

  private async handleDocumentReview(
    request: ProviderServiceRequest
  ): Promise<ProviderServiceResponse> {
    if (!request.content.documentUrl) {
      return {
        requestId: request.requestId,
        status: 'FAILED',
        error: { code: 'MISSING_DOCUMENT', message: 'Document URL is required' },
      }
    }

    // For document review, we need document content
    // In a real implementation, this would fetch and parse the document
    const analysis = await analyzeDocument({
      documentId: request.requestId,
      operatorId: request.operatorId,
      content: request.content.context || '',
      filename: request.content.documentType || 'document',
      documentType: request.content.documentType,
    })

    if (!analysis) {
      return {
        requestId: request.requestId,
        status: 'FAILED',
        error: { code: 'ANALYSIS_FAILED', message: 'Document analysis failed' },
      }
    }

    return {
      requestId: request.requestId,
      status: 'COMPLETED',
      content: {
        summary: analysis.summary,
        analysis: JSON.stringify(analysis),
        recommendations: analysis.recommendations,
        confidence: analysis.confidenceScore / 100,
      },
      creditsUsed: this.calculateDocumentCredits(request.content.pageCount || 1),
    }
  }

  private async handleConsultation(
    request: ProviderServiceRequest
  ): Promise<ProviderServiceResponse> {
    // For consultations, we provide an initial AI response
    // but mark it for potential escalation to human attorney
    const result = await generateLegalResponse({
      question: request.content.question || request.content.context || '',
      context: request.content.context,
      jurisdiction: request.content.jurisdiction,
    })

    // Consultations typically need human review
    if (result.complexity === 'complex' || result.confidenceScore < 70) {
      return {
        requestId: request.requestId,
        status: 'REQUIRES_ESCALATION',
        content: {
          answer: result.answer,
          confidence: result.confidenceScore / 100,
          complexity: this.normalizeComplexity(result.complexity),
        },
        escalation: {
          reason: 'Complex consultation requires attorney review',
          suggestedAction: 'Queue for human attorney consultation',
        },
      }
    }

    return {
      requestId: request.requestId,
      status: 'COMPLETED',
      content: {
        answer: result.answer,
        confidence: result.confidenceScore / 100,
        complexity: this.normalizeComplexity(result.complexity),
        citations: result.citations.map((c) => c.source),
      },
      creditsUsed: this.calculateConsultationCredits(request.content.urgency),
    }
  }

  private async handleGenericRequest(
    request: ProviderServiceRequest
  ): Promise<ProviderServiceResponse> {
    // Generic handler for other service types
    const result = await generateLegalResponse({
      question: request.content.question || request.content.context || '',
      context: request.content.context,
      jurisdiction: request.content.jurisdiction,
    })

    return {
      requestId: request.requestId,
      status: 'COMPLETED',
      content: {
        answer: result.answer,
        confidence: result.confidenceScore / 100,
        complexity: this.normalizeComplexity(result.complexity),
        citations: result.citations.map((c) => c.source),
      },
    }
  }

  private normalizeComplexity(
    complexity: LegalResponse['complexity']
  ): 'SIMPLE' | 'MODERATE' | 'COMPLEX' {
    const map: Record<LegalResponse['complexity'], 'SIMPLE' | 'MODERATE' | 'COMPLEX'> = {
      simple: 'SIMPLE',
      moderate: 'MODERATE',
      complex: 'COMPLEX',
    }
    return map[complexity]
  }

  private calculateCredits(
    request: ProviderServiceRequest,
    complexity: LegalResponse['complexity']
  ): number {
    const baseCredits = {
      simple: 1000,
      moderate: 2500,
      complex: 5000,
    }

    let credits = baseCredits[complexity]

    // Urgent requests cost more
    if (request.content.urgency === 'URGENT') {
      credits = Math.floor(credits * 1.5)
    }

    return credits
  }

  private calculateDocumentCredits(pageCount: number): number {
    const baseCredits = 2500
    const perPageCredits = 100
    return baseCredits + pageCount * perPageCredits
  }

  private calculateConsultationCredits(urgency?: 'STANDARD' | 'URGENT'): number {
    return urgency === 'URGENT' ? 10000 : 5000
  }
}

export const internalProvider = new InternalProvider()
