import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdminSession } from '@/lib/admin-auth/session'
import { logAdminAction, AdminActions } from '@/lib/admin-auth/audit'
import {
  processSettlement,
  retryFailedSettlement,
  getSettlementById,
} from '@botesq/mcp-server/services/settlement.service'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { admin } = await getCurrentAdminSession()

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const isRetry = body.retry === true

    // Get the settlement first to check if it exists
    const settlement = await getSettlementById(id)

    if (!settlement) {
      return NextResponse.json({ error: 'Settlement not found' }, { status: 404 })
    }

    // Process or retry based on status
    let result
    if (isRetry && settlement.status === 'FAILED') {
      result = await retryFailedSettlement(id)

      await logAdminAction(admin.id, AdminActions.SETTLEMENT_RETRY, 'ProviderSettlement', id, {
        providerId: settlement.providerId,
        success: result.success,
        error: result.error,
      })
    } else {
      if (settlement.status !== 'PENDING') {
        return NextResponse.json(
          { error: `Cannot process settlement with status ${settlement.status}` },
          { status: 400 }
        )
      }

      result = await processSettlement(id)

      await logAdminAction(admin.id, AdminActions.SETTLEMENT_PROCESS, 'ProviderSettlement', id, {
        providerId: settlement.providerId,
        success: result.success,
        transferId: result.transferId,
        error: result.error,
      })
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      transferId: result.transferId,
    })
  } catch (error) {
    console.error('Failed to process settlement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
