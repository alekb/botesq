import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdminSession } from '@/lib/admin-auth/session'
import { getSettlementById } from '@botesq/mcp-server/services/settlement.service'
import { getConnectAccountStatus } from '@botesq/mcp-server/services/stripe-connect.service'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { admin } = await getCurrentAdminSession()

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const settlement = await getSettlementById(id)

    if (!settlement) {
      return NextResponse.json({ error: 'Settlement not found' }, { status: 404 })
    }

    // If provider has Stripe Connect, fetch account status
    let connectStatus = null
    if (settlement.provider.stripeConnectId) {
      try {
        connectStatus = await getConnectAccountStatus(settlement.provider.stripeConnectId)
      } catch {
        // If we can't fetch status, just return null
        connectStatus = null
      }
    }

    return NextResponse.json({
      settlement,
      connectStatus,
    })
  } catch (error) {
    console.error('Failed to get settlement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
