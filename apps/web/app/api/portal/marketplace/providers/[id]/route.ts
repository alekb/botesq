import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@botesq/database'
import { getCurrentSession } from '@/lib/auth/session'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { operator } = await getCurrentSession()

    if (!operator) {
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
        status: true,
        jurisdictions: true,
        specialties: true,
        serviceTypes: true,
        avgResponseMins: true,
        qualityScore: true,
        services: {
          select: {
            id: true,
            providerId: true,
            serviceType: true,
            enabled: true,
            basePrice: true,
            priceModel: true,
            pricePerUnit: true,
            maxConcurrent: true,
            currentLoad: true,
            targetResponseMins: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    })

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    // Only show ACTIVE providers to operators
    if (provider.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    // Get operator's preference for this provider
    const preference = await prisma.operatorProviderPreference.findUnique({
      where: {
        operatorId_providerId: {
          operatorId: operator.id,
          providerId: id,
        },
      },
    })

    return NextResponse.json({
      ...provider,
      preference: preference ?? undefined,
    })
  } catch (error) {
    console.error('Failed to get provider:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
