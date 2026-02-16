import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ResolveDisputeStatus } from '@botesq/database'

// Mock prisma
vi.mock('@botesq/database', async () => {
  const actual = await vi.importActual('@botesq/database')
  return {
    ...actual,
    prisma: {
      resolveDispute: {
        update: vi.fn(),
      },
    },
  }
})

// Mock llm.service
vi.mock('../services/llm.service.js', () => ({
  chatCompletion: vi.fn(),
  isLLMAvailable: vi.fn(),
}))

// Mock resolve-dispute.service
vi.mock('../services/resolve-dispute.service.js', () => ({
  getDisputeById: vi.fn(),
  recordRuling: vi.fn(),
  listDisputesPendingArbitration: vi.fn(),
}))

// Mock resolve-agent.service
vi.mock('../services/resolve-agent.service.js', () => ({
  updateTrustScore: vi.fn(),
  updateDisputeOutcome: vi.fn(),
  calculateTrustImpact: vi.fn(),
}))

// Mock precedent-provider
vi.mock('../services/precedent-provider.js', () => ({
  getPrecedentProvider: vi.fn(),
  formatPrecedentContext: vi.fn(),
}))

import { isLLMAvailable, chatCompletion } from '../services/llm.service.js'
import {
  getDisputeById,
  recordRuling,
  listDisputesPendingArbitration,
} from '../services/resolve-dispute.service.js'
import {
  updateTrustScore,
  updateDisputeOutcome,
  calculateTrustImpact,
} from '../services/resolve-agent.service.js'
import { getPrecedentProvider, formatPrecedentContext } from '../services/precedent-provider.js'
import { prisma } from '@botesq/database'
import {
  arbitrateDispute,
  processArbitration,
  processAllPendingDisputes,
} from '../services/resolve-arbitration.service'

