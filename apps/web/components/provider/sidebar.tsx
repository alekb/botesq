'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Inbox,
  Layers,
  DollarSign,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'

interface ProviderSidebarProps {
  collapsed: boolean
  onCollapse: (collapsed: boolean) => void
}

const navigation = [
  { name: 'Dashboard', href: '/provider', icon: LayoutDashboard },
  { name: 'Work Queue', href: '/provider/requests', icon: Inbox },
  { name: 'Services', href: '/provider/services', icon: Layers },
  { name: 'Earnings', href: '/provider/earnings', icon: DollarSign },
  { name: 'Settings', href: '/provider/settings', icon: Settings },
]

export function ProviderSidebar({ collapsed, onCollapse }: ProviderSidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-30 h-full bg-background-primary border-r border-border-default transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-[280px]'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border-default">
        <Link
          href="/provider"
          className={cn(
            'flex items-center gap-2 text-xl font-bold text-primary-500 hover:text-primary-400 transition-opacity',
            collapsed && 'opacity-0 w-0 overflow-hidden'
          )}
        >
          BotEsq
          <span className="text-xs font-normal text-text-secondary bg-background-secondary px-2 py-0.5 rounded">
            Provider
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onCollapse(!collapsed)}
          className="h-8 w-8"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-2 mt-2">
        {navigation.map((item) => {
          const isActive =
            item.href === '/provider' ? pathname === '/provider' : pathname.startsWith(item.href)

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-500/10 text-primary-500'
                  : 'text-text-secondary hover:bg-background-secondary hover:text-text-primary'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span
                className={cn(
                  'transition-opacity duration-300',
                  collapsed && 'opacity-0 w-0 overflow-hidden'
                )}
              >
                {item.name}
              </span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
