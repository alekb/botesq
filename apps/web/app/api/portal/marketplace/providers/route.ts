import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@botesq/database'
import { getCurrentSession } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  try {
    const { operator } = await getCurrentSession()

    if (!operator) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const serviceType = searchParams.get('serviceType') ?? undefined
    const jurisdiction = searchParams.get('jurisdiction') ?? undefined
    const search = searchParams.get('search') ?? undefined
    const limit = parseInt(searchParams.get('limit') ?? '20', 10)
    const offset = parseInt(searchParams.get('offset') ?? '0', 10)

    // Build where clause - only show ACTIVE providers
    const where: Record<string, unknown> = {
      status: 'ACTIVE',
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (serviceType) {
      where.serviceTypes = { has: serviceType }
    }

    if (jurisdiction) {
      where.jurisdictions = { has: jurisdiction }
    }

    // Get providers with their services
    const [providers, total] = await Promise.all([
      prisma.provider.findMany({
        where,
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
        orderBy: [{ qualityScore: 'desc' }, { name: 'asc' }],
        skip: offset,
        take: limit,
      }),
      prisma.provider.count({ where }),
    ])

    // Get operator's preferences for these providers
    const providerIds = providers.map((p) => p.id)
    const preferences = await prisma.operatorProviderPreference.findMany({
      where: {
        operatorId: operator.id,
        providerId: { in: providerIds },
      },
    })

    const preferenceMap = new Map(preferences.map((p) => [p.providerId, p]))

    // Combine provider data with preferences
    const providersWithPreferences = providers.map((provider) => ({
      ...provider,
      preference: preferenceMap.get(provider.id) ?? undefined,
    }))

    return NextResponse.json({
      providers: providersWithPreferences,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Failed to list marketplace providers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
