'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProviderSidebar, ProviderHeader } from '@/components/provider'
import { cn } from '@/lib/utils/cn'
import { getCurrentProvider } from '@/lib/auth/provider-actions'
import { getProviderStats } from '@/lib/api/provider'
import { Skeleton } from '@/components/ui/skeleton'
import type { Provider, ProviderStats } from '@/types/provider'

export default function ProviderPortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [provider, setProvider] = useState<Provider | null>(null)
  const [stats, setStats] = useState<ProviderStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadProviderData() {
      const { provider: currentProvider, token } = await getCurrentProvider()

      if (!currentProvider) {
        router.push('/provider-login')
        return
      }

      if (currentProvider.status === 'PENDING_APPROVAL') {
        router.push('/provider-pending')
        return
      }

      setProvider(currentProvider)

      // Load stats if we have a token
      if (token) {
        try {
          const providerStats = await getProviderStats(token)
          setStats(providerStats)
        } catch {
          // Stats failed to load, not critical
        }
      }

      setIsLoading(false)
    }

    loadProviderData()
  }, [router])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [])

  if (isLoading || !provider) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    )
  }

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
        <ProviderSidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />
      </div>

      {/* Main content */}
      <div
        className={cn(
          'transition-all duration-300',
          sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[280px]'
        )}
      >
        <ProviderHeader
          provider={provider}
          stats={stats ?? undefined}
          onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