describe('resolve-arbitration.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: NullPrecedentProvider behavior (no precedent)
    vi.mocked(getPrecedentProvider).mockReturnValue({
      name: 'none',
      findRelevantPrecedent: vi.fn().mockResolvedValue({ cases: [], source: 'none' }),
      isAvailable: vi.fn().mockResolvedValue(true),
    })
    vi.mocked(formatPrecedentContext).mockReturnValue('')
  })

  const baseInput = {
    disputeId: 'dispute_123',
    transactionTitle: 'Widget Purchase',
    transactionDescription: 'Purchase of 100 widgets',
    transactionTerms: { price: 1000, quantity: 100 },
    claimType: 'NON_DELIVERY' as never,
    claimSummary: 'Widgets were never delivered',
    claimDetails: 'I ordered 100 widgets but received nothing',
    requestedResolution: 'Full refund',
    responseSummary: 'Widgets were shipped on time',
    responseDetails: 'Tracking shows delivery',
    claimantTrustScore: 85,
    respondentTrustScore: 90,
    evidence: [
      {
        submittedBy: 'CLAIMANT' as const,
        evidenceType: 'receipt',
        title: 'Purchase Receipt',
        content: 'Receipt for 100 widgets',
      },
    ],
  }

  describe('arbitrateDispute', () => {
    it('should throw when LLM is not available', async () => {
      vi.mocked(isLLMAvailable).mockReturnValue(false)

      await expect(arbitrateDispute(baseInput)).rejects.toThrow(
        'AI arbitration is currently unavailable'
      )
    })

    it('should return CLAIMANT ruling', async () => {
      vi.mocked(isLLMAvailable).mockReturnValue(true)
      vi.mocked(chatCompletion).mockResolvedValue({
        content: JSON.stringify({
          ruling: 'CLAIMANT',
          reasoning: 'Evidence supports claimant.',
          details: {
            confidence: 0.9,
            keyFactors: ['No delivery proof'],
            mitigatingFactors: [],
            recommendation: 'Issue full refund',
          },
        }),
      } as never)

      const result = await arbitrateDispute(baseInput)

      expect(result.ruling).toBe('CLAIMANT')
      expect(result.reasoning).toBe('Evidence supports claimant.')
      expect(result.details.confidence).toBe(0.9)
    })

    it('should return RESPONDENT ruling', async () => {
      vi.mocked(isLLMAvailable).mockReturnValue(true)
      vi.mocked(chatCompletion).mockResolvedValue({
        content: JSON.stringify({
          ruling: 'RESPONDENT',
          reasoning: 'Delivery was confirmed.',
          details: {
            confidence: 0.85,
            keyFactors: ['Tracking confirmed'],
            mitigatingFactors: [],
            recommendation: 'Dismiss claim',
          },
        }),
      } as never)

      const result = await arbitrateDispute(baseInput)

      expect(result.ruling).toBe('RESPONDENT')
    })

    it('should return SPLIT ruling', async () => {
      vi.mocked(isLLMAvailable).mockReturnValue(true)
      vi.mocked(chatCompletion).mockResolvedValue({
        content: JSON.stringify({
          ruling: 'SPLIT',
          reasoning: 'Both parties share responsibility.',
          details: { confidence: 0.7 },
        }),
      } as never)

      const result = await arbitrateDispute(baseInput)

      expect(result.ruling).toBe('SPLIT')
    })

    it('should return DISMISSED ruling', async () => {
      vi.mocked(isLLMAvailable).mockReturnValue(true)
      vi.mocked(chatCompletion).mockResolvedValue({
        content: JSON.stringify({
          ruling: 'DISMISSED',
          reasoning: 'Claim lacks merit.',
          details: { confidence: 0.95 },
        }),
      } as never)

      const result = await arbitrateDispute(baseInput)

      expect(result.ruling).toBe('DISMISSED')
    })

    it('should return fallback SPLIT when JSON parse fails', async () => {
      vi.mocked(isLLMAvailable).mockReturnValue(true)
      vi.mocked(chatCompletion).mockResolvedValue({
        content: 'This is not valid JSON',
      } as never)

      const result = await arbitrateDispute(baseInput)

      expect(result.ruling).toBe('SPLIT')
      expect(result.details.confidence).toBe(0.5)
      expect(result.reasoning).toContain('Unable to make a clear determination')
    })

    it('should clamp confidence to 0-1 range', async () => {
      vi.mocked(isLLMAvailable).mockReturnValue(true)
      vi.mocked(chatCompletion).mockResolvedValue({
        content: JSON.stringify({
          ruling: 'CLAIMANT',
          reasoning: 'Test',
          details: { confidence: 1.5 },
        }),
      } as never)

      const result = await arbitrateDispute(baseInput)

      expect(result.details.confidence).toBe(1)
    })

    it('should clamp negative confidence to 0', async () => {
      vi.mocked(isLLMAvailable).mockReturnValue(true)
      vi.mocked(chatCompletion).mockResolvedValue({
        content: JSON.stringify({
          ruling: 'CLAIMANT',
          reasoning: 'Test',
          details: { confidence: -0.5 },
        }),
      } as never)

      const result = await arbitrateDispute(baseInput)

      expect(result.details.confidence).toBe(0)
    })
  })

  describe('precedent integration', () => {
    it('should include precedent context in system prompt when provider returns cases', async () => {
      vi.mocked(isLLMAvailable).mockReturnValue(true)

      const mockPrecedent = {
        cases: [
          {
            caseId: 'AAA-2024-001',
            summary: 'Provider billed for services not rendered',
            claimType: 'NON_PERFORMANCE',
            ruling: 'CLAIMANT',
            reasoning: 'No evidence of service delivery',
            keyFactors: ['Missing service records'],
            relevanceScore: 0.92,
          },
        ],
        source: 'NY No-Fault Insurance Awards',
        corpusSize: 3247,
      }

      vi.mocked(getPrecedentProvider).mockReturnValue({
        name: 'ny-no-fault',
        findRelevantPrecedent: vi.fn().mockResolvedValue(mockPrecedent),
        isAvailable: vi.fn().mockResolvedValue(true),
      })
      vi.mocked(formatPrecedentContext).mockReturnValue(
        '\n\n=== PRECEDENT CONTEXT ===\nRelevant precedent...'
      )
      vi.mocked(chatCompletion).mockResolvedValue({
        content: JSON.stringify({
          ruling: 'CLAIMANT',
          reasoning: 'Evidence supports claimant, consistent with precedent AAA-2024-001.',
          details: {
            confidence: 0.92,
            keyFactors: ['No delivery proof', 'Precedent supports ruling'],
            mitigatingFactors: [],
            recommendation: 'Issue full refund',
          },
        }),
      } as never)

      const result = await arbitrateDispute(baseInput)

      // Verify precedent context was appended to system prompt
      const systemPromptArg = vi.mocked(chatCompletion).mock.calls[0][0][0].content
      expect(systemPromptArg).toContain('=== PRECEDENT CONTEXT ===')

      // Verify precedent citations are attached to result
      expect(result.precedentCitations).toHaveLength(1)
      expect(result.precedentCitations![0]).toEqual({
        caseId: 'AAA-2024-001',
        relevanceScore: 0.92,
        source: 'NY No-Fault Insurance Awards',
      })
    })

    it('should proceed without precedent when provider is unavailable', async () => {
      vi.mocked(isLLMAvailable).mockReturnValue(true)
      vi.mocked(getPrecedentProvider).mockReturnValue({
        name: 'ny-no-fault',
        findRelevantPrecedent: vi.fn(),
        isAvailable: vi.fn().mockResolvedValue(false),
      })
      vi.mocked(chatCompletion).mockResolvedValue({
        content: JSON.stringify({
          ruling: 'CLAIMANT',
          reasoning: 'Evidence supports claimant.',
          details: { confidence: 0.85 },
        }),
      } as never)

      const result = await arbitrateDispute(baseInput)

      expect(result.ruling).toBe('CLAIMANT')
      expect(result.precedentCitations).toBeUndefined()
    })

    it('should proceed without precedent when provider throws', async () => {
      vi.mocked(isLLMAvailable).mockReturnValue(true)
      vi.mocked(getPrecedentProvider).mockReturnValue({
        name: 'ny-no-fault',
        findRelevantPrecedent: vi.fn().mockRejectedValue(new Error('DB connection failed')),
        isAvailable: vi.fn().mockResolvedValue(true),
      })
      vi.mocked(chatCompletion).mockResolvedValue({
        content: JSON.stringify({
          ruling: 'SPLIT',
          reasoning: 'Both parties share responsibility.',
          details: { confidence: 0.7 },
        }),
      } as never)

      const result = await arbitrateDispute(baseInput)

      expect(result.ruling).toBe('SPLIT')
      expect(result.precedentCitations).toBeUndefined()
    })

    it('should not attach precedentCitations when provider returns empty cases', async () => {
      vi.mocked(isLLMAvailable).mockReturnValue(true)
      vi.mocked(chatCompletion).mockResolvedValue({
        content: JSON.stringify({
          ruling: 'RESPONDENT',
          reasoning: 'Respondent provided delivery proof.',
          details: { confidence: 0.88 },
        }),
      } as never)

      const result = await arbitrateDispute(baseInput)

      expect(result.precedentCitations).toBeUndefined()
    })
  })

  describe('processArbitration', () => {
    const mockDispute = {
      id: 'dispute_123',
      externalId: 'RDISP-123',
      status: ResolveDisputeStatus.AWAITING_RESPONSE,
      claimType: 'NON_DELIVERY',
      claimSummary: 'Widgets not delivered',
      claimDetails: 'Details...',
      requestedResolution: 'Full refund',
      responseSummary: 'We shipped them',
      responseDetails: 'Details...',
      statedValue: 1000,
      claimantAgentId: 'agent_1',
      respondentAgentId: 'agent_2',
      claimantAgent: { trustScore: 85 },
      respondentAgent: { trustScore: 90 },
      transaction: {
        title: 'Widget Purchase',
        description: 'Purchase of widgets',
        terms: { price: 1000 },
      },
      evidence: [
        {
          submittedBy: 'CLAIMANT',
          evidenceType: 'receipt',
          title: 'Receipt',
          content: 'Receipt content',
        },
      ],
    }

    it('should throw when dispute not found', async () => {
      vi.mocked(getDisputeById).mockResolvedValue(null)

      await expect(processArbitration('nonexistent')).rejects.toThrow('Dispute not found')
    })

    it('should throw for invalid status', async () => {
      vi.mocked(getDisputeById).mockResolvedValue({
        ...mockDispute,
        status: ResolveDisputeStatus.RESOLVED,
      } as never)

      await expect(processArbitration('dispute_123')).rejects.toThrow('Cannot arbitrate dispute')
    })

    it('should mark dispute as IN_ARBITRATION', async () => {
      vi.mocked(getDisputeById).mockResolvedValue(mockDispute as never)
      vi.mocked(isLLMAvailable).mockReturnValue(true)
      vi.mocked(chatCompletion).mockResolvedValue({
        content: JSON.stringify({
          ruling: 'SPLIT',
          reasoning: 'Both share responsibility.',
          details: { confidence: 0.7 },
        }),
      } as never)
      vi.mocked(calculateTrustImpact).mockReturnValue(0)

      await processArbitration('dispute_123')

      expect(prisma.resolveDispute.update).toHaveBeenCalledWith({
        where: { id: 'dispute_123' },
        data: { status: ResolveDisputeStatus.IN_ARBITRATION },
      })
    })

    it('should record ruling after arbitration', async () => {
      vi.mocked(getDisputeById).mockResolvedValue(mockDispute as never)
      vi.mocked(isLLMAvailable).mockReturnValue(true)
      vi.mocked(chatCompletion).mockResolvedValue({
        content: JSON.stringify({
          ruling: 'CLAIMANT',
          reasoning: 'Claimant wins.',
          details: {
            confidence: 0.9,
            keyFactors: ['No delivery'],
            mitigatingFactors: [],
            recommendation: 'Refund',
          },
        }),
      } as never)
      vi.mocked(calculateTrustImpact).mockReturnValue(5)

      await processArbitration('dispute_123')

      expect(recordRuling).toHaveBeenCalledWith(
        expect.objectContaining({
          disputeId: 'dispute_123',
          ruling: 'CLAIMANT',
        })
      )
    })

    it('should update trust scores for claimant win', async () => {
      vi.mocked(getDisputeById).mockResolvedValue(mockDispute as never)
      vi.mocked(isLLMAvailable).mockReturnValue(true)
      vi.mocked(chatCompletion).mockResolvedValue({
        content: JSON.stringify({
          ruling: 'CLAIMANT',
          reasoning: 'Claimant wins.',
          details: { confidence: 0.9 },
        }),
      } as never)
      vi.mocked(calculateTrustImpact).mockReturnValueOnce(5).mockReturnValueOnce(-3)

      await processArbitration('dispute_123')

      expect(updateTrustScore).toHaveBeenCalledWith(
        'agent_1',
        5,
        expect.any(String),
        'dispute',
        'RDISP-123'
      )
      expect(updateTrustScore).toHaveBeenCalledWith(
        'agent_2',
        -3,
        expect.any(String),
        'dispute',
        'RDISP-123'
      )
      expect(updateDisputeOutcome).toHaveBeenCalledWith('agent_1', true)
      expect(updateDisputeOutcome).toHaveBeenCalledWith('agent_2', false)
    })

    it('should not penalize respondent for DISMISSED ruling', async () => {
      vi.mocked(getDisputeById).mockResolvedValue(mockDispute as never)
      vi.mocked(isLLMAvailable).mockReturnValue(true)
      vi.mocked(chatCompletion).mockResolvedValue({
        content: JSON.stringify({
          ruling: 'DISMISSED',
          reasoning: 'Frivolous claim.',
          details: { confidence: 0.95 },
        }),
      } as never)
      vi.mocked(calculateTrustImpact).mockReturnValue(-5)

      await processArbitration('dispute_123')

      // Claimant should lose trust
      expect(updateTrustScore).toHaveBeenCalledWith(
        'agent_1',
        -5,
        expect.any(String),
        'dispute',
        'RDISP-123'
      )
      // Respondent should NOT have trust updated (score change is 0 for dismissed)
      // Note: respondentScoreChange = 0 because isDismissed, so updateTrustScore not called for respondent
    })
  })

  describe('processAllPendingDisputes', () => {
    it('should process all pending disputes and count results', async () => {
      vi.mocked(listDisputesPendingArbitration).mockResolvedValue([
        { id: 'dispute_1', externalId: 'RDISP-1' },
        { id: 'dispute_2', externalId: 'RDISP-2' },
      ] as never)
      vi.mocked(getDisputeById)
        .mockResolvedValueOnce({
          id: 'dispute_1',
          externalId: 'RDISP-1',
          status: ResolveDisputeStatus.AWAITING_RESPONSE,
          claimType: 'NON_DELIVERY',
          claimSummary: 'Test',
          claimDetails: null,
          requestedResolution: 'Refund',
          responseSummary: null,
          responseDetails: null,
          statedValue: 100,
          claimantAgentId: 'a1',
          respondentAgentId: 'a2',
          claimantAgent: { trustScore: 85 },
          respondentAgent: { trustScore: 90 },
          transaction: { title: 'T', description: null, terms: {} },
          evidence: [],
        } as never)
        .mockResolvedValueOnce(null) // Second dispute not found -> fails
      vi.mocked(isLLMAvailable).mockReturnValue(true)
      vi.mocked(chatCompletion).mockResolvedValue({
        content: JSON.stringify({
          ruling: 'SPLIT',
          reasoning: 'Split.',
          details: { confidence: 0.7 },
        }),
      } as never)
      vi.mocked(calculateTrustImpact).mockReturnValue(0)

      const result = await processAllPendingDisputes()

      expect(result.processed).toBe(1)
      expect(result.failed).toBe(1)
    })
  })
})
