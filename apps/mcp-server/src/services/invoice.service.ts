import { prisma } from '@botesq/database'
import { creditsToUsd } from './credit.service.js'

// Invoice number format: INV-YYYYMM-XXXXX
const INVOICE_PREFIX = 'INV'

export interface InvoiceLineItemInput {
  description: string
  quantity: number
  unitCredits: number
  referenceType?: string
  referenceId?: string
}

export interface GenerateInvoiceOptions {
  operatorId: string
  periodStart: Date
  periodEnd: Date
  notes?: string
}

export interface InvoiceSummary {
  id: string
  invoiceNumber: string
  periodStart: Date
  periodEnd: Date
  subtotalCredits: number
  subtotalUsd: number
  taxUsd: number
  totalUsd: number
  status: string
  lineItemCount: number
  createdAt: Date
}

export interface InvoiceDetail extends InvoiceSummary {
  operator: {
    id: string
    companyName: string
    email: string
    billingAddress: unknown
  }
  lineItems: Array<{
    id: string
    description: string
    quantity: number
    unitCredits: number
    totalCredits: number
    totalUsd: number
  }>
  pdfUrl: string | null
  sentAt: Date | null
  paidAt: Date | null
  notes: string | null
}

/**
 * Generate a unique invoice number
 * Format: INV-YYYYMM-XXXXX (e.g., INV-202602-00001)
 */
export async function generateInvoiceNumber(periodEnd: Date): Promise<string> {
  const year = periodEnd.getFullYear()
  const month = String(periodEnd.getMonth() + 1).padStart(2, '0')
  const prefix = `${INVOICE_PREFIX}-${year}${month}`

  // Count existing invoices for this period
  const count = await prisma.invoice.count({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
  })

  const sequence = String(count + 1).padStart(5, '0')
  return `${prefix}-${sequence}`
}

/**
 * Generate a monthly invoice for an operator based on their credit transactions
 */
export async function generateMonthlyInvoice(
  options: GenerateInvoiceOptions
): Promise<InvoiceDetail> {
  const { operatorId, periodStart, periodEnd, notes } = options

  // Get all deduction transactions for the period
  const transactions = await prisma.creditTransaction.findMany({
    where: {
      operatorId,
      type: 'DEDUCTION',
      createdAt: {
        gte: periodStart,
        lt: periodEnd,
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  // Group transactions by reference type for line items
  const lineItemsMap = new Map<string, InvoiceLineItemInput>()

  for (const tx of transactions) {
    const key = tx.referenceType || 'other'
    const existing = lineItemsMap.get(key)

    // Amount is negative for deductions, so we negate it
    const credits = Math.abs(tx.amount)

    if (existing) {
      existing.quantity += 1
      existing.unitCredits = Math.round(
        (existing.unitCredits * (existing.quantity - 1) + credits) / existing.quantity
      )
    } else {
      lineItemsMap.set(key, {
        description: getLineItemDescription(tx.referenceType),
        quantity: 1,
        unitCredits: credits,
        referenceType: tx.referenceType || undefined,
      })
    }
  }

  // Convert to array and calculate totals
  const lineItems = Array.from(lineItemsMap.values()).map((item) => ({
    ...item,
    totalCredits: item.quantity * item.unitCredits,
    totalUsd: Math.round(creditsToUsd(item.quantity * item.unitCredits) * 100), // cents
  }))

  const subtotalCredits = lineItems.reduce((sum, item) => sum + item.totalCredits, 0)
  const subtotalUsd = lineItems.reduce((sum, item) => sum + item.totalUsd, 0)
  const taxUsd = 0 // No tax for now
  const totalUsd = subtotalUsd + taxUsd

  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber(periodEnd)

  // Create invoice with line items in a transaction
  const invoice = await prisma.$transaction(async (tx) => {
    const newInvoice = await tx.invoice.create({
      data: {
        operatorId,
        invoiceNumber,
        periodStart,
        periodEnd,
        subtotalCredits,
        subtotalUsd,
        taxUsd,
        totalUsd,
        status: 'DRAFT',
        notes,
        lineItems: {
          create: lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitCredits: item.unitCredits,
            totalCredits: item.totalCredits,
            totalUsd: item.totalUsd,
            referenceType: item.referenceType,
          })),
        },
      },
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

    return newInvoice
  })

  return formatInvoiceDetail(invoice)
}

/**
 * Get an invoice by ID
 */
export async function getInvoice(invoiceId: string): Promise<InvoiceDetail | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
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

  if (!invoice) {
    return null
  }

  return formatInvoiceDetail(invoice)
}

/**
 * Get an invoice by invoice number
 */
export async function getInvoiceByNumber(invoiceNumber: string): Promise<InvoiceDetail | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { invoiceNumber },
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

  if (!invoice) {
    return null
  }

  return formatInvoiceDetail(invoice)
}

/**
 * List invoices for an operator
 */
export async function listInvoices(
  operatorId: string,
  options: { limit?: number; offset?: number; status?: string } = {}
): Promise<{ invoices: InvoiceSummary[]; total: number }> {
  const { limit = 20, offset = 0, status } = options

  const where = {
    operatorId,
    ...(status ? { status: status as 'DRAFT' | 'SENT' | 'PAID' | 'VOID' | 'OVERDUE' } : {}),
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        _count: {
          select: { lineItems: true },
        },
      },
      orderBy: { periodEnd: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.invoice.count({ where }),
  ])

  return {
    invoices: invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      periodStart: inv.periodStart,
      periodEnd: inv.periodEnd,
      subtotalCredits: inv.subtotalCredits,
      subtotalUsd: inv.subtotalUsd,
      taxUsd: inv.taxUsd,
      totalUsd: inv.totalUsd,
      status: inv.status,
      lineItemCount: inv._count.lineItems,
      createdAt: inv.createdAt,
    })),
    total,
  }
}

