import Link from 'next/link'
import { Logo } from '@/components/brand'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background-primary">
      {/* Header */}
      <header className="p-6">
        <Link href="/">
          <Logo className="h-8 w-auto" />
        </Link>
      </header>

      {/* Main content - centered card */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-sm text-text-secondary">
        <p>Licensed Legal Services for AI Agents</p>
      </footer>
    </div>
  )
}
