import { NextResponse } from 'next/server'
import { getCurrentAdminSession } from '@/lib/admin-auth/session'

export async function GET() {
  try {
    const { admin } = await getCurrentAdminSession()

    if (!admin) {
      return NextResponse.json({ admin: null }, { status: 401 })
    }

    return NextResponse.json({ admin })
  } catch (error) {
    console.error('Failed to get admin:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
