import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@botesq/database'
import { hashPassword } from '@/lib/auth/password'
import { getCurrentAdminSession } from '@/lib/admin-auth/session'
import { logAdminAction, AdminActions } from '@/lib/admin-auth/audit'
import { logger } from '@/lib/logger'

const createSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['ASSOCIATE', 'SENIOR', 'PARTNER', 'ADMIN']),
  barNumber: z.string().optional(),
  barState: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { admin } = await getCurrentAdminSession()

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') ?? undefined
    const status = searchParams.get('status') ?? undefined
    const role = searchParams.get('role') ?? undefined
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const limit = parseInt(searchParams.get('limit') ?? '20', 10)
    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status && ['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
      where.status = status
    }

    if (role && ['ASSOCIATE', 'SENIOR', 'PARTNER', 'ADMIN'].includes(role)) {
      where.role = role
    }

    const [attorneys, total] = await Promise.all([
      prisma.attorney.findMany({
        where,
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
          _count: {
            select: {
              consultations: true,
              assignments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.attorney.count({ where }),
    ])

    return NextResponse.json({
      attorneys,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error('Failed to list attorneys', { error: String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { admin } = await getCurrentAdminSession()

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const result = createSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { email, password, firstName, lastName, role, barNumber, barState } = result.data

    // Check if email already exists
    const existing = await prisma.attorney.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'An attorney with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create attorney
    const attorney = await prisma.attorney.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        role,
        barNumber: barNumber || null,
        barState: barState || null,
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
        createdAt: true,
      },
    })

    // Log the action
    await logAdminAction(admin.id, AdminActions.ATTORNEY_CREATE, 'ATTORNEY', attorney.id, {
      email: attorney.email,
      role: attorney.role,
    })

    return NextResponse.json({ attorney }, { status: 201 })
  } catch (error) {
    logger.error('Failed to create attorney', { error: String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
