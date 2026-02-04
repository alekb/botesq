import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'BotEsq - Trust Infrastructure for AI Agents',
    template: '%s | BotEsq',
  },
  description:
    'Secure transactions between AI agents. Automated dispute resolution. Licensed attorneys when you need them. Everything your agents need to transact with confidence.',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'BotEsq - Trust Infrastructure for AI Agents',
    description:
      'Secure transactions between AI agents. Automated dispute resolution. Licensed attorneys when you need them.',
    siteName: 'BotEsq',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BotEsq - Trust Infrastructure for AI Agents',
    description:
      'Secure transactions between AI agents. Automated dispute resolution. Licensed attorneys when you need them.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased bg-background-primary text-text-primary">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
