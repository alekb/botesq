'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, User, ChevronRight, Plus, ShieldCheck, Shield } from 'lucide-react'
import type { Attorney } from '@botesq/database'
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

interface AttorneyWithCounts extends Omit<Attorney, 'passwordHash' | 'totpSecret'> {
  _count: {
    consultations: number
    assignments: number
  }
}

interface AttorneyListProps {
  attorneys: AttorneyWithCounts[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const statusColors = {
  ACTIVE: 'bg-success-500/10 text-success-500',
  INACTIVE: 'bg-text-secondary/10 text-text-secondary',
  SUSPENDED: 'bg-error-500/10 text-error-500',
}

const roleColors = {
  ASSOCIATE: 'bg-primary-500/10 text-primary-500',
  SENIOR: 'bg-warning-500/10 text-warning-500',
  PARTNER: 'bg-success-500/10 text-success-500',
  ADMIN: 'bg-error-500/10 text-error-500',
}

export function AttorneyList({ attorneys, pagination }: AttorneyListProps) {
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
    router.push(`/admin/attorneys?${params.toString()}`)
  }

  function handleFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams)
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.set('page', '1')
    router.push(`/admin/attorneys?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
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

        <div className="flex gap-2">
          <Select
            value={searchParams.get('status') ?? 'all'}
            onValueChange={(v) => handleFilter('status', v)}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={searchParams.get('role') ?? 'all'}
            onValueChange={(v) => handleFilter('role', v)}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="ASSOCIATE">Associate</SelectItem>
              <SelectItem value="SENIOR">Senior</SelectItem>
              <SelectItem value="PARTNER">Partner</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>

          <Button asChild>
            <Link href="/admin/attorneys/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Attorney
            </Link>
          </Button>
        </div>
      </div>

      {/* Attorney List */}
      <div className="space-y-2">
        {attorneys.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <User className="h-12 w-12 text-text-tertiary" />
              <p className="mt-4 text-text-secondary">No attorneys found</p>
            </CardContent>
          </Card>
        ) : (
          attorneys.map((attorney) => (
            <Link key={attorney.id} href={`/admin/attorneys/${attorney.id}`}>
              <Card className="transition-colors hover:bg-background-secondary">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500/10">
                    {attorney.role === 'ADMIN' ? (
                      <ShieldCheck className="h-5 w-5 text-error-500" />
                    ) : (
                      <User className="h-5 w-5 text-primary-500" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-text-primary">
                        {attorney.firstName} {attorney.lastName}
                      </p>
                      <Badge className={cn('text-xs', roleColors[attorney.role])}>
                        {attorney.role}
                      </Badge>
                      <Badge className={cn('text-xs', statusColors[attorney.status])}>
                        {attorney.status}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-text-secondary">{attorney.email}</p>
                  </div>

                  <div className="hidden items-center gap-6 sm:flex">
                    {attorney.totpEnabled && (
                      <div className="flex items-center gap-1">
                        <Shield className="h-4 w-4 text-success-500" />
                        <span className="text-xs text-success-500">2FA</span>
                      </div>
                    )}

                    <div className="text-right">
                      <p className="text-sm font-medium text-text-primary">
                        {attorney._count.consultations}
                      </p>
                      <p className="text-xs text-text-secondary">Consultations</p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-medium text-text-primary">
                        {attorney._count.assignments}
                      </p>
                      <p className="text-xs text-text-secondary">Assignments</p>
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
                router.push(`/admin/attorneys?${params.toString()}`)
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
                router.push(`/admin/attorneys?${params.toString()}`)
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
