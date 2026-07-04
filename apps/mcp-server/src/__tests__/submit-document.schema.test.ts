import { describe, it, expect } from 'vitest'
import { submitDocumentSchema } from '../tools/submit-document.js'
import { MAX_FILE_SIZE } from '../services/storage.service.js'

const MAX_BASE64_LENGTH = Math.ceil((MAX_FILE_SIZE * 4) / 3) + 4

const base = {
  session_token: 'sess_test',
  filename: 'contract.pdf',
}

describe('submitDocumentSchema content bounds', () => {
  it('accepts content within the base64 length bound', () => {
    const result = submitDocumentSchema.safeParse({
      ...base,
      content_base64: 'a'.repeat(1024),
    })
    expect(result.success).toBe(true)
  })

  it('rejects content exceeding the base64 length bound before any decoding', () => {
    const result = submitDocumentSchema.safeParse({
      ...base,
      content_base64: 'a'.repeat(MAX_BASE64_LENGTH + 1),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0]?.message).toContain('File too large')
    }
  })

  it('rejects empty content', () => {
    const result = submitDocumentSchema.safeParse({ ...base, content_base64: '' })
    expect(result.success).toBe(false)
  })
})
