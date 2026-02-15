'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ChevronDown, ChevronRight, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'

interface NavItem {
  title: string
  href?: string
  items?: NavItem[]
}

const navigation: NavItem[] = [
  { title: 'Introduction', href: '/docs' },
  { title: 'Quickstart', href: '/docs/quickstart' },
  { title: 'Authentication', href: '/docs/authentication' },
  {
    title: 'MCP Tools',
    href: '/docs/tools',
    items: [
      { title: 'start_session', href: '/docs/tools/start-session' },
      { title: 'get_session_info', href: '/docs/tools/get-session-info' },
      { title: 'list_services', href: '/docs/tools/list-services' },
      { title: 'get_disclaimers', href: '/docs/tools/get-disclaimers' },
      { title: 'check_credits', href: '/docs/tools/check-credits' },
      { title: 'add_credits', href: '/docs/tools/add-credits' },
      { title: 'register_resolve_agent', href: '/docs/tools/register-resolve-agent' },
      { title: 'get_agent_trust', href: '/docs/tools/get-agent-trust' },
      { title: 'propose_transaction', href: '/docs/tools/propose-transaction' },
      { title: 'respond_to_transaction', href: '/docs/tools/respond-to-transaction' },
      { title: 'complete_transaction', href: '/docs/tools/complete-transaction' },
      { title: 'fund_escrow', href: '/docs/tools/fund-escrow' },
      { title: 'release_escrow', href: '/docs/tools/release-escrow' },
      { title: 'get_escrow_status', href: '/docs/tools/get-escrow-status' },
      { title: 'file_dispute', href: '/docs/tools/file-dispute' },
      { title: 'respond_to_dispute', href: '/docs/tools/respond-to-dispute' },
      { title: 'get_dispute', href: '/docs/tools/get-dispute' },
      { title: 'list_disputes', href: '/docs/tools/list-disputes' },
      { title: 'submit_evidence', href: '/docs/tools/submit-evidence' },
      { title: 'get_evidence', href: '/docs/tools/get-evidence' },
      { title: 'get_decision', href: '/docs/tools/get-decision' },
      { title: 'accept_decision', href: '/docs/tools/accept-decision' },
      { title: 'reject_decision', href: '/docs/tools/reject-decision' },
      { title: 'request_escalation', href: '/docs/tools/request-escalation' },
      { title: 'get_escalation_status', href: '/docs/tools/get-escalation-status' },
      { title: 'submit_dispute_feedback', href: '/docs/tools/submit-dispute-feedback' },
    ],
  },
  { title: 'Error Handling', href: '/docs/errors' },
  { title: 'Webhooks', href: '/docs/webhooks' },
  {
    title: 'Examples',
    href: '/docs/examples',
    items: [
      { title: 'Python', href: '/docs/examples/python' },
      { title: 'TypeScript', href: '/docs/examples/typescript' },
    ],
  },
]

function NavSection({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname()
  const isActive = item.href === pathname
  const hasItems = item.items && item.items.length > 0
  const isExpanded =
    hasItems && (pathname === item.href || item.items?.some((child) => pathname === child.href))
  const [open, setOpen] = useState(isExpanded)

  return (
    <div>
      <div className="flex items-center">
        {item.href ? (
          <Link
            href={item.href}
            className={cn(
              'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary-500/10 text-primary-500'
                : 'text-text-secondary hover:bg-background-secondary hover:text-text-primary',
              depth > 0 && 'pl-6'
            )}
          >
            {item.title}
          </Link>
        ) : (
          <span
            className={cn(
              'flex-1 px-3 py-2 text-sm font-medium text-text-secondary',
              depth > 0 && 'pl-6'
            )}
          >
            {item.title}
          </span>
        )}
        {hasItems && (
          <button
            onClick={() => setOpen(!open)}
            className="rounded-md p-1 text-text-secondary hover:bg-background-secondary hover:text-text-primary"
            aria-label={open ? 'Collapse section' : 'Expand section'}
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}
      </div>
      {hasItems && open && (
        <div className="mt-1 space-y-1">
          {item.items?.map((child) => (
            <NavSection key={child.href || child.title} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function DocsSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile menu button */}
      <div className="sticky top-0 z-40 flex items-center border-b border-border-default bg-background-primary px-4 py-3 lg:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          <span className="ml-2">Menu</span>
        </Button>
      </div>

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed inset-x-0 top-[120px] z-30 h-[calc(100vh-120px)] overflow-y-auto border-r border-border-default bg-background-primary px-4 py-6 lg:hidden',
          mobileOpen ? 'block' : 'hidden'
        )}
      >
        <nav className="space-y-1">
          {navigation.map((item) => (
            <NavSection key={item.href || item.title} item={item} />
          ))}
        </nav>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <nav className="sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto px-4 py-8">
          <div className="space-y-1">
            {navigation.map((item) => (
              <NavSection key={item.href || item.title} item={item} />
            ))}
          </div>
        </nav>
      </aside>
    </>
  )
}
