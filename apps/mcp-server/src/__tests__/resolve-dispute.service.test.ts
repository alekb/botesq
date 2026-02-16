import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  ResolveDisputeStatus,
  ResolveDisputeClaimType,
  ResolveDisputeRuling,
  ResolveEvidenceType,
  ResolveEvidenceSubmitter,
  ResolveTransactionStatus,
  ResolveEscalationStatus,
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
        count: vi.fn(),
      },
      resolveEvidence: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      resolveEscalation: {
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
  markSubmissionComplete,
  extendSubmissionDeadline,
  listDisputesPendingArbitration,
  recordRuling,
  acceptDecision,
  rejectDecision,
  getDecision,
  requestEscalation,
  getEscalationStatus,
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

  describe('addEvidence - submission complete blocking', () => {
    it('should throw error if claimant already marked submission complete', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        id: 'dispute_123',
        externalId: 'RDISP-123',
        claimantAgentId: 'agent_claimant',
        respondentAgentId: 'agent_respondent',
        status: ResolveDisputeStatus.RESPONSE_RECEIVED,
        claimantSubmissionComplete: true,
        respondentSubmissionComplete: false,
      } as never)

      await expect(
        addEvidence({
          disputeExternalId: 'RDISP-123',
          submittingAgentId: 'agent_claimant',
          evidenceType: ResolveEvidenceType.TEXT_STATEMENT,
          title: 'Late evidence',
          content: 'Should be blocked',
        })
      ).rejects.toThrow('already marked your submission as complete')
    })

    it('should throw error if respondent already marked submission complete', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        id: 'dispute_123',
        externalId: 'RDISP-123',
        claimantAgentId: 'agent_claimant',
        respondentAgentId: 'agent_respondent',
        status: ResolveDisputeStatus.RESPONSE_RECEIVED,
        claimantSubmissionComplete: false,
        respondentSubmissionComplete: true,
      } as never)

      await expect(
        addEvidence({
          disputeExternalId: 'RDISP-123',
          submittingAgentId: 'agent_respondent',
          evidenceType: ResolveEvidenceType.TEXT_STATEMENT,
          title: 'Late evidence',
          content: 'Should be blocked',
        })
      ).rejects.toThrow('already marked your submission as complete')
    })

    it('should still allow other party to submit if only one party marked complete', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        id: 'dispute_123',
        externalId: 'RDISP-123',
        claimantAgentId: 'agent_claimant',
        respondentAgentId: 'agent_respondent',
        status: ResolveDisputeStatus.RESPONSE_RECEIVED,
        claimantSubmissionComplete: true,
        respondentSubmissionComplete: false,
      } as never)
      vi.mocked(prisma.resolveEvidence.create).mockResolvedValue({ id: 'ev_123' } as never)

      const result = await addEvidence({
        disputeExternalId: 'RDISP-123',
        submittingAgentId: 'agent_respondent',
        evidenceType: ResolveEvidenceType.TEXT_STATEMENT,
        title: 'Respondent evidence',
        content: 'Still allowed because respondent has not marked complete',
      })

      expect(result.evidenceId).toBe('ev_123')
    })
  })

  describe('markSubmissionComplete', () => {
    const mockDispute = {
      id: 'dispute_123',
      externalId: 'RDISP-123',
      claimantAgentId: 'agent_claimant',
      respondentAgentId: 'agent_respondent',
      status: ResolveDisputeStatus.RESPONSE_RECEIVED,
      claimantSubmissionComplete: false,
      respondentSubmissionComplete: false,
    }

    it('should throw error if dispute not found', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(null)

      await expect(
        markSubmissionComplete({
          disputeExternalId: 'nonexistent',
          agentId: 'agent_claimant',
        })
      ).rejects.toThrow('Dispute not found')
    })

    it('should throw error if not a party', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockDispute as never)

      await expect(
        markSubmissionComplete({
          disputeExternalId: 'RDISP-123',
          agentId: 'agent_outsider',
        })
      ).rejects.toThrow('Only dispute parties')
    })

    it('should throw error if dispute status does not allow it', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        ...mockDispute,
        status: ResolveDisputeStatus.IN_ARBITRATION,
      } as never)

      await expect(
        markSubmissionComplete({
          disputeExternalId: 'RDISP-123',
          agentId: 'agent_claimant',
        })
      ).rejects.toThrow('Cannot mark submission complete')
    })

    it('should throw error if claimant already marked complete', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        ...mockDispute,
        claimantSubmissionComplete: true,
      } as never)

      await expect(
        markSubmissionComplete({
          disputeExternalId: 'RDISP-123',
          agentId: 'agent_claimant',
        })
      ).rejects.toThrow('already marked your submission as complete')
    })

    it('should throw error if respondent already marked complete', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        ...mockDispute,
        respondentSubmissionComplete: true,
      } as never)

      await expect(
        markSubmissionComplete({
          disputeExternalId: 'RDISP-123',
          agentId: 'agent_respondent',
        })
      ).rejects.toThrow('already marked your submission as complete')
    })

    it('should mark claimant submission as complete', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockDispute as never)
      vi.mocked(prisma.resolveDispute.update).mockResolvedValue({} as never)

      const result = await markSubmissionComplete({
        disputeExternalId: 'RDISP-123',
        agentId: 'agent_claimant',
      })

      expect(result.yourSubmissionComplete).toBe(true)
      expect(result.otherPartyComplete).toBe(false)
      expect(result.bothComplete).toBe(false)

      expect(prisma.resolveDispute.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            claimantSubmissionComplete: true,
            claimantSubmissionCompletedAt: expect.any(Date),
          }),
        })
      )
    })

    it('should mark respondent submission as complete', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockDispute as never)
      vi.mocked(prisma.resolveDispute.update).mockResolvedValue({} as never)

      const result = await markSubmissionComplete({
        disputeExternalId: 'RDISP-123',
        agentId: 'agent_respondent',
      })

      expect(result.yourSubmissionComplete).toBe(true)
      expect(result.otherPartyComplete).toBe(false)
      expect(result.bothComplete).toBe(false)

      expect(prisma.resolveDispute.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            respondentSubmissionComplete: true,
            respondentSubmissionCompletedAt: expect.any(Date),
          }),
        })
      )
    })

    it('should report bothComplete=true when claimant marks complete and respondent already is', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        ...mockDispute,
        respondentSubmissionComplete: true,
      } as never)
      vi.mocked(prisma.resolveDispute.update).mockResolvedValue({} as never)

      const result = await markSubmissionComplete({
        disputeExternalId: 'RDISP-123',
        agentId: 'agent_claimant',
      })

      expect(result.yourSubmissionComplete).toBe(true)
      expect(result.otherPartyComplete).toBe(true)
      expect(result.bothComplete).toBe(true)
    })

    it('should report bothComplete=true when respondent marks complete and claimant already is', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        ...mockDispute,
        claimantSubmissionComplete: true,
      } as never)
      vi.mocked(prisma.resolveDispute.update).mockResolvedValue({} as never)

      const result = await markSubmissionComplete({
        disputeExternalId: 'RDISP-123',
        agentId: 'agent_respondent',
      })

      expect(result.yourSubmissionComplete).toBe(true)
      expect(result.otherPartyComplete).toBe(true)
      expect(result.bothComplete).toBe(true)
    })

    it('should allow marking complete during AWAITING_RESPONSE status', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        ...mockDispute,
        status: ResolveDisputeStatus.AWAITING_RESPONSE,
      } as never)
      vi.mocked(prisma.resolveDispute.update).mockResolvedValue({} as never)

      const result = await markSubmissionComplete({
        disputeExternalId: 'RDISP-123',
        agentId: 'agent_claimant',
      })

      expect(result.yourSubmissionComplete).toBe(true)
    })
  })

  describe('extendSubmissionDeadline', () => {
    const mockDispute = {
      id: 'dispute_123',
      externalId: 'RDISP-123',
      claimantAgentId: 'agent_claimant',
      respondentAgentId: 'agent_respondent',
      status: ResolveDisputeStatus.RESPONSE_RECEIVED,
      responseDeadline: new Date('2024-01-15T12:00:00Z'),
    }

    it('should throw error if dispute not found', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(null)

      await expect(
        extendSubmissionDeadline({
          disputeExternalId: 'nonexistent',
          agentId: 'agent_claimant',
          additionalHours: 24,
        })
      ).rejects.toThrow('Dispute not found')
    })

    it('should throw error if caller is not the claimant', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockDispute as never)

      await expect(
        extendSubmissionDeadline({
          disputeExternalId: 'RDISP-123',
          agentId: 'agent_respondent',
          additionalHours: 24,
        })
      ).rejects.toThrow('Only the claimant')
    })

    it('should throw error if dispute is already in arbitration', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        ...mockDispute,
        status: ResolveDisputeStatus.IN_ARBITRATION,
      } as never)

      await expect(
        extendSubmissionDeadline({
          disputeExternalId: 'RDISP-123',
          agentId: 'agent_claimant',
          additionalHours: 24,
        })
      ).rejects.toThrow('Cannot extend deadline')
    })

    it('should throw error if dispute is RULED', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        ...mockDispute,
        status: ResolveDisputeStatus.RULED,
      } as never)

      await expect(
        extendSubmissionDeadline({
          disputeExternalId: 'RDISP-123',
          agentId: 'agent_claimant',
          additionalHours: 24,
        })
      ).rejects.toThrow('Cannot extend deadline')
    })

    it('should extend deadline by specified hours', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockDispute as never)
      vi.mocked(prisma.resolveDispute.update).mockResolvedValue({} as never)

      const result = await extendSubmissionDeadline({
        disputeExternalId: 'RDISP-123',
        agentId: 'agent_claimant',
        additionalHours: 48,
      })

      expect(result.disputeId).toBe('RDISP-123')
      expect(result.previousDeadline).toEqual(new Date('2024-01-15T12:00:00Z'))
      expect(result.newDeadline).toEqual(new Date('2024-01-17T12:00:00Z'))

      expect(prisma.resolveDispute.update).toHaveBeenCalledWith({
        where: { id: 'dispute_123' },
        data: { responseDeadline: new Date('2024-01-17T12:00:00Z') },
      })
    })

    it('should work during AWAITING_RESPONSE status', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        ...mockDispute,
        status: ResolveDisputeStatus.AWAITING_RESPONSE,
      } as never)
      vi.mocked(prisma.resolveDispute.update).mockResolvedValue({} as never)

      const result = await extendSubmissionDeadline({
        disputeExternalId: 'RDISP-123',
        agentId: 'agent_claimant',
        additionalHours: 24,
      })

      expect(result.newDeadline).toEqual(new Date('2024-01-16T12:00:00Z'))
    })

    it('should extend by 1 hour (minimum)', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockDispute as never)
      vi.mocked(prisma.resolveDispute.update).mockResolvedValue({} as never)

      const result = await extendSubmissionDeadline({
        disputeExternalId: 'RDISP-123',
        agentId: 'agent_claimant',
        additionalHours: 1,
      })

      expect(result.newDeadline).toEqual(new Date('2024-01-15T13:00:00Z'))
    })

    it('should allow large extensions (arbitrary)', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockDispute as never)
      vi.mocked(prisma.resolveDispute.update).mockResolvedValue({} as never)

      const result = await extendSubmissionDeadline({
        disputeExternalId: 'RDISP-123',
        agentId: 'agent_claimant',
        additionalHours: 720, // 30 days
      })

      expect(result.newDeadline).toEqual(new Date('2024-02-14T12:00:00Z'))
    })

    it('should allow an outsider agent to be rejected', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockDispute as never)

      await expect(
        extendSubmissionDeadline({
          disputeExternalId: 'RDISP-123',
          agentId: 'agent_outsider',
          additionalHours: 24,
        })
      ).rejects.toThrow('Only the claimant')
    })
  })

  describe('listDisputesPendingArbitration', () => {
    it('should include disputes where both parties marked complete', async () => {
      vi.mocked(prisma.resolveDispute.findMany).mockResolvedValue([
        {
          id: 'dispute_1',
          externalId: 'RDISP-1',
          responseDeadline: new Date(),
          status: ResolveDisputeStatus.RESPONSE_RECEIVED,
        },
      ] as never)

      const result = await listDisputesPendingArbitration()

      expect(result).toHaveLength(1)
      // Verify the query includes the both-complete condition
      const queryArg = vi.mocked(prisma.resolveDispute.findMany).mock.calls[0]?.[0]
      const orConditions = queryArg?.where?.OR as Array<Record<string, unknown>>
      expect(orConditions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            status: ResolveDisputeStatus.RESPONSE_RECEIVED,
            claimantSubmissionComplete: true,
            respondentSubmissionComplete: true,
          }),
        ])
      )
    })

    it('should include disputes where grace period has expired', async () => {
      vi.mocked(prisma.resolveDispute.findMany).mockResolvedValue([])

      await listDisputesPendingArbitration()

      const queryArg = vi.mocked(prisma.resolveDispute.findMany).mock.calls[0]?.[0]
      const orConditions = queryArg?.where?.OR as Array<Record<string, unknown>>
      expect(orConditions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            status: ResolveDisputeStatus.RESPONSE_RECEIVED,
            responseSubmittedAt: expect.objectContaining({ lt: expect.any(Date) }),
          }),
        ])
      )
    })

    it('should include disputes where response deadline passed', async () => {
      vi.mocked(prisma.resolveDispute.findMany).mockResolvedValue([])

      await listDisputesPendingArbitration()

      const queryArg = vi.mocked(prisma.resolveDispute.findMany).mock.calls[0]?.[0]
      const orConditions = queryArg?.where?.OR as Array<Record<string, unknown>>
      expect(orConditions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            status: ResolveDisputeStatus.AWAITING_RESPONSE,
            responseDeadline: expect.objectContaining({ lt: expect.any(Date) }),
          }),
        ])
      )
    })
  })

  describe('recordRuling', () => {
    it('should update dispute with ruling and decision deadline', async () => {
      vi.mocked(prisma.resolveDispute.update).mockResolvedValue({} as never)

      await recordRuling({
        disputeId: 'dispute_123',
        ruling: ResolveDisputeRuling.CLAIMANT,
        rulingReasoning: 'Claimant provided sufficient evidence',
        rulingDetails: { key: 'value' },
        claimantScoreChange: 5,
        respondentScoreChange: -10,
      })

      expect(prisma.resolveDispute.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dispute_123' },
          data: expect.objectContaining({
            ruling: ResolveDisputeRuling.CLAIMANT,
            rulingReasoning: 'Claimant provided sufficient evidence',
            rulingDetails: { key: 'value' },
            ruledAt: expect.any(Date),
            claimantScoreChange: 5,
            respondentScoreChange: -10,
            decisionDeadline: expect.any(Date),
            status: ResolveDisputeStatus.RULED,
          }),
        })
      )
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

    it('should set decision deadline ~7 days from now', async () => {
      vi.mocked(prisma.resolveDispute.update).mockResolvedValue({} as never)

      const before = Date.now()
      await recordRuling({
        disputeId: 'dispute_123',
        ruling: ResolveDisputeRuling.CLAIMANT,
        rulingReasoning: 'Evidence clear',
        rulingDetails: {},
        claimantScoreChange: 2,
        respondentScoreChange: -3,
      })

      const callArg = vi.mocked(prisma.resolveDispute.update).mock.calls[0]?.[0]
      const deadline = callArg?.data?.decisionDeadline as Date
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
      expect(deadline.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000)
      expect(deadline.getTime()).toBeLessThanOrEqual(Date.now() + sevenDaysMs + 1000)
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

  describe('acceptDecision', () => {
    const mockRuledDispute = {
      id: 'dispute_123',
      externalId: 'RDISP-123',
      claimantAgentId: 'agent_claimant',
      respondentAgentId: 'agent_respondent',
      status: ResolveDisputeStatus.RULED,
      ruling: 'CLAIMANT',
      claimantAccepted: null,
      respondentAccepted: null,
      claimantDecisionAt: null,
      respondentDecisionAt: null,
    }

    const mockUpdatedDispute = {
      ...mockRuledDispute,
      claimantAccepted: true,
      claimantDecisionAt: new Date(),
      transaction: { externalId: 'RTRANS-123', title: 'Test', statedValue: 1000 },
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
      claimType: ResolveDisputeClaimType.NON_PERFORMANCE,
      claimSummary: 'Test',
      claimDetails: null,
      requestedResolution: 'Refund',
      responseSummary: null,
      responseDetails: null,
      responseDeadline: new Date(),
      responseSubmittedAt: null,
      rulingReasoning: 'Clear evidence',
      rulingDetails: null,
      ruledAt: new Date(),
      claimantScoreChange: 5,
      respondentScoreChange: -5,
      statedValue: 1000,
      creditsCharged: 0,
      wasFree: true,
      decisionDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      closedAt: null,
      createdAt: new Date(),
      _count: { evidence: 0 },
    }

    it('should throw error if dispute not found', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(null)

      await expect(acceptDecision('nonexistent', 'agent_claimant')).rejects.toThrow(
        'Dispute not found'
      )
    })

    it('should throw error if dispute not in RULED status', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        ...mockRuledDispute,
        status: ResolveDisputeStatus.AWAITING_RESPONSE,
      } as never)

      await expect(acceptDecision('RDISP-123', 'agent_claimant')).rejects.toThrow(
        'Cannot accept decision'
      )
    })

    it('should throw error if not a party to dispute', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockRuledDispute as never)

      await expect(acceptDecision('RDISP-123', 'agent_outsider')).rejects.toThrow('not a party')
    })

    it('should throw error if claimant already responded', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        ...mockRuledDispute,
        claimantAccepted: true,
      } as never)

      await expect(acceptDecision('RDISP-123', 'agent_claimant')).rejects.toThrow(
        'already responded'
      )
    })

    it('should throw error if respondent already responded', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        ...mockRuledDispute,
        respondentAccepted: false,
      } as never)

      await expect(acceptDecision('RDISP-123', 'agent_respondent')).rejects.toThrow(
        'already responded'
      )
    })

    it('should set claimantAccepted=true for claimant', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockRuledDispute as never)
      vi.mocked(prisma.resolveDispute.update).mockResolvedValue(mockUpdatedDispute as never)

      await acceptDecision('RDISP-123', 'agent_claimant')

      expect(prisma.resolveDispute.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            claimantAccepted: true,
            claimantDecisionAt: expect.any(Date),
          }),
        })
      )
    })

    it('should set respondentAccepted=true for respondent', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockRuledDispute as never)
      vi.mocked(prisma.resolveDispute.update).mockResolvedValue({
        ...mockUpdatedDispute,
        respondentAccepted: true,
        respondentDecisionAt: new Date(),
      } as never)

      await acceptDecision('RDISP-123', 'agent_respondent')

      expect(prisma.resolveDispute.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            respondentAccepted: true,
            respondentDecisionAt: expect.any(Date),
          }),
        })
      )
    })

    it('should close dispute when both parties accept', async () => {
      // Respondent already accepted, claimant now accepts
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        ...mockRuledDispute,
        respondentAccepted: true,
        respondentDecisionAt: new Date(),
      } as never)
      vi.mocked(prisma.resolveDispute.update).mockResolvedValue({
        ...mockUpdatedDispute,
        status: ResolveDisputeStatus.CLOSED,
        closedAt: new Date(),
      } as never)

      await acceptDecision('RDISP-123', 'agent_claimant')

      expect(prisma.resolveDispute.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ResolveDisputeStatus.CLOSED,
            closedAt: expect.any(Date),
          }),
        })
      )
    })

    it('should NOT close dispute when only one party accepts', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockRuledDispute as never)
      vi.mocked(prisma.resolveDispute.update).mockResolvedValue(mockUpdatedDispute as never)

      await acceptDecision('RDISP-123', 'agent_claimant')

      const callData = vi.mocked(prisma.resolveDispute.update).mock.calls[0]?.[0]?.data as Record<
        string,
        unknown
      >
      expect(callData.status).toBeUndefined()
      expect(callData.closedAt).toBeUndefined()
    })
  })

  describe('rejectDecision', () => {
    const mockRuledDispute = {
      id: 'dispute_123',
      externalId: 'RDISP-123',
      claimantAgentId: 'agent_claimant',
      respondentAgentId: 'agent_respondent',
      status: ResolveDisputeStatus.RULED,
      ruling: 'CLAIMANT',
      claimantAccepted: null,
      respondentAccepted: null,
    }

    const mockUpdatedDispute = {
      ...mockRuledDispute,
      claimantAccepted: false,
      claimantDecisionAt: new Date(),
      transaction: { externalId: 'RTRANS-123', title: 'Test', statedValue: 1000 },
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
      claimType: ResolveDisputeClaimType.NON_PERFORMANCE,
      claimSummary: 'Test',
      claimDetails: null,
      requestedResolution: 'Refund',
      responseSummary: null,
      responseDetails: null,
      responseDeadline: new Date(),
      responseSubmittedAt: null,
      rulingReasoning: 'Clear evidence',
      rulingDetails: null,
      ruledAt: new Date(),
      claimantScoreChange: 5,
      respondentScoreChange: -5,
      statedValue: 1000,
      creditsCharged: 0,
      wasFree: true,
      respondentDecisionAt: null,
      decisionDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      closedAt: null,
      createdAt: new Date(),
      _count: { evidence: 0 },
    }

    it('should throw error if dispute not found', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(null)

      await expect(rejectDecision('nonexistent', 'agent_claimant')).rejects.toThrow(
        'Dispute not found'
      )
    })

    it('should throw error if dispute not in RULED status', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        ...mockRuledDispute,
        status: ResolveDisputeStatus.IN_ARBITRATION,
      } as never)

      await expect(rejectDecision('RDISP-123', 'agent_claimant')).rejects.toThrow(
        'Cannot reject decision'
      )
    })

    it('should throw error if not a party', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockRuledDispute as never)

      await expect(rejectDecision('RDISP-123', 'agent_outsider')).rejects.toThrow('not a party')
    })

    it('should throw error if already responded', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        ...mockRuledDispute,
        claimantAccepted: true,
      } as never)

      await expect(rejectDecision('RDISP-123', 'agent_claimant')).rejects.toThrow(
        'already responded'
      )
    })

    it('should set claimantAccepted=false for claimant', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockRuledDispute as never)
      vi.mocked(prisma.resolveDispute.update).mockResolvedValue(mockUpdatedDispute as never)

      await rejectDecision('RDISP-123', 'agent_claimant')

      expect(prisma.resolveDispute.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            claimantAccepted: false,
            claimantDecisionAt: expect.any(Date),
          }),
        })
      )
    })

    it('should set respondentAccepted=false for respondent', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockRuledDispute as never)
      vi.mocked(prisma.resolveDispute.update).mockResolvedValue({
        ...mockUpdatedDispute,
        respondentAccepted: false,
        respondentDecisionAt: new Date(),
      } as never)

      await rejectDecision('RDISP-123', 'agent_respondent')

      expect(prisma.resolveDispute.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            respondentAccepted: false,
            respondentDecisionAt: expect.any(Date),
          }),
        })
      )
    })

    it('should NOT close dispute on rejection', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockRuledDispute as never)
      vi.mocked(prisma.resolveDispute.update).mockResolvedValue(mockUpdatedDispute as never)

      await rejectDecision('RDISP-123', 'agent_claimant')

      const callData = vi.mocked(prisma.resolveDispute.update).mock.calls[0]?.[0]?.data as Record<
        string,
        unknown
      >
      expect(callData.status).toBeUndefined()
      expect(callData.closedAt).toBeUndefined()
    })
  })

  describe('getDecision', () => {
    const mockRuledDispute = {
      id: 'dispute_123',
      externalId: 'RDISP-123',
      claimantAgentId: 'agent_claimant',
      respondentAgentId: 'agent_respondent',
      status: ResolveDisputeStatus.RULED,
      ruling: 'CLAIMANT',
      rulingReasoning: 'Evidence supports claimant',
      rulingDetails: { key: 'value' },
      ruledAt: new Date(),
      claimantScoreChange: 5,
      respondentScoreChange: -5,
      claimantAccepted: null,
      respondentAccepted: null,
      claimantDecisionAt: null,
      respondentDecisionAt: null,
      decisionDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      escalation: null,
    }

    it('should throw error if dispute not found', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(null)

      await expect(getDecision('nonexistent', 'agent_claimant')).rejects.toThrow(
        'Dispute not found'
      )
    })

    it('should throw error if not a party', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockRuledDispute as never)

      await expect(getDecision('RDISP-123', 'agent_outsider')).rejects.toThrow('not a party')
    })

    it('should throw error if no ruling yet', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        ...mockRuledDispute,
        ruling: null,
      } as never)

      await expect(getDecision('RDISP-123', 'agent_claimant')).rejects.toThrow(
        'not been ruled on yet'
      )
    })

    it('should return ruling details', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockRuledDispute as never)

      const result = await getDecision('RDISP-123', 'agent_claimant')

      expect(result.dispute_id).toBe('RDISP-123')
      expect(result.ruling).toBe('CLAIMANT')
      expect(result.ruling_reasoning).toBe('Evidence supports claimant')
      expect(result.claimant_score_change).toBe(5)
      expect(result.respondent_score_change).toBe(-5)
    })

    it('should return can_escalate=false when agent has not rejected', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockRuledDispute as never)

      const result = await getDecision('RDISP-123', 'agent_claimant')

      expect(result.can_escalate).toBe(false)
    })

    it('should return can_escalate=true when agent rejected and no escalation exists', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        ...mockRuledDispute,
        respondentAccepted: false,
      } as never)

      const result = await getDecision('RDISP-123', 'agent_respondent')

      expect(result.can_escalate).toBe(true)
    })

    it('should return can_escalate=false when escalation already exists', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        ...mockRuledDispute,
        respondentAccepted: false,
        escalation: { id: 'esc_123' },
      } as never)

      const result = await getDecision('RDISP-123', 'agent_respondent')

      expect(result.can_escalate).toBe(false)
    })

    it('should return can_escalate=false when status is not RULED', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        ...mockRuledDispute,
        status: ResolveDisputeStatus.ESCALATED,
        respondentAccepted: false,
      } as never)

      const result = await getDecision('RDISP-123', 'agent_respondent')

      expect(result.can_escalate).toBe(false)
    })
  })

  describe('requestEscalation', () => {
    const mockRuledDispute = {
      id: 'dispute_123',
      externalId: 'RDISP-123',
      claimantAgentId: 'agent_claimant',
      respondentAgentId: 'agent_respondent',
      status: ResolveDisputeStatus.RULED,
      claimantAccepted: null,
      respondentAccepted: false, // respondent rejected
      escalation: null,
    }

    const mockEscalation = {
      id: 'esc_123',
      externalId: 'RESC-ABCD1234',
      disputeId: 'dispute_123',
      requestedByAgentId: 'agent_respondent',
      reason: 'AI ruling was unfair',
      status: ResolveEscalationStatus.REQUESTED,
      creditsCharged: 2000,
      requestedAt: new Date(),
    }

    it('should throw error if dispute not found', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(null)

      await expect(
        requestEscalation({
          disputeExternalId: 'nonexistent',
          agentId: 'agent_respondent',
          reason: 'Unfair ruling',
          operatorId: 'op_123',
        })
      ).rejects.toThrow('Dispute not found')
    })

    it('should throw error if dispute not in RULED status', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        ...mockRuledDispute,
        status: ResolveDisputeStatus.CLOSED,
      } as never)

      await expect(
        requestEscalation({
          disputeExternalId: 'RDISP-123',
          agentId: 'agent_respondent',
          reason: 'Unfair ruling',
          operatorId: 'op_123',
        })
      ).rejects.toThrow('Cannot escalate dispute')
    })

    it('should throw error if not a party', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockRuledDispute as never)

      await expect(
        requestEscalation({
          disputeExternalId: 'RDISP-123',
          agentId: 'agent_outsider',
          reason: 'Unfair ruling',
          operatorId: 'op_123',
        })
      ).rejects.toThrow('not a party')
    })

    it('should throw error if agent has not rejected first', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        ...mockRuledDispute,
        respondentAccepted: null, // hasn't responded yet
      } as never)

      await expect(
        requestEscalation({
          disputeExternalId: 'RDISP-123',
          agentId: 'agent_respondent',
          reason: 'Unfair ruling',
          operatorId: 'op_123',
        })
      ).rejects.toThrow('must reject')
    })

    it('should throw error if agent accepted (not rejected)', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        ...mockRuledDispute,
        respondentAccepted: true,
      } as never)

      await expect(
        requestEscalation({
          disputeExternalId: 'RDISP-123',
          agentId: 'agent_respondent',
          reason: 'Changed my mind',
          operatorId: 'op_123',
        })
      ).rejects.toThrow('must reject')
    })

    it('should throw error if already escalated', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        ...mockRuledDispute,
        escalation: { id: 'esc_existing' },
      } as never)

      await expect(
        requestEscalation({
          disputeExternalId: 'RDISP-123',
          agentId: 'agent_respondent',
          reason: 'Try again',
          operatorId: 'op_123',
        })
      ).rejects.toThrow('already been escalated')
    })

    it('should charge escalation credits (2000)', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockRuledDispute as never)
      vi.mocked(prisma.resolveEscalation.create).mockResolvedValue(mockEscalation as never)
      vi.mocked(prisma.resolveDispute.update).mockResolvedValue({} as never)

      await requestEscalation({
        disputeExternalId: 'RDISP-123',
        agentId: 'agent_respondent',
        reason: 'AI ruling was unfair',
        operatorId: 'op_123',
      })

      expect(deductCredits).toHaveBeenCalledWith(
        'op_123',
        2000,
        expect.stringContaining('Escalation fee'),
        'escalation',
        undefined
      )
    })

    it('should create escalation record', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockRuledDispute as never)
      vi.mocked(prisma.resolveEscalation.create).mockResolvedValue(mockEscalation as never)
      vi.mocked(prisma.resolveDispute.update).mockResolvedValue({} as never)

      await requestEscalation({
        disputeExternalId: 'RDISP-123',
        agentId: 'agent_respondent',
        reason: 'AI ruling was unfair',
        operatorId: 'op_123',
      })

      expect(prisma.resolveEscalation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          disputeId: 'dispute_123',
          requestedByAgentId: 'agent_respondent',
          reason: 'AI ruling was unfair',
          creditsCharged: 2000,
        }),
      })
    })

    it('should update dispute status to ESCALATED', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockRuledDispute as never)
      vi.mocked(prisma.resolveEscalation.create).mockResolvedValue(mockEscalation as never)
      vi.mocked(prisma.resolveDispute.update).mockResolvedValue({} as never)

      await requestEscalation({
        disputeExternalId: 'RDISP-123',
        agentId: 'agent_respondent',
        reason: 'AI ruling was unfair',
        operatorId: 'op_123',
      })

      expect(prisma.resolveDispute.update).toHaveBeenCalledWith({
        where: { id: 'dispute_123' },
        data: { status: ResolveDisputeStatus.ESCALATED },
      })
    })

    it('should return escalation details', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(mockRuledDispute as never)
      vi.mocked(prisma.resolveEscalation.create).mockResolvedValue(mockEscalation as never)
      vi.mocked(prisma.resolveDispute.update).mockResolvedValue({} as never)

      const result = await requestEscalation({
        disputeExternalId: 'RDISP-123',
        agentId: 'agent_respondent',
        reason: 'AI ruling was unfair',
        operatorId: 'op_123',
      })

      expect(result.escalation_id).toBe('RESC-ABCD1234')
      expect(result.dispute_id).toBe('RDISP-123')
      expect(result.status).toBe(ResolveEscalationStatus.REQUESTED)
      expect(result.credits_charged).toBe(2000)
    })
  })

  describe('getEscalationStatus', () => {
    const mockDisputeWithEscalation = {
      id: 'dispute_123',
      externalId: 'RDISP-123',
      claimantAgentId: 'agent_claimant',
      respondentAgentId: 'agent_respondent',
      escalation: {
        externalId: 'RESC-ABCD1234',
        status: ResolveEscalationStatus.REQUESTED,
        reason: 'Unfair ruling',
        requestedByAgent: { externalId: 'agent_respondent' },
        arbitratorRuling: null,
        arbitratorRulingReasoning: null,
        arbitratorNotes: null,
        creditsCharged: 2000,
        requestedAt: new Date(),
        assignedAt: null,
        decidedAt: null,
        closedAt: null,
      },
    }

    it('should throw error if dispute not found', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(null)

      await expect(getEscalationStatus('nonexistent', 'agent_claimant')).rejects.toThrow(
        'Dispute not found'
      )
    })

    it('should throw error if not a party', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(
        mockDisputeWithEscalation as never
      )

      await expect(getEscalationStatus('RDISP-123', 'agent_outsider')).rejects.toThrow(
        'not a party'
      )
    })

    it('should throw error if no escalation exists', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        ...mockDisputeWithEscalation,
        escalation: null,
      } as never)

      await expect(getEscalationStatus('RDISP-123', 'agent_claimant')).rejects.toThrow(
        'No escalation exists'
      )
    })

    it('should return escalation details', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(
        mockDisputeWithEscalation as never
      )

      const result = await getEscalationStatus('RDISP-123', 'agent_claimant')

      expect(result.escalation_id).toBe('RESC-ABCD1234')
      expect(result.dispute_id).toBe('RDISP-123')
      expect(result.status).toBe(ResolveEscalationStatus.REQUESTED)
      expect(result.reason).toBe('Unfair ruling')
      expect(result.requested_by).toBe('agent_respondent')
      expect(result.credits_charged).toBe(2000)
    })

    it('should return null arbitrator fields when not yet decided', async () => {
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue(
        mockDisputeWithEscalation as never
      )

      const result = await getEscalationStatus('RDISP-123', 'agent_claimant')

      expect(result.arbitrator_ruling).toBeNull()
      expect(result.arbitrator_ruling_reasoning).toBeNull()
      expect(result.arbitrator_notes).toBeNull()
      expect(result.assigned_at).toBeNull()
      expect(result.decided_at).toBeNull()
    })

    it('should return arbitrator decision when decided', async () => {
      const decidedAt = new Date()
      vi.mocked(prisma.resolveDispute.findUnique).mockResolvedValue({
        ...mockDisputeWithEscalation,
        escalation: {
          ...mockDisputeWithEscalation.escalation,
          status: ResolveEscalationStatus.DECIDED,
          arbitratorRuling: 'RESPONDENT',
          arbitratorRulingReasoning: 'Human review found respondent correct',
          arbitratorNotes: 'Overturned AI decision',
          decidedAt,
        },
      } as never)

      const result = await getEscalationStatus('RDISP-123', 'agent_respondent')

      expect(result.arbitrator_ruling).toBe('RESPONDENT')
      expect(result.arbitrator_ruling_reasoning).toBe('Human review found respondent correct')
      expect(result.arbitrator_notes).toBe('Overturned AI decision')
      expect(result.decided_at).toBe(decidedAt)
    })
  })
})
