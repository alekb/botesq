import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock external dependencies
vi.mock('@botesq/database', () => ({
  prisma: {
    operator: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    creditTransaction: {
      create: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  MatterType: {
    CONTRACT_REVIEW: 'CONTRACT_REVIEW',
    ENTITY_FORMATION: 'ENTITY_FORMATION',
    COMPLIANCE: 'COMPLIANCE',
    IP_TRADEMARK: 'IP_TRADEMARK',
    IP_COPYRIGHT: 'IP_COPYRIGHT',
    IP_PATENT: 'IP_PATENT',
    EMPLOYMENT: 'EMPLOYMENT',
    LITIGATION_CONSULTATION: 'LITIGATION_CONSULTATION',
  },
  MatterUrgency: {
    LOW: 'LOW',
    STANDARD: 'STANDARD',
    HIGH: 'HIGH',
    URGENT: 'URGENT',
  },
}))

// Mock services
vi.mock('../services/session.service.js', () => ({
  startSession: vi.fn(),
  getSessionInfo: vi.fn(),
  endSession: vi.fn(),
}))

vi.mock('../services/auth.service.js', () => ({
  authenticateSession: vi.fn(),
}))

vi.mock('../services/rate-limit.service.js', () => ({
  checkRateLimit: vi.fn(),
}))

vi.mock('../services/matter.service.js', () => ({
  createMatter: vi.fn(),
  getMatter: vi.fn(),
  listMatters: vi.fn(),
}))

import { prisma } from '@botesq/database'
import { startSession } from '../services/session.service.js'
import { authenticateSession } from '../services/auth.service.js'
import { checkRateLimit } from '../services/rate-limit.service.js'
import { createMatter } from '../services/matter.service.js'
import {
  executeTool,
  tools,
  startSessionTool,
  listServicesTool,
  checkCreditsTool,
  createMatterTool,
} from '../tools/index.js'
import { handleStartSession, startSessionSchema } from '../tools/start-session.js'
import { handleListServices } from '../tools/list-services.js'
import { handleCheckCredits, checkCreditsSchema } from '../tools/check-credits.js'
import { handleCreateMatter, createMatterSchema } from '../tools/create-matter.js'
import { ApiError, PaymentError } from '../types.js'

describe('MCP Tool Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('tools registry', () => {
    it('should export all required tools', () => {
      const toolNames = tools.map((t) => t.name)

      // Core tools
      expect(toolNames).toContain('start_session')
      expect(toolNames).toContain('get_session_info')
      expect(toolNames).toContain('list_services')
      expect(toolNames).toContain('get_disclaimers')
      expect(toolNames).toContain('check_credits')
      expect(toolNames).toContain('add_credits')
      expect(toolNames).toContain('ask_legal_question')
      expect(toolNames).toContain('create_matter')
      expect(toolNames).toContain('get_matter_status')
      expect(toolNames).toContain('list_matters')
      expect(toolNames).toContain('get_retainer_terms')
      expect(toolNames).toContain('accept_retainer')
      expect(toolNames).toContain('submit_document')
      expect(toolNames).toContain('get_document_analysis')
      expect(toolNames).toContain('request_consultation')
      expect(toolNames).toContain('get_consultation_result')

      // Resolve tools - agents & transactions
      expect(toolNames).toContain('register_resolve_agent')
      expect(toolNames).toContain('get_agent_trust')
      expect(toolNames).toContain('propose_transaction')
      expect(toolNames).toContain('respond_to_transaction')
      expect(toolNames).toContain('complete_transaction')

      // Resolve tools - disputes
      expect(toolNames).toContain('file_dispute')
      expect(toolNames).toContain('respond_to_dispute')
      expect(toolNames).toContain('get_dispute')
      expect(toolNames).toContain('list_disputes')
      expect(toolNames).toContain('submit_evidence')
      expect(toolNames).toContain('get_evidence')

      // Resolve tools - decisions
      expect(toolNames).toContain('accept_decision')
      expect(toolNames).toContain('reject_decision')
      expect(toolNames).toContain('get_decision')

      // Resolve tools - escalation
      expect(toolNames).toContain('request_escalation')
      expect(toolNames).toContain('get_escalation_status')

      // Resolve tools - escrow
      expect(toolNames).toContain('fund_escrow')
      expect(toolNames).toContain('release_escrow')
      expect(toolNames).toContain('get_escrow_status')

      // Resolve tools - feedback
      expect(toolNames).toContain('submit_dispute_feedback')
    })

    it('should export exactly 38 tools', () => {
      expect(tools).toHaveLength(38)
    })

    it('should have handler functions for all tools', () => {
      for (const tool of tools) {
        expect(tool.handler).toBeDefined()
        expect(typeof tool.handler).toBe('function')
      }
    })

    it('should have valid inputSchema for all tools', () => {
      for (const tool of tools) {
        expect(tool.inputSchema).toBeDefined()
        expect(tool.inputSchema.type).toBe('object')
        expect(tool.inputSchema.properties).toBeDefined()
      }
    })
  })

  describe('executeTool', () => {
    it('should route to correct handler', async () => {
      vi.mocked(startSession).mockResolvedValue({
        session_token: 'session_123',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        operator: { id: 'op_123', name: 'Test Operator' },
        credits: { balance: 5000, currency: 'credits' },
        rate_limits: { requests_per_minute: 60, requests_per_hour: 1000 },
      })

      const result = await executeTool('start_session', { api_key: 'test_key' })

      expect(startSession).toHaveBeenCalledWith({ api_key: 'test_key' })
      expect(result).toHaveProperty('success', true)
    })

    it('should throw ApiError for unknown tool', async () => {
      await expect(executeTool('unknown_tool', {})).rejects.toThrow(ApiError)
      await expect(executeTool('unknown_tool', {})).rejects.toThrow('Unknown tool')
    })

    it('should throw ApiError for validation errors', async () => {
      // Missing required api_key
      await expect(executeTool('start_session', {})).rejects.toThrow(ApiError)
      await expect(executeTool('start_session', {})).rejects.toThrow('Invalid input')
    })

    it('should pass through service errors', async () => {
      vi.mocked(startSession).mockRejectedValue(new ApiError('AUTH_ERROR', 'Invalid API key', 401))

      await expect(executeTool('start_session', { api_key: 'bad_key' })).rejects.toThrow(ApiError)
      await expect(executeTool('start_session', { api_key: 'bad_key' })).rejects.toThrow(
        'Invalid API key'
      )
    })

    it('should handle list_services without input', async () => {
      const result = await executeTool('list_services', undefined)

      expect(result).toHaveProperty('success', true)
      expect(result).toHaveProperty('data.services')
    })
  })

  describe('startSessionSchema', () => {
    it('should require api_key', () => {
      expect(() => startSessionSchema.parse({})).toThrow()
    })

    it('should reject empty api_key', () => {
      expect(() => startSessionSchema.parse({ api_key: '' })).toThrow()
    })

    it('should accept valid input', () => {
      const result = startSessionSchema.parse({ api_key: 'test_key' })
      expect(result.api_key).toBe('test_key')
    })

    it('should accept optional agent_identifier', () => {
      const result = startSessionSchema.parse({
        api_key: 'test_key',
        agent_identifier: 'gpt-4',
      })
      expect(result.agent_identifier).toBe('gpt-4')
    })
  })

  describe('handleStartSession', () => {
    it('should return session data on success', async () => {
      vi.mocked(startSession).mockResolvedValue({
        session_token: 'session_abc123',
        expires_at: '2024-12-31T00:00:00Z',
        operator: { id: 'op_123', name: 'Test Operator' },
        credits: { balance: 5000, currency: 'credits' },
        rate_limits: { requests_per_minute: 60, requests_per_hour: 1000 },
      })

      const result = await handleStartSession({ api_key: 'valid_key' })

      expect(result.success).toBe(true)
      expect(result.data?.session_token).toBe('session_abc123')
    })

    it('should pass agent_identifier to service', async () => {
      vi.mocked(startSession).mockResolvedValue({
        session_token: 'session_abc123',
        expires_at: new Date().toISOString(),
        operator: { id: 'op_123', name: 'Test' },
        credits: { balance: 5000, currency: 'credits' },
        rate_limits: { requests_per_minute: 60, requests_per_hour: 1000 },
      })

      await handleStartSession({ api_key: 'key', agent_identifier: 'claude' })

      expect(startSession).toHaveBeenCalledWith({
        api_key: 'key',
        agent_identifier: 'claude',
      })
    })
  })

  describe('handleListServices', () => {
    it('should return list of services', async () => {
      const result = await handleListServices()

      expect(result.success).toBe(true)
      expect(result.data?.services).toBeDefined()
      expect(Array.isArray(result.data?.services)).toBe(true)
    })

    it('should include ask_legal_question service', async () => {
      const result = await handleListServices()

      const legalQuestion = result.data?.services.find((s) => s.service === 'ask_legal_question')
      expect(legalQuestion).toBeDefined()
      expect(legalQuestion?.description).toBeTruthy()
    })

    it('should include create_matter service', async () => {
      const result = await handleListServices()

      const createMatterService = result.data?.services.find((s) => s.service === 'create_matter')
      expect(createMatterService).toBeDefined()
      expect(createMatterService?.requires_retainer).toBe(true)
    })

    it('should have pricing info for all services', async () => {
      const result = await handleListServices()

      for (const service of result.data?.services ?? []) {
        expect(service.credit_cost).toBeDefined()
      }
    })
  })

  describe('checkCreditsSchema', () => {
    it('should require session_token', () => {
      expect(() => checkCreditsSchema.parse({})).toThrow()
    })

    it('should reject empty session_token', () => {
      expect(() => checkCreditsSchema.parse({ session_token: '' })).toThrow()
    })

    it('should accept valid input', () => {
      const result = checkCreditsSchema.parse({ session_token: 'sess_123' })
      expect(result.session_token).toBe('sess_123')
    })
  })

  describe('handleCheckCredits', () => {
    const mockSession = {
      id: 'session_123',
      token: 'token_hash',
      apiKey: {
        id: 'key_123',
        operator: {
          id: 'op_123',
          creditBalance: 5000,
        },
      },
    }

    it('should authenticate session', async () => {
      vi.mocked(authenticateSession).mockResolvedValue(mockSession as never)
      vi.mocked(prisma.creditTransaction.aggregate).mockResolvedValue({
        _sum: { amount: -1000 },
        _count: 0,
        _avg: { amount: 0 },
        _max: { amount: 0 },
        _min: { amount: 0 },
      } as never)
      vi.mocked(prisma.creditTransaction.groupBy).mockResolvedValue([])

      await handleCheckCredits({ session_token: 'sess_123' })

      expect(authenticateSession).toHaveBeenCalledWith('sess_123')
    })

    it('should check rate limits', async () => {
      vi.mocked(authenticateSession).mockResolvedValue(mockSession as never)
      vi.mocked(prisma.creditTransaction.aggregate).mockResolvedValue({
        _sum: { amount: 0 },
        _count: 0,
        _avg: { amount: 0 },
        _max: { amount: 0 },
        _min: { amount: 0 },
      } as never)
      vi.mocked(prisma.creditTransaction.groupBy).mockResolvedValue([])

      await handleCheckCredits({ session_token: 'sess_123' })

      expect(checkRateLimit).toHaveBeenCalledWith('sess_123')
    })

    it('should return current balance', async () => {
      vi.mocked(authenticateSession).mockResolvedValue(mockSession as never)
      vi.mocked(prisma.creditTransaction.aggregate).mockResolvedValue({
        _sum: { amount: 0 },
        _count: 0,
        _avg: { amount: 0 },
        _max: { amount: 0 },
        _min: { amount: 0 },
      } as never)
      vi.mocked(prisma.creditTransaction.groupBy).mockResolvedValue([])

      const result = await handleCheckCredits({ session_token: 'sess_123' })

      expect(result.success).toBe(true)
      expect(result.data?.balance).toBe(5000)
    })

    it('should calculate USD equivalent', async () => {
      vi.mocked(authenticateSession).mockResolvedValue(mockSession as never)
      vi.mocked(prisma.creditTransaction.aggregate).mockResolvedValue({
        _sum: { amount: 0 },
        _count: 0,
        _avg: { amount: 0 },
        _max: { amount: 0 },
        _min: { amount: 0 },
      } as never)
      vi.mocked(prisma.creditTransaction.groupBy).mockResolvedValue([])

      const result = await handleCheckCredits({ session_token: 'sess_123' })

      // 5000 credits / 100 = $50
      expect(result.data?.usd_equivalent).toBe(50)
    })

    it('should set low_balance_warning for balances under threshold', async () => {
      const lowBalanceSession = {
        ...mockSession,
        apiKey: {
          ...mockSession.apiKey,
          operator: { id: 'op_123', creditBalance: 500 },
        },
      }
      vi.mocked(authenticateSession).mockResolvedValue(lowBalanceSession as never)
      vi.mocked(prisma.creditTransaction.aggregate).mockResolvedValue({
        _sum: { amount: 0 },
        _count: 0,
        _avg: { amount: 0 },
        _max: { amount: 0 },
        _min: { amount: 0 },
      } as never)
      vi.mocked(prisma.creditTransaction.groupBy).mockResolvedValue([])

      const result = await handleCheckCredits({ session_token: 'sess_123' })

      expect(result.data?.low_balance_warning).toBe(true)
    })

    it('should not set low_balance_warning for healthy balances', async () => {
      vi.mocked(authenticateSession).mockResolvedValue(mockSession as never)
      vi.mocked(prisma.creditTransaction.aggregate).mockResolvedValue({
        _sum: { amount: 0 },
        _count: 0,
        _avg: { amount: 0 },
        _max: { amount: 0 },
        _min: { amount: 0 },
      } as never)
      vi.mocked(prisma.creditTransaction.groupBy).mockResolvedValue([])

      const result = await handleCheckCredits({ session_token: 'sess_123' })

      expect(result.data?.low_balance_warning).toBe(false)
    })

    it('should return usage this month', async () => {
      vi.mocked(authenticateSession).mockResolvedValue(mockSession as never)
      vi.mocked(prisma.creditTransaction.aggregate).mockResolvedValue({
        _sum: { amount: -2500 },
        _count: 0,
        _avg: { amount: 0 },
        _max: { amount: 0 },
        _min: { amount: 0 },
      } as never)
      vi.mocked(prisma.creditTransaction.groupBy).mockResolvedValue([])

      const result = await handleCheckCredits({ session_token: 'sess_123' })

      expect(result.data?.usage_this_month).toBe(2500)
    })

    it('should return top services', async () => {
      vi.mocked(authenticateSession).mockResolvedValue(mockSession as never)
      vi.mocked(prisma.creditTransaction.aggregate).mockResolvedValue({
        _sum: { amount: -3000 },
        _count: 0,
        _avg: { amount: 0 },
        _max: { amount: 0 },
        _min: { amount: 0 },
      } as never)
      vi.mocked(prisma.creditTransaction.groupBy).mockResolvedValue([
        { referenceType: 'legal_question', _sum: { amount: -2000 } },
        { referenceType: 'document', _sum: { amount: -1000 } },
      ] as never)

      const result = await handleCheckCredits({ session_token: 'sess_123' })

      expect(result.data?.top_services).toHaveLength(2)
      expect(result.data?.top_services?.[0]?.service).toBe('legal_question')
      expect(result.data?.top_services?.[0]?.credits).toBe(2000)
    })
  })

  describe('createMatterSchema', () => {
    it('should require session_token', () => {
      expect(() =>
        createMatterSchema.parse({
          matter_type: 'CONTRACT_REVIEW',
          title: 'Test',
        })
      ).toThrow()
    })

    it('should require matter_type', () => {
      expect(() =>
        createMatterSchema.parse({
          session_token: 'sess_123',
          title: 'Test',
        })
      ).toThrow()
    })

    it('should require title', () => {
      expect(() =>
        createMatterSchema.parse({
          session_token: 'sess_123',
          matter_type: 'CONTRACT_REVIEW',
        })
      ).toThrow()
    })

    it('should validate matter_type enum', () => {
      expect(() =>
        createMatterSchema.parse({
          session_token: 'sess_123',
          matter_type: 'INVALID_TYPE',
          title: 'Test',
        })
      ).toThrow()
    })

    it('should accept valid input with optional fields', () => {
      const result = createMatterSchema.parse({
        session_token: 'sess_123',
        matter_type: 'CONTRACT_REVIEW',
        title: 'NDA Review',
        description: 'Review standard NDA',
        urgency: 'high',
      })

      expect(result.urgency).toBe('high')
      expect(result.description).toBe('Review standard NDA')
    })

    it('should validate urgency enum', () => {
      expect(() =>
        createMatterSchema.parse({
          session_token: 'sess_123',
          matter_type: 'CONTRACT_REVIEW',
          title: 'Test',
          urgency: 'invalid',
        })
      ).toThrow()
    })

    it('should enforce title max length', () => {
      expect(() =>
        createMatterSchema.parse({
          session_token: 'sess_123',
          matter_type: 'CONTRACT_REVIEW',
          title: 'A'.repeat(201),
        })
      ).toThrow()
    })

    it('should enforce description max length', () => {
      expect(() =>
        createMatterSchema.parse({
          session_token: 'sess_123',
          matter_type: 'CONTRACT_REVIEW',
          title: 'Test',
          description: 'A'.repeat(2001),
        })
      ).toThrow()
    })
  })

  describe('handleCreateMatter', () => {
    const mockSession = {
      id: 'session_123',
      token: 'token_hash',
      agentId: 'agent_123',
      apiKey: {
        id: 'key_123',
        operator: {
          id: 'op_123',
          creditBalance: 50000,
        },
      },
    }

    const mockMatter = {
      id: 'matter_uuid',
      externalId: 'MATTER-123',
      type: 'CONTRACT_REVIEW',
      status: 'PENDING_RETAINER',
      title: 'NDA Review',
      createdAt: new Date('2024-01-15T00:00:00Z'),
      retainer: {
        id: 'ret_uuid',
        externalId: 'RET-123',
        status: 'PENDING',
      },
    }

    it('should authenticate session', async () => {
      vi.mocked(authenticateSession).mockResolvedValue(mockSession as never)
      vi.mocked(createMatter).mockResolvedValue({
        matter: mockMatter as never,
        retainerRequired: true,
      })
      vi.mocked(prisma.$transaction).mockResolvedValue(undefined)

      await handleCreateMatter({
        session_token: 'sess_123',
        matter_type: 'CONTRACT_REVIEW',
        title: 'NDA Review',
      })

      expect(authenticateSession).toHaveBeenCalledWith('sess_123')
    })

    it('should check rate limits', async () => {
      vi.mocked(authenticateSession).mockResolvedValue(mockSession as never)
      vi.mocked(createMatter).mockResolvedValue({
        matter: mockMatter as never,
        retainerRequired: true,
      })
      vi.mocked(prisma.$transaction).mockResolvedValue(undefined)

      await handleCreateMatter({
        session_token: 'sess_123',
        matter_type: 'CONTRACT_REVIEW',
        title: 'NDA Review',
      })

      expect(checkRateLimit).toHaveBeenCalledWith('sess_123')
    })

    it('should throw PaymentError for insufficient credits', async () => {
      const poorSession = {
        ...mockSession,
        apiKey: {
          ...mockSession.apiKey,
          operator: { id: 'op_123', creditBalance: 1000 },
        },
      }
      vi.mocked(authenticateSession).mockResolvedValue(poorSession as never)

      await expect(
        handleCreateMatter({
          session_token: 'sess_123',
          matter_type: 'CONTRACT_REVIEW',
          title: 'Test',
        })
      ).rejects.toThrow(PaymentError)

      await expect(
        handleCreateMatter({
          session_token: 'sess_123',
          matter_type: 'CONTRACT_REVIEW',
          title: 'Test',
        })
      ).rejects.toThrow('Not enough credits')
    })

    it('should create matter with correct parameters', async () => {
      vi.mocked(authenticateSession).mockResolvedValue(mockSession as never)
      vi.mocked(createMatter).mockResolvedValue({
        matter: mockMatter as never,
        retainerRequired: true,
      })
      vi.mocked(prisma.$transaction).mockResolvedValue(undefined)

      await handleCreateMatter({
        session_token: 'sess_123',
        matter_type: 'CONTRACT_REVIEW',
        title: 'NDA Review',
        description: 'Review standard NDA',
        urgency: 'high',
      })

      expect(createMatter).toHaveBeenCalledWith({
        operatorId: 'op_123',
        agentId: 'agent_123',
        type: 'CONTRACT_REVIEW',
        title: 'NDA Review',
        description: 'Review standard NDA',
        urgency: 'HIGH',
      })
    })

    it('should return matter data on success', async () => {
      vi.mocked(authenticateSession).mockResolvedValue(mockSession as never)
      vi.mocked(createMatter).mockResolvedValue({
        matter: mockMatter as never,
        retainerRequired: true,
      })
      vi.mocked(prisma.$transaction).mockResolvedValue(undefined)

      const result = await handleCreateMatter({
        session_token: 'sess_123',
        matter_type: 'CONTRACT_REVIEW',
        title: 'NDA Review',
      })

      expect(result.success).toBe(true)
      expect(result.data?.matter_id).toBe('MATTER-123')
      expect(result.data?.status).toBe('PENDING_RETAINER')
      expect(result.data?.retainer_required).toBe(true)
    })

    it('should return retainer info when required', async () => {
      vi.mocked(authenticateSession).mockResolvedValue(mockSession as never)
      vi.mocked(createMatter).mockResolvedValue({
        matter: mockMatter as never,
        retainerRequired: true,
      })
      vi.mocked(prisma.$transaction).mockResolvedValue(undefined)

      const result = await handleCreateMatter({
        session_token: 'sess_123',
        matter_type: 'CONTRACT_REVIEW',
        title: 'NDA Review',
      })

      expect(result.data?.retainer).toBeDefined()
      expect(result.data?.retainer?.id).toBe('RET-123')
      expect(result.data?.retainer?.status).toBe('PENDING')
    })

    it('should return credits used and remaining', async () => {
      vi.mocked(authenticateSession).mockResolvedValue(mockSession as never)
      vi.mocked(createMatter).mockResolvedValue({
        matter: mockMatter as never,
        retainerRequired: true,
      })
      vi.mocked(prisma.$transaction).mockResolvedValue(undefined)

      const result = await handleCreateMatter({
        session_token: 'sess_123',
        matter_type: 'CONTRACT_REVIEW',
        title: 'NDA Review',
      })

      expect(result.data?.credits_used).toBe(10000)
      expect(result.data?.credits_remaining).toBe(40000) // 50000 - 10000
    })

    it('should deduct credits via transaction', async () => {
      vi.mocked(authenticateSession).mockResolvedValue(mockSession as never)
      vi.mocked(createMatter).mockResolvedValue({
        matter: mockMatter as never,
        retainerRequired: true,
      })
      vi.mocked(prisma.$transaction).mockResolvedValue(undefined)

      await handleCreateMatter({
        session_token: 'sess_123',
        matter_type: 'CONTRACT_REVIEW',
        title: 'NDA Review',
      })

      expect(prisma.$transaction).toHaveBeenCalled()
    })
  })

  describe('tool definitions', () => {
    it('start_session tool should have correct schema', () => {
      expect(startSessionTool.name).toBe('start_session')
      expect(startSessionTool.inputSchema.required).toContain('api_key')
      expect(startSessionTool.inputSchema.properties.api_key).toBeDefined()
    })

    it('list_services tool should have correct schema', () => {
      expect(listServicesTool.name).toBe('list_services')
      expect(listServicesTool.inputSchema.required).toEqual([])
    })

    it('check_credits tool should have correct schema', () => {
      expect(checkCreditsTool.name).toBe('check_credits')
      expect(checkCreditsTool.inputSchema.required).toContain('session_token')
    })

    it('create_matter tool should have correct schema', () => {
      expect(createMatterTool.name).toBe('create_matter')
      expect(createMatterTool.inputSchema.required).toContain('session_token')
      expect(createMatterTool.inputSchema.required).toContain('matter_type')
      expect(createMatterTool.inputSchema.required).toContain('title')
      expect(createMatterTool.inputSchema.properties.matter_type.enum).toBeDefined()
    })
  })
})
