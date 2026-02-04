import { Badge } from '@/components/ui/badge'
import type { MatterStatus } from '@botesq/database'

interface MatterStatusBadgeProps {
  status: MatterStatus
}

const statusConfig: Record<
  MatterStatus,
  { label: string; variant: 'default' | 'primary' | 'success' | 'warning' | 'error' }
> = {
  PENDING_RETAINER: { label: 'Pending Retainer', variant: 'warning' },
  ACTIVE: { label: 'Active', variant: 'primary' },
  ON_HOLD: { label: 'On Hold', variant: 'default' },
  RESOLVED: { label: 'Resolved', variant: 'success' },
  CLOSED: { label: 'Closed', variant: 'default' },
}

export function MatterStatusBadge({ status }: MatterStatusBadgeProps) {
  const config = statusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
