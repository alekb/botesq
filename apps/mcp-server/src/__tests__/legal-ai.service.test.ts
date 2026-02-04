import { describe, it, expect } from 'vitest'
import { validateLegalQuestion } from '../services/legal-ai.service.js'

describe('legal-ai.service', () => {
  describe('validateLegalQuestion', () => {
    describe('valid questions', () => {
      it('should accept normal legal questions', () => {
        const result = validateLegalQuestion(
          'What are the requirements for forming an LLC in Delaware?'
        )

        expect(result.valid).toBe(true)
        expect(result.reason).toBeUndefined()
      })

      it('should accept questions at minimum length', () => {
        const result = validateLegalQuestion('Is this legal?') // 13 chars

        expect(result.valid).toBe(true)
      })

      it('should accept long detailed questions', () => {
        const question =
          'I am starting a new business that will operate across multiple states. ' +
          'We plan to sell software as a service to both consumers and businesses. ' +
          'What legal structure would you recommend, and what are the key compliance ' +
          'considerations for a multi-state SaaS company?'

        const result = validateLegalQuestion(question)

        expect(result.valid).toBe(true)
      })

      it('should accept questions about contracts', () => {
        const result = validateLegalQuestion(
          'What clauses should I include in a software license agreement?'
        )

        expect(result.valid).toBe(true)
      })

      it('should accept questions about intellectual property', () => {
        const result = validateLegalQuestion('How do I trademark my business name?')

        expect(result.valid).toBe(true)
      })

      it('should accept questions about employment law', () => {
        const result = validateLegalQuestion(
          'What are the requirements for employee non-compete agreements in California?'
        )

        expect(result.valid).toBe(true)
      })
    })

    describe('invalid questions', () => {
      it('should reject empty questions', () => {
        const result = validateLegalQuestion('')

        expect(result.valid).toBe(false)
        expect(result.reason).toBe('Question is too short')
      })

      it('should reject whitespace-only questions', () => {
        const result = validateLegalQuestion('   ')

        expect(result.valid).toBe(false)
        expect(result.reason).toBe('Question is too short')
      })

      it('should reject questions that are too short', () => {
        const result = validateLegalQuestion('Legal?') // 6 chars

        expect(result.valid).toBe(false)
        expect(result.reason).toBe('Question is too short')
      })

      it('should reject questions exceeding maximum length', () => {
        const longQuestion = 'x'.repeat(10001)

        const result = validateLegalQuestion(longQuestion)

        expect(result.valid).toBe(false)
        expect(result.reason).toBe('Question exceeds maximum length')
      })

      it('should reject questions at exactly maximum + 1 length', () => {
        const question = 'x'.repeat(10001)

        const result = validateLegalQuestion(question)

        expect(result.valid).toBe(false)
      })

      it('should accept questions at exactly maximum length', () => {
        const question = 'x'.repeat(10000)

        const result = validateLegalQuestion(question)

        expect(result.valid).toBe(true)
      })
    })

    describe('inappropriate content detection', () => {
      it('should reject questions about hiding activities', () => {
        const result = validateLegalQuestion('How to hide income from the IRS?')

        expect(result.valid).toBe(false)
        expect(result.reason).toContain('illegal activities')
      })

      it('should reject questions about concealing', () => {
        const result = validateLegalQuestion('How to conceal assets during bankruptcy?')

        expect(result.valid).toBe(false)
        expect(result.reason).toContain('illegal activities')
      })

      it('should reject questions about evading', () => {
        const result = validateLegalQuestion('How to evade debt collectors legally?')

        expect(result.valid).toBe(false)
        expect(result.reason).toContain('illegal activities')
      })

      it('should reject questions about avoiding taxes', () => {
        const result = validateLegalQuestion('Best way to avoid paying taxes on crypto')

        expect(result.valid).toBe(false)
        expect(result.reason).toContain('illegal activities')
      })

      it('should reject questions about avoiding detection', () => {
        const result = validateLegalQuestion('How to avoid detection when moving money offshore')

        expect(result.valid).toBe(false)
        expect(result.reason).toContain('illegal activities')
      })

      it('should reject questions seeking illegal methods', () => {
        const result = validateLegalQuestion('What is the illegal way to terminate an employee?')

        expect(result.valid).toBe(false)
        expect(result.reason).toContain('illegal activities')
      })

      it('should accept legitimate tax questions', () => {
        const result = validateLegalQuestion('What are legal tax deductions for small businesses?')

        expect(result.valid).toBe(true)
      })

      it('should accept legitimate asset protection questions', () => {
        const result = validateLegalQuestion(
          'What are legitimate asset protection strategies using trusts?'
        )

        expect(result.valid).toBe(true)
      })
    })

    describe('edge cases', () => {
      it('should handle questions with special characters', () => {
        const result = validateLegalQuestion(
          "What's the difference between LLC & Corp for tax purposes?"
        )

        expect(result.valid).toBe(true)
      })

      it('should handle questions with unicode', () => {
        const result = validateLegalQuestion(
          'Can I use the trademark symbol ™ before registration?'
        )

        expect(result.valid).toBe(true)
      })

      it('should handle multi-line questions', () => {
        const result = validateLegalQuestion(
          'I have a question about employment law.\nSpecifically about wrongful termination.'
        )

        expect(result.valid).toBe(true)
      })

      it('should be case-insensitive for inappropriate content', () => {
        const result1 = validateLegalQuestion('HOW TO HIDE money from creditors')
        const result2 = validateLegalQuestion('How To Hide money from creditors')
        const result3 = validateLegalQuestion('how to hide money from creditors')

        expect(result1.valid).toBe(false)
        expect(result2.valid).toBe(false)
        expect(result3.valid).toBe(false)
      })
    })
  })
})
