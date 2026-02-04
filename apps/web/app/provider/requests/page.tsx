'use client'

import { useEffect, useState } from 'react'
import { RequestList, RequestFilters } from '@/components/provider/requests'
import { Button } from '@/components/ui/button'
import { getProviderToken } from '@/lib/auth/provider-session'
import { listProviderRequests } from '@/lib/api/provider-requests'
import type { ProviderRequest, ProviderRequestStatus, ProviderServiceType } from '@/types/provider'

const PAGE_SIZE = 20

export default function ProviderRequestsPage() {
  const [requests, setRequests] = useState<ProviderRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [status, setStatus] = useState<ProviderRequestStatus | 'ALL'>('ALL')
  const [serviceType, setServiceType] = useState<ProviderServiceType | 'ALL'>('ALL')

  // Load requests when filters change
  useEffect(() => {
    let mounted = true

    async function loadRequests() {
      const token = await getProviderToken()
      if (!token || !mounted) return

      setIsLoading(true)
      setOffset(0)

      try {
        const data = await listProviderRequests(token, {
          status: status === 'ALL' ? undefined : status,
          serviceType: serviceType === 'ALL' ? undefined : serviceType,
          limit: PAGE_SIZE,
          offset: 0,
        })

        if (mounted) {
          setRequests(data.items)
          setHasMore(data.items.length === PAGE_SIZE && data.total > PAGE_SIZE)
        }
      } catch (error) {
        console.error('Failed to load requests:', error)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadRequests()

    return () => {
      mounted = false
    }
  }, [status, serviceType])

  const handleLoadMore = async () => {
    const token = await getProviderToken()
    if (!token) return

    const newOffset = offset + PAGE_SIZE
    setIsLoadingMore(true)

    try {
      const data = await listProviderRequests(token, {
        status: status === 'ALL' ? undefined : status,
        serviceType: serviceType === 'ALL' ? undefined : serviceType,
        limit: PAGE_SIZE,
        offset: newOffset,
      })

      setRequests((prev) => [...prev, ...data.items])
      setOffset(newOffset)
      setHasMore(data.items.length === PAGE_SIZE && data.total > newOffset + PAGE_SIZE)
    } catch (error) {
      console.error('Failed to load more requests:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Work Queue</h1>
          <p className="text-text-secondary">Manage and respond to service requests</p>
        </div>
        <RequestFilters
          status={status}
          serviceType={serviceType}
          onStatusChange={setStatus}
          onServiceTypeChange={setServiceType}
        />
      </div>

      <RequestList
        requests={requests}
        isLoading={isLoading}
        emptyMessage={
          status === 'ALL' && serviceType === 'ALL'
            ? 'No requests in your queue'
            : 'No requests match the selected filters'
        }
      />

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleLoadMore} isLoading={isLoadingMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  )
}
