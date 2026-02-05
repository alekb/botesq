import type { InvoiceDetail } from './invoice.service.js'

/**
 * Generate HTML content for an invoice
 * This can be used for:
 * - Rendering in a browser for print-to-PDF
 * - Server-side PDF generation with puppeteer/playwright
 * - Email content
 */
export function generateInvoiceHtml(invoice: InvoiceDetail): string {
  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)

  const formatCredits = (credits: number) => credits.toLocaleString()

  const billingAddress = invoice.operator.billingAddress as {
    street?: string
    city?: string
    state?: string
    zip?: string
    country?: string
  } | null

  const lineItemsHtml = invoice.lineItems
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCredits(item.unitCredits)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCredits(item.totalCredits)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.totalUsd)}</td>
      </tr>
    `
    )
    .join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1f2937;
      background: #ffffff;
      padding: 40px;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #3b82f6;
    }
    .logo {
      font-size: 28px;
      font-weight: 700;
      color: #3b82f6;
    }
    .logo span {
      color: #1f2937;
    }
    .invoice-title {
      text-align: right;
    }
    .invoice-title h1 {
      font-size: 32px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 8px;
    }
    .invoice-number {
      font-size: 16px;
      color: #6b7280;
    }
    .details-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    .details-block {
      flex: 1;
    }
    .details-block h3 {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
      margin-bottom: 8px;
    }
    .details-block p {
      margin-bottom: 4px;
    }
    .details-block .company-name {
      font-weight: 600;
      font-size: 16px;
    }
    .period-info {
      background: #f9fafb;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 32px;
    }
    .period-info p {
      margin-bottom: 4px;
    }
    .period-info strong {
      color: #374151;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 32px;
    }
    thead th {
      background: #f9fafb;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
      border-bottom: 2px solid #e5e7eb;
    }
    thead th:nth-child(2),
    thead th:nth-child(3),
    thead th:nth-child(4),
    thead th:nth-child(5) {
      text-align: right;
    }
    thead th:nth-child(2) {
      text-align: center;
    }
    .totals {
      display: flex;
      justify-content: flex-end;
    }
    .totals-table {
      width: 300px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .totals-row.total {
      font-size: 18px;
      font-weight: 700;
      border-bottom: none;
      border-top: 2px solid #1f2937;
      padding-top: 12px;
      margin-top: 8px;
    }
    .notes {
      margin-top: 40px;
      padding: 16px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .notes h3 {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-draft { background: #fef3c7; color: #92400e; }
    .status-sent { background: #dbeafe; color: #1e40af; }
    .status-paid { background: #d1fae5; color: #065f46; }
    .status-void { background: #fee2e2; color: #991b1b; }
    .status-overdue { background: #fee2e2; color: #991b1b; }
    @media print {
      body { padding: 20px; }
      .invoice-container { max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="logo">Bot<span>Esq</span></div>
      <div class="invoice-title">
        <h1>INVOICE</h1>
        <p class="invoice-number">${invoice.invoiceNumber}</p>
        <p style="margin-top: 8px;">
          <span class="status-badge status-${invoice.status.toLowerCase()}">${invoice.status}</span>
        </p>
      </div>
    </div>

    <div class="details-section">
      <div class="details-block">
        <h3>From</h3>
        <p class="company-name">BotEsq</p>
        <p>123 Legal Street</p>
        <p>San Francisco, CA 94102</p>
        <p>United States</p>
        <p style="margin-top: 8px;">billing@botesq.io</p>
      </div>
      <div class="details-block" style="text-align: right;">
        <h3>Bill To</h3>
        <p class="company-name">${invoice.operator.companyName}</p>
        ${billingAddress?.street ? `<p>${billingAddress.street}</p>` : ''}
        ${billingAddress?.city || billingAddress?.state || billingAddress?.zip ? `<p>${[billingAddress.city, billingAddress.state, billingAddress.zip].filter(Boolean).join(', ')}</p>` : ''}
        ${billingAddress?.country ? `<p>${billingAddress.country}</p>` : ''}
        <p style="margin-top: 8px;">${invoice.operator.email}</p>
      </div>
    </div>

    <div class="period-info">
      <p><strong>Invoice Date:</strong> ${formatDate(invoice.createdAt)}</p>
      <p><strong>Billing Period:</strong> ${formatDate(invoice.periodStart)} - ${formatDate(new Date(invoice.periodEnd.getTime() - 1))}</p>
      ${invoice.paidAt ? `<p><strong>Paid Date:</strong> ${formatDate(invoice.paidAt)}</p>` : ''}
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Qty</th>
          <th>Unit Credits</th>
          <th>Total Credits</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemsHtml}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-table">
        <div class="totals-row">
          <span>Subtotal (${formatCredits(invoice.subtotalCredits)} credits)</span>
          <span>${formatCurrency(invoice.subtotalUsd)}</span>
        </div>
        ${
          invoice.taxUsd > 0
            ? `
        <div class="totals-row">
          <span>Tax</span>
          <span>${formatCurrency(invoice.taxUsd)}</span>
        </div>
        `
            : ''
        }
        <div class="totals-row total">
          <span>Total</span>
          <span>${formatCurrency(invoice.totalUsd)}</span>
        </div>
      </div>
    </div>

    ${
      invoice.notes
        ? `
    <div class="notes">
      <h3>Notes</h3>
      <p>${invoice.notes}</p>
    </div>
    `
        : ''
    }

    <div class="footer">
      <p>Thank you for using BotEsq!</p>
      <p style="margin-top: 8px;">Questions? Contact billing@botesq.io</p>
      <p style="margin-top: 16px; font-size: 11px;">
        BotEsq | San Francisco, CA | www.botesq.io
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Generate a plain text version of the invoice for email
 */
export function generateInvoiceText(invoice: InvoiceDetail): string {
  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)

  const formatCredits = (credits: number) => credits.toLocaleString()

  const lineItemsText = invoice.lineItems
    .map(
      (item) =>
        `  ${item.description}\n` +
        `    Qty: ${item.quantity} × ${formatCredits(item.unitCredits)} credits = ${formatCredits(item.totalCredits)} credits (${formatCurrency(item.totalUsd)})`
    )
    .join('\n\n')

  return `
INVOICE ${invoice.invoiceNumber}
${'='.repeat(50)}

From: BotEsq
To: ${invoice.operator.companyName} (${invoice.operator.email})

Invoice Date: ${formatDate(invoice.createdAt)}
Billing Period: ${formatDate(invoice.periodStart)} - ${formatDate(new Date(invoice.periodEnd.getTime() - 1))}
Status: ${invoice.status}

${'─'.repeat(50)}
LINE ITEMS
${'─'.repeat(50)}

${lineItemsText}

${'─'.repeat(50)}
SUMMARY
${'─'.repeat(50)}

Subtotal: ${formatCredits(invoice.subtotalCredits)} credits = ${formatCurrency(invoice.subtotalUsd)}
${invoice.taxUsd > 0 ? `Tax: ${formatCurrency(invoice.taxUsd)}\n` : ''}
TOTAL: ${formatCurrency(invoice.totalUsd)}

${'─'.repeat(50)}

${invoice.notes ? `Notes: ${invoice.notes}\n\n` : ''}
Thank you for using BotEsq!
Questions? Contact billing@botesq.io

BotEsq | www.botesq.io
  `.trim()
}
