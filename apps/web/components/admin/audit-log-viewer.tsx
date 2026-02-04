'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ScrollText, ChevronDown, ChevronUp, Filter } from 'lucide-react'
import type { AuditLog, AuditActorType } from '@botesq/database'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils/cn'

interface AuditLogWithActor extends AuditLog {
  actorName: string | null
}

interface AuditLogViewerProps {
  logs: AuditLogWithActor[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const actorTypeColors: Record<AuditActorType, string> = {
  OPERATOR: 'bg-primary-500/10 text-primary-500',
  AGENT: 'bg-success-500/10 text-success-500',
  ATTORNEY: 'bg-warning-500/10 text-warning-500',
  ADMIN: 'bg-error-500/10 text-error-500',
  SYSTEM: 'bg-text-secondary/10 text-text-secondary',
  PROVIDER: 'bg-purple-500/10 text-purple-400',
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

export function AuditLogViewer({ logs, pagination }: AuditLogViewerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)

  function toggleExpanded(id: string) {
    const newSet = new Set(expandedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedIds(newSet)
  }

  function handleFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams)
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.set('page', '1')
    router.push(`/admin/audit?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      {/* Filters Toggle */}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setShowFilters(!showFilters)}
        className="gap-2"
      >
        <Filter className="h-4 w-4" />
        {showFilters ? 'Hide Filters' : 'Show Filters'}
      </Button>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Actor Type</label>
              <Select
                value={searchParams.get('actorType') ?? 'all'}
                onValueChange={(v) => handleFilter('actorType', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="ATTORNEY">Attorney</SelectItem>
                  <SelectItem value="OPERATOR">Operator</SelectItem>
                  <SelectItem value="AGENT">Agent</SelectItem>
                  <SelectItem value="SYSTEM">System</SelectItem>
                  <SelectItem value="PROVIDER">Provider</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Action</label>
              <Input
                placeholder="e.g., LOGIN, CREATE"
                defaultValue={searchParams.get('action') ?? ''}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFilter('action', e.currentTarget.value)
                  }
                }}
                onBlur={(e) => handleFilter('action', e.currentTarget.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Start Date</label>
              <Input
                type="date"
                defaultValue={searchParams.get('startDate') ?? ''}
                onChange={(e) => handleFilter('startDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">End Date</label>
              <Input
                type="date"
                defaultValue={searchParams.get('endDate') ?? ''}
                onChange={(e) => handleFilter('endDate', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs List */}
      <div className="space-y-2">
        {logs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ScrollText className="h-12 w-12 text-text-tertiary" />
              <p className="mt-4 text-text-secondary">No audit logs found</p>
            </CardContent>
          </Card>
        ) : (
          logs.map((log) => {
            const isExpanded = expandedIds.has(log.id)

            return (
              <Card key={log.id} className="overflow-hidden">
                <button className="w-full text-left" onClick={() => toggleExpanded(log.id)}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <Badge className={cn('text-xs', actorTypeColors[log.actorType])}>
                      {log.actorType}
                    </Badge>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-text-primary">{log.action}</p>
                        <span className="text-text-secondary">on</span>
                        <span className="text-text-primary">{log.resourceType}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        {log.actorName ? (
                          <span>by {log.actorName}</span>
                        ) : log.actorId ? (
                          <span className="font-mono text-xs">{log.actorId}</span>
                        ) : (
                          <span>System</span>
                        )}
                        <span>&middot;</span>
                        <span>{formatDate(log.createdAt)}</span>
                      </div>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-text-secondary" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-text-secondary" />
                    )}
                  </CardContent>
                </button>

                {isExpanded && (
                  <CardContent className="border-t border-border bg-background-secondary p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-sm font-medium text-text-secondary">Resource ID</p>
                        <p className="font-mono text-sm text-text-primary">
                          {log.resourceId ?? 'N/A'}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-text-secondary">Actor ID</p>
                        <p className="font-mono text-sm text-text-primary">
                          {log.actorId ?? 'System'}
                        </p>
                      </div>

                      {log.ipAddress && (
                        <div>
                          <p className="text-sm font-medium text-text-secondary">IP Address</p>
                          <p className="text-sm text-text-primary">{log.ipAddress}</p>
                        </div>
                      )}

                      {log.userAgent && (
                        <div className="sm:col-span-2">
                          <p className="text-sm font-medium text-text-secondary">User Agent</p>
                          <p className="truncate text-sm text-text-primary">{log.userAgent}</p>
                        </div>
                      )}

                      {log.details && (
                        <div className="sm:col-span-2">
                          <p className="text-sm font-medium text-text-secondary">Details</p>
                          <pre className="mt-1 overflow-x-auto rounded-lg bg-background-primary p-3 text-xs text-text-primary">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
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
                router.push(`/admin/audit?${params.toString()}`)
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
                router.push(`/admin/audit?${params.toString()}`)
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
