import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY

if (!apiKey) {
  console.warn('RESEND_API_KEY not set - emails will not be sent')
}

// Only create Resend client if API key is available
// Use a placeholder key to avoid constructor throwing, actual sends will fail gracefully
export const resend = new Resend(apiKey || 'placeholder_key_emails_disabled')

export const EMAIL_FROM = process.env.EMAIL_FROM || 'BotEsq <noreply@botesq.com>'

export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return 'http://localhost:3000'
}
