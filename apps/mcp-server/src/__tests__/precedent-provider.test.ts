import { describe, it, expect, beforeEach } from 'vitest'
import {
  NullPrecedentProvider,
  registerPrecedentProvider,
  getPrecedentProvider,
  resetPrecedentProvider,
  formatPrecedentContext,
} from '../services/precedent-provider'
import type { PrecedentProvider, PrecedentResult } from '../services/precedent-provider'
import type { ArbitrationInput } from '../services/resolve-arbitration.service'

describe('precedent-provider', () => {
  beforeEach(() => {
    resetPrecedentProvider()
  })

  describe('NullPrecedentProvider', () => {
    it('should have name "none"', () => {
      const provider = new NullPrecedentProvider()
      expect(provider.name).toBe('none')
    })

    it('should return empty cases', async () => {
      const provider = new NullPrecedentProvider()
      const result = await provider.findRelevantPrecedent({} as ArbitrationInput)
      expect(result.cases).toEqual([])
      expect(result.source).toBe('none')
    })

    it('should always be available', async () => {
      const provider = new NullPrecedentProvider()
      expect(await provider.isAvailable()).toBe(true)
    })
  })

  describe('provider registry', () => {
    it('should default to NullPrecedentProvider', () => {
      const provider = getPrecedentProvider()
      expect(provider.name).toBe('none')
    })

    it('should allow registering a custom provider', () => {
      const custom: PrecedentProvider = {
        name: 'test-provider',
        findRelevantPrecedent: async () => ({ cases: [], source: 'test' }),
        isAvailable: async () => true,
      }

      registerPrecedentProvider(custom)
      expect(getPrecedentProvider().name).toBe('test-provider')
    })

    it('should reset to NullPrecedentProvider', () => {
      const custom: PrecedentProvider = {
        name: 'test-provider',
        findRelevantPrecedent: async () => ({ cases: [], source: 'test' }),
        isAvailable: async () => true,
      }

      registerPrecedentProvider(custom)
      expect(getPrecedentProvider().name).toBe('test-provider')

      resetPrecedentProvider()
      expect(getPrecedentProvider().name).toBe('none')
    })

    it('should allow replacing an existing provider', () => {
      const first: PrecedentProvider = {
        name: 'first',
        findRelevantPrecedent: async () => ({ cases: [], source: 'first' }),
        isAvailable: async () => true,
      }
      const second: PrecedentProvider = {
        name: 'second',
        findRelevantPrecedent: async () => ({ cases: [], source: 'second' }),
        isAvailable: async () => true,
      }

      registerPrecedentProvider(first)
      registerPrecedentProvider(second)
      expect(getPrecedentProvider().name).toBe('second')
    })
  })

  describe('formatPrecedentContext', () => {
    it('should return empty string for no cases', () => {
      const result: PrecedentResult = { cases: [], source: 'test' }
      expect(formatPrecedentContext(result)).toBe('')
    })

    it('should format a single precedent case', () => {
      const result: PrecedentResult = {
        cases: [
          {
            caseId: 'AAA-2024-001',
            summary: 'Medical provider denied payment for chiropractic treatment',
            claimType: 'PAYMENT_DISPUTE',
            ruling: 'CLAIMANT',
            reasoning: 'Insurer failed to provide timely denial',
            keyFactors: ['Late denial', 'No IME scheduled'],
            relevanceScore: 0.88,
          },
        ],
        source: 'NY No-Fault Insurance Awards',
      }

      const formatted = formatPrecedentContext(result)

      expect(formatted).toContain('=== PRECEDENT CONTEXT ===')
      expect(formatted).toContain('AAA-2024-001')
      expect(formatted).toContain('88%')
      expect(formatted).toContain('PAYMENT_DISPUTE')
      expect(formatted).toContain('CLAIMANT')
      expect(formatted).toContain('Late denial; No IME scheduled')
      expect(formatted).toContain('NY No-Fault Insurance Awards')
      expect(formatted).toContain('Cite relevant precedent')
    })

    it('should format multiple precedent cases', () => {
      const result: PrecedentResult = {
        cases: [
          {
            caseId: 'CASE-001',
            summary: 'First case',
            claimType: 'TYPE_A',
            ruling: 'CLAIMANT',
            reasoning: 'Reasoning 1',
            keyFactors: ['Factor 1'],
            relevanceScore: 0.95,
          },
          {
            caseId: 'CASE-002',
            summary: 'Second case',
            claimType: 'TYPE_B',
            ruling: 'RESPONDENT',
            reasoning: 'Reasoning 2',
            keyFactors: ['Factor 2', 'Factor 3'],
            relevanceScore: 0.82,
          },
        ],
        source: 'Test Corpus',
        corpusSize: 5000,
      }

      const formatted = formatPrecedentContext(result)

      expect(formatted).toContain('2 past arbitration award(s)')
      expect(formatted).toContain('Precedent 1 (CASE-001')
      expect(formatted).toContain('Precedent 2 (CASE-002')
      expect(formatted).toContain('5,000 awards')
    })

    it('should include metadata when provided', () => {
      const result: PrecedentResult = {
        cases: [
          {
            caseId: 'CASE-001',
            summary: 'Test case',
            claimType: 'TYPE_A',
            ruling: 'CLAIMANT',
            reasoning: 'Test reasoning',
            keyFactors: ['Factor'],
            relevanceScore: 0.9,
            metadata: {
              date: '2024-03-15',
              amount: '$5,000',
              arbitrator: 'John Smith',
            },
          },
        ],
        source: 'Test',
      }

      const formatted = formatPrecedentContext(result)

      expect(formatted).toContain('Date: 2024-03-15')
      expect(formatted).toContain('Amount: $5,000')
      expect(formatted).toContain('Arbitrator: John Smith')
    })

    it('should not include corpus size note when not provided', () => {
      const result: PrecedentResult = {
        cases: [
          {
            caseId: 'CASE-001',
            summary: 'Test',
            claimType: 'TYPE_A',
            ruling: 'CLAIMANT',
            reasoning: 'Test',
            keyFactors: [],
            relevanceScore: 0.9,
          },
        ],
        source: 'Test',
      }

      const formatted = formatPrecedentContext(result)
      expect(formatted).not.toContain('corpus of')
    })
  })
})
