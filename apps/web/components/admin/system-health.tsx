'use client'

import { Activity, Clock, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface SystemHealthProps {
  pendingConsultations: number
  totalMatters: number
}

export function SystemHealth({ pendingConsultations, totalMatters }: SystemHealthProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-5 w-5 text-primary-500" />
          System Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-text-secondary" />
            <span className="text-sm text-text-secondary">Pending Consultations</span>
          </div>
          <span className="text-sm font-medium text-text-primary">{pendingConsultations}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-text-secondary" />
            <span className="text-sm text-text-secondary">Total Matters</span>
          </div>
          <span className="text-sm font-medium text-text-primary">{totalMatters}</span>
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-success-500" />
            <span className="text-sm text-success-500">All systems operational</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
