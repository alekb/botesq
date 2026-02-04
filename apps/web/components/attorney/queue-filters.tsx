'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Filter, SortAsc } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function QueueFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/attorney/queue?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <Input
          placeholder="Search consultations..."
          defaultValue={searchParams.get('search') ?? ''}
          onChange={(e) => {
            const value = e.target.value
            // Debounce search
            const timeoutId = setTimeout(() => {
              updateParam('search', value || null)
            }, 300)
            return () => clearTimeout(timeoutId)
          }}
          className="pl-9"
        />
      </div>

      {/* Status Filter */}
      <Select
        value={searchParams.get('status') ?? 'all'}
        onValueChange={(value) => updateParam('status', value === 'all' ? null : value)}
      >
        <SelectTrigger className="w-[160px]">
          <Filter className="mr-2 h-4 w-4" />
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="QUEUED">Queued</SelectItem>
          <SelectItem value="AI_PROCESSING">AI Processing</SelectItem>
          <SelectItem value="IN_REVIEW">In Review</SelectItem>
        </SelectContent>
      </Select>

      {/* Complexity Filter */}
      <Select
        value={searchParams.get('complexity') ?? 'all'}
        onValueChange={(value) => updateParam('complexity', value === 'all' ? null : value)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Complexity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Complexity</SelectItem>
          <SelectItem value="URGENT">Urgent</SelectItem>
          <SelectItem value="STANDARD">Standard</SelectItem>
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select
        value={searchParams.get('sort') ?? 'newest'}
        onValueChange={(value) => updateParam('sort', value)}
      >
        <SelectTrigger className="w-[160px]">
          <SortAsc className="mr-2 h-4 w-4" />
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest First</SelectItem>
          <SelectItem value="oldest">Oldest First</SelectItem>
          <SelectItem value="deadline">By Deadline</SelectItem>
          <SelectItem value="complexity">By Complexity</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {(searchParams.get('status') ||
        searchParams.get('complexity') ||
        searchParams.get('search')) && (
        <Button variant="ghost" size="sm" onClick={() => router.push('/attorney/queue')}>
          Clear
        </Button>
      )}
    </div>
  )
}
