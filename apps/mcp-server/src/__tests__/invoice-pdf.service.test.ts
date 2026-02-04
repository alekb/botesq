import { describe, it, expect } from 'vitest'
import { generateInvoiceHtml, generateInvoiceText } from '../services/invoice-pdf.service.js'
import type { InvoiceDetail } from '../services/invoice.service.js'

describe('Invoice PDF Service', () => {
  const mockInvoice: InvoiceDetail = {
    id: 'inv_123',
    invoiceNumber: 'INV-202602-00001',
    periodStart: new Date('2026-02-01'),
    periodEnd: new Date('2026-03-01'),
    subtotalCredits: 4000,
    subtotalUsd: 4000, // $40.00 in cents
    taxUsd: 0,
    totalUsd: 4000,
    status: 'SENT',
    lineItemCount: 2,
    createdAt: new Date('2026-03-01'),
    pdfUrl: null,
    sentAt: new Date('2026-03-01'),
    paidAt: null,
    notes: 'Thank you for your business!',
    operator: {
      id: 'op_123',
      companyName: 'Acme Corporation',
      email: 'billing@acme.com',
      billingAddress: {
        street: '123 Main Street',
        city: 'San Francisco',
        state: 'CA',
        zip: '94102',
        country: 'United States',
      },
    },
    lineItems: [
      {
        id: 'li_1',
        description: 'Legal Q&A Services',
        quantity: 3,
        unitCredits: 500,
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

  describe('generateInvoiceHtml', () => {
    it('should generate valid HTML with invoice number', () => {
      const html = generateInvoiceHtml(mockInvoice)

      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('INV-202602-00001')
    })

    it('should include company name and email', () => {
      const html = generateInvoiceHtml(mockInvoice)

      expect(html).toContain('Acme Corporation')
      expect(html).toContain('billing@acme.com')
    })

    it('should include billing address', () => {
      const html = generateInvoiceHtml(mockInvoice)

      expect(html).toContain('123 Main Street')
      expect(html).toContain('San Francisco')
      expect(html).toContain('CA')
      expect(html).toContain('94102')
    })

    it('should include line items', () => {
      const html = generateInvoiceHtml(mockInvoice)

      expect(html).toContain('Legal Q&A Services')
      expect(html).toContain('Document Review Services')
    })

    it('should include totals', () => {
      const html = generateInvoiceHtml(mockInvoice)

      expect(html).toContain('4,000') // credits
      expect(html).toContain('$40.00') // total
    })

    it('should include status badge', () => {
      const html = generateInvoiceHtml(mockInvoice)

      expect(html).toContain('status-sent')
      expect(html).toContain('SENT')
    })

    it('should include notes when present', () => {
      const html = generateInvoiceHtml(mockInvoice)

      expect(html).toContain('Thank you for your business!')
    })

    it('should handle invoice without billing address', () => {
      const invoiceNoBilling = {
        ...mockInvoice,
        operator: {
          ...mockInvoice.operator,
          billingAddress: null,
        },
      }

      const html = generateInvoiceHtml(invoiceNoBilling)

      expect(html).toContain('Acme Corporation')
      expect(html).not.toContain('undefined')
    })

    it('should handle paid invoice', () => {
      const paidInvoice = {
        ...mockInvoice,
        status: 'PAID',
        paidAt: new Date('2026-03-05'),
      }

      const html = generateInvoiceHtml(paidInvoice)

      expect(html).toContain('status-paid')
      expect(html).toContain('Paid Date')
    })
  })

  describe('generateInvoiceText', () => {
    it('should generate plain text invoice', () => {
      const text = generateInvoiceText(mockInvoice)

      expect(text).toContain('INVOICE INV-202602-00001')
      expect(text).toContain('Acme Corporation')
    })

    it('should include line items', () => {
      const text = generateInvoiceText(mockInvoice)

      expect(text).toContain('Legal Q&A Services')
      expect(text).toContain('Document Review Services')
      expect(text).toContain('Qty: 3')
      expect(text).toContain('Qty: 1')
    })

    it('should include totals', () => {
      const text = generateInvoiceText(mockInvoice)

      expect(text).toContain('4,000 credits')
      expect(text).toContain('$40.00')
    })

    it('should include notes when present', () => {
      const text = generateInvoiceText(mockInvoice)

      expect(text).toContain('Notes: Thank you for your business!')
    })

    it('should handle invoice without notes', () => {
      const invoiceNoNotes = {
        ...mockInvoice,
        notes: null,
      }

      const text = generateInvoiceText(invoiceNoNotes)

      expect(text).not.toContain('Notes:')
    })

    it('should include billing period', () => {
      const text = generateInvoiceText(mockInvoice)

      expect(text).toContain('Billing Period:')
      expect(text).toContain('February')
    })

    it('should include status', () => {
      const text = generateInvoiceText(mockInvoice)

      expect(text).toContain('Status: SENT')
    })
  })
})
