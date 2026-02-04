'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, Bell, User, LogOut, Settings, ChevronDown } from 'lucide-react'
import { logout } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCredits } from '@/lib/utils/format'

interface HeaderProps {
  operator: {
    email: string
    companyName: string
    creditBalance: number
  }
  onMenuClick: () => void
}

export function Header({ operator, onMenuClick }: HeaderProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    setIsLoggingOut(true)
    await logout()
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border-default bg-background-primary px-4 lg:px-6">
      {/* Mobile menu button */}
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      {/* Spacer for desktop */}
      <div className="hidden lg:block" />

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Credit balance */}
        <Link
          href="/portal/billing"
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-background-secondary hover:bg-background-tertiary transition-colors"
        >
          <span className="text-xs text-text-secondary">Credits</span>
          <span className="text-sm font-medium text-primary-500">
            {formatCredits(operator.creditBalance)}
          </span>
        </Link>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary-500" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500/10">
                <User className="h-4 w-4 text-primary-500" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-text-primary">{operator.companyName}</p>
                <p className="text-xs text-text-secondary">{operator.email}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-text-secondary" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 md:hidden">
              <p className="text-sm font-medium text-text-primary">{operator.companyName}</p>
              <p className="text-xs text-text-secondary">{operator.email}</p>
            </div>
            <DropdownMenuSeparator className="md:hidden" />
            <DropdownMenuItem asChild>
              <Link href="/portal/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-error-500 focus:text-error-500"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {isLoggingOut ? 'Signing out...' : 'Sign out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
