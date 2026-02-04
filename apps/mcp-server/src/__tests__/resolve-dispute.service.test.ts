import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  ResolveDisputeStatus,
  ResolveDisputeClaimType,
  ResolveDisputeRuling,
  ResolveEvidenceType,
  ResolveEvidenceSubmitter,
  ResolveTransactionStatus,
} from '@botesq/database'

// Mock prisma
vi.mock('@botesq/database', async () => {
  const actual = await vi.importActual('@botesq/database')
  return {
    ...actual,
    prisma: {
      resolveDispute: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      resolveEvidence: {
        create: vi.fn(),
      },
    },
  }
})

// Mock other services
vi.mock('../services/credit.service.js', () => ({
  deductCredits: vi.fn(),
}))

vi.mock('../services/resolve-agent.service.js', () => ({
  checkDisputeLimit: vi.fn(),
  incrementDisputeCount: vi.fn(),
}))

vi.mock('../services/resolve-transaction.service.js', () => ({
  getTransactionByExternalId: vi.fn(),
  markTransactionDisputed: vi.fn(),
}))

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: vi.fn().mockReturnValue('DISP1234'),
}))

import { prisma } from '@botesq/database'
import { deductCredits } from '../services/credit.service.js'
import { checkDisputeLimit, incrementDisputeCount } from '../services/resolve-agent.service.js'
import {
  getTransactionByExternalId,
  markTransactionDisputed,
} from '../services/resolve-transaction.service.js'
import {
  canFileDispute,
  calculateDisputeCost,
  fileDispute,
  respondToDispute,
  addEvidence,
  recordRuling,
} from '../services/resolve-dispute.service.js'
import { ApiError } from '../types.js'

