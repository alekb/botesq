'use client'

import { useState, useMemo } from 'react'
import { MatterCard } from './matter-card'
import { MatterFilters } from './matter-filters'
import { Briefcase } from 'lucide-react'
import type { MatterStatus, MatterType, MatterUrgency } from '@botesq/database'

interface Matter {
  id: string
  externalId: string
  title: string
  type: MatterType
  status: MatterStatus
  urgency: MatterUrgency
  createdAt: Date
  documentCount?: number
}

interface MatterListProps {
  matters: Matter[]
}

export function MatterList({ matters }: MatterListProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const filteredMatters = useMemo(() => {
    return matters.filter((matter) => {
      const matchesSearch =
        search === '' ||
        matter.title.toLowerCase().includes(search.toLowerCase()) ||
        matter.externalId.toLowerCase().includes(search.toLowerCase())

      const matchesStatus = statusFilter === 'all' || matter.status === statusFilter
      const matchesType = typeFilter === 'all' || matter.type === typeFilter

      return matchesSearch && matchesStatus && matchesType
    })
  }, [matters, search, statusFilter, typeFilter])

  return (
    <div className="space-y-4">
      <MatterFilters
        search={search}
        onSearchChange={setSearch}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        type={typeFilter}
        onTypeChange={setTypeFilter}
      />

      {filteredMatters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-background-tertiary p-4 mb-4">
            <Briefcase className="h-8 w-8 text-text-tertiary" />
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-1">No matters found</h3>
          <p className="text-sm text-text-secondary">
            {search || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Matters created by your AI agents will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMatters.map((matter) => (
            <MatterCard key={matter.id} matter={matter} />
          ))}
        </div>
      )}
    </div>
  )
}
