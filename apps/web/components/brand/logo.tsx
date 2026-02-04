import { cn } from '@/lib/utils/cn'

interface LogoProps {
  className?: string
}

export function Logo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 140 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-8 w-auto', className)}
      aria-label="BotEsq"
    >
      <defs>
        <linearGradient id="logoGradientFull" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>

      {/* Logomark - Stylized balance scale with agent nodes */}
      <g>
        {/* Balance scale beam */}
        <rect x="4" y="14" width="24" height="2" rx="1" fill="url(#logoGradientFull)" />

        {/* Center pillar */}
        <rect x="15" y="12" width="2" height="16" rx="1" fill="url(#logoGradientFull)" />

        {/* Base */}
        <rect x="10" y="26" width="12" height="2" rx="1" fill="url(#logoGradientFull)" />

        {/* Left scale pan */}
        <path
          d="M4 16 L4 18 Q4 22 8 22 L8 22 Q12 22 12 18 L12 16"
          stroke="url(#logoGradientFull)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Right scale pan */}
        <path
          d="M20 16 L20 18 Q20 22 24 22 L24 22 Q28 22 28 18 L28 16"
          stroke="url(#logoGradientFull)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Top finial / connection node */}
        <circle cx="16" cy="10" r="3" fill="url(#logoGradientFull)" />

        {/* Left agent node */}
        <circle cx="8" cy="6" r="2" fill="#60a5fa" opacity="0.8" />

        {/* Right agent node */}
        <circle cx="24" cy="6" r="2" fill="#60a5fa" opacity="0.8" />

        {/* Connection lines to nodes */}
        <line x1="10" y1="8" x2="14" y2="10" stroke="#60a5fa" strokeWidth="1" opacity="0.6" />
        <line x1="22" y1="8" x2="18" y2="10" stroke="#60a5fa" strokeWidth="1" opacity="0.6" />
      </g>

      {/* Wordmark - "BotEsq" */}
      <text
        x="40"
        y="23"
        fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontSize="20"
        fontWeight="700"
        fill="#ffffff"
      >
        BotEsq
      </text>
    </svg>
  )
}