/**
 * Mark an invoice as sent
 */
export async function markInvoiceSent(invoiceId: string): Promise<InvoiceDetail> {
  const invoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: 'SENT',
      sentAt: new Date(),
    },
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

  return formatInvoiceDetail(invoice)
}

/**
 * Mark an invoice as paid
 */
export async function markInvoicePaid(invoiceId: string): Promise<InvoiceDetail> {
  const invoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: 'PAID',
      paidAt: new Date(),
    },
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

  return formatInvoiceDetail(invoice)
}

/**
 * Void an invoice
 */
export async function voidInvoice(invoiceId: string): Promise<InvoiceDetail> {
  const invoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: 'VOID',
      voidedAt: new Date(),
    },
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

  return formatInvoiceDetail(invoice)
}

/**
 * Update invoice PDF URL after generation
 */
export async function updateInvoicePdf(
  invoiceId: string,
  pdfUrl: string,
  pdfS3Key: string
): Promise<void> {
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      pdfUrl,
      pdfS3Key,
    },
  })
}

/**
 * Get operators that need invoices generated for a given period
 */
export async function getOperatorsNeedingInvoices(
  periodStart: Date,
  periodEnd: Date
): Promise<string[]> {
  // Find operators with deductions in the period who don't have an invoice yet
  const operatorsWithDeductions = await prisma.creditTransaction.findMany({
    where: {
      type: 'DEDUCTION',
      createdAt: {
        gte: periodStart,
        lt: periodEnd,
      },
    },
    select: {
      operatorId: true,
    },
    distinct: ['operatorId'],
  })

  const operatorIds = operatorsWithDeductions.map((o) => o.operatorId)

  // Filter out operators who already have an invoice for this period
  const existingInvoices = await prisma.invoice.findMany({
    where: {
      operatorId: { in: operatorIds },
      periodStart: { gte: periodStart },
      periodEnd: { lte: periodEnd },
    },
    select: {
      operatorId: true,
    },
  })

  const operatorsWithInvoices = new Set(existingInvoices.map((i) => i.operatorId))

  return operatorIds.filter((id) => !operatorsWithInvoices.has(id))
}

/**
 * Generate invoices for all operators for a given month
 */
export async function generateAllMonthlyInvoices(
  year: number,
  month: number
): Promise<{ generated: number; errors: Array<{ operatorId: string; error: string }> }> {
  const periodStart = new Date(year, month - 1, 1, 0, 0, 0, 0)
  const periodEnd = new Date(year, month, 1, 0, 0, 0, 0)

  const operatorIds = await getOperatorsNeedingInvoices(periodStart, periodEnd)

  let generated = 0
  const errors: Array<{ operatorId: string; error: string }> = []

  for (const operatorId of operatorIds) {
    try {
      await generateMonthlyInvoice({
        operatorId,
        periodStart,
        periodEnd,
      })
      generated++
    } catch (error) {
      errors.push({
        operatorId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return { generated, errors }
}

// Helper functions

function getLineItemDescription(referenceType: string | null): string {
  switch (referenceType) {
    case 'legal_question':
      return 'Legal Q&A Services'
    case 'consultation':
      return 'Legal Consultation Services'
    case 'document':
      return 'Document Review Services'
    case 'matter':
      return 'Matter Management'
    default:
      return 'Legal Services'
  }
}

function formatInvoiceDetail(invoice: {
  id: string
  invoiceNumber: string
  periodStart: Date
  periodEnd: Date
  subtotalCredits: number
  subtotalUsd: number
  taxUsd: number
  totalUsd: number
  status: string
  pdfUrl: string | null
  sentAt: Date | null
  paidAt: Date | null
  notes: string | null
  createdAt: Date
  operator: {
    id: string
    companyName: string
    email: string
    billingAddress: unknown
  }
  lineItems: Array<{
    id: string
    description: string
    quantity: number
    unitCredits: number
    totalCredits: number
    totalUsd: number
  }>
}): InvoiceDetail {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    periodStart: invoice.periodStart,
    periodEnd: invoice.periodEnd,
    subtotalCredits: invoice.subtotalCredits,
    subtotalUsd: invoice.subtotalUsd,
    taxUsd: invoice.taxUsd,
    totalUsd: invoice.totalUsd,
    status: invoice.status,
    lineItemCount: invoice.lineItems.length,
    createdAt: invoice.createdAt,
    pdfUrl: invoice.pdfUrl,
    sentAt: invoice.sentAt,
    paidAt: invoice.paidAt,
    notes: invoice.notes,
    operator: invoice.operator,
    lineItems: invoice.lineItems.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitCredits: item.unitCredits,
      totalCredits: item.totalCredits,
      totalUsd: item.totalUsd,
    })),
  }
}