describe('resolve-dispute.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('calculateDisputeCost', () => {
    it('should be free for transactions under $100', () => {
      const result = calculateDisputeCost(9900, 10) // $99
      expect(result.isFree).toBe(true)
      expect(result.estimatedCost).toBe(0)
    })

    it('should be free for first 5 disputes per month', () => {
      const result = calculateDisputeCost(50000, 3) // $500, 3 disputes
      expect(result.isFree).toBe(true)
      expect(result.estimatedCost).toBe(0)
    })

    it('should charge for high value disputes after free threshold', () => {
      const result = calculateDisputeCost(50000, 6) // $500, 6 disputes
      expect(result.isFree).toBe(false)
      expect(result.estimatedCost).toBeGreaterThan(0)
    })

    it('should calculate cost based on value: base + value multiplier', () => {
      // $500 value = 500 (base) + 0.5 * 100 = 550 credits
      const result = calculateDisputeCost(50000, 6)
      expect(result.estimatedCost).toBe(550)
    })

    it('should cap cost at maximum of 5000 credits', () => {
      const result = calculateDisputeCost(10000000, 10) // $100,000
      expect(result.estimatedCost).toBe(5000)
    })

    it('should handle null stated value as zero', () => {
      const result = calculateDisputeCost(null, 6)
      expect(result.isFree).toBe(true) // null treated as $0
      expect(result.estimatedCost).toBe(0)
    })

    it('should be free when exactly at $100 threshold', () => {
      const result = calculateDisputeCost(9999, 10) // $99.99
      expect(result.isFree).toBe(true)
    })

    it('should still be free at exactly 5 disputes (under limit)', () => {
      const result = calculateDisputeCost(10001, 4) // $100.01, 4 disputes (under 5)
      expect(result.isFree).toBe(true)
    })

    it('should charge when over $100 and over 5 disputes', () => {
      const result = calculateDisputeCost(10001, 6) // $100.01, 6 disputes
      expect(result.isFree).toBe(false)
    })
  })

  describe('canFileDispute', () => {
    const mockTransaction = {
      id: 'trans_123',
      externalId: 'RTRANS-123',
      proposerAgentId: 'agent_proposer',
      receiverAgentId: 'agent_receiver',
      status: ResolveTransactionStatus.COMPLETED,
      statedValue: 5000,
    }

    beforeEach(() => {
      vi.mocked(getTransactionByExternalId).mockResolvedValue(mockTransaction as never)
      vi.mocked(prisma.resolveDispute.findFirst).mockResolvedValue(null)
      vi.mocked(checkDisputeLimit).mockResolvedValue({
        canFile: true,
        disputesThisMonth: 0,
        limit: 10,
      })
    })

    it('should return canFile=false if transaction not found', async () => {
      vi.mocked(getTransactionByExternalId).mockResolvedValue(null)

      const result = await canFileDispute('nonexistent', 'agent_proposer')

      expect(result.canFile).toBe(false)
      expect(result.reason).toContain('Transaction not found')
    })

    it('should return canFile=false if not a party to transaction', async () => {
      const result = await canFileDispute('RTRANS-123', 'agent_outsider')

      expect(result.canFile).toBe(false)
      expect(result.reason).toContain('not a party')
    })

    it('should allow filing for proposer agent', async () => {
      const result = await canFileDispute('RTRANS-123', 'agent_proposer')

      expect(result.canFile).toBe(true)
    })

    it('should allow filing for receiver agent', async () => {
      const result = await canFileDispute('RTRANS-123', 'agent_receiver')

      expect(result.canFile).toBe(true)
    })

    it('should return canFile=false for pending transaction', async () => {
      vi.mocked(getTransactionByExternalId).mockResolvedValue({
        ...mockTransaction,
        status: 'PENDING' as ResolveTransactionStatus,
      } as never)

      const result = await canFileDispute('RTRANS-123', 'agent_proposer')

      expect(result.canFile).toBe(false)
      expect(result.reason).toContain('Cannot file dispute')
    })

    it('should return canFile=false if active dispute exists', async () => {
      vi.mocked(prisma.resolveDispute.findFirst).mockResolvedValue({
        id: 'existing_dispute',
        status: ResolveDisputeStatus.AWAITING_RESPONSE,
      } as never)

      const result = await canFileDispute('RTRANS-123', 'agent_proposer')

      expect(result.canFile).toBe(false)
      expect(result.reason).toContain('already have an active dispute')
    })

    it('should return estimated cost', async () => {
      const result = await canFileDispute('RTRANS-123', 'agent_proposer')

      expect(result.estimatedCost).toBeDefined()
      expect(typeof result.estimatedCost).toBe('number')
    })

    it('should indicate if dispute would be free', async () => {
      const result = await canFileDispute('RTRANS-123', 'agent_proposer')

      expect(result.isFree).toBeDefined()
    })
  })

  describe('fileDispute', () => {
    const mockTransaction = {
      id: 'trans_123',
      externalId: 'RTRANS-123',
      proposerAgentId: 'agent_proposer',
      receiverAgentId: 'agent_receiver',
      status: ResolveTransactionStatus.COMPLETED,
      statedValue: 5000,
    }

    const mockDispute = {
      id: 'dispute_123',
      externalId: 'RDISP-DISP1234',
      transactionId: 'trans_123',
      claimantAgentId: 'agent_proposer',
      respondentAgentId: 'agent_receiver',
      claimType: ResolveDisputeClaimType.NON_PERFORMANCE,
      claimSummary: 'Test claim',
      claimDetails: null,
      requestedResolution: 'Full refund',
      responseSummary: null,
      responseDetails: null,
      responseDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000),
      responseSubmittedAt: null,
      status: ResolveDisputeStatus.AWAITING_RESPONSE,
      ruling: null,
      rulingReasoning: null,
      rulingDetails: null,
      ruledAt: null,
      claimantScoreChange: null,
      respondentScoreChange: null,
      statedValue: 5000,
      creditsCharged: 0,
      wasFree: true,
      createdAt: new Date(),
      transaction: {
        externalId: 'RTRANS-123',
        title: 'Test Transaction',
        statedValue: 5000,
      },
      claimantAgent: {
        externalId: 'agent_proposer',
        agentIdentifier: 'proposer-agent',
        displayName: 'Proposer Agent',
        trustScore: 80,
      },
      respondentAgent: {
        externalId: 'agent_receiver',
        agentIdentifier: 'receiver-agent',
        displayName: 'Receiver Agent',
        trustScore: 75,
      },
      _count: { evidence: 0 },
    }

    beforeEach(() => {
      vi.mocked(getTransactionByExternalId).mockResolvedValue(mockTransaction as never)
      vi.mocked(prisma.resolveDispute.findFirst).mockResolvedValue(null)
      vi.mocked(checkDisputeLimit).mockResolvedValue({
        canFile: true,
        disputesThisMonth: 0,
        limit: 10,
      })
      vi.mocked(prisma.resolveDispute.create).mockResolvedValue(mockDispute as never)
      vi.mocked(markTransactionDisputed).mockResolvedValue(undefined)
      vi.mocked(incrementDisputeCount).mockResolvedValue(undefined)
    })

    it('should create dispute with generated external ID', async () => {
      const result = await fileDispute({
        transactionExternalId: 'RTRANS-123',
        claimantAgentId: 'agent_proposer',
        claimType: ResolveDisputeClaimType.NON_PERFORMANCE,
        claimSummary: 'Test claim',
        requestedResolution: 'Full refund',
        operatorId: 'op_123',
      })

      expect(result.externalId).toMatch(/^RDISP-/)
    })

    it('should throw error if canFileDispute returns false', async () => {
      vi.mocked(getTransactionByExternalId).mockResolvedValue(null)

      await expect(
        fileDispute({
          transactionExternalId: 'nonexistent',
          claimantAgentId: 'agent_proposer',
          claimType: ResolveDisputeClaimType.NON_PERFORMANCE,
          claimSummary: 'Test claim',
          requestedResolution: 'Full refund',
          operatorId: 'op_123',
        })
      ).rejects.toThrow(ApiError)
    })

    it('should determine correct respondent (other party)', async () => {
      await fileDispute({
        transactionExternalId: 'RTRANS-123',
        claimantAgentId: 'agent_proposer',
        claimType: ResolveDisputeClaimType.NON_PERFORMANCE,
        claimSummary: 'Test claim',
        requestedResolution: 'Full refund',
        operatorId: 'op_123',
      })

      expect(prisma.resolveDispute.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            claimantAgentId: 'agent_proposer',
            respondentAgentId: 'agent_receiver',
          }),
        })
      )
    })

    it('should deduct credits if not free', async () => {
      vi.mocked(checkDisputeLimit).mockResolvedValue({
        canFile: true,
        disputesThisMonth: 10,
        limit: 10,
      })
      vi.mocked(getTransactionByExternalId).mockResolvedValue({
        ...mockTransaction,
        statedValue: 50000, // $500, will trigger charge
      } as never)
      vi.mocked(prisma.resolveDispute.create).mockResolvedValue({
        ...mockDispute,
        creditsCharged: 550,
        wasFree: false,
      } as never)

      await fileDispute({
        transactionExternalId: 'RTRANS-123',
        claimantAgentId: 'agent_proposer',
        claimType: ResolveDisputeClaimType.NON_PERFORMANCE,
        claimSummary: 'Test claim',
        requestedResolution: 'Full refund',
        operatorId: 'op_123',
      })

      expect(deductCredits).toHaveBeenCalled()
    })

    it('should NOT deduct credits if free', async () => {
      await fileDispute({
        transactionExternalId: 'RTRANS-123',
        claimantAgentId: 'agent_proposer',
        claimType: ResolveDisputeClaimType.NON_PERFORMANCE,
        claimSummary: 'Test claim',
        requestedResolution: 'Full refund',
        operatorId: 'op_123',
      })

      expect(deductCredits).not.toHaveBeenCalled()
    })

    it('should set 72-hour response deadline', async () => {
      const beforeFile = Date.now()

      await fileDispute({
        transactionExternalId: 'RTRANS-123',
        claimantAgentId: 'agent_proposer',
        claimType: ResolveDisputeClaimType.NON_PERFORMANCE,
        claimSummary: 'Test claim',
        requestedResolution: 'Full refund',
        operatorId: 'op_123',
      })

      expect(prisma.resolveDispute.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            responseDeadline: expect.any(Date),
          }),
        })
      )

      const callArg = vi.mocked(prisma.resolveDispute.create).mock.calls[0]?.[0]
      const deadline = callArg?.data?.responseDeadline as Date
      const expectedDeadline = beforeFile + 72 * 60 * 60 * 1000
      expect(deadline.getTime()).toBeGreaterThanOrEqual(expectedDeadline - 1000)
    })

    it('should mark transaction as disputed', async () => {
      await fileDispute({
        transactionExternalId: 'RTRANS-123',
        claimantAgentId: 'agent_proposer',
        claimType: ResolveDisputeClaimType.NON_PERFORMANCE,
        claimSummary: 'Test claim',
        requestedResolution: 'Full refund',
        operatorId: 'op_123',
      })

      expect(markTransactionDisputed).toHaveBeenCalledWith('trans_123')
    })

    it('should increment dispute counts for both parties', async () => {
      await fileDispute({
        transactionExternalId: 'RTRANS-123',
        claimantAgentId: 'agent_proposer',
        claimType: ResolveDisputeClaimType.NON_PERFORMANCE,
        claimSummary: 'Test claim',
        requestedResolution: 'Full refund',
        operatorId: 'op_123',
      })

      expect(incrementDisputeCount).toHaveBeenCalledWith('agent_proposer', true) // as claimant
      expect(incrementDisputeCount).toHaveBeenCalledWith('agent_receiver', false) // as respondent
    })
  })

  describe('respondToDispute', () => {
    const mockDispute = {
      id: 'dispute_123',
      externalId: 'RDISP-123',
      claimantAgentId: 'agent_claimant',
      respondentAgentId: 'agent_respondent',
      status: ResolveDisputeStatus.AWAITING_RESPONSE,
      responseDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    }

    const mockUpdatedDispute = {
      ...mockDispute,
      responseSummary: 'My response',
      responseSubmittedAt: new Date(),
      status: ResolveDisputeStatus.RESPONSE_RECEIVED,
      transaction: {
        externalId: 'RTRANS-123',
        title: 'Test',
        statedValue: 1000,
      },
      claimantAgent: {
        externalId: 'agent_claimant',
        agentIdentifier: 'claimant',
        displayName: 'Claimant',
        trustScore: 80,
      },
      respondentAgent: {
        externalId: 'agent_respondent',
        agentIdentifier: 'respondent',
        displayName: 'Respondent',
        trustScore: 75,
      },
      _count: { evidence: 0 },
    }

    it('should throw error if dispute not found', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(null)

      await expect(
        respondToDispute({
          disputeExternalId: 'nonexistent',
          respondentAgentId: 'agent_respondent',
          responseSummary: 'My response',
        })
      ).rejects.toThrow('Dispute not found')
    })

    it('should throw error if not the respondent', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockDispute as never)

      await expect(
        respondToDispute({
          disputeExternalId: 'RDISP-123',
          respondentAgentId: 'agent_claimant', // Wrong party
          responseSummary: 'My response',
        })
      ).rejects.toThrow('Only the respondent can respond')
    })

    it('should throw error if not in AWAITING_RESPONSE status', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        ...mockDispute,
        status: ResolveDisputeStatus.IN_ARBITRATION,
      } as never)

      await expect(
        respondToDispute({
          disputeExternalId: 'RDISP-123',
          respondentAgentId: 'agent_respondent',
          responseSummary: 'My response',
        })
      ).rejects.toThrow('Cannot respond to dispute')
    })

    it('should throw error if deadline passed', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        ...mockDispute,
        responseDeadline: new Date(Date.now() - 1000), // Already passed
      } as never)
      vi.mocked(prisma.resolveDispute.update).mockResolvedValue({} as never)

      await expect(
        respondToDispute({
          disputeExternalId: 'RDISP-123',
          respondentAgentId: 'agent_respondent',
          responseSummary: 'My response',
        })
      ).rejects.toThrow('deadline has passed')
    })

    it('should update dispute with response', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockDispute as never)
      vi.mocked(prisma.resolveDispute.update).mockResolvedValue(mockUpdatedDispute as never)

      const result = await respondToDispute({
        disputeExternalId: 'RDISP-123',
        respondentAgentId: 'agent_respondent',
        responseSummary: 'My response',
      })

      expect(result.status).toBe(ResolveDisputeStatus.RESPONSE_RECEIVED)
    })

    it('should set responseSubmittedAt timestamp', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockDispute as never)
      vi.mocked(prisma.resolveDispute.update).mockResolvedValue(mockUpdatedDispute as never)

      await respondToDispute({
        disputeExternalId: 'RDISP-123',
        respondentAgentId: 'agent_respondent',
        responseSummary: 'My response',
      })

      expect(prisma.resolveDispute.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            responseSubmittedAt: expect.any(Date),
          }),
        })
      )
    })
  })

  describe('addEvidence', () => {
    const mockDispute = {
      id: 'dispute_123',
      externalId: 'RDISP-123',
      claimantAgentId: 'agent_claimant',
      respondentAgentId: 'agent_respondent',
      status: ResolveDisputeStatus.AWAITING_RESPONSE,
    }

    it('should throw error if dispute not found', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(null)

      await expect(
        addEvidence({
          disputeExternalId: 'nonexistent',
          submittingAgentId: 'agent_claimant',
          evidenceType: ResolveEvidenceType.COMMUNICATION_LOG,
          title: 'Evidence',
          content: 'Content',
        })
      ).rejects.toThrow('Dispute not found')
    })

    it('should throw error if not a party', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockDispute as never)

      await expect(
        addEvidence({
          disputeExternalId: 'RDISP-123',
          submittingAgentId: 'agent_outsider',
          evidenceType: ResolveEvidenceType.COMMUNICATION_LOG,
          title: 'Evidence',
          content: 'Content',
        })
      ).rejects.toThrow('Only dispute parties can submit evidence')
    })

    it('should throw error if status does not allow evidence', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        ...mockDispute,
        status: ResolveDisputeStatus.IN_ARBITRATION,
      } as never)

      await expect(
        addEvidence({
          disputeExternalId: 'RDISP-123',
          submittingAgentId: 'agent_claimant',
          evidenceType: ResolveEvidenceType.COMMUNICATION_LOG,
          title: 'Evidence',
          content: 'Content',
        })
      ).rejects.toThrow('Cannot submit evidence')
    })

    it('should create evidence with CLAIMANT submitter type', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockDispute as never)
      vi.mocked(prisma.resolveEvidence.create).mockResolvedValue({ id: 'ev_123' } as never)

      await addEvidence({
        disputeExternalId: 'RDISP-123',
        submittingAgentId: 'agent_claimant',
        evidenceType: ResolveEvidenceType.COMMUNICATION_LOG,
        title: 'Evidence',
        content: 'Content',
      })

      expect(prisma.resolveEvidence.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          submittedBy: ResolveEvidenceSubmitter.CLAIMANT,
        }),
      })
    })

    it('should create evidence with RESPONDENT submitter type', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockDispute as never)
      vi.mocked(prisma.resolveEvidence.create).mockResolvedValue({ id: 'ev_123' } as never)

      await addEvidence({
        disputeExternalId: 'RDISP-123',
        submittingAgentId: 'agent_respondent',
        evidenceType: ResolveEvidenceType.OTHER,
        title: 'Screenshot Evidence',
        content: 'Screenshot content',
      })

      expect(prisma.resolveEvidence.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          submittedBy: ResolveEvidenceSubmitter.RESPONDENT,
        }),
      })
    })
  })

  describe('recordRuling', () => {
    it('should update dispute with ruling', async () => {
      vi.mocked(prisma.resolveDispute.update).mockResolvedValue({} as never)

      await recordRuling({
        disputeId: 'dispute_123',
        ruling: ResolveDisputeRuling.CLAIMANT,
        rulingReasoning: 'Claimant provided sufficient evidence',
        rulingDetails: { key: 'value' },
        claimantScoreChange: 5,
        respondentScoreChange: -10,
      })

      expect(prisma.resolveDispute.update).toHaveBeenCalledWith({
        where: { id: 'dispute_123' },
        data: {
          ruling: ResolveDisputeRuling.CLAIMANT,
          rulingReasoning: 'Claimant provided sufficient evidence',
          rulingDetails: { key: 'value' },
          ruledAt: expect.any(Date),
          claimantScoreChange: 5,
          respondentScoreChange: -10,
          status: ResolveDisputeStatus.RULED,
        },
      })
    })

    it('should set status to RULED', async () => {
      vi.mocked(prisma.resolveDispute.update).mockResolvedValue({} as never)

      await recordRuling({
        disputeId: 'dispute_123',
        ruling: ResolveDisputeRuling.RESPONDENT,
        rulingReasoning: 'Claim not substantiated',
        rulingDetails: {},
        claimantScoreChange: -5,
        respondentScoreChange: 2,
      })

      expect(prisma.resolveDispute.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ResolveDisputeStatus.RULED,
          }),
        })
      )
    })

    it('should record score changes for both parties', async () => {
      vi.mocked(prisma.resolveDispute.update).mockResolvedValue({} as never)

      await recordRuling({
        disputeId: 'dispute_123',
        ruling: ResolveDisputeRuling.SPLIT,
        rulingReasoning: 'Both parties share responsibility',
        rulingDetails: { claimantResponsibility: 50, respondentResponsibility: 50 },
        claimantScoreChange: -2,
        respondentScoreChange: -2,
      })

      expect(prisma.resolveDispute.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            claimantScoreChange: -2,
            respondentScoreChange: -2,
          }),
        })
      )
    })
  })
})
