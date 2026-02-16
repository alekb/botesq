import { resend, EMAIL_FROM, getBaseUrl } from './client'
import { VerificationEmail, getVerificationEmailText } from './templates/verification'
import { PasswordResetEmail, getPasswordResetEmailText } from './templates/password-reset'
import { logger } from '@/lib/logger'
import {
  ContactNotificationEmail,
  getContactNotificationEmailText,
} from './templates/contact-notification'

type InquiryType = 'sales' | 'support' | 'legal' | 'general'

const INQUIRY_RECIPIENTS: Record<InquiryType, string> = {
  sales: 'sales@botesq.com',
  support: 'support@botesq.com',
  legal: 'legal@botesq.com',
  general: 'hello@botesq.com',
}

/**
 * Send verification email to new operator
 */
export async function sendVerificationEmail(
  to: string,
  token: string,
  companyName: string
): Promise<void> {
  const baseUrl = getBaseUrl()
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: 'Verify your BotEsq account',
      react: VerificationEmail({ companyName, verificationUrl }),
      text: getVerificationEmailText(companyName, verificationUrl),
    })
  } catch (error) {
    logger.error('Failed to send verification email', { error: String(error) })
    // Don't throw - we don't want to block signup on email failure
    // The user can request a new verification email
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  token: string,
  companyName: string
): Promise<void> {
  const baseUrl = getBaseUrl()
  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: 'Reset your BotEsq password',
      react: PasswordResetEmail({ companyName, resetUrl }),
      text: getPasswordResetEmailText(companyName, resetUrl),
    })
  } catch (error) {
    logger.error('Failed to send password reset email', { error: String(error) })
    // Don't throw - we don't want to reveal email existence via timing
  }
}

/**
 * Send contact form notification to the appropriate team
 */
export async function sendContactEmail(
  name: string,
  email: string,
  inquiryType: InquiryType,
  message: string
): Promise<void> {
  const to = INQUIRY_RECIPIENTS[inquiryType]

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      replyTo: email,
      subject: `Contact Form: ${name}`,
      react: ContactNotificationEmail({ name, email, inquiryType, message }),
      text: getContactNotificationEmailText(name, email, inquiryType, message),
    })
  } catch (error) {
    logger.error('Failed to send contact email', { error: String(error) })
    // Don't throw - we show a generic success to the user regardless
  }
}
