import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DocumentStatus, DocumentAnalysisStatus } from '@botesq/database'

// Mock prisma
vi.mock('@botesq/database', async () => {
  const actual = await vi.importActual('@botesq/database')
  return {
    ...actual,
    prisma: {
      document: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
      matter: {
        findFirst: vi.fn(),
      },
    },
  }
})

// Mock storage service
vi.mock('../services/storage.service.js', () => ({
  uploadFile: vi.fn(),
  generateS3Key: vi.fn(),
  getDownloadUrl: vi.fn(),
  validateFile: vi.fn(),
  isStorageConfigured: vi.fn(),
}))

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: vi.fn().mockReturnValue('ABCD1234'),
}))

import { prisma } from '@botesq/database'
import {
  uploadFile,
  generateS3Key,
  getDownloadUrl,
  validateFile,
  isStorageConfigured,
} from '../services/storage.service.js'
import {
  submitDocument,
  getDocument,
  getDocumentDownloadUrl,
  listDocuments,
  updateDocumentAnalysis,
  deleteDocument,
} from '../services/document.service.js'
import { ApiError } from '../types.js'

describe('document.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default to valid file
    vi.mocked(validateFile).mockReturnValue({ valid: true })
    // Default to S3 configured
    vi.mocked(isStorageConfigured).mockReturnValue(true)
  })

  describe('submitDocument', () => {
    const baseDocument = {
      id: 'doc_internal_123',
      externalId: 'DOC-ABCD1234',
      operatorId: 'op_123',
      matterId: null,
      filename: 'test.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
      pageCount: 1,
      s3Key: 'operators/op_123/DOC-ABCD1234/test.pdf',
      s3Bucket: 'botesq-documents',
      documentType: null,
      notes: null,
      analysis: null,
      analysisStatus: DocumentAnalysisStatus.PENDING,
      analyzedAt: null,
      confidenceScore: null,
      attorneyReviewRecommended: false,
      status: DocumentStatus.ACTIVE,
      createdAt: new Date(),
    }

    beforeEach(() => {
      vi.mocked(generateS3Key).mockReturnValue('operators/op_123/DOC-ABCD1234/test.pdf')
      vi.mocked(uploadFile).mockResolvedValue({
        key: 'operators/op_123/DOC-ABCD1234/test.pdf',
        bucket: 'botesq-documents',
      })
    })

    it('should validate file before upload', async () => {
      vi.mocked(validateFile).mockReturnValue({ valid: true })
      vi.mocked(prisma.document.create).mockResolvedValue(baseDocument as never)

      await submitDocument({
        operatorId: 'op_123',
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        content: Buffer.from('test content'),
      })

      expect(validateFile).toHaveBeenCalled()
    })

    it('should reject invalid files', async () => {
      vi.mocked(validateFile).mockReturnValue({ valid: false, reason: 'File type not allowed' })

      await expect(
        submitDocument({
          operatorId: 'op_123',
          filename: 'test.exe',
          mimeType: 'application/x-executable',
          content: Buffer.from('test'),
        })
      ).rejects.toThrow(ApiError)
      await expect(
        submitDocument({
          operatorId: 'op_123',
          filename: 'test.exe',
          mimeType: 'application/x-executable',
          content: Buffer.from('test'),
        })
      ).rejects.toThrow('File type not allowed')
    })

    it('should validate matter exists if matterId provided', async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue({
        id: 'matter_123',
        operatorId: 'op_123',
      } as never)
      vi.mocked(prisma.document.create).mockResolvedValue({
        ...baseDocument,
        matterId: 'matter_123',
      } as never)

      await submitDocument({
        operatorId: 'op_123',
        matterId: 'matter_123',
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        content: Buffer.from('test'),
      })

      expect(prisma.matter.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ id: 'matter_123' }, { externalId: 'matter_123' }],
          operatorId: 'op_123',
        },
      })
    })

    it('should throw error if matter not found', async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue(null)

      await expect(
        submitDocument({
          operatorId: 'op_123',
          matterId: 'nonexistent',
          filename: 'test.pdf',
          mimeType: 'application/pdf',
          content: Buffer.from('test'),
        })
      ).rejects.toThrow('Matter not found')
    })

    it("should enforce row-level security for matter (cannot link to other operator's matter)", async () => {
      vi.mocked(prisma.matter.findFirst).mockResolvedValue(null) // Not found for this operator

      await expect(
        submitDocument({
          operatorId: 'op_123',
          matterId: 'matter_other_operator',
          filename: 'test.pdf',
          mimeType: 'application/pdf',
          content: Buffer.from('test'),
        })
      ).rejects.toThrow('Matter not found')
    })

    it('should upload file to S3 when configured', async () => {
      vi.mocked(isStorageConfigured).mockReturnValue(true)
      vi.mocked(prisma.document.create).mockResolvedValue(baseDocument as never)

      await submitDocument({
        operatorId: 'op_123',
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        content: Buffer.from('test content'),
      })

      expect(uploadFile).toHaveBeenCalled()
    })

    it('should handle base64 content', async () => {
      vi.mocked(prisma.document.create).mockResolvedValue(baseDocument as never)

      const base64Content = Buffer.from('test content').toString('base64')
      await submitDocument({
        operatorId: 'op_123',
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        content: base64Content, // String content
      })

      expect(prisma.document.create).toHaveBeenCalled()
    })

    it('should use local placeholder when S3 not configured', async () => {
      vi.mocked(isStorageConfigured).mockReturnValue(false)
      vi.mocked(prisma.document.create).mockResolvedValue({
        ...baseDocument,
        s3Key: 'local/op_123/DOC-ABCD1234',
        s3Bucket: 'local',
      } as never)

      await submitDocument({
        operatorId: 'op_123',
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        content: Buffer.from('test'),
      })

      expect(uploadFile).not.toHaveBeenCalled()
      expect(prisma.document.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          s3Key: expect.stringContaining('local/'),
          s3Bucket: 'local',
        }),
      })
    })

    it('should generate unique document ID', async () => {
      vi.mocked(prisma.document.create).mockResolvedValue(baseDocument as never)

      await submitDocument({
        operatorId: 'op_123',
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        content: Buffer.from('test'),
      })

      expect(prisma.document.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          externalId: 'DOC-ABCD1234',
        }),
      })
    })

    it('should estimate page count for PDFs', async () => {
      vi.mocked(prisma.document.create).mockResolvedValue(baseDocument as never)

      // 9000 bytes ~= 3 pages (assuming ~3KB per page)
      await submitDocument({
        operatorId: 'op_123',
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        content: Buffer.alloc(9000),
      })

      expect(prisma.document.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          pageCount: 3,
        }),
      })
    })

    it('should set initial analysis status to PENDING', async () => {
      vi.mocked(prisma.document.create).mockResolvedValue(baseDocument as never)

      await submitDocument({
        operatorId: 'op_123',
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        content: Buffer.from('test'),
      })

      expect(prisma.document.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          analysisStatus: DocumentAnalysisStatus.PENDING,
        }),
      })
    })

    it('should set initial status to ACTIVE', async () => {
      vi.mocked(prisma.document.create).mockResolvedValue(baseDocument as never)

      await submitDocument({
        operatorId: 'op_123',
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        content: Buffer.from('test'),
      })

      expect(prisma.document.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: DocumentStatus.ACTIVE,
        }),
      })
    })

    it('should include document type and notes if provided', async () => {
      vi.mocked(prisma.document.create).mockResolvedValue({
        ...baseDocument,
        documentType: 'CONTRACT',
        notes: 'Important document',
      } as never)

      await submitDocument({
        operatorId: 'op_123',
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        content: Buffer.from('test'),
        documentType: 'CONTRACT',
        notes: 'Important document',
      })

      expect(prisma.document.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          documentType: 'CONTRACT',
          notes: 'Important document',
        }),
      })
    })
  })

  describe('getDocument', () => {
    const baseDocument = {
      id: 'doc_internal_123',
      externalId: 'DOC-ABCD1234',
      operatorId: 'op_123',
      filename: 'test.pdf',
      status: DocumentStatus.ACTIVE,
    }

    it('should return document when found by internal ID', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(baseDocument as never)

      const result = await getDocument('doc_internal_123', 'op_123')

      expect(result).not.toBeNull()
    })

    it('should return document when found by external ID', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(baseDocument as never)

      await getDocument('DOC-ABCD1234', 'op_123')

      expect(prisma.document.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ id: 'DOC-ABCD1234' }, { externalId: 'DOC-ABCD1234' }],
          operatorId: 'op_123',
          status: DocumentStatus.ACTIVE,
        },
      })
    })

    it('should return null if document not found', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(null)

      const result = await getDocument('nonexistent', 'op_123')

      expect(result).toBeNull()
    })

    it('should enforce row-level security (operator isolation)', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(null)

      const result = await getDocument('doc_internal_123', 'op_attacker')

      expect(prisma.document.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          operatorId: 'op_attacker',
        }),
      })
      expect(result).toBeNull()
    })

    it('should NOT return deleted documents', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(null)

      await getDocument('doc_internal_123', 'op_123')

      expect(prisma.document.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: DocumentStatus.ACTIVE,
        }),
      })
    })
  })

  describe('getDocumentDownloadUrl', () => {
    const baseDocument = {
      id: 'doc_internal_123',
      externalId: 'DOC-ABCD1234',
      operatorId: 'op_123',
      s3Key: 'operators/op_123/DOC-ABCD1234/test.pdf',
      s3Bucket: 'botesq-documents',
      status: DocumentStatus.ACTIVE,
    }

    it('should return signed URL for S3 document', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(baseDocument as never)
      vi.mocked(isStorageConfigured).mockReturnValue(true)
      vi.mocked(getDownloadUrl).mockResolvedValue('https://s3.amazonaws.com/signed-url')

      const result = await getDocumentDownloadUrl('DOC-ABCD1234', 'op_123')

      expect(result).toBe('https://s3.amazonaws.com/signed-url')
      expect(getDownloadUrl).toHaveBeenCalledWith('operators/op_123/DOC-ABCD1234/test.pdf')
    })

    it('should return null if document not found', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(null)

      const result = await getDocumentDownloadUrl('nonexistent', 'op_123')

      expect(result).toBeNull()
    })

    it('should return null for local storage documents', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue({
        ...baseDocument,
        s3Bucket: 'local',
      } as never)

      const result = await getDocumentDownloadUrl('DOC-ABCD1234', 'op_123')

      expect(result).toBeNull()
    })

    it('should return null when S3 not configured', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(baseDocument as never)
      vi.mocked(isStorageConfigured).mockReturnValue(false)

      const result = await getDocumentDownloadUrl('DOC-ABCD1234', 'op_123')

      expect(result).toBeNull()
    })

    it("should enforce row-level security (cannot get URL for other operator's document)", async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(null)

      const result = await getDocumentDownloadUrl('DOC-ABCD1234', 'op_attacker')

      expect(result).toBeNull()
      expect(getDownloadUrl).not.toHaveBeenCalled()
    })
  })

  describe('listDocuments', () => {
    const mockDocuments = [
      {
        id: 'doc_1',
        externalId: 'DOC-111111',
        operatorId: 'op_123',
        status: DocumentStatus.ACTIVE,
      },
      {
        id: 'doc_2',
        externalId: 'DOC-222222',
        operatorId: 'op_123',
        status: DocumentStatus.ACTIVE,
      },
    ]

    it('should list documents for operator only', async () => {
      vi.mocked(prisma.document.findMany).mockResolvedValue(mockDocuments as never)
      vi.mocked(prisma.document.count).mockResolvedValue(2)

      const result = await listDocuments({ operatorId: 'op_123' })

      expect(prisma.document.findMany).toHaveBeenCalledWith({
        where: {
          operatorId: 'op_123',
          status: DocumentStatus.ACTIVE,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      })
      expect(result.documents).toHaveLength(2)
    })

    it('should filter by matterId when provided', async () => {
      vi.mocked(prisma.document.findMany).mockResolvedValue([mockDocuments[0]] as never)
      vi.mocked(prisma.document.count).mockResolvedValue(1)

      await listDocuments({ operatorId: 'op_123', matterId: 'matter_123' })

      expect(prisma.document.findMany).toHaveBeenCalledWith({
        where: {
          operatorId: 'op_123',
          status: DocumentStatus.ACTIVE,
          matterId: 'matter_123',
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      })
    })

    it('should only list ACTIVE documents', async () => {
      vi.mocked(prisma.document.findMany).mockResolvedValue(mockDocuments as never)
      vi.mocked(prisma.document.count).mockResolvedValue(2)

      await listDocuments({ operatorId: 'op_123' })

      expect(prisma.document.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: DocumentStatus.ACTIVE,
        }),
        orderBy: expect.any(Object),
        take: expect.any(Number),
        skip: expect.any(Number),
      })
    })

    it('should respect pagination', async () => {
      vi.mocked(prisma.document.findMany).mockResolvedValue(mockDocuments as never)
      vi.mocked(prisma.document.count).mockResolvedValue(50)

      await listDocuments({ operatorId: 'op_123', limit: 10, offset: 20 })

      expect(prisma.document.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 20,
      })
    })

    it('should return pagination metadata', async () => {
      vi.mocked(prisma.document.findMany).mockResolvedValue(mockDocuments as never)
      vi.mocked(prisma.document.count).mockResolvedValue(50)

      const result = await listDocuments({ operatorId: 'op_123', limit: 2, offset: 0 })

      expect(result.total).toBe(50)
      expect(result.hasMore).toBe(true)
    })
  })

  describe('updateDocumentAnalysis', () => {
    const baseDocument = {
      id: 'doc_internal_123',
      externalId: 'DOC-ABCD1234',
      operatorId: 'op_123',
      analysisStatus: DocumentAnalysisStatus.PENDING,
    }

    it('should update analysis status', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(baseDocument as never)
      vi.mocked(prisma.document.update).mockResolvedValue({
        ...baseDocument,
        analysisStatus: DocumentAnalysisStatus.COMPLETED,
      } as never)

      const result = await updateDocumentAnalysis('doc_internal_123', 'op_123', {
        status: DocumentAnalysisStatus.COMPLETED,
      })

      expect(result?.analysisStatus).toBe(DocumentAnalysisStatus.COMPLETED)
    })

    it('should return null if document not found', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(null)

      const result = await updateDocumentAnalysis('nonexistent', 'op_123', {
        status: DocumentAnalysisStatus.COMPLETED,
      })

      expect(result).toBeNull()
      expect(prisma.document.update).not.toHaveBeenCalled()
    })

    it('should enforce row-level security', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(null)

      const result = await updateDocumentAnalysis('doc_internal_123', 'op_attacker', {
        status: DocumentAnalysisStatus.COMPLETED,
      })

      expect(result).toBeNull()
    })

    it('should set analyzedAt when status is COMPLETED', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(baseDocument as never)
      vi.mocked(prisma.document.update).mockResolvedValue({
        ...baseDocument,
        analysisStatus: DocumentAnalysisStatus.COMPLETED,
        analyzedAt: new Date(),
      } as never)

      await updateDocumentAnalysis('doc_internal_123', 'op_123', {
        status: DocumentAnalysisStatus.COMPLETED,
      })

      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc_internal_123' },
        data: expect.objectContaining({
          analysisStatus: DocumentAnalysisStatus.COMPLETED,
          analyzedAt: expect.any(Date),
        }),
      })
    })

    it('should NOT set analyzedAt for non-COMPLETED status', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(baseDocument as never)
      vi.mocked(prisma.document.update).mockResolvedValue({
        ...baseDocument,
        analysisStatus: DocumentAnalysisStatus.FAILED,
      } as never)

      await updateDocumentAnalysis('doc_internal_123', 'op_123', {
        status: DocumentAnalysisStatus.FAILED,
      })

      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc_internal_123' },
        data: expect.objectContaining({
          analyzedAt: undefined,
        }),
      })
    })

    it('should update confidence score and attorney review flag', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(baseDocument as never)
      vi.mocked(prisma.document.update).mockResolvedValue({
        ...baseDocument,
        analysisStatus: DocumentAnalysisStatus.COMPLETED,
        confidenceScore: 0.85,
        attorneyReviewRecommended: true,
      } as never)

      await updateDocumentAnalysis('doc_internal_123', 'op_123', {
        status: DocumentAnalysisStatus.COMPLETED,
        confidenceScore: 0.85,
        attorneyReviewRecommended: true,
      })

      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc_internal_123' },
        data: expect.objectContaining({
          confidenceScore: 0.85,
          attorneyReviewRecommended: true,
        }),
      })
    })
  })

  describe('deleteDocument', () => {
    const baseDocument = {
      id: 'doc_internal_123',
      externalId: 'DOC-ABCD1234',
      operatorId: 'op_123',
      status: DocumentStatus.ACTIVE,
    }

    it('should soft delete document', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(baseDocument as never)
      vi.mocked(prisma.document.update).mockResolvedValue({
        ...baseDocument,
        status: DocumentStatus.DELETED,
      } as never)

      const result = await deleteDocument('doc_internal_123', 'op_123')

      expect(result).toBe(true)
      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc_internal_123' },
        data: {
          status: DocumentStatus.DELETED,
          deletedAt: expect.any(Date),
        },
      })
    })

    it('should return false if document not found', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(null)

      const result = await deleteDocument('nonexistent', 'op_123')

      expect(result).toBe(false)
      expect(prisma.document.update).not.toHaveBeenCalled()
    })

    it("should enforce row-level security (cannot delete other operator's document)", async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(null)

      const result = await deleteDocument('doc_internal_123', 'op_attacker')

      expect(result).toBe(false)
    })

    it('should set deletedAt timestamp', async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValue(baseDocument as never)
      vi.mocked(prisma.document.update).mockResolvedValue({
        ...baseDocument,
        status: DocumentStatus.DELETED,
        deletedAt: new Date(),
      } as never)

      await deleteDocument('doc_internal_123', 'op_123')

      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc_internal_123' },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
        }),
      })
    })
  })
})
