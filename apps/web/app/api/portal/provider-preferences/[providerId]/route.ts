import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@botesq/database'
import { getCurrentSession } from '@/lib/auth/session'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ providerId: string }>
}

const preferenceSchema = z.object({
  enabled: z.boolean().optional(),
  priority: z.number().min(0).max(100).optional(),
  serviceTypes: z
    .array(
      z.enum([
        'LEGAL_QA',
        'DOCUMENT_REVIEW',
        'CONSULTATION',
        'CONTRACT_DRAFTING',
        'ENTITY_FORMATION',
        'TRADEMARK',
        'LITIGATION',
      ])
    )
    .optional(),
})

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { operator } = await getCurrentSession()

    if (!operator) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { providerId } = await params

    // Validate provider exists and is active
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { id: true, status: true, serviceTypes: true },
    })

    if (!provider || provider.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = preferenceSchema.parse(body)

    // If no serviceTypes provided, default to all of the provider's service types
    const serviceTypes = validatedData.serviceTypes ?? provider.serviceTypes

    // Upsert the preference
    const preference = await prisma.operatorProviderPreference.upsert({
      where: {
        operatorId_providerId: {
          operatorId: operator.id,
          providerId,
        },
      },
      create: {
        operatorId: operator.id,
        providerId,
        enabled: validatedData.enabled ?? true,
        priority: validatedData.priority ?? 0,
        serviceTypes,
      },
      update: {
        enabled: validatedData.enabled,
        priority: validatedData.priority,
        serviceTypes: validatedData.serviceTypes,
      },
    })

    return NextResponse.json(preference)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Failed to set provider preference:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { operator } = await getCurrentSession()

    if (!operator) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { providerId } = await params

    await prisma.operatorProviderPreference.delete({
      where: {
        operatorId_providerId: {
          operatorId: operator.id,
          providerId,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    // If preference doesn't exist, that's fine
    if ((error as { code?: string })?.code === 'P2025') {
      return NextResponse.json({ success: true })
    }
    console.error('Failed to delete provider preference:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
