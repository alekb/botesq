'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ListTodo, FileText, BarChart3, Settings } from 'lucide-react'
import type { Attorney } from '@botesq/database'
import { cn } from '@/lib/utils/cn'
import { Logo } from '@/components/brand'

interface AttorneySidebarProps {
  attorney: Attorney
}

const navigation = [
  { name: 'Dashboard', href: '/attorney', icon: LayoutDashboard },
  { name: 'Queue', href: '/attorney/queue', icon: ListTodo },
  { name: 'My Matters', href: '/attorney/matters', icon: FileText },
  { name: 'Stats', href: '/attorney/stats', icon: BarChart3 },
  { name: 'Settings', href: '/attorney/settings', icon: Settings },
]

export function AttorneySidebar({ attorney }: AttorneySidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-background-secondary lg:block">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-border px-6">
          <Link href="/attorney" className="flex items-center">
            <Logo className="h-8 w-auto" />
          </Link>
          <span className="rounded bg-primary-500/10 px-1.5 py-0.5 text-xs font-medium text-primary-500">
            Attorney
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/attorney' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-500/10 text-primary-500'
                    : 'text-text-secondary hover:bg-background-primary hover:text-text-primary'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Attorney Info */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500/10 text-sm font-medium text-primary-500">
              {attorney.firstName[0]}
              {attorney.lastName[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">
                {attorney.firstName} {attorney.lastName}
              </p>
              <p className="truncate text-xs text-text-secondary">{attorney.role}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
