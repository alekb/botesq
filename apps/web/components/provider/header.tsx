'use client'

import { Menu, DollarSign, LogOut, User, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { providerLogoutAction } from '@/lib/auth/provider-actions'
import { formatCurrency } from '@/lib/utils/format'
import type { Provider, ProviderStats } from '@/types/provider'
import Link from 'next/link'

interface ProviderHeaderProps {
  provider: Provider
  stats?: ProviderStats
  onMenuClick: () => void
}

export function ProviderHeader({ provider, stats, onMenuClick }: ProviderHeaderProps) {
  return (
    <header className="sticky top-0 z-20 h-16 bg-background-primary border-b border-border-default">
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        {/* Mobile menu button */}
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>

        {/* Spacer for desktop */}
        <div className="hidden lg:block" />

        {/* Right side actions */}
        <div className="flex items-center gap-4">
          {/* Pending earnings display */}
          {stats && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-background-secondary rounded-md">
              <DollarSign className="h-4 w-4 text-success-500" />
              <div className="text-sm">
                <span className="text-text-secondary">Pending: </span>
                <span className="font-medium text-success-500">
                  {formatCurrency(stats.pendingPayout / 100)}
                </span>
              </div>
            </div>
          )}

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500/10 text-primary-500">
                  <User className="h-4 w-4" />
                </div>
                <span className="hidden sm:inline text-sm">{provider.name}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{provider.name}</p>
                <p className="text-xs text-text-secondary">{provider.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/provider/settings/profile">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/provider/earnings">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Earnings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <form action={providerLogoutAction}>
                <DropdownMenuItem asChild>
                  <button type="submit" className="w-full cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </button>
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
