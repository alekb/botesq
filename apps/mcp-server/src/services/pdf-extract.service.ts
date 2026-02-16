import pdfParse from 'pdf-parse'

// Maximum extracted text length (50,000 chars — covers ~20 pages of dense text)
export const MAX_EXTRACTED_TEXT_LENGTH = 50_000

export interface PdfExtractionResult {
  text: string
  pageCount: number
  truncated: boolean
}

/**
 * Extract text content from a PDF buffer.
 * Returns the extracted text, page count, and whether it was truncated.
 */
export async function extractTextFromPdf(pdfBuffer: Buffer): Promise<PdfExtractionResult> {
  const result = await pdfParse(pdfBuffer)

  const rawText = result.text.trim()
  const truncated = rawText.length > MAX_EXTRACTED_TEXT_LENGTH

  return {
    text: truncated ? rawText.slice(0, MAX_EXTRACTED_TEXT_LENGTH) : rawText,
    pageCount: result.numpages,
    truncated,
  }
}

/**
 * Detect MIME type from filename extension.
 */
export function detectMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    txt: 'text/plain',
    md: 'text/markdown',
    json: 'application/json',
    csv: 'text/csv',
  }
  return mimeMap[ext ?? ''] ?? 'application/octet-stream'
}

/**
 * Extract text from a file based on its MIME type.
 * Supports PDF and plain text formats.
 */
export async function extractTextFromFile(
  buffer: Buffer,
  filename: string
): Promise<PdfExtractionResult> {
  const mimeType = detectMimeType(filename)

  if (mimeType === 'application/pdf') {
    return extractTextFromPdf(buffer)
  }

  // For text-based formats, decode directly
  if (mimeType.startsWith('text/') || mimeType === 'application/json') {
    const text = buffer.toString('utf-8').trim()
    const truncated = text.length > MAX_EXTRACTED_TEXT_LENGTH
    return {
      text: truncated ? text.slice(0, MAX_EXTRACTED_TEXT_LENGTH) : text,
      pageCount: 1,
      truncated,
    }
  }

  throw new Error(`Unsupported file type: ${mimeType} (${filename})`)
}
