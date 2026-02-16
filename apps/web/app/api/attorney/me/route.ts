import { NextResponse } from 'next/server'
import { getCurrentAttorneySession } from '@/lib/attorney-auth/session'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const { attorney } = await getCurrentAttorneySession()

    if (!attorney) {
      return NextResponse.json({ attorney: null }, { status: 401 })
    }

    return NextResponse.json({ attorney })
  } catch (error) {
    logger.error('Failed to get attorney', { error: String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
