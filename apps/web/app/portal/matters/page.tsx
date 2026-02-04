import { MatterList } from '@/components/portal/matters'

// Mock data - will be replaced with real data fetching
const mockMatters = [
  {
    id: '1',
    externalId: 'MTR-001',
    title: 'Software Licensing Agreement Review',
    type: 'CONTRACT_REVIEW' as const,
    status: 'ACTIVE' as const,
    urgency: 'HIGH' as const,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    documentCount: 3,
  },
  {
    id: '2',
    externalId: 'MTR-002',
    title: 'Delaware LLC Formation',
    type: 'ENTITY_FORMATION' as const,
    status: 'PENDING_RETAINER' as const,
    urgency: 'STANDARD' as const,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    documentCount: 1,
  },
  {
    id: '3',
    externalId: 'MTR-003',
    title: 'Employment Contract Compliance Review',
    type: 'COMPLIANCE' as const,
    status: 'RESOLVED' as const,
    urgency: 'LOW' as const,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    documentCount: 5,
  },
  {
    id: '4',
    externalId: 'MTR-004',
    title: 'Trademark Application - "BotLegal"',
    type: 'IP_TRADEMARK' as const,
    status: 'ACTIVE' as const,
    urgency: 'STANDARD' as const,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    documentCount: 2,
  },
  {
    id: '5',
    externalId: 'MTR-005',
    title: 'NDA Review for Partnership',
    type: 'CONTRACT_REVIEW' as const,
    status: 'ON_HOLD' as const,
    urgency: 'URGENT' as const,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    documentCount: 1,
  },
]

export default function MattersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Matters</h1>
        <p className="text-text-secondary mt-1">
          View and manage legal matters created by your AI agents.
        </p>
      </div>

      <MatterList matters={mockMatters} />
    </div>
  )
}
