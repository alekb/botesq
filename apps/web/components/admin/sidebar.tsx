'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Building2, Users, ScrollText, ShieldCheck } from 'lucide-react'
import type { Attorney } from '@botesq/database'
import { cn } from '@/lib/utils/cn'

interface AdminSidebarProps {
  admin: Attorney
}

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Operators', href: '/admin/operators', icon: Building2 },
  { name: 'Attorneys', href: '/admin/attorneys', icon: Users },
  { name: 'Audit Logs', href: '/admin/audit', icon: ScrollText },
]

export function AdminSidebar({ admin }: AdminSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-background-secondary lg:block">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <ShieldCheck className="h-8 w-8 text-error-500" />
          <div>
            <span className="text-lg font-bold text-primary-500">Bot</span>
            <span className="text-lg font-bold text-text-primary">Esq</span>
            <span className="ml-2 rounded bg-error-500/10 px-1.5 py-0.5 text-xs font-medium text-error-500">
              Admin
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-error-500/10 text-error-500'
                    : 'text-text-secondary hover:bg-background-primary hover:text-text-primary'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Admin Info */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error-500/10 text-sm font-medium text-error-500">
              {admin.firstName[0]}
              {admin.lastName[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">
                {admin.firstName} {admin.lastName}
              </p>
              <p className="truncate text-xs text-text-secondary">{admin.role}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
