'use client'

import { AlertTriangle, CreditCard, Clock } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface AlertsPanelProps {
  lowCreditOperators: number
  overdueConsultations: number
}

export function AlertsPanel({ lowCreditOperators, overdueConsultations }: AlertsPanelProps) {
  const hasAlerts = lowCreditOperators > 0 || overdueConsultations > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle
            className={hasAlerts ? 'h-5 w-5 text-warning-500' : 'h-5 w-5 text-text-secondary'}
          />
          Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasAlerts ? (
          <p className="text-sm text-text-secondary">No alerts at this time</p>
        ) : (
          <>
            {lowCreditOperators > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-warning-500/10 p-3">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-warning-500" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">Low Credit Operators</p>
                    <p className="text-xs text-text-secondary">
                      {lowCreditOperators} operator{lowCreditOperators !== 1 ? 's' : ''} with less
                      than 100 credits
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/operators?filter=low_credits">View</Link>
                </Button>
              </div>
            )}

            {overdueConsultations > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-error-500/10 p-3">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-error-500" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">Overdue Consultations</p>
                    <p className="text-xs text-text-secondary">
                      {overdueConsultations} consultation{overdueConsultations !== 1 ? 's' : ''}{' '}
                      pending over 24 hours
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/attorney/queue">View Queue</Link>
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
