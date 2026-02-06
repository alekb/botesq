import * as React from 'react'

type InquiryType = 'sales' | 'support' | 'legal' | 'general'

interface ContactNotificationEmailProps {
  name: string
  email: string
  inquiryType: InquiryType
  message: string
}

const inquiryLabels: Record<InquiryType, string> = {
  sales: 'Sales Inquiry',
  support: 'Technical Support',
  legal: 'Legal & Compliance',
  general: 'General Inquiry',
}

const inquiryColors: Record<InquiryType, string> = {
  sales: '#3b82f6',
  support: '#22c55e',
  legal: '#f59e0b',
  general: '#a1a1a1',
}

export function ContactNotificationEmail({
  name,
  email,
  inquiryType,
  message,
}: ContactNotificationEmailProps) {
  const badgeColor = inquiryColors[inquiryType]
  const label = inquiryLabels[inquiryType]

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
        <div style={{ marginBottom: '24px' }}>
          <span
            style={{
              display: 'inline-block',
              backgroundColor: badgeColor,
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
              padding: '4px 12px',
              borderRadius: '9999px',
            }}
          >
            {label}
          </span>
        </div>

        <h2
          style={{
            fontSize: '20px',
            fontWeight: 600,
            marginTop: 0,
            marginBottom: '16px',
            color: '#ffffff',
          }}
        >
          New Contact Form Submission
        </h2>

        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '24px',
          }}
        >
          <tbody>
            <tr>
              <td
                style={{
                  fontSize: '12px',
                  color: '#6b6b6b',
                  paddingBottom: '4px',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.05em',
                }}
              >
                Name
              </td>
            </tr>
            <tr>
              <td
                style={{
                  fontSize: '14px',
                  color: '#ffffff',
                  paddingBottom: '16px',
                }}
              >
                {name}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  fontSize: '12px',
                  color: '#6b6b6b',
                  paddingBottom: '4px',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.05em',
                }}
              >
                Email
              </td>
            </tr>
            <tr>
              <td style={{ paddingBottom: '16px' }}>
                <a
                  href={`mailto:${email}`}
                  style={{
                    fontSize: '14px',
                    color: '#3b82f6',
                    textDecoration: 'none',
                  }}
                >
                  {email}
                </a>
              </td>
            </tr>
          </tbody>
        </table>

        <div
          style={{
            backgroundColor: '#0a0a0a',
            borderRadius: '6px',
            padding: '16px',
            border: '1px solid #262626',
          }}
        >
          <p
            style={{
              fontSize: '12px',
              color: '#6b6b6b',
              marginTop: 0,
              marginBottom: '8px',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.05em',
            }}
          >
            Message
          </p>
          <p
            style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#a1a1a1',
              margin: 0,
              whiteSpace: 'pre-wrap' as const,
            }}
          >
            {message}
          </p>
        </div>

        <p
          style={{
            fontSize: '12px',
            color: '#6b6b6b',
            marginTop: '24px',
            marginBottom: 0,
          }}
        >
          Submitted on{' '}
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
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

export function getContactNotificationEmailText(
  name: string,
  email: string,
  inquiryType: InquiryType,
  message: string
): string {
  return `
New Contact Form Submission

Type: ${inquiryLabels[inquiryType]}
Name: ${name}
Email: ${email}

Message:
${message}

---
BotEsq - Licensed Legal Services for AI Agents
  `.trim()
}
