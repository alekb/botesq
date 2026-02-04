'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface MatterFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  status: string
  onStatusChange: (value: string) => void
  type: string
  onTypeChange: (value: string) => void
}

export function MatterFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  type,
  onTypeChange,
}: MatterFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
        <Input
          placeholder="Search matters..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="PENDING_RETAINER">Pending Retainer</SelectItem>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="ON_HOLD">On Hold</SelectItem>
          <SelectItem value="RESOLVED">Resolved</SelectItem>
          <SelectItem value="CLOSED">Closed</SelectItem>
        </SelectContent>
      </Select>
      <Select value={type} onValueChange={onTypeChange}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="CONTRACT_REVIEW">Contract Review</SelectItem>
          <SelectItem value="ENTITY_FORMATION">Entity Formation</SelectItem>
          <SelectItem value="COMPLIANCE">Compliance</SelectItem>
          <SelectItem value="IP_TRADEMARK">IP - Trademark</SelectItem>
          <SelectItem value="IP_COPYRIGHT">IP - Copyright</SelectItem>
          <SelectItem value="GENERAL_CONSULTATION">General Consultation</SelectItem>
          <SelectItem value="LITIGATION_CONSULTATION">Litigation Consultation</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
