import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@botesq/database'
import { getCurrentAdminSession } from '@/lib/admin-auth/session'
import { logAdminAction, AdminActions } from '@/lib/admin-auth/audit'

const updateSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE']).optional(),
  reason: z.string().optional(),
})

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { admin } = await getCurrentAdminSession()

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const provider = await prisma.provider.findUnique({
      where: { id },
      select: {
        id: true,
        externalId: true,
        name: true,
        legalName: true,
        description: true,
        email: true,
        webhookUrl: true,
        jurisdictions: true,
        specialties: true,
        serviceTypes: true,
        maxConcurrent: true,
        avgResponseMins: true,
        qualityScore: true,
        revenueSharePct: true,
        stripeConnectId: true,
        status: true,
        verifiedAt: true,
        totpEnabled: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            requests: true,
            services: true,
            settlements: true,
          },
        },
        requests: {
          select: {
            id: true,
            serviceType: true,
            status: true,
            creditsCharged: true,
            createdAt: true,
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    // Log the view action
    await logAdminAction(admin.id, AdminActions.PROVIDER_VIEW, 'PROVIDER', provider.id, {
      email: provider.email,
    })

    return NextResponse.json({ provider })
  } catch (error) {
    console.error('Failed to get provider:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { admin } = await getCurrentAdminSession()

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const result = updateSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { status, reason } = result.data

    // Check provider exists
    const existing = await prisma.provider.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, status: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    // Determine action type for audit
    let action: string = AdminActions.PROVIDER_VIEW
    if (status === 'ACTIVE' && existing.status === 'PENDING_APPROVAL') {
      action = AdminActions.PROVIDER_APPROVE
    } else if (status === 'INACTIVE' && existing.status === 'PENDING_APPROVAL') {
      action = AdminActions.PROVIDER_REJECT
    } else if (status === 'SUSPENDED' && existing.status !== 'SUSPENDED') {
      action = AdminActions.PROVIDER_SUSPEND
    } else if (status === 'ACTIVE' && existing.status === 'SUSPENDED') {
      action = AdminActions.PROVIDER_REACTIVATE
    }

    // Update provider
    const provider = await prisma.provider.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(status === 'ACTIVE' &&
          existing.status === 'PENDING_APPROVAL' && { verifiedAt: new Date() }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        verifiedAt: true,
      },
    })

    // Log the action
    await logAdminAction(admin.id, action, 'PROVIDER', provider.id, {
      email: provider.email,
      name: provider.name,
      changes: {
        status: { from: existing.status, to: status },
      },
      ...(reason && { reason }),
    })

    return NextResponse.json({ provider })
  } catch (error) {
    console.error('Failed to update provider:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
