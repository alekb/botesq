import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin.js'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: {
          primary: '#0a0a0a',
          secondary: '#141414',
          tertiary: '#1f1f1f',
          elevated: '#262626',
          inverse: '#ffffff',
        },
        text: {
          primary: '#ffffff',
          secondary: '#a1a1a1',
          muted: '#6b6b6b',
          inverse: '#0a0a0a',
          link: '#3b82f6',
        },
        border: {
          default: '#262626',
          subtle: '#1f1f1f',
          strong: '#404040',
          focus: '#3b82f6',
        },
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        secondary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        info: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        status: {
          pending: '#f59e0b',
          active: '#3b82f6',
          review: '#a855f7',
          completed: '#22c55e',
          blocked: '#ef4444',
          closed: '#6b6b6b',
        },
        credits: {
          positive: '#22c55e',
          negative: '#ef4444',
          balance: '#3b82f6',
        },
        confidence: {
          high: '#22c55e',
          medium: '#f59e0b',
          low: '#ef4444',
        },
        priority: {
          urgent: '#ef4444',
          high: '#f59e0b',
          normal: '#3b82f6',
          low: '#6b6b6b',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        DEFAULT: '6px',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    plugin(function ({ addUtilities }) {
      addUtilities({
        '.typography-h1': {
          fontSize: '2.25rem',
          fontWeight: '700',
          lineHeight: '1.25',
          letterSpacing: '-0.025em',
        },
        '.typography-h2': {
          fontSize: '1.875rem',
          fontWeight: '700',
          lineHeight: '1.25',
          letterSpacing: '-0.025em',
        },
        '.typography-h3': {
          fontSize: '1.5rem',
          fontWeight: '600',
          lineHeight: '1.375',
        },
        '.typography-h4': {
          fontSize: '1.25rem',
          fontWeight: '600',
          lineHeight: '1.375',
        },
        '.typography-h5': {
          fontSize: '1.125rem',
          fontWeight: '500',
          lineHeight: '1.5',
        },
        '.typography-h6': {
          fontSize: '1rem',
          fontWeight: '500',
          lineHeight: '1.5',
        },
        '.typography-body-large': {
          fontSize: '1.125rem',
          fontWeight: '400',
          lineHeight: '1.625',
        },
        '.typography-body': {
          fontSize: '1rem',
          fontWeight: '400',
          lineHeight: '1.5',
        },
        '.typography-body-small': {
          fontSize: '0.875rem',
          fontWeight: '400',
          lineHeight: '1.5',
        },
        '.typography-label': {
          fontSize: '0.875rem',
          fontWeight: '500',
          lineHeight: '1',
        },
        '.typography-caption': {
          fontSize: '0.75rem',
          fontWeight: '400',
          lineHeight: '1.5',
        },
        '.typography-code': {
          fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, Monaco, 'Courier New', monospace",
          fontSize: '0.875rem',
          fontWeight: '400',
        },
      })
    }),
  ],
}

export default config
