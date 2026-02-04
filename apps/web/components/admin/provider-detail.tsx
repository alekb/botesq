'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Briefcase,
  Mail,
  Calendar,
  MapPin,
  Star,
  Clock,
  CheckCircle,
  Loader2,
  FileText,
  CreditCard,
} from 'lucide-react'
import type {
  Provider,
  ProviderStatus,
  ProviderServiceType,
  ProviderRequestStatus,
} from '@botesq/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils/cn'

interface RequestSummary {
  id: string
  serviceType: ProviderServiceType
  status: ProviderRequestStatus
  creditsCharged: number
  createdAt: Date
}

interface ProviderDetailProps {
  provider: Omit<Provider, 'passwordHash' | 'totpSecret' | 'webhookSecret'> & {
    _count: {
      requests: number
      services: number
      settlements: number
    }
    requests: RequestSummary[]
  }
}

const statusColors: Record<ProviderStatus, string> = {
  PENDING_APPROVAL: 'bg-warning-500/10 text-warning-500',
  ACTIVE: 'bg-success-500/10 text-success-500',
  SUSPENDED: 'bg-error-500/10 text-error-500',
  INACTIVE: 'bg-text-secondary/10 text-text-secondary',
}

export function ProviderDetail({ provider }: ProviderDetailProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showSuspendDialog, setShowSuspendDialog] = useState(false)
  const [showReactivateDialog, setShowReactivateDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  async function handleStatusChange(newStatus: ProviderStatus, reason?: string) {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/providers/${provider.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason }),
      })

      if (response.ok) {
        router.refresh()
      }
    } finally {
      setIsUpdating(false)
      setShowApproveDialog(false)
      setShowRejectDialog(false)
      setShowSuspendDialog(false)
      setShowReactivateDialog(false)
      setRejectionReason('')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary-500/10">
            <Briefcase className="h-8 w-8 text-primary-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-text-primary">{provider.name}</h1>
              <Badge className={cn('text-xs', statusColors[provider.status])}>
                {provider.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-text-secondary">{provider.email}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {provider.status === 'PENDING_APPROVAL' && (
            <>
              <Button
                variant="danger"
                onClick={() => setShowRejectDialog(true)}
                disabled={isUpdating}
              >
                Reject
              </Button>
              <Button onClick={() => setShowApproveDialog(true)} disabled={isUpdating}>
                Approve
              </Button>
            </>
          )}
          {provider.status === 'ACTIVE' && (
            <Button
              variant="danger"
              onClick={() => setShowSuspendDialog(true)}
              disabled={isUpdating}
            >
              Suspend Provider
            </Button>
          )}
          {provider.status === 'SUSPENDED' && (
            <Button onClick={() => setShowReactivateDialog(true)} disabled={isUpdating}>
              Reactivate Provider
            </Button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-primary-500/10 p-3">
              <Star className="h-5 w-5 text-primary-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">
                {provider.qualityScore.toFixed(1)}
              </p>
              <p className="text-sm text-text-secondary">Quality Score</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-success-500/10 p-3">
              <FileText className="h-5 w-5 text-success-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{provider._count.requests}</p>
              <p className="text-sm text-text-secondary">Requests</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-warning-500/10 p-3">
              <Clock className="h-5 w-5 text-warning-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">
                {provider.avgResponseMins ?? 'N/A'}
              </p>
              <p className="text-sm text-text-secondary">Avg Response (min)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-error-500/10 p-3">
              <CreditCard className="h-5 w-5 text-error-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{provider.revenueSharePct}%</p>
              <p className="text-sm text-text-secondary">Revenue Share</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Provider Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Provider Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-text-secondary" />
              <div>
                <p className="text-sm text-text-secondary">Email</p>
                <p className="text-sm font-medium text-text-primary">{provider.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Briefcase className="h-4 w-4 text-text-secondary" />
              <div>
                <p className="text-sm text-text-secondary">Legal Name</p>
                <p className="text-sm font-medium text-text-primary">{provider.legalName}</p>
              </div>
            </div>

            {provider.description && (
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 text-text-secondary" />
                <div>
                  <p className="text-sm text-text-secondary">Description</p>
                  <p className="text-sm font-medium text-text-primary">{provider.description}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-text-secondary" />
              <div>
                <p className="text-sm text-text-secondary">Applied</p>
                <p className="text-sm font-medium text-text-primary">
                  {new Date(provider.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {provider.verifiedAt && (
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-success-500" />
                <div>
                  <p className="text-sm text-text-secondary">Verified</p>
                  <p className="text-sm font-medium text-text-primary">
                    {new Date(provider.verifiedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Jurisdictions & Specialties */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Practice Areas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-text-secondary" />
                <p className="text-sm text-text-secondary">Jurisdictions</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {provider.jurisdictions.length > 0 ? (
                  provider.jurisdictions.map((j) => (
                    <Badge key={j} variant="secondary">
                      {j}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-text-tertiary">No jurisdictions specified</p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="h-4 w-4 text-text-secondary" />
                <p className="text-sm text-text-secondary">Specialties</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {provider.specialties.length > 0 ? (
                  provider.specialties.map((s) => (
                    <Badge key={s} variant="secondary">
                      {s.replace('_', ' ')}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-text-tertiary">No specialties specified</p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-text-secondary" />
                <p className="text-sm text-text-secondary">Service Types</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {provider.serviceTypes.length > 0 ? (
                  provider.serviceTypes.map((s) => (
                    <Badge key={s} variant="secondary">
                      {s.replace('_', ' ')}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-text-tertiary">No service types specified</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Requests */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {provider.requests.length === 0 ? (
              <p className="text-sm text-text-secondary">No requests yet</p>
            ) : (
              <div className="space-y-3">
                {provider.requests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {request.serviceType.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {new Date(request.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge
                        className={cn(
                          'text-xs',
                          request.status === 'COMPLETED'
                            ? 'bg-success-500/10 text-success-500'
                            : request.status === 'PENDING'
                              ? 'bg-warning-500/10 text-warning-500'
                              : 'bg-text-secondary/10 text-text-secondary'
                        )}
                      >
                        {request.status}
                      </Badge>
                      {request.creditsCharged > 0 && (
                        <span className="text-sm font-medium text-text-primary">
                          {request.creditsCharged.toLocaleString()} credits
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Provider</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve {provider.name}? They will be able to start receiving
              service requests.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleStatusChange('ACTIVE')} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                'Approve Provider'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject {provider.name}&apos;s application? They will need to
              reapply.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Reason for rejection (optional)..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => handleStatusChange('INACTIVE', rejectionReason)}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject Application'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Provider</DialogTitle>
            <DialogDescription>
              Are you sure you want to suspend {provider.name}? They will not receive any new
              service requests.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowSuspendDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => handleStatusChange('SUSPENDED')}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suspending...
                </>
              ) : (
                'Suspend Provider'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivate Dialog */}
      <Dialog open={showReactivateDialog} onOpenChange={setShowReactivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate Provider</DialogTitle>
            <DialogDescription>
              Are you sure you want to reactivate {provider.name}? They will be able to receive
              service requests again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowReactivateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleStatusChange('ACTIVE')} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reactivating...
                </>
              ) : (
                'Reactivate Provider'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
