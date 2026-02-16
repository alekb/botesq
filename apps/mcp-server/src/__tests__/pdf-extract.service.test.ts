import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock pdf-parse
vi.mock('pdf-parse', () => ({
  default: vi.fn(),
}))

import pdfParse from 'pdf-parse'
import {
  extractTextFromPdf,
  extractTextFromFile,
  detectMimeType,
  MAX_EXTRACTED_TEXT_LENGTH,
} from '../services/pdf-extract.service.js'

const mockPdfParse = vi.mocked(pdfParse)

describe('pdf-extract.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('detectMimeType', () => {
    it('returns application/pdf for .pdf files', () => {
      expect(detectMimeType('contract.pdf')).toBe('application/pdf')
    })

    it('returns text/plain for .txt files', () => {
      expect(detectMimeType('notes.txt')).toBe('text/plain')
    })

    it('returns text/csv for .csv files', () => {
      expect(detectMimeType('data.csv')).toBe('text/csv')
    })

    it('returns application/json for .json files', () => {
      expect(detectMimeType('config.json')).toBe('application/json')
    })

    it('returns text/markdown for .md files', () => {
      expect(detectMimeType('readme.md')).toBe('text/markdown')
    })

    it('returns octet-stream for unknown extensions', () => {
      expect(detectMimeType('file.xyz')).toBe('application/octet-stream')
    })

    it('handles uppercase extensions', () => {
      expect(detectMimeType('CONTRACT.PDF')).toBe('application/pdf')
    })
  })

  describe('extractTextFromPdf', () => {
    it('extracts text from a PDF buffer', async () => {
      mockPdfParse.mockResolvedValue({
        text: 'This is the extracted PDF content.',
        numpages: 3,
        numrender: 3,
        info: {},
        metadata: null,
        version: '1.7',
      })

      const buffer = Buffer.from('fake pdf content')
      const result = await extractTextFromPdf(buffer)

      expect(result.text).toBe('This is the extracted PDF content.')
      expect(result.pageCount).toBe(3)
      expect(result.truncated).toBe(false)
      expect(mockPdfParse).toHaveBeenCalledWith(buffer)
    })

    it('truncates text exceeding MAX_EXTRACTED_TEXT_LENGTH', async () => {
      const longText = 'A'.repeat(MAX_EXTRACTED_TEXT_LENGTH + 1000)
      mockPdfParse.mockResolvedValue({
        text: longText,
        numpages: 50,
        numrender: 50,
        info: {},
        metadata: null,
        version: '1.7',
      })

      const buffer = Buffer.from('fake pdf content')
      const result = await extractTextFromPdf(buffer)

      expect(result.text.length).toBe(MAX_EXTRACTED_TEXT_LENGTH)
      expect(result.truncated).toBe(true)
      expect(result.pageCount).toBe(50)
    })

    it('trims whitespace from extracted text', async () => {
      mockPdfParse.mockResolvedValue({
        text: '  \n  Some content with whitespace  \n  ',
        numpages: 1,
        numrender: 1,
        info: {},
        metadata: null,
        version: '1.7',
      })

      const buffer = Buffer.from('fake pdf content')
      const result = await extractTextFromPdf(buffer)

      expect(result.text).toBe('Some content with whitespace')
    })
  })

  describe('extractTextFromFile', () => {
    it('delegates to extractTextFromPdf for PDF files', async () => {
      mockPdfParse.mockResolvedValue({
        text: 'PDF content here',
        numpages: 2,
        numrender: 2,
        info: {},
        metadata: null,
        version: '1.7',
      })

      const buffer = Buffer.from('fake pdf')
      const result = await extractTextFromFile(buffer, 'document.pdf')

      expect(result.text).toBe('PDF content here')
      expect(result.pageCount).toBe(2)
      expect(mockPdfParse).toHaveBeenCalled()
    })

    it('reads plain text files directly', async () => {
      const textContent = 'This is a plain text evidence file.'
      const buffer = Buffer.from(textContent)
      const result = await extractTextFromFile(buffer, 'notes.txt')

      expect(result.text).toBe(textContent)
      expect(result.pageCount).toBe(1)
      expect(result.truncated).toBe(false)
      expect(mockPdfParse).not.toHaveBeenCalled()
    })

    it('reads CSV files directly', async () => {
      const csvContent = 'date,amount,description\n2024-01-10,100,Payment'
      const buffer = Buffer.from(csvContent)
      const result = await extractTextFromFile(buffer, 'transactions.csv')

      expect(result.text).toBe(csvContent)
      expect(result.pageCount).toBe(1)
    })

    it('reads JSON files directly', async () => {
      const jsonContent = '{"key": "value"}'
      const buffer = Buffer.from(jsonContent)
      const result = await extractTextFromFile(buffer, 'data.json')

      expect(result.text).toBe(jsonContent)
    })

    it('reads Markdown files directly', async () => {
      const mdContent = '# Agreement\n\nTerms here.'
      const buffer = Buffer.from(mdContent)
      const result = await extractTextFromFile(buffer, 'agreement.md')

      expect(result.text).toBe(mdContent)
    })

    it('truncates long text files', async () => {
      const longContent = 'B'.repeat(MAX_EXTRACTED_TEXT_LENGTH + 500)
      const buffer = Buffer.from(longContent)
      const result = await extractTextFromFile(buffer, 'huge.txt')

      expect(result.text.length).toBe(MAX_EXTRACTED_TEXT_LENGTH)
      expect(result.truncated).toBe(true)
    })

    it('throws for unsupported file types', async () => {
      const buffer = Buffer.from('binary data')
      await expect(extractTextFromFile(buffer, 'image.png')).rejects.toThrow(
        'Unsupported file type'
      )
    })

    it('throws for unknown file types', async () => {
      const buffer = Buffer.from('data')
      await expect(extractTextFromFile(buffer, 'file.xyz')).rejects.toThrow('Unsupported file type')
    })
  })
})
