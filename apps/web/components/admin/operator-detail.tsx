'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Mail,
  CreditCard,
  Calendar,
  Bot,
  Key,
  FileText,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import type { Operator, CreditTransaction } from '@botesq/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils/cn'

interface AgentSummary {
  id: string
  identifier: string | null
  firstSeenAt: Date
}

interface OperatorDetailProps {
  operator: Omit<
    Operator,
    'passwordHash' | 'preAuthToken' | 'preAuthScope' | 'preAuthMaxCredits' | 'stripeCustomerId'
  > & {
    _count: {
      agents: number
      apiKeys: number
      matters: number
      credits: number
    }
    agents: AgentSummary[]
    credits: Pick<CreditTransaction, 'id' | 'type' | 'amount' | 'description' | 'createdAt'>[]
  }
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-success-500/10 text-success-500',
  SUSPENDED: 'bg-error-500/10 text-error-500',
  PENDING_VERIFICATION: 'bg-warning-500/10 text-warning-500',
  CLOSED: 'bg-text-secondary/10 text-text-secondary',
}

export function OperatorDetail({ operator }: OperatorDetailProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [showSuspendDialog, setShowSuspendDialog] = useState(false)
  const [showReactivateDialog, setShowReactivateDialog] = useState(false)

  async function handleStatusChange(newStatus: 'ACTIVE' | 'SUSPENDED') {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/operators/${operator.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        router.refresh()
      }
    } finally {
      setIsUpdating(false)
      setShowSuspendDialog(false)
      setShowReactivateDialog(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary-500/10">
            <Building2 className="h-8 w-8 text-primary-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-text-primary">{operator.companyName}</h1>
              <Badge className={cn('text-xs', statusColors[operator.status])}>
                {operator.status}
              </Badge>
            </div>
            <p className="text-text-secondary">{operator.email}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {operator.status === 'ACTIVE' ? (
            <Button
              variant="danger"
              onClick={() => setShowSuspendDialog(true)}
              disabled={isUpdating}
            >
              Suspend Operator
            </Button>
          ) : operator.status === 'SUSPENDED' ? (
            <Button
              variant="primary"
              onClick={() => setShowReactivateDialog(true)}
              disabled={isUpdating}
            >
              Reactivate Operator
            </Button>
          ) : null}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-primary-500/10 p-3">
              <CreditCard className="h-5 w-5 text-primary-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">
                {operator.creditBalance.toLocaleString()}
              </p>
              <p className="text-sm text-text-secondary">Credits</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-success-500/10 p-3">
              <Bot className="h-5 w-5 text-success-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{operator._count.agents}</p>
              <p className="text-sm text-text-secondary">Agents</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-warning-500/10 p-3">
              <Key className="h-5 w-5 text-warning-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{operator._count.apiKeys}</p>
              <p className="text-sm text-text-secondary">API Keys</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-error-500/10 p-3">
              <FileText className="h-5 w-5 text-error-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{operator._count.matters}</p>
              <p className="text-sm text-text-secondary">Matters</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-text-secondary" />
              <div>
                <p className="text-sm text-text-secondary">Email</p>
                <p className="text-sm font-medium text-text-primary">{operator.email}</p>
              </div>
              {operator.emailVerified ? (
                <CheckCircle className="ml-auto h-4 w-4 text-success-500" />
              ) : (
                <AlertTriangle className="ml-auto h-4 w-4 text-warning-500" />
              )}
            </div>

            {operator.companyType && (
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-text-secondary" />
                <div>
                  <p className="text-sm text-text-secondary">Company Type</p>
                  <p className="text-sm font-medium text-text-primary">{operator.companyType}</p>
                </div>
              </div>
            )}

            {operator.jurisdiction && (
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-text-secondary" />
                <div>
                  <p className="text-sm text-text-secondary">Jurisdiction</p>
                  <p className="text-sm font-medium text-text-primary">{operator.jurisdiction}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-text-secondary" />
              <div>
                <p className="text-sm text-text-secondary">Created</p>
                <p className="text-sm font-medium text-text-primary">
                  {new Date(operator.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Agents */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Agents</CardTitle>
          </CardHeader>
          <CardContent>
            {operator.agents.length === 0 ? (
              <p className="text-sm text-text-secondary">No agents created yet</p>
            ) : (
              <div className="space-y-3">
                {operator.agents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-text-secondary" />
                      <span className="text-sm font-medium text-text-primary">
                        {agent.identifier ?? 'Unnamed Agent'}
                      </span>
                    </div>
                    <span className="text-xs text-text-secondary">
                      {new Date(agent.firstSeenAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent Credit Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {operator.credits.length === 0 ? (
              <p className="text-sm text-text-secondary">No transactions yet</p>
            ) : (
              <div className="space-y-3">
                {operator.credits.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {tx.description || tx.type}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'text-sm font-medium',
                        tx.amount > 0 ? 'text-success-500' : 'text-error-500'
                      )}
                    >
                      {tx.amount > 0 ? '+' : ''}
                      {tx.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Suspend Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Operator</DialogTitle>
            <DialogDescription>
              Are you sure you want to suspend {operator.companyName}? This will prevent all their
              agents from accessing BotEsq services.
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
                'Suspend Operator'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivate Dialog */}
      <Dialog open={showReactivateDialog} onOpenChange={setShowReactivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate Operator</DialogTitle>
            <DialogDescription>
              Are you sure you want to reactivate {operator.companyName}? This will restore their
              access to BotEsq services.
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
                'Reactivate Operator'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
