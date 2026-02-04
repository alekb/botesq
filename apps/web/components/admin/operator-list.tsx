'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Building2, ChevronRight } from 'lucide-react'
import type { Operator } from '@botesq/database'
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

interface OperatorWithCounts extends Omit<
  Operator,
  | 'passwordHash'
  | 'preAuthToken'
  | 'preAuthScope'
  | 'preAuthMaxCredits'
  | 'stripeCustomerId'
  | 'billingAddress'
> {
  _count: {
    agents: number
    apiKeys: number
    matters: number
  }
}

interface OperatorListProps {
  operators: OperatorWithCounts[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-success-500/10 text-success-500',
  SUSPENDED: 'bg-error-500/10 text-error-500',
  PENDING_VERIFICATION: 'bg-warning-500/10 text-warning-500',
  CLOSED: 'bg-text-secondary/10 text-text-secondary',
}

export function OperatorList({ operators, pagination }: OperatorListProps) {
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
    router.push(`/admin/operators?${params.toString()}`)
  }

  function handleStatusFilter(status: string) {
    const params = new URLSearchParams(searchParams)
    if (status && status !== 'all') {
      params.set('status', status)
    } else {
      params.delete('status')
    }
    params.set('page', '1')
    router.push(`/admin/operators?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <Input
              placeholder="Search by company or email..."
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
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="PENDING_VERIFICATION">Pending</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Operator List */}
      <div className="space-y-2">
        {operators.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-text-tertiary" />
              <p className="mt-4 text-text-secondary">No operators found</p>
            </CardContent>
          </Card>
        ) : (
          operators.map((operator) => (
            <Link key={operator.id} href={`/admin/operators/${operator.id}`}>
              <Card className="transition-colors hover:bg-background-secondary">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/10">
                    <Building2 className="h-5 w-5 text-primary-500" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-text-primary">
                        {operator.companyName}
                      </p>
                      <Badge className={cn('text-xs', statusColors[operator.status])}>
                        {operator.status}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-text-secondary">{operator.email}</p>
                  </div>

                  <div className="hidden items-center gap-6 sm:flex">
                    <div className="text-right">
                      <p className="text-sm font-medium text-text-primary">
                        {operator.creditBalance.toLocaleString()}
                      </p>
                      <p className="text-xs text-text-secondary">Credits</p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-medium text-text-primary">
                        {operator._count.agents}
                      </p>
                      <p className="text-xs text-text-secondary">Agents</p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-medium text-text-primary">
                        {operator._count.matters}
                      </p>
                      <p className="text-xs text-text-secondary">Matters</p>
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 text-text-tertiary" />
                </CardContent>
              </Card>
            </Link>
          ))
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
                router.push(`/admin/operators?${params.toString()}`)
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
                router.push(`/admin/operators?${params.toString()}`)
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
