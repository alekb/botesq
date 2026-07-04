import { describe, it, expect } from 'vitest'
import { MatterType } from '@botesq/database'
import { createMatterSchema, createMatterTool } from '../tools/create-matter.js'

const base = { session_token: 'sess_test', title: 'Test matter' }

describe('createMatterSchema matter_type parity', () => {
  it('accepts every value in the Prisma MatterType enum', () => {
    for (const value of Object.values(MatterType)) {
      const result = createMatterSchema.safeParse({ ...base, matter_type: value })
      expect(result.success, `expected ${value} to be accepted`).toBe(true)
    }
  })

  it('rejects types that are not in the enum (the old crash cases)', () => {
    for (const value of ['IP_PATENT', 'EMPLOYMENT', 'NONSENSE']) {
      const result = createMatterSchema.safeParse({ ...base, matter_type: value })
      expect(result.success, `expected ${value} to be rejected`).toBe(false)
    }
  })

  it('advertises exactly the Prisma enum values in its MCP inputSchema', () => {
    const advertised = createMatterTool.inputSchema.properties.matter_type.enum
    expect([...advertised].sort()).toEqual(Object.values(MatterType).sort())
  })
})
