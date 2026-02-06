import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DocumentAnalysisStatus } from '@botesq/database'

// Mock llm.service
vi.mock('../services/llm.service.js', () => ({
  chatCompletion: vi.fn(),
  isLLMAvailable: vi.fn(),
}))

// Mock document.service
vi.mock('../services/document.service.js', () => ({
  updateDocumentAnalysis: vi.fn(),
  getDocument: vi.fn(),
}))

import { chatCompletion, isLLMAvailable } from '../services/llm.service.js'
import { updateDocumentAnalysis, getDocument } from '../services/document.service.js'
import { analyzeDocument, getAnalysisStatus } from '../services/document-analysis.service'

describe('document-analysis.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('analyzeDocument', () => {
    const baseParams = {
      documentId: 'doc_123',
      operatorId: 'op_123',
      content: 'This is a standard employment agreement between Company A and Employee B...',
      filename: 'employment-agreement.pdf',
    }

    const validAnalysisJson = JSON.stringify({
      documentType: 'Employment Agreement',
      summary: 'Standard employment agreement.',
      parties: [{ name: 'Company A', role: 'Employer' }],
      keyTerms: [{ term: 'Non-compete', description: 'Clause', importance: 'high' }],
      keyDates: [{ date: '2025-01-01', description: 'Start date' }],
      financialTerms: [{ item: 'Salary', amount: '$100,000', frequency: 'annual' }],
      risks: [],
      missingElements: [],
      recommendations: ['Add arbitration clause'],
      confidence: 'HIGH',
      confidenceScore: 92,
      attorneyReviewRecommended: false,
    })

    it('should return null when LLM is not available', async () => {
      vi.mocked(isLLMAvailable).mockReturnValue(false)

      const result = await analyzeDocument(baseParams)

      expect(result).toBeNull()
      expect(updateDocumentAnalysis).not.toHaveBeenCalled()
    })

    it('should mark document as PROCESSING before analysis', async () => {
      vi.mocked(isLLMAvailable).mockReturnValue(true)
      vi.mocked(chatCompletion).mockResolvedValue({ content: validAnalysisJson } as never)

      await analyzeDocument(baseParams)

      expect(updateDocumentAnalysis).toHaveBeenCalledWith('doc_123', 'op_123', {
        status: DocumentAnalysisStatus.PROCESSING,
      })
    })

    it('should call chatCompletion with correct messages', async () => {
      vi.mocked(isLLMAvailable).mockReturnValue(true)
      vi.mocked(chatCompletion).mockResolvedValue({ content: validAnalysisJson } as never)

      await analyzeDocument(baseParams)

      expect(chatCompletion).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' }),
        ]),
        { temperature: 0.2, maxTokens: 4096 }
      )
    })

    it('should parse valid JSON response', async () => {
      vi.mocked(isLLMAvailable).mockReturnValue(true)
      vi.mocked(chatCompletion).mockResolvedValue({ content: validAnalysisJson } as never)

      const result = await analyzeDocument(baseParams)

      expect(result).not.toBeNull()
      expect(result?.documentType).toBe('Employment Agreement')
      expect(result?.confidenceScore).toBe(92)
    })

    it('should mark document as COMPLETED on success', async () => {
      vi.mocked(isLLMAvailable).mockReturnValue(true)
      vi.mocked(chatCompletion).mockResolvedValue({ content: validAnalysisJson } as never)

      await analyzeDocument(baseParams)

      expect(updateDocumentAnalysis).toHaveBeenCalledWith('doc_123', 'op_123', {
        status: DocumentAnalysisStatus.COMPLETED,
        results: expect.objectContaining({ documentType: 'Employment Agreement' }),
        confidenceScore: 92,
        attorneyReviewRecommended: false,
      })
    })

    it('should return fallback analysis when JSON parsing fails', async () => {
      vi.mocked(isLLMAvailable).mockReturnValue(true)
      vi.mocked(chatCompletion).mockResolvedValue({
        content: 'This is not valid JSON at all',
      } as never)

      const result = await analyzeDocument(baseParams)

      expect(result).not.toBeNull()
      expect(result?.confidence).toBe('LOW')
      expect(result?.confidenceScore).toBe(50)
      expect(result?.attorneyReviewRecommended).toBe(true)
    })

    it('should truncate content longer than 50k characters', async () => {
      vi.mocked(isLLMAvailable).mockReturnValue(true)
      vi.mocked(chatCompletion).mockResolvedValue({ content: validAnalysisJson } as never)

      const longContent = 'x'.repeat(60000)
      await analyzeDocument({ ...baseParams, content: longContent })

      const userMessage = vi.mocked(chatCompletion).mock.calls[0]?.[0]?.[1]?.content as string
      expect(userMessage).toContain('[Content truncated due to length]')
    })

    it('should mark document as FAILED on error', async () => {
      vi.mocked(isLLMAvailable).mockReturnValue(true)
      vi.mocked(chatCompletion).mockRejectedValue(new Error('API timeout'))

      const result = await analyzeDocument(baseParams)

      expect(result).toBeNull()
      expect(updateDocumentAnalysis).toHaveBeenCalledWith('doc_123', 'op_123', {
        status: DocumentAnalysisStatus.FAILED,
      })
    })

    it('should include document type hint when provided', async () => {
      vi.mocked(isLLMAvailable).mockReturnValue(true)
      vi.mocked(chatCompletion).mockResolvedValue({ content: validAnalysisJson } as never)

      await analyzeDocument({ ...baseParams, documentType: 'NDA' })

      const userMessage = vi.mocked(chatCompletion).mock.calls[0]?.[0]?.[1]?.content as string
      expect(userMessage).toContain('Document Type Hint: NDA')
    })
  })

  describe('getAnalysisStatus', () => {
    it('should return null when document not found', async () => {
      vi.mocked(getDocument).mockResolvedValue(null)

      const result = await getAnalysisStatus('doc_123', 'op_123')

      expect(result).toBeNull()
    })

    it('should return analysis status and results', async () => {
      vi.mocked(getDocument).mockResolvedValue({
        analysisStatus: DocumentAnalysisStatus.COMPLETED,
        analysis: { documentType: 'Contract' },
        analyzedAt: new Date('2025-01-15'),
      } as never)

      const result = await getAnalysisStatus('doc_123', 'op_123')

      expect(result).toEqual({
        status: DocumentAnalysisStatus.COMPLETED,
        analysis: { documentType: 'Contract' },
        analyzedAt: expect.any(Date),
      })
    })
  })
})
