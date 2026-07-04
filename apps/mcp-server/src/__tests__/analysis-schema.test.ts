import { describe, it, expect, vi } from 'vitest'

// document-analysis.service imports the LLM client transitively; stub the DB.
vi.mock('@botesq/database', () => ({
  prisma: {},
  DocumentAnalysisStatus: {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
  },
}))

import { analysisSchema } from '../services/document-analysis.service.js'

const complete = {
  documentType: 'NDA',
  summary: 'A mutual NDA.',
  parties: [{ name: 'Acme', role: 'Discloser' }],
  keyTerms: [{ term: 'Confidentiality', description: '5 years', importance: 'high' }],
  keyDates: [{ date: '2026-01-01', description: 'Effective' }],
  financialTerms: [{ item: 'Penalty', amount: '$10,000', frequency: null }],
  risks: [{ risk: 'Broad scope', severity: 'medium', recommendation: 'Narrow it' }],
  missingElements: [],
  recommendations: ['Sign it'],
  confidence: 'HIGH',
  confidenceScore: 92,
  attorneyReviewRecommended: false,
  attorneyReviewReason: null,
}

describe('analysisSchema coercion', () => {
  it('accepts a valid analysis with null optional fields (the regression case)', () => {
    const result = analysisSchema.safeParse(complete)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.attorneyReviewReason).toBeUndefined()
      expect(result.data.financialTerms).toHaveLength(1)
      expect(result.data.financialTerms[0]?.frequency).toBeUndefined()
    }
  })

  it('defaults missing array fields to [] so downstream .map() never crashes', () => {
    const result = analysisSchema.parse({ documentType: 'Contract', confidenceScore: 80 })
    expect(result.parties).toEqual([])
    expect(result.keyTerms).toEqual([])
    expect(result.risks).toEqual([])
    expect(result.recommendations).toEqual([])
    expect(result.confidence).toBe('LOW')
  })

  it('coerces a stringified confidenceScore', () => {
    const result = analysisSchema.parse({ ...complete, confidenceScore: '85' })
    expect(result.confidenceScore).toBe(85)
  })
})
