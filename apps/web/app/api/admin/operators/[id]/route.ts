import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@botesq/database'
import { getCurrentAdminSession } from '@/lib/admin-auth/session'
import { logAdminAction, AdminActions } from '@/lib/admin-auth/audit'

const updateSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  creditBalance: z.number().int().min(0).optional(),
})

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { admin } = await getCurrentAdminSession()

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const operator = await prisma.operator.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        companyName: true,
        companyType: true,
        jurisdiction: true,
        phone: true,
        billingAddress: true,
        emailVerified: true,
        emailVerifiedAt: true,
        tosAcceptedAt: true,
        tosVersion: true,
        creditBalance: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            agents: true,
            apiKeys: true,
            matters: true,
            credits: true,
          },
        },
        agents: {
          select: {
            id: true,
            identifier: true,
            firstSeenAt: true,
          },
          take: 10,
          orderBy: { firstSeenAt: 'desc' },
        },
        credits: {
          select: {
            id: true,
            type: true,
            amount: true,
            description: true,
            createdAt: true,
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!operator) {
      return NextResponse.json({ error: 'Operator not found' }, { status: 404 })
    }

    // Log the view action
    await logAdminAction(admin.id, AdminActions.OPERATOR_VIEW, 'OPERATOR', operator.id, {
      email: operator.email,
    })

    return NextResponse.json({ operator })
  } catch (error) {
    console.error('Failed to get operator:', error)
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

    const { status, creditBalance } = result.data

    // Check operator exists
    const existing = await prisma.operator.findUnique({
      where: { id },
      select: { id: true, email: true, status: true, creditBalance: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Operator not found' }, { status: 404 })
    }

    // Determine action type for audit
    let action: string = AdminActions.OPERATOR_UPDATE
    if (status === 'SUSPENDED' && existing.status !== 'SUSPENDED') {
      action = AdminActions.OPERATOR_SUSPEND
    } else if (status === 'ACTIVE' && existing.status === 'SUSPENDED') {
      action = AdminActions.OPERATOR_REACTIVATE
    }

    // Update operator
    const operator = await prisma.operator.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(creditBalance !== undefined && { creditBalance }),
      },
      select: {
        id: true,
        email: true,
        companyName: true,
        status: true,
        creditBalance: true,
      },
    })

    // Log the action
    await logAdminAction(admin.id, action, 'OPERATOR', operator.id, {
      email: operator.email,
      changes: {
        ...(status && { status: { from: existing.status, to: status } }),
        ...(creditBalance !== undefined && {
          creditBalance: { from: existing.creditBalance, to: creditBalance },
        }),
      },
    })

    return NextResponse.json({ operator })
  } catch (error) {
    console.error('Failed to update operator:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
