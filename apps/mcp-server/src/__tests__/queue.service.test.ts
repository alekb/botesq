import { describe, it, expect } from 'vitest'
import { COMPLEXITY_TO_ENUM } from '../services/queue.service.js'

// Prisma enum values the database actually accepts
const VALID_ENUM_VALUES = ['SIMPLE', 'STANDARD', 'COMPLEX', 'URGENT']

describe('COMPLEXITY_TO_ENUM', () => {
  it('covers every internal complexity level', () => {
    expect(Object.keys(COMPLEXITY_TO_ENUM).sort()).toEqual(['complex', 'moderate', 'simple'])
  })

  it('maps every level to a valid ConsultationComplexity enum value', () => {
    for (const value of Object.values(COMPLEXITY_TO_ENUM)) {
      expect(VALID_ENUM_VALUES).toContain(value)
    }
  })

  it("maps 'moderate' to STANDARD (the enum has no MODERATE member)", () => {
    expect(COMPLEXITY_TO_ENUM.moderate).toBe('STANDARD')
  })
})
