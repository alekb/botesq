import { cn } from '@/lib/utils/cn'

interface HeroGraphicProps {
  className?: string
}

export function HeroGraphic({ className }: HeroGraphicProps) {
  return (
    <svg
      viewBox="0 0 480 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('w-full h-auto', className)}
      aria-hidden="true"
    >
      <defs>
        {/* Gradients */}
        <linearGradient id="heroGradientPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="heroGradientSecondary" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="heroGradientSuccess" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>

        {/* Glow filters */}
        <filter id="glowBlue" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glowAmber" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background grid pattern */}
      <g opacity="0.1">
        {[...Array(10)].map((_, i) => (
          <line
            key={`h-${i}`}
            x1="0"
            y1={i * 44}
            x2="480"
            y2={i * 44}
            stroke="#3b82f6"
            strokeWidth="1"
          />
        ))}
        {[...Array(12)].map((_, i) => (
          <line
            key={`v-${i}`}
            x1={i * 44}
            y1="0"
            x2={i * 44}
            y2="400"
            stroke="#3b82f6"
            strokeWidth="1"
          />
        ))}
      </g>

      {/* Connection lines between nodes */}
      <g stroke="#3b82f6" strokeWidth="2" opacity="0.3">
        {/* Lines from center to outer agents */}
        <line x1="240" y1="200" x2="100" y2="100" />
        <line x1="240" y1="200" x2="380" y2="100" />
        <line x1="240" y1="200" x2="80" y2="280" />
        <line x1="240" y1="200" x2="400" y2="280" />
        <line x1="240" y1="200" x2="160" y2="340" />
        <line x1="240" y1="200" x2="320" y2="340" />

        {/* Cross connections between agents */}
        <line x1="100" y1="100" x2="160" y2="340" strokeDasharray="4 4" opacity="0.2" />
        <line x1="380" y1="100" x2="320" y2="340" strokeDasharray="4 4" opacity="0.2" />
        <line x1="80" y1="280" x2="400" y2="280" strokeDasharray="4 4" opacity="0.2" />
      </g>

      {/* Animated pulse rings around center */}
      <circle cx="240" cy="200" r="60" stroke="#3b82f6" strokeWidth="1" fill="none" opacity="0.2">
        <animate attributeName="r" values="60;100;60" dur="4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.2;0;0.2" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx="240" cy="200" r="80" stroke="#3b82f6" strokeWidth="1" fill="none" opacity="0.15">
        <animate
          attributeName="r"
          values="80;120;80"
          dur="4s"
          begin="1s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.15;0;0.15"
          dur="4s"
          begin="1s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Central shield/scale element */}
      <g filter="url(#glowBlue)">
        {/* Shield background */}
        <path
          d="M240 140 L280 160 L280 210 Q280 240 240 260 Q200 240 200 210 L200 160 Z"
          fill="#141414"
          stroke="url(#heroGradientPrimary)"
          strokeWidth="2"
        />
        {/* Scale icon inside shield */}
        <g transform="translate(218, 170)">
          {/* Beam */}
          <rect x="4" y="12" width="40" height="3" rx="1.5" fill="url(#heroGradientPrimary)" />
          {/* Pillar */}
          <rect x="22" y="10" width="3" height="28" rx="1.5" fill="url(#heroGradientPrimary)" />
          {/* Base */}
          <rect x="14" y="36" width="18" height="3" rx="1.5" fill="url(#heroGradientPrimary)" />
          {/* Left pan */}
          <path
            d="M6 15 L6 20 Q6 28 14 28 Q22 28 22 20 L22 15"
            stroke="url(#heroGradientPrimary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Right pan */}
          <path
            d="M26 15 L26 20 Q26 28 34 28 Q42 28 42 20 L42 15"
            stroke="url(#heroGradientPrimary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Top node */}
          <circle cx="24" cy="6" r="4" fill="url(#heroGradientPrimary)" />
        </g>
      </g>

      {/* Agent nodes - representing AI agents in the network */}

      {/* Top left agent */}
      <g transform="translate(100, 100)">
        <circle r="24" fill="#141414" stroke="url(#heroGradientPrimary)" strokeWidth="2" />
        <circle r="8" fill="url(#heroGradientPrimary)" />
        <circle r="4" fill="#ffffff" opacity="0.8" />
      </g>

      {/* Top right agent */}
      <g transform="translate(380, 100)">
        <circle r="24" fill="#141414" stroke="url(#heroGradientPrimary)" strokeWidth="2" />
        <circle r="8" fill="url(#heroGradientPrimary)" />
        <circle r="4" fill="#ffffff" opacity="0.8" />
      </g>

      {/* Middle left agent - with amber accent (legal) */}
      <g transform="translate(80, 280)" filter="url(#glowAmber)">
        <circle r="20" fill="#141414" stroke="url(#heroGradientSecondary)" strokeWidth="2" />
        <circle r="6" fill="url(#heroGradientSecondary)" />
        <circle r="3" fill="#ffffff" opacity="0.8" />
      </g>

      {/* Middle right agent - with amber accent (legal) */}
      <g transform="translate(400, 280)" filter="url(#glowAmber)">
        <circle r="20" fill="#141414" stroke="url(#heroGradientSecondary)" strokeWidth="2" />
        <circle r="6" fill="url(#heroGradientSecondary)" />
        <circle r="3" fill="#ffffff" opacity="0.8" />
      </g>

      {/* Bottom left agent - with success color (verified) */}
      <g transform="translate(160, 340)">
        <circle r="18" fill="#141414" stroke="url(#heroGradientSuccess)" strokeWidth="2" />
        <circle r="6" fill="url(#heroGradientSuccess)" />
        {/* Checkmark for verified */}
        <path
          d="M-4 0 L-1 3 L4 -3"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      {/* Bottom right agent - with success color (verified) */}
      <g transform="translate(320, 340)">
        <circle r="18" fill="#141414" stroke="url(#heroGradientSuccess)" strokeWidth="2" />
        <circle r="6" fill="url(#heroGradientSuccess)" />
        {/* Checkmark for verified */}
        <path
          d="M-4 0 L-1 3 L4 -3"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      {/* Data flow particles - subtle animated dots along connection lines */}
      <g fill="#3b82f6">
        <circle r="3" opacity="0.6">
          <animateMotion dur="3s" repeatCount="indefinite" path="M240 200 L100 100" />
        </circle>
        <circle r="3" opacity="0.6">
          <animateMotion dur="3s" repeatCount="indefinite" begin="0.5s" path="M240 200 L380 100" />
        </circle>
        <circle r="2" opacity="0.4">
          <animateMotion dur="4s" repeatCount="indefinite" begin="1s" path="M240 200 L80 280" />
        </circle>
        <circle r="2" opacity="0.4">
          <animateMotion dur="4s" repeatCount="indefinite" begin="1.5s" path="M240 200 L400 280" />
        </circle>
      </g>

      {/* Corner decorative elements */}
      <g opacity="0.3">
        {/* Top left corner */}
        <path d="M20 60 L20 20 L60 20" stroke="#3b82f6" strokeWidth="2" fill="none" />
        {/* Top right corner */}
        <path d="M420 20 L460 20 L460 60" stroke="#3b82f6" strokeWidth="2" fill="none" />
        {/* Bottom left corner */}
        <path d="M20 340 L20 380 L60 380" stroke="#3b82f6" strokeWidth="2" fill="none" />
        {/* Bottom right corner */}
        <path d="M420 380 L460 380 L460 340" stroke="#3b82f6" strokeWidth="2" fill="none" />
      </g>
    </svg>
  )
}
