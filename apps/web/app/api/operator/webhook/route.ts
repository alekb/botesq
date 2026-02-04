import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@botesq/database'
import { getCurrentSession } from '@/lib/auth/session'

/**
 * Generate a new webhook secret
 */
function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString('hex')}`
}

/**
 * GET /api/operator/webhook - Get webhook configuration
 */
export async function GET() {
  const { operator } = await getCurrentSession()

  if (!operator) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    webhookUrl: operator.webhookUrl || null,
    hasSecret: !!operator.webhookSecret,
    webhookSecretPreview: operator.webhookSecret
      ? `${operator.webhookSecret.substring(0, 10)}...`
      : null,
  })
}

/**
 * PUT /api/operator/webhook - Update webhook URL
 */
export async function PUT(request: NextRequest) {
  const { operator } = await getCurrentSession()

  if (!operator) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { webhookUrl } = body

  // Allow clearing the webhook
  if (!webhookUrl) {
    await prisma.operator.update({
      where: { id: operator.id },
      data: { webhookUrl: null, webhookSecret: null },
    })

    return NextResponse.json({
      webhookUrl: null,
      hasSecret: false,
      webhookSecretPreview: null,
    })
  }

  // Validate URL
  try {
    const url = new URL(webhookUrl)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return NextResponse.json(
        { error: 'Webhook URL must use HTTP or HTTPS protocol' },
        { status: 400 }
      )
    }

    // Require HTTPS except for localhost (development)
    const isLocalhost =
      url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1'

    if (url.protocol === 'http:' && !isLocalhost) {
      return NextResponse.json(
        { error: 'Webhook URL must use HTTPS for security. HTTP is only allowed for localhost.' },
        { status: 400 }
      )
    }
  } catch {
    return NextResponse.json({ error: 'Invalid webhook URL' }, { status: 400 })
  }

  const webhookSecret = operator.webhookSecret || generateWebhookSecret()

  await prisma.operator.update({
    where: { id: operator.id },
    data: { webhookUrl, webhookSecret },
  })

  return NextResponse.json({
    webhookUrl,
    hasSecret: true,
    webhookSecretPreview: `${webhookSecret.substring(0, 10)}...`,
    // Only show full secret on first creation
    webhookSecret: !operator.webhookSecret ? webhookSecret : undefined,
  })
}

/**
 * POST /api/operator/webhook - Regenerate webhook secret
 */
export async function POST(request: NextRequest) {
  const { operator } = await getCurrentSession()

  if (!operator) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  if (body.action !== 'regenerate') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const webhookSecret = generateWebhookSecret()

  await prisma.operator.update({
    where: { id: operator.id },
    data: { webhookSecret },
  })

  return NextResponse.json({
    webhookSecret,
    webhookSecretPreview: `${webhookSecret.substring(0, 10)}...`,
  })
}
