import { describe, it, expect } from 'vitest'
import {
  sanitizeFilename,
  validateFile,
  validateFileContent,
  MAX_FILE_SIZE,
} from '../services/storage.service.js'

describe('storage.service', () => {
  describe('sanitizeFilename', () => {
    it('should return filename unchanged if safe', () => {
      expect(sanitizeFilename('document.pdf')).toBe('document.pdf')
      expect(sanitizeFilename('my-file_123.docx')).toBe('my-file_123.docx')
    })

    it('should remove path traversal sequences', () => {
      expect(sanitizeFilename('../../../etc/passwd')).toBe('passwd')
      expect(sanitizeFilename('..\\..\\windows\\system32')).toBe('system32')
      expect(sanitizeFilename('foo/../bar/baz.txt')).toBe('baz.txt')
    })

    it('should remove null bytes', () => {
      expect(sanitizeFilename('file\x00.pdf')).toBe('file.pdf')
      expect(sanitizeFilename('test\0name.txt')).toBe('testname.txt')
    })

    it('should remove dangerous characters', () => {
      expect(sanitizeFilename('file<script>.pdf')).toBe('file_script_.pdf')
      expect(sanitizeFilename('doc|test.pdf')).toBe('doc_test.pdf')
      expect(sanitizeFilename('file:name?.txt')).toBe('file_name_.txt')
    })

    it('should collapse multiple underscores/spaces', () => {
      expect(sanitizeFilename('file   name.pdf')).toBe('file_name.pdf')
      expect(sanitizeFilename('doc___test.pdf')).toBe('doc_test.pdf')
    })

    it('should remove leading/trailing dots and spaces', () => {
      expect(sanitizeFilename('...hidden.pdf')).toBe('hidden.pdf')
      expect(sanitizeFilename('file.pdf...')).toBe('file.pdf')
      expect(sanitizeFilename('  spaced.pdf  ')).toBe('spaced.pdf')
    })

    it('should return default for empty filename', () => {
      expect(sanitizeFilename('')).toBe('unnamed_file')
      expect(sanitizeFilename('...')).toBe('unnamed_file')
      expect(sanitizeFilename('   ')).toBe('unnamed_file')
    })

    it('should truncate long filenames', () => {
      const longName = 'a'.repeat(300) + '.pdf'
      const sanitized = sanitizeFilename(longName)

      expect(sanitized.length).toBeLessThanOrEqual(255)
      expect(sanitized.endsWith('.pdf')).toBe(true)
    })
  })

  describe('validateFile', () => {
    it('should accept valid PDF file', () => {
      const result = validateFile({
        filename: 'document.pdf',
        mimeType: 'application/pdf',
        size: 1024,
      })

      expect(result.valid).toBe(true)
    })

    it('should accept valid Word document', () => {
      const result = validateFile({
        filename: 'document.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1024,
      })

      expect(result.valid).toBe(true)
    })

    it('should reject empty filename', () => {
      const result = validateFile({
        filename: '',
        mimeType: 'application/pdf',
        size: 1024,
      })

      expect(result.valid).toBe(false)
      expect(result.reason).toContain('Filename')
    })

    it('should reject disallowed MIME type', () => {
      const result = validateFile({
        filename: 'script.js',
        mimeType: 'application/javascript',
        size: 1024,
      })

      expect(result.valid).toBe(false)
      expect(result.reason).toContain('not allowed')
    })

    it('should reject file exceeding size limit', () => {
      const result = validateFile({
        filename: 'large.pdf',
        mimeType: 'application/pdf',
        size: MAX_FILE_SIZE + 1,
      })

      expect(result.valid).toBe(false)
      expect(result.reason).toContain('too large')
    })
  })

  describe('validateFileContent', () => {
    it('should accept valid PDF content', async () => {
      // PDF magic bytes: %PDF-
      const pdfBuffer = Buffer.from('%PDF-1.4 fake pdf content')

      const result = await validateFileContent(pdfBuffer)

      expect(result.valid).toBe(true)
      expect(result.detectedMime).toBe('application/pdf')
    })

    it('should accept valid PNG content', async () => {
      // PNG magic bytes
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      const pngBuffer = Buffer.concat([pngHeader, Buffer.alloc(100)])

      const result = await validateFileContent(pngBuffer)

      expect(result.valid).toBe(true)
      expect(result.detectedMime).toBe('image/png')
    })

    it('should accept valid JPEG content', async () => {
      // JPEG magic bytes: FF D8 FF
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0])
      const jpegBuffer = Buffer.concat([jpegHeader, Buffer.alloc(100)])

      const result = await validateFileContent(jpegBuffer)

      expect(result.valid).toBe(true)
      expect(result.detectedMime).toBe('image/jpeg')
    })

    it('should accept plain text content', async () => {
      const textBuffer = Buffer.from('Hello, this is a plain text file.\nWith multiple lines.')

      const result = await validateFileContent(textBuffer)

      expect(result.valid).toBe(true)
      expect(result.detectedMime).toBe('text/plain')
    })

    it('should reject file exceeding size limit', async () => {
      const largeBuffer = Buffer.alloc(MAX_FILE_SIZE + 1)

      const result = await validateFileContent(largeBuffer)

      expect(result.valid).toBe(false)
      expect(result.reason).toContain('too large')
    })

    it('should reject disallowed file type (executable)', async () => {
      // EXE magic bytes: MZ
      const exeBuffer = Buffer.from('MZ' + '\0'.repeat(100))

      const result = await validateFileContent(exeBuffer)

      expect(result.valid).toBe(false)
      expect(result.reason).toContain('not allowed')
    })

    it('should reject binary content claiming to be text', async () => {
      // Buffer with null bytes (indicates binary)
      const binaryBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04])

      const result = await validateFileContent(binaryBuffer)

      expect(result.valid).toBe(false)
    })
  })
})
