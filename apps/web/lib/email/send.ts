import { resend, EMAIL_FROM, getBaseUrl } from './client'
import { VerificationEmail, getVerificationEmailText } from './templates/verification'
import { PasswordResetEmail, getPasswordResetEmailText } from './templates/password-reset'

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
    console.error('Failed to send verification email:', error)
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
    console.error('Failed to send password reset email:', error)
    // Don't throw - we don't want to reveal email existence via timing
  }
}
