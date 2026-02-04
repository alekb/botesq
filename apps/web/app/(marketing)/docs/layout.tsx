import { Metadata } from 'next'
import { DocsSidebar } from './components/docs-sidebar'

export const metadata: Metadata = {
  title: 'Documentation | BotEsq',
  description: 'API documentation and guides for integrating with BotEsq MCP server',
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col lg:flex-row">
        <DocsSidebar />
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <div className="mx-auto max-w-3xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
