import { prisma, DocumentStatus, DocumentAnalysisStatus } from '@botesq/database'
import {
  uploadFile,
  generateS3Key,
  getDownloadUrl,
  validateFile,
  isStorageConfigured,
} from './storage.service.js'
import { ApiError } from '../types.js'
import { generateDocumentId } from '../utils/secure-id.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

export interface DocumentWithDetails {
  id: string
  externalId: string
  operatorId: string
  matterId: string | null
  filename: string
  mimeType: string
  fileSize: number
  pageCount: number | null
  s3Key: string
  s3Bucket: string
  documentType: string | null
  notes: string | null
  analysis: unknown
  analysisStatus: DocumentAnalysisStatus
  analyzedAt: Date | null
  confidenceScore: number | null
  attorneyReviewRecommended: boolean
  status: DocumentStatus
  createdAt: Date
}

/**
 * Submit a new document
 */
export async function submitDocument(params: {
  operatorId: string
  matterId?: string
  filename: string
  mimeType: string
  content: Buffer | string
  documentType?: string
  notes?: string
}): Promise<DocumentWithDetails> {
  const { operatorId, matterId, filename, mimeType, content, documentType, notes } = params

  // Convert string content to Buffer if needed
  const contentBuffer = typeof content === 'string' ? Buffer.from(content, 'base64') : content
  const fileSize = contentBuffer.length

  // Validate file
  const validation = validateFile({ filename, mimeType, size: fileSize })
  if (!validation.valid) {
    throw new ApiError('INVALID_FILE', validation.reason ?? 'Invalid file', 400)
  }

  // Validate matter exists if provided
  if (matterId) {
    const matter = await prisma.matter.findFirst({
      where: {
        OR: [{ id: matterId }, { externalId: matterId }],
        operatorId,
      },
    })
    if (!matter) {
      throw new ApiError('MATTER_NOT_FOUND', 'Matter not found', 404)
    }
  }

  const externalId = generateDocumentId()

  // Upload to S3 if configured
  let s3Key = ''
  let s3Bucket = ''

  if (isStorageConfigured()) {
    const key = generateS3Key(operatorId, externalId, filename)
    const upload = await uploadFile({
      key,
      body: contentBuffer,
      contentType: mimeType,
      metadata: {
        operatorId,
        documentId: externalId,
        originalFilename: filename,
      },
    })
    s3Key = upload.key
    s3Bucket = upload.bucket
  } else {
    // For development without S3, use placeholder
    s3Key = `local/${operatorId}/${externalId}`
    s3Bucket = 'local'
    logger.warn('S3 not configured, using local placeholder')
  }

  // Estimate page count for PDFs (rough estimate)
  let pageCount: number | null = null
  if (mimeType === 'application/pdf') {
    // Rough estimate: ~3KB per page for typical PDF
    pageCount = Math.max(1, Math.ceil(fileSize / 3000))
  }

  // Create document record
  const document = await prisma.document.create({
    data: {
      externalId,
      operatorId,
      matterId: matterId ?? null,
      filename,
      mimeType,
      fileSize,
      pageCount,
      s3Key,
      s3Bucket,
      documentType,
      notes,
      analysisStatus: DocumentAnalysisStatus.PENDING,
      status: DocumentStatus.ACTIVE,
    },
  })

  logger.info(
    {
      documentId: document.externalId,
      operatorId,
      matterId,
      filename,
      fileSize,
    },
    'Document submitted'
  )

  return document
}

/**
 * Get document by ID
 */
export async function getDocument(
  documentId: string,
  operatorId: string
): Promise<DocumentWithDetails | null> {
  const document = await prisma.document.findFirst({
    where: {
      OR: [{ id: documentId }, { externalId: documentId }],
      operatorId,
      status: DocumentStatus.ACTIVE,
    },
  })

  return document
}

/**
 * Get document download URL
 */
export async function getDocumentDownloadUrl(
  documentId: string,
  operatorId: string
): Promise<string | null> {
  const document = await getDocument(documentId, operatorId)
  if (!document) {
    return null
  }

  if (!isStorageConfigured() || document.s3Bucket === 'local') {
    return null // Can't generate URL for local storage
  }

  return getDownloadUrl(document.s3Key)
}

/**
 * List documents for an operator
 */
export async function listDocuments(params: {
  operatorId: string
  matterId?: string
  limit?: number
  offset?: number
}): Promise<{
  documents: DocumentWithDetails[]
  total: number
  hasMore: boolean
}> {
  const { operatorId, matterId, limit = 20, offset = 0 } = params

  const where = {
    operatorId,
    status: DocumentStatus.ACTIVE,
    ...(matterId && { matterId }),
  }

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.document.count({ where }),
  ])

  return {
    documents,
    total,
    hasMore: offset + documents.length < total,
  }
}

/**
 * Update document analysis status
 * @param documentId - Document ID (internal or external)
 * @param operatorId - Operator ID for row-level security
 * @param analysis - Analysis results to update
 */
export async function updateDocumentAnalysis(
  documentId: string,
  operatorId: string,
  analysis: {
    status: DocumentAnalysisStatus
    results?: unknown
    confidenceScore?: number
    attorneyReviewRecommended?: boolean
  }
): Promise<DocumentWithDetails | null> {
  // Row-level security: only allow updating documents belonging to this operator
  const document = await prisma.document.findFirst({
    where: {
      OR: [{ id: documentId }, { externalId: documentId }],
      operatorId, // Security: ensure operator ownership
    },
  })

  if (!document) {
    return null
  }

  const updated = await prisma.document.update({
    where: { id: document.id },
    data: {
      analysisStatus: analysis.status,
      analysis: analysis.results as object,
      confidenceScore: analysis.confidenceScore,
      attorneyReviewRecommended: analysis.attorneyReviewRecommended,
      analyzedAt: analysis.status === DocumentAnalysisStatus.COMPLETED ? new Date() : undefined,
    },
  })

  logger.info(
    {
      documentId: updated.externalId,
      status: analysis.status,
    },
    'Document analysis updated'
  )

  return updated
}

/**
 * Delete a document (soft delete)
 */
export async function deleteDocument(documentId: string, operatorId: string): Promise<boolean> {
  const document = await prisma.document.findFirst({
    where: {
      OR: [{ id: documentId }, { externalId: documentId }],
      operatorId,
    },
  })

  if (!document) {
    return false
  }

  await prisma.document.update({
    where: { id: document.id },
    data: {
      status: DocumentStatus.DELETED,
      deletedAt: new Date(),
    },
  })

  logger.info(
    {
      documentId: document.externalId,
      operatorId,
    },
    'Document deleted'
  )

  return true
}
