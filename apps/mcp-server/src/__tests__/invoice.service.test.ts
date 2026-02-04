import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma
vi.mock('@botesq/database', () => ({
  prisma: {
    invoice: {
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    creditTransaction: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn((callback) =>
      callback({
        invoice: {
          create: vi.fn(),
        },
      })
    ),
  },
}))

import { prisma } from '@botesq/database'
import {
  generateInvoiceNumber,
  generateMonthlyInvoice,
  getInvoice,
  listInvoices,
  markInvoiceSent,
  markInvoicePaid,
  voidInvoice,
  getOperatorsNeedingInvoices,
} from '../services/invoice.service.js'

describe('Invoice Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateInvoiceNumber', () => {
    it('should generate invoice number with correct format', async () => {
      vi.mocked(prisma.invoice.count).mockResolvedValue(0)

      const date = new Date('2026-02-15')
      const result = await generateInvoiceNumber(date)

      expect(result).toBe('INV-202602-00001')
      expect(prisma.invoice.count).toHaveBeenCalledWith({
        where: {
          invoiceNumber: {
            startsWith: 'INV-202602',
          },
        },
      })
    })

    it('should increment sequence number for existing invoices', async () => {
      vi.mocked(prisma.invoice.count).mockResolvedValue(5)

      // Use local time constructor to avoid UTC timezone issues
      const date = new Date(2026, 2, 1) // March 1, 2026 (month is 0-indexed)
      const result = await generateInvoiceNumber(date)

      expect(result).toBe('INV-202603-00006')
    })

    it('should handle single digit months correctly', async () => {
      vi.mocked(prisma.invoice.count).mockResolvedValue(0)

      const date = new Date('2026-01-15')
      const result = await generateInvoiceNumber(date)

      expect(result).toBe('INV-202601-00001')
    })
  })

  describe('generateMonthlyInvoice', () => {
    const mockOperator = {
      id: 'op_123',
      companyName: 'Test Company',
      email: 'test@example.com',
      billingAddress: { street: '123 Main St', city: 'San Francisco', state: 'CA', zip: '94102' },
    }

    const mockTransactions = [
      {
        id: 'tx_1',
        operatorId: 'op_123',
        type: 'DEDUCTION' as const,
        amount: -500,
        balanceBefore: 5000,
        balanceAfter: 4500,
        description: 'Legal Q&A',
        referenceType: 'legal_question',
        referenceId: 'lq_1',
        createdAt: new Date('2026-02-10'),
      },
      {
        id: 'tx_2',
        operatorId: 'op_123',
        type: 'DEDUCTION' as const,
        amount: -1000,
        balanceBefore: 4500,
        balanceAfter: 3500,
        description: 'Legal Q&A',
        referenceType: 'legal_question',
        referenceId: 'lq_2',
        createdAt: new Date('2026-02-15'),
      },
      {
        id: 'tx_3',
        operatorId: 'op_123',
        type: 'DEDUCTION' as const,
        amount: -2500,
        balanceBefore: 3500,
        balanceAfter: 1000,
        description: 'Document Review',
        referenceType: 'document',
        referenceId: 'doc_1',
        createdAt: new Date('2026-02-20'),
      },
    ]

    it('should generate invoice from credit transactions', async () => {
      vi.mocked(prisma.creditTransaction.findMany).mockResolvedValue(mockTransactions)
      vi.mocked(prisma.invoice.count).mockResolvedValue(0)

      const mockCreatedInvoice = {
        id: 'inv_123',
        invoiceNumber: 'INV-202602-00001',
        operatorId: 'op_123',
        periodStart: new Date('2026-02-01'),
        periodEnd: new Date('2026-03-01'),
        subtotalCredits: 4000,
        subtotalUsd: 4000, // cents
        taxUsd: 0,
        totalUsd: 4000,
        status: 'DRAFT',
        pdfUrl: null,
        sentAt: null,
        paidAt: null,
        notes: null,
        createdAt: new Date(),
        operator: mockOperator,
        lineItems: [
          {
            id: 'li_1',
            description: 'Legal Q&A Services',
            quantity: 2,
            unitCredits: 750, // (500 + 1000) / 2
            totalCredits: 1500,
            totalUsd: 1500,
          },
          {
            id: 'li_2',
            description: 'Document Review Services',
            quantity: 1,
            unitCredits: 2500,
            totalCredits: 2500,
            totalUsd: 2500,
          },
        ],
      }

      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        const tx = {
          invoice: {
            create: vi.fn().mockResolvedValue(mockCreatedInvoice),
          },
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return callback(tx as unknown as Parameters<typeof callback>[0])
      })

      const result = await generateMonthlyInvoice({
        operatorId: 'op_123',
        periodStart: new Date('2026-02-01'),
        periodEnd: new Date('2026-03-01'),
      })

      expect(result.invoiceNumber).toBe('INV-202602-00001')
      expect(result.status).toBe('DRAFT')
      expect(result.lineItems).toHaveLength(2)
      expect(prisma.creditTransaction.findMany).toHaveBeenCalledWith({
        where: {
          operatorId: 'op_123',
          type: 'DEDUCTION',
          createdAt: {
            gte: new Date('2026-02-01'),
            lt: new Date('2026-03-01'),
          },
        },
        orderBy: { createdAt: 'asc' },
      })
    })
  })

  describe('getInvoice', () => {
    it('should return invoice with details', async () => {
      const mockInvoice = {
        id: 'inv_123',
        invoiceNumber: 'INV-202602-00001',
        operatorId: 'op_123',
        periodStart: new Date('2026-02-01'),
        periodEnd: new Date('2026-03-01'),
        subtotalCredits: 1000,
        subtotalUsd: 1000,
        taxUsd: 0,
        totalUsd: 1000,
        status: 'DRAFT' as const,
        pdfUrl: null,
        pdfS3Key: null,
        sentAt: null,
        paidAt: null,
        voidedAt: null,
        notes: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        operator: {
          id: 'op_123',
          companyName: 'Test Co',
          email: 'test@example.com',
          billingAddress: null,
        },
        lineItems: [],
      }

      vi.mocked(prisma.invoice.findUnique).mockResolvedValue(mockInvoice)

      const result = await getInvoice('inv_123')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('inv_123')
      expect(result?.invoiceNumber).toBe('INV-202602-00001')
      expect(prisma.invoice.findUnique).toHaveBeenCalledWith({
        where: { id: 'inv_123' },
        include: {
          operator: {
            select: {
              id: true,
              companyName: true,
              email: true,
              billingAddress: true,
            },
          },
          lineItems: true,
        },
      })
    })

    it('should return null for non-existent invoice', async () => {
      vi.mocked(prisma.invoice.findUnique).mockResolvedValue(null)

      const result = await getInvoice('inv_nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('listInvoices', () => {
    it('should list invoices with pagination', async () => {
      const mockInvoices = [
        {
          id: 'inv_1',
          invoiceNumber: 'INV-202602-00001',
          operatorId: 'op_123',
          periodStart: new Date('2026-02-01'),
          periodEnd: new Date('2026-03-01'),
          subtotalCredits: 1000,
          subtotalUsd: 1000,
          taxUsd: 0,
          totalUsd: 1000,
          status: 'PAID',
          createdAt: new Date(),
          _count: { lineItems: 3 },
        },
      ]

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.invoice.findMany).mockResolvedValue(
        mockInvoices as unknown as Awaited<ReturnType<typeof prisma.invoice.findMany>>
      )
      vi.mocked(prisma.invoice.count).mockResolvedValue(1)

      const result = await listInvoices('op_123', { limit: 10, offset: 0 })

      expect(result.invoices).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.invoices[0]?.lineItemCount).toBe(3)
    })

    it('should filter by status', async () => {
      vi.mocked(prisma.invoice.findMany).mockResolvedValue([])
      vi.mocked(prisma.invoice.count).mockResolvedValue(0)

      await listInvoices('op_123', { status: 'PAID' })

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            operatorId: 'op_123',
            status: 'PAID',
          },
        })
      )
    })
  })

  describe('markInvoiceSent', () => {
    it('should update invoice status to SENT', async () => {
      const mockUpdatedInvoice = {
        id: 'inv_123',
        invoiceNumber: 'INV-202602-00001',
        operatorId: 'op_123',
        periodStart: new Date('2026-02-01'),
        periodEnd: new Date('2026-03-01'),
        subtotalCredits: 1000,
        subtotalUsd: 1000,
        taxUsd: 0,
        totalUsd: 1000,
        status: 'SENT' as const,
        pdfUrl: null,
        pdfS3Key: null,
        sentAt: new Date(),
        paidAt: null,
        voidedAt: null,
        notes: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        operator: {
          id: 'op_123',
          companyName: 'Test Co',
          email: 'test@example.com',
          billingAddress: null,
        },
        lineItems: [],
      }

      vi.mocked(prisma.invoice.update).mockResolvedValue(mockUpdatedInvoice)

      const result = await markInvoiceSent('inv_123')

      expect(result.status).toBe('SENT')
      expect(result.sentAt).not.toBeNull()
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv_123' },
        data: {
          status: 'SENT',
          sentAt: expect.any(Date),
        },
        include: expect.any(Object),
      })
    })
  })

  describe('markInvoicePaid', () => {
    it('should update invoice status to PAID', async () => {
      const mockUpdatedInvoice = {
        id: 'inv_123',
        invoiceNumber: 'INV-202602-00001',
        operatorId: 'op_123',
        periodStart: new Date('2026-02-01'),
        periodEnd: new Date('2026-03-01'),
        subtotalCredits: 1000,
        subtotalUsd: 1000,
        taxUsd: 0,
        totalUsd: 1000,
        status: 'PAID' as const,
        pdfUrl: null,
        pdfS3Key: null,
        sentAt: new Date(),
        paidAt: new Date(),
        voidedAt: null,
        notes: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        operator: {
          id: 'op_123',
          companyName: 'Test Co',
          email: 'test@example.com',
          billingAddress: null,
        },
        lineItems: [],
      }

      vi.mocked(prisma.invoice.update).mockResolvedValue(mockUpdatedInvoice)

      const result = await markInvoicePaid('inv_123')

      expect(result.status).toBe('PAID')
      expect(result.paidAt).not.toBeNull()
    })
  })

  describe('voidInvoice', () => {
    it('should update invoice status to VOID', async () => {
      const mockUpdatedInvoice = {
        id: 'inv_123',
        invoiceNumber: 'INV-202602-00001',
        operatorId: 'op_123',
        periodStart: new Date('2026-02-01'),
        periodEnd: new Date('2026-03-01'),
        subtotalCredits: 1000,
        subtotalUsd: 1000,
        taxUsd: 0,
        totalUsd: 1000,
        status: 'VOID' as const,
        pdfUrl: null,
        pdfS3Key: null,
        sentAt: null,
        paidAt: null,
        voidedAt: new Date(),
        notes: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        operator: {
          id: 'op_123',
          companyName: 'Test Co',
          email: 'test@example.com',
          billingAddress: null,
        },
        lineItems: [],
      }

      vi.mocked(prisma.invoice.update).mockResolvedValue(mockUpdatedInvoice)

      const result = await voidInvoice('inv_123')

      expect(result.status).toBe('VOID')
    })
  })

  describe('getOperatorsNeedingInvoices', () => {
    it('should return operators with deductions but no invoices', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.creditTransaction.findMany).mockResolvedValue([
        { operatorId: 'op_1' },
        { operatorId: 'op_2' },
        { operatorId: 'op_3' },
      ] as unknown as Awaited<ReturnType<typeof prisma.creditTransaction.findMany>>)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.invoice.findMany).mockResolvedValue([
        { operatorId: 'op_1' },
      ] as unknown as Awaited<ReturnType<typeof prisma.invoice.findMany>>)

      const result = await getOperatorsNeedingInvoices(
        new Date('2026-02-01'),
        new Date('2026-03-01')
      )

      expect(result).toEqual(['op_2', 'op_3'])
    })

    it('should return empty array if all operators have invoices', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.creditTransaction.findMany).mockResolvedValue([
        { operatorId: 'op_1' },
      ] as unknown as Awaited<ReturnType<typeof prisma.creditTransaction.findMany>>)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.invoice.findMany).mockResolvedValue([
        { operatorId: 'op_1' },
      ] as unknown as Awaited<ReturnType<typeof prisma.invoice.findMany>>)

      const result = await getOperatorsNeedingInvoices(
        new Date('2026-02-01'),
        new Date('2026-03-01')
      )

      expect(result).toEqual([])
    })
  })
})
