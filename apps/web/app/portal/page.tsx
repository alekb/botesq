import { Briefcase, FileText, CreditCard, Clock } from 'lucide-react'
import { StatsCard, RecentActivity, QuickActions } from '@/components/portal'
import { formatCredits } from '@/lib/utils/format'

// Mock data - will be replaced with real data fetching
const mockStats = {
  totalMatters: 12,
  activeMatters: 5,
  documentsProcessed: 47,
  creditBalance: 50000,
}

const mockActivities = [
  {
    id: '1',
    type: 'matter' as const,
    title: 'Contract Review',
    description: 'Software licensing agreement review completed',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    status: 'success' as const,
  },
  {
    id: '2',
    type: 'document' as const,
    title: 'NDA Analysis',
    description: 'Non-disclosure agreement uploaded for review',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    status: 'pending' as const,
  },
  {
    id: '3',
    type: 'payment' as const,
    title: 'Credit Purchase',
    description: '100,000 credits added to account',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    status: 'success' as const,
  },
  {
    id: '4',
    type: 'consultation' as const,
    title: 'Legal Q&A',
    description: 'Question about employment contracts answered',
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
    status: 'success' as const,
  },
]

export default function PortalDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary mt-1">
          Welcome back! Here&apos;s an overview of your account.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Matters"
          value={mockStats.totalMatters}
          description={`${mockStats.activeMatters} active`}
          icon={Briefcase}
        />
        <StatsCard
          title="Documents Processed"
          value={mockStats.documentsProcessed}
          description="Last 30 days"
          icon={FileText}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Credit Balance"
          value={formatCredits(mockStats.creditBalance)}
          description="Available credits"
          icon={CreditCard}
        />
        <StatsCard
          title="Avg Response Time"
          value="< 5 min"
          description="For AI responses"
          icon={Clock}
        />
      </div>

      {/* Two column layout for activity and actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity activities={mockActivities} />
        <QuickActions />
      </div>
    </div>
  )
}
