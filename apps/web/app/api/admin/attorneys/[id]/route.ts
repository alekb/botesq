import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@botesq/database'
import { getCurrentAdminSession } from '@/lib/admin-auth/session'
import { logAdminAction, AdminActions } from '@/lib/admin-auth/audit'

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.enum(['ASSOCIATE', 'SENIOR', 'PARTNER', 'ADMIN']).optional(),
  barNumber: z.string().nullable().optional(),
  barState: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
})

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { admin } = await getCurrentAdminSession()

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const attorney = await prisma.attorney.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        barNumber: true,
        barState: true,
        role: true,
        totpEnabled: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            consultations: true,
            assignments: true,
          },
        },
        consultations: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            completedAt: true,
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!attorney) {
      return NextResponse.json({ error: 'Attorney not found' }, { status: 404 })
    }

    // Log the view action
    await logAdminAction(admin.id, AdminActions.ATTORNEY_VIEW, 'ATTORNEY', attorney.id, {
      email: attorney.email,
    })

    return NextResponse.json({ attorney })
  } catch (error) {
    console.error('Failed to get attorney:', error)
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

    // Check attorney exists
    const existing = await prisma.attorney.findUnique({
      where: { id },
      select: { id: true, email: true, status: true, role: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Attorney not found' }, { status: 404 })
    }

    // Prevent self-demotion from admin
    if (id === admin.id && result.data.role && result.data.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'You cannot remove your own admin privileges' },
        { status: 400 }
      )
    }

    // Prevent self-suspension
    if (id === admin.id && result.data.status && result.data.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'You cannot suspend your own account' }, { status: 400 })
    }

    const { firstName, lastName, role, barNumber, barState, status } = result.data

    // Determine action type for audit
    let action: string = AdminActions.ATTORNEY_UPDATE
    if (status === 'SUSPENDED' && existing.status !== 'SUSPENDED') {
      action = AdminActions.ATTORNEY_SUSPEND
    } else if (status === 'ACTIVE' && existing.status === 'SUSPENDED') {
      action = AdminActions.ATTORNEY_REACTIVATE
    }

    // Update attorney
    const attorney = await prisma.attorney.update({
      where: { id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(role && { role }),
        ...(barNumber !== undefined && { barNumber }),
        ...(barState !== undefined && { barState }),
        ...(status && { status }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        barNumber: true,
        barState: true,
        status: true,
        totpEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Log the action
    await logAdminAction(admin.id, action, 'ATTORNEY', attorney.id, {
      email: attorney.email,
      changes: result.data,
    })

    return NextResponse.json({ attorney })
  } catch (error) {
    console.error('Failed to update attorney:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
