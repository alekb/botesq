'use client'

import { useEffect, useState, useCallback } from 'react'
import { PeriodSelector, EarningsSummary, SettlementHistory } from '@/components/provider/earnings'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { getProviderToken } from '@/lib/auth/provider-session'
import { getEarningsSummary, listSettlements } from '@/lib/api/provider-earnings'
import type { EarningsSummary as EarningsSummaryType, ProviderSettlement } from '@/types/provider'

type Period = 'day' | 'week' | 'month' | 'year'

export default function ProviderEarningsPage() {
  const [period, setPeriod] = useState<Period>('month')
  const [summary, setSummary] = useState<EarningsSummaryType | null>(null)
  const [settlements, setSettlements] = useState<ProviderSettlement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const PAGE_SIZE = 10

  const loadData = useCallback(async () => {
    const token = await getProviderToken()
    if (!token) return

    setIsLoading(true)
    setError(null)

    try {
      const [summaryData, settlementsData] = await Promise.all([
        getEarningsSummary(token, period),
        listSettlements(token, { limit: PAGE_SIZE, offset: 0 }),
      ])

      setSummary(summaryData)
      setSettlements(settlementsData.items)
      setHasMore(settlementsData.items.length === PAGE_SIZE && settlementsData.total > PAGE_SIZE)
      setOffset(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load earnings data')
    } finally {
      setIsLoading(false)
    }
  }, [period])

  useEffect(() => {
    loadData()
  }, [loadData])

  const loadMoreSettlements = async () => {
    const token = await getProviderToken()
    if (!token) return

    setIsLoadingMore(true)
    const newOffset = offset + PAGE_SIZE

    try {
      const data = await listSettlements(token, { limit: PAGE_SIZE, offset: newOffset })
      setSettlements((prev) => [...prev, ...data.items])
      setOffset(newOffset)
      setHasMore(data.items.length === PAGE_SIZE && data.total > newOffset + PAGE_SIZE)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more settlements')
    } finally {
      setIsLoadingMore(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Earnings</h1>
          <p className="text-text-secondary">Track your earnings and payouts</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <EarningsSummary summary={summary ?? undefined} isLoading={isLoading} />

      <SettlementHistory settlements={settlements} isLoading={isLoading} />

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMoreSettlements} isLoading={isLoadingMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  )
}
