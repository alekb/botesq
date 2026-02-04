'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Briefcase, ChevronRight, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import type { Provider, ProviderStatus } from '@botesq/database'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils/cn'

interface ProviderWithCounts extends Omit<
  Provider,
  'passwordHash' | 'totpSecret' | 'webhookSecret'
> {
  _count: {
    requests: number
    services: number
  }
}

interface ProviderListProps {
  providers: ProviderWithCounts[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  pendingCount: number
}

const statusColors: Record<ProviderStatus, string> = {
  PENDING_APPROVAL: 'bg-warning-500/10 text-warning-500',
  ACTIVE: 'bg-success-500/10 text-success-500',
  SUSPENDED: 'bg-error-500/10 text-error-500',
  INACTIVE: 'bg-text-secondary/10 text-text-secondary',
}

const statusIcons: Record<ProviderStatus, typeof Clock> = {
  PENDING_APPROVAL: Clock,
  ACTIVE: CheckCircle,
  SUSPENDED: AlertTriangle,
  INACTIVE: AlertTriangle,
}

export function ProviderList({ providers, pagination, pendingCount }: ProviderListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') ?? '')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams(searchParams)
    if (search) {
      params.set('search', search)
    } else {
      params.delete('search')
    }
    params.set('page', '1')
    router.push(`/admin/providers?${params.toString()}`)
  }

  function handleStatusFilter(status: string) {
    const params = new URLSearchParams(searchParams)
    if (status && status !== 'all') {
      params.set('status', status)
    } else {
      params.delete('status')
    }
    params.set('page', '1')
    router.push(`/admin/providers?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      {/* Pending Applications Alert */}
      {pendingCount > 0 && (
        <Card className="border-warning-500/30 bg-warning-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-5 w-5 text-warning-500" />
            <div className="flex-1">
              <p className="font-medium text-text-primary">
                {pendingCount} pending application{pendingCount > 1 ? 's' : ''} awaiting review
              </p>
              <p className="text-sm text-text-secondary">
                Review and approve or reject provider applications
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleStatusFilter('PENDING_APPROVAL')}
            >
              View Pending
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>

        <Select value={searchParams.get('status') ?? 'all'} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Provider List */}
      <div className="space-y-2">
        {providers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Briefcase className="h-12 w-12 text-text-tertiary" />
              <p className="mt-4 text-text-secondary">No providers found</p>
            </CardContent>
          </Card>
        ) : (
          providers.map((provider) => {
            const StatusIcon = statusIcons[provider.status]
            return (
              <Link key={provider.id} href={`/admin/providers/${provider.id}`}>
                <Card className="transition-colors hover:bg-background-secondary">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/10">
                      <Briefcase className="h-5 w-5 text-primary-500" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-text-primary">{provider.name}</p>
                        <Badge className={cn('text-xs', statusColors[provider.status])}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {provider.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="truncate text-sm text-text-secondary">{provider.email}</p>
                    </div>

                    <div className="hidden items-center gap-6 sm:flex">
                      <div className="text-right">
                        <p className="text-sm font-medium text-text-primary">
                          {provider.jurisdictions.length}
                        </p>
                        <p className="text-xs text-text-secondary">Jurisdictions</p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-medium text-text-primary">
                          {provider._count.services}
                        </p>
                        <p className="text-xs text-text-secondary">Services</p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-medium text-text-primary">
                          {provider._count.requests}
                        </p>
                        <p className="text-xs text-text-secondary">Requests</p>
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-text-tertiary" />
                  </CardContent>
                </Card>
              </Link>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            Showing {(pagination.page - 1) * pagination.limit + 1} -{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => {
                const params = new URLSearchParams(searchParams)
                params.set('page', String(pagination.page - 1))
                router.push(`/admin/providers?${params.toString()}`)
              }}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => {
                const params = new URLSearchParams(searchParams)
                params.set('page', String(pagination.page + 1))
                router.push(`/admin/providers?${params.toString()}`)
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
