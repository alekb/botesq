import { describe, it, expect } from 'vitest'
import { submitDocumentSchema } from '../tools/submit-document.js'
import { MAX_FILE_SIZE } from '../services/storage.service.js'

const MAX_BASE64_LENGTH = Math.ceil(((MAX_FILE_SIZE * 4) / 3) * 1.1) + 16

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

  it('accepts MIME-wrapped base64 for a file that decodes under the limit', () => {
    // ~9.8MB of base64 wrapped with CRLF every 76 chars (~2.6% overhead) must
    // still pass — the decoded-size check in validateFile is authoritative.
    const rawLen = Math.floor((MAX_FILE_SIZE * 0.98 * 4) / 3)
    const unwrapped = 'a'.repeat(rawLen)
    const wrapped = (unwrapped.match(/.{1,76}/g) ?? []).join('\r\n')
    expect(wrapped.length).toBeGreaterThan(rawLen) // wrapping added chars
    const result = submitDocumentSchema.safeParse({ ...base, content_base64: wrapped })
    expect(result.success).toBe(true)
  })
})
