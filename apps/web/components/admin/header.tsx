'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, LogOut, User, ShieldCheck } from 'lucide-react'
import type { Attorney } from '@botesq/database'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { adminLogout } from '@/lib/admin-auth/actions'

interface AdminHeaderProps {
  admin: Attorney
}

export function AdminHeader({ admin }: AdminHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background-secondary px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Security indicator */}
      <div className="flex items-center gap-2 rounded-lg bg-error-500/10 px-3 py-1.5">
        <ShieldCheck className="h-4 w-4 text-error-500" />
        <span className="text-xs font-medium text-error-500">Admin Access</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-error-500/10 text-sm font-medium text-error-500">
              {admin.firstName[0]}
              {admin.lastName[0]}
            </div>
            <span className="hidden text-sm font-medium text-text-primary sm:inline">
              {admin.firstName}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium text-text-primary">
              {admin.firstName} {admin.lastName}
            </p>
            <p className="text-xs text-text-secondary">{admin.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/attorney/settings">
              <User className="mr-2 h-4 w-4" />
              Profile Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-error-500 focus:text-error-500"
            onClick={() => adminLogout()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
