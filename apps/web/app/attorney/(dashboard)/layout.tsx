import { redirect } from 'next/navigation'
import { getCurrentAttorneySession } from '@/lib/attorney-auth/session'
import { AttorneySidebar } from '@/components/attorney/sidebar'
import { AttorneyHeader } from '@/components/attorney/header'

export default async function AttorneyDashboardLayout({ children }: { children: React.ReactNode }) {
  const { session, attorney } = await getCurrentAttorneySession()

  if (!session || !attorney) {
    redirect('/attorney/login')
  }

  return (
    <div className="flex min-h-screen bg-background-primary">
      <AttorneySidebar attorney={attorney} />
      <div className="flex flex-1 flex-col lg:pl-64">
        <AttorneyHeader attorney={attorney} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
