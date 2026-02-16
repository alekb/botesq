import { NextResponse } from 'next/server'
import { getCurrentAdminSession } from '@/lib/admin-auth/session'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const { admin } = await getCurrentAdminSession()

    if (!admin) {
      return NextResponse.json({ admin: null }, { status: 401 })
    }

    return NextResponse.json({ admin })
  } catch (error) {
    logger.error('Failed to get admin', { error: String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
