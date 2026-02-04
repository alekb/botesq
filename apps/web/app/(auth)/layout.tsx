import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background-primary">
      {/* Header */}
      <header className="p-6">
        <Link href="/" className="text-2xl font-bold text-primary-500 hover:text-primary-400">
          BotEsq
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
