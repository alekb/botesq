import * as React from 'react'

interface PasswordResetEmailProps {
  companyName: string
  resetUrl: string
}

export function PasswordResetEmail({ companyName, resetUrl }: PasswordResetEmailProps) {
  return (
    <div
      style={{
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        maxWidth: '600px',
        margin: '0 auto',
        padding: '40px 20px',
        backgroundColor: '#0a0a0a',
        color: '#ffffff',
      }}
    >
      <div style={{ marginBottom: '32px' }}>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 700,
            margin: 0,
            color: '#3b82f6',
          }}
        >
          BotEsq
        </h1>
      </div>

      <div
        style={{
          backgroundColor: '#141414',
          borderRadius: '8px',
          padding: '32px',
          border: '1px solid #262626',
        }}
      >
        <h2
          style={{
            fontSize: '20px',
            fontWeight: 600,
            marginTop: 0,
            marginBottom: '16px',
            color: '#ffffff',
          }}
        >
          Reset your password
        </h2>

        <p
          style={{
            fontSize: '14px',
            lineHeight: '1.6',
            color: '#a1a1a1',
            marginBottom: '24px',
          }}
        >
          Hi {companyName}, we received a request to reset your password. Click the button below to
          create a new password.
        </p>

        <a
          href={resetUrl}
          style={{
            display: 'inline-block',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            textDecoration: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          Reset Password
        </a>

        <p
          style={{
            fontSize: '12px',
            color: '#6b6b6b',
            marginTop: '24px',
            marginBottom: 0,
          }}
        >
          This link expires in 1 hour. If you didn&apos;t request a password reset, you can safely
          ignore this email. Your password will remain unchanged.
        </p>
      </div>

      <div
        style={{
          marginTop: '32px',
          paddingTop: '24px',
          borderTop: '1px solid #262626',
          textAlign: 'center' as const,
        }}
      >
        <p
          style={{
            fontSize: '12px',
            color: '#6b6b6b',
            margin: 0,
          }}
        >
          BotEsq - Licensed Legal Services for AI Agents
        </p>
      </div>
    </div>
  )
}

export function getPasswordResetEmailText(companyName: string, resetUrl: string): string {
  return `
Hi ${companyName},

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

---
BotEsq - Licensed Legal Services for AI Agents
  `.trim()
}
