'use client'

import { useEffect, useState } from 'react'
import { QuickStats, RecentRequests } from '@/components/provider'
import { getProviderToken } from '@/lib/auth/provider-session'
import { getProviderStats } from '@/lib/api/provider'
import { getPendingRequestCounts, listProviderRequests } from '@/lib/api/provider-requests'
import type { ProviderStats, PendingRequestCounts, ProviderRequest } from '@/types/provider'

export default function ProviderDashboardPage() {
  const [stats, setStats] = useState<ProviderStats | null>(null)
  const [pendingCounts, setPendingCounts] = useState<PendingRequestCounts | null>(null)
  const [recentRequests, setRecentRequests] = useState<ProviderRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadDashboardData() {
      const token = await getProviderToken()
      if (!token) return

      try {
        const [statsData, pendingData, requestsData] = await Promise.all([
          getProviderStats(token),
          getPendingRequestCounts(token),
          listProviderRequests(token, { limit: 5 }),
        ])

        setStats(statsData)
        setPendingCounts(pendingData)
        setRecentRequests(requestsData.items)
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-text-secondary">Overview of your provider activity</p>
      </div>

      <QuickStats
        stats={stats ?? undefined}
        pendingCounts={pendingCounts ?? undefined}
        isLoading={isLoading}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <RecentRequests requests={recentRequests} isLoading={isLoading} />

        {/* Performance Summary */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Performance</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-background-secondary">
              <p className="text-sm text-text-secondary">Avg Response Time</p>
              <p className="text-xl font-bold">
                {stats?.avgResponseMins ? `${Math.round(stats.avgResponseMins)} min` : '--'}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-background-secondary">
              <p className="text-sm text-text-secondary">SLA Met Rate</p>
              <p className="text-xl font-bold">
                {stats?.slaMetRate ? `${Math.round(stats.slaMetRate * 100)}%` : '--'}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-background-secondary">
              <p className="text-sm text-text-secondary">Total Requests</p>
              <p className="text-xl font-bold">{stats?.totalRequests ?? 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-background-secondary">
              <p className="text-sm text-text-secondary">Completed</p>
              <p className="text-xl font-bold">{stats?.completedRequests ?? 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
