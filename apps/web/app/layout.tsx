import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BotEsq',
  description: 'Licensed legal services for AI agents',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
