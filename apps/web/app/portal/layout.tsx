'use client'

import { useState, useEffect } from 'react'
import { Sidebar, Header } from '@/components/portal'
import { cn } from '@/lib/utils/cn'

// Temporary mock operator data - will be replaced with real data fetching
const mockOperator = {
  id: 'mock-id',
  email: 'operator@example.com',
  companyName: 'Acme Inc.',
  creditBalance: 50000,
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [])

  return (
    <div className="min-h-screen bg-background-primary">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile unless menu is open */}
      <div className={cn('lg:block', mobileMenuOpen ? 'block' : 'hidden')}>
        <Sidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />
      </div>

      {/* Main content */}
      <div
        className={cn(
          'transition-all duration-300',
          sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[280px]'
        )}
      >
        <Header operator={mockOperator} onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
