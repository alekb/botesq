import { redirect } from 'next/navigation'
import { getCurrentAdminSession } from '@/lib/admin-auth/session'
import { AdminSidebar } from '@/components/admin/sidebar'
import { AdminHeader } from '@/components/admin/header'

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const { session, admin } = await getCurrentAdminSession()

  if (!session || !admin) {
    redirect('/admin/login')
  }

  // Double-check admin role (already checked in session validation, but defense in depth)
  if (admin.role !== 'ADMIN') {
    redirect('/admin/login')
  }

  return (
    <div className="flex min-h-screen bg-background-primary">
      <AdminSidebar admin={admin} />
      <div className="flex flex-1 flex-col lg:pl-64">
        <AdminHeader admin={admin} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
