import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ArbitrationInput } from '../services/resolve-arbitration.service'

// Mock pg before importing the provider
const mockQuery = vi.fn()
const mockRelease = vi.fn()
const mockConnect = vi.fn().mockResolvedValue({ query: mockQuery, release: mockRelease })
const mockEnd = vi.fn().mockResolvedValue(undefined)
const mockOn = vi.fn()

vi.mock('pg', () => {
  return {
    default: {
      Pool: vi.fn().mockImplementation(() => ({
        connect: mockConnect,
        end: mockEnd,
        on: mockOn,
      })),
    },
  }
})

// Import after mocks are set up
const { DatabasePrecedentProvider } = await import('../services/database-precedent-provider')

const baseConfig = {
  connectionString: 'postgresql://user:pass@localhost:5432/precedent_db',
  name: 'Test Precedent DB',
}

const sampleInput: ArbitrationInput = {
  disputeId: 'dispute_001',
  transactionTitle: 'API Integration Service',
  transactionDescription: 'Build REST API integration',
  transactionTerms: { deliveryDays: 7 },
  claimType: 'NON_DELIVERY' as ArbitrationInput['claimType'],
  claimSummary: 'Service was never delivered',
  claimDetails: 'Agent failed to deliver API integration within agreed timeframe',
  requestedResolution: 'Full refund',
  responseSummary: null,
  responseDetails: null,
  claimantTrustScore: 80,
  respondentTrustScore: 60,
  evidence: [],
}

describe('DatabasePrecedentProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConnect.mockResolvedValue({ query: mockQuery, release: mockRelease })
  })

  describe('constructor', () => {
    it('should create provider with required config', () => {
      const provider = new DatabasePrecedentProvider(baseConfig)
      expect(provider.name).toBe('Test Precedent DB')
    })

    it('should reject invalid table names', () => {
      expect(
        () =>
          new DatabasePrecedentProvider({
            ...baseConfig,
            tableName: 'DROP TABLE; --',
          })
      ).toThrow('Invalid table name')
    })

    it('should accept valid custom table names', () => {
      const provider = new DatabasePrecedentProvider({
        ...baseConfig,
        tableName: 'custom_precedent_cases',
      })
      expect(provider.name).toBe('Test Precedent DB')
    })
  })

  describe('isAvailable', () => {
    it('should return true when database is reachable', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
      const provider = new DatabasePrecedentProvider(baseConfig)

      const result = await provider.isAvailable()

      expect(result).toBe(true)
      expect(mockConnect).toHaveBeenCalled()
      expect(mockRelease).toHaveBeenCalled()
    })

    it('should return false when database is unreachable', async () => {
      mockConnect.mockRejectedValueOnce(new Error('Connection refused'))
      const provider = new DatabasePrecedentProvider(baseConfig)

      const result = await provider.isAvailable()

      expect(result).toBe(false)
    })
  })

  describe('findRelevantPrecedent', () => {
    it('should return matching precedent cases', async () => {
      // Mock corpus count
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '1500' }] })
      // Mock precedent query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'CASE-2024-001',
            claim_type: 'NON_DELIVERY',
            summary: 'Agent failed to deliver contracted service',
            ruling: 'CLAIMANT',
            reasoning: 'Clear breach of delivery terms',
            key_factors: ['Missed deadline', 'No partial delivery'],
            metadata: { date: '2024-06-15', amount: '$2,500' },
          },
          {
            id: 'CASE-2024-002',
            claim_type: 'NON_DELIVERY',
            summary: 'Incomplete API integration delivered',
            ruling: 'SPLIT',
            reasoning: 'Partial delivery warranted partial payment',
            key_factors: ['Partial delivery', 'Scope ambiguity'],
            metadata: null,
          },
        ],
      })

      const provider = new DatabasePrecedentProvider(baseConfig)
      const result = await provider.findRelevantPrecedent(sampleInput, 5)

      expect(result.source).toBe('Test Precedent DB')
      expect(result.corpusSize).toBe(1500)
      expect(result.cases).toHaveLength(2)

      expect(result.cases[0].caseId).toBe('CASE-2024-001')
      expect(result.cases[0].relevanceScore).toBe(0.9) // exact claim_type match
      expect(result.cases[0].metadata).toEqual({ date: '2024-06-15', amount: '$2,500' })

      expect(result.cases[1].caseId).toBe('CASE-2024-002')
      expect(result.cases[1].relevanceScore).toBe(0.9)
      expect(result.cases[1].metadata).toBeUndefined() // null -> undefined
    })

    it('should assign lower relevance to non-matching claim types', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '500' }] })
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'CASE-2024-010',
            claim_type: 'PAYMENT_DISPUTE', // different from input's NON_DELIVERY
            summary: 'Payment withheld after delivery',
            ruling: 'RESPONDENT',
            reasoning: 'Payment terms were met',
            key_factors: ['Terms fulfilled'],
            metadata: null,
          },
        ],
      })

      const provider = new DatabasePrecedentProvider(baseConfig)
      const result = await provider.findRelevantPrecedent(sampleInput)

      expect(result.cases[0].relevanceScore).toBe(0.5) // non-matching type
    })

    it('should return empty cases when no matches found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] })
      mockQuery.mockResolvedValueOnce({ rows: [] })

      const provider = new DatabasePrecedentProvider(baseConfig)
      const result = await provider.findRelevantPrecedent(sampleInput)

      expect(result.cases).toEqual([])
      expect(result.corpusSize).toBe(0)
    })

    it('should pass maxResults to the query limit', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '100' }] })
      mockQuery.mockResolvedValueOnce({ rows: [] })

      const provider = new DatabasePrecedentProvider(baseConfig)
      await provider.findRelevantPrecedent(sampleInput, 3)

      // Second call is the precedent query — check the values parameter
      const precedentCall = mockQuery.mock.calls[1][0]
      expect(precedentCall.values).toContain(3)
    })

    it('should release the client even on query error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query failed'))

      const provider = new DatabasePrecedentProvider(baseConfig)
      await expect(provider.findRelevantPrecedent(sampleInput)).rejects.toThrow('Query failed')

      expect(mockRelease).toHaveBeenCalled()
    })
  })

  describe('disconnect', () => {
    it('should close the connection pool', async () => {
      const provider = new DatabasePrecedentProvider(baseConfig)
      await provider.disconnect()

      expect(mockEnd).toHaveBeenCalled()
    })
  })
})
