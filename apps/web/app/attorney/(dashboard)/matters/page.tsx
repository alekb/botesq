import { prisma } from '@botesq/database'
import { getCurrentAttorneySession } from '@/lib/attorney-auth/session'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Clock } from 'lucide-react'
import Link from 'next/link'

async function getAttorneyMatters(attorneyId: string) {
  // Get matters where the attorney has assignments
  const assignments = await prisma.matterAssignment.findMany({
    where: { attorneyId },
    include: {
      matter: {
        select: {
          id: true,
          externalId: true,
          type: true,
          status: true,
          operator: {
            select: {
              companyName: true,
            },
          },
          _count: {
            select: {
              consultations: true,
              documents: true,
            },
          },
        },
      },
    },
    orderBy: { assignedAt: 'desc' },
    take: 50,
  })

  return assignments
}

export default async function AttorneyMattersPage() {
  const { attorney } = await getCurrentAttorneySession()
  if (!attorney) return null

  const assignments = await getAttorneyMatters(attorney.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">My Matters</h1>
        <p className="text-text-secondary">Matters you have worked on or been assigned to.</p>
      </div>

      {assignments.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="mx-auto h-12 w-12 text-text-secondary" />
          <h3 className="mt-4 text-lg font-medium text-text-primary">No matters yet</h3>
          <p className="mt-2 text-sm text-text-secondary">
            You haven't been assigned to any matters yet. Check the queue for new work.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/attorney/matters/${assignment.matter.id}`}
                      className="text-lg font-medium text-text-primary hover:text-primary-500"
                    >
                      {assignment.matter.externalId}
                    </Link>
                    <Badge variant="secondary">{assignment.matter.type}</Badge>
                    <Badge
                      variant={
                        assignment.matter.status === 'ACTIVE'
                          ? 'success'
                          : assignment.matter.status === 'CLOSED'
                            ? 'secondary'
                            : 'warning'
                      }
                    >
                      {assignment.matter.status}
                    </Badge>
                  </div>

                  <p className="mt-1 text-sm text-text-secondary">
                    {assignment.matter.operator.companyName}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-text-secondary">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Assigned {new Date(assignment.assignedAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {assignment.matter._count.consultations} consultations
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {assignment.matter._count.documents} documents
                    </span>
                    {assignment.timeSpentMinutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {Math.round((assignment.timeSpentMinutes / 60) * 10) / 10}h spent
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {assignment.completedAt ? (
                    <Badge variant="success">Completed</Badge>
                  ) : (
                    <Badge variant="warning">In Progress</Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
