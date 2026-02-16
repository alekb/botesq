import { NextResponse } from 'next/server'
import { prisma } from '@botesq/database'
import { getCurrentSession } from '@/lib/auth/session'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const { operator } = await getCurrentSession()

    if (!operator) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preferences = await prisma.operatorProviderPreference.findMany({
      where: { operatorId: operator.id },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json(preferences)
  } catch (error) {
    logger.error('Failed to list provider preferences', { error: String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
