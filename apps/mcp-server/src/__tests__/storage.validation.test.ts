import { describe, it, expect } from 'vitest'
import { contentMatchesMimeType, validateFile } from '../services/storage.service.js'

const PDF = Buffer.from('%PDF-1.7 rest of file')
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0])
const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04])
const TEXT = Buffer.from('just some text')

describe('contentMatchesMimeType', () => {
  it('accepts matching signatures', () => {
    expect(contentMatchesMimeType(PDF, 'application/pdf')).toBe(true)
    expect(contentMatchesMimeType(PNG, 'image/png')).toBe(true)
    expect(contentMatchesMimeType(JPEG, 'image/jpeg')).toBe(true)
    expect(
      contentMatchesMimeType(
        ZIP,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
    ).toBe(true)
  })

  it('rejects content whose bytes do not match the claimed type', () => {
    expect(contentMatchesMimeType(TEXT, 'application/pdf')).toBe(false)
    expect(contentMatchesMimeType(PDF, 'image/png')).toBe(false)
  })

  it('exempts types without signatures (text/plain)', () => {
    expect(contentMatchesMimeType(TEXT, 'text/plain')).toBe(true)
  })
})

describe('validateFile with content', () => {
  it('rejects a renamed file whose content mismatches its extension', () => {
    const result = validateFile({
      filename: 'malware.pdf',
      mimeType: 'application/pdf',
      size: TEXT.length,
      content: TEXT,
    })
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('does not match')
  })

  it('accepts a genuine PDF', () => {
    const result = validateFile({
      filename: 'contract.pdf',
      mimeType: 'application/pdf',
      size: PDF.length,
      content: PDF,
    })
    expect(result.valid).toBe(true)
  })
})
