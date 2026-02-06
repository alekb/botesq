import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the email client module
vi.mock('../lib/email/client', () => ({
  resend: {
    emails: {
      send: vi.fn().mockResolvedValue({ id: 'email_123' }),
    },
  },
  EMAIL_FROM: 'BotEsq <noreply@botesq.com>',
  getBaseUrl: vi.fn().mockReturnValue('https://botesq.io'),
}))

// Mock email templates
vi.mock('../lib/email/templates/verification', () => ({
  VerificationEmail: vi.fn().mockReturnValue('verification-email-jsx'),
  getVerificationEmailText: vi.fn().mockReturnValue('verification plain text'),
}))

vi.mock('../lib/email/templates/password-reset', () => ({
  PasswordResetEmail: vi.fn().mockReturnValue('password-reset-jsx'),
  getPasswordResetEmailText: vi.fn().mockReturnValue('password reset plain text'),
}))

vi.mock('../lib/email/templates/contact-notification', () => ({
  ContactNotificationEmail: vi.fn().mockReturnValue('contact-notification-jsx'),
  getContactNotificationEmailText: vi.fn().mockReturnValue('contact plain text'),
}))

import { resend } from '../lib/email/client'
import { sendVerificationEmail, sendPasswordResetEmail, sendContactEmail } from '../lib/email/send'

describe('email send', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('sendVerificationEmail', () => {
    it('should send email with correct params', async () => {
      await sendVerificationEmail('user@test.com', 'token123', 'TestCo')

      expect(resend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'BotEsq <noreply@botesq.com>',
          to: 'user@test.com',
          subject: 'Verify your BotEsq account',
        })
      )
    })

    it('should include verification URL with token', async () => {
      await sendVerificationEmail('user@test.com', 'abc123', 'TestCo')

      // VerificationEmail template should be called with the URL
      const { VerificationEmail } = await import('../lib/email/templates/verification')
      expect(VerificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          verificationUrl: 'https://botesq.io/verify-email?token=abc123',
        })
      )
    })

    it('should not throw on send failure', async () => {
      vi.mocked(resend.emails.send).mockRejectedValue(new Error('API error'))

      // Should not throw
      await sendVerificationEmail('user@test.com', 'token', 'TestCo')
    })
  })

  describe('sendPasswordResetEmail', () => {
    it('should send email with correct params', async () => {
      await sendPasswordResetEmail('user@test.com', 'resettoken', 'TestCo')

      expect(resend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'BotEsq <noreply@botesq.com>',
          to: 'user@test.com',
          subject: 'Reset your BotEsq password',
        })
      )
    })

    it('should include reset URL with token', async () => {
      await sendPasswordResetEmail('user@test.com', 'reset123', 'TestCo')

      const { PasswordResetEmail } = await import('../lib/email/templates/password-reset')
      expect(PasswordResetEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          resetUrl: 'https://botesq.io/reset-password?token=reset123',
        })
      )
    })

    it('should not throw on send failure', async () => {
      vi.mocked(resend.emails.send).mockRejectedValue(new Error('API error'))

      await sendPasswordResetEmail('user@test.com', 'token', 'TestCo')
    })
  })

  describe('sendContactEmail', () => {
    it('should route sales inquiries to sales@botesq.com', async () => {
      await sendContactEmail('John', 'john@test.com', 'sales', 'I need info')

      expect(resend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'sales@botesq.com',
          replyTo: 'john@test.com',
        })
      )
    })

    it('should route support inquiries to support@botesq.com', async () => {
      await sendContactEmail('Jane', 'jane@test.com', 'support', 'Help me')

      expect(resend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'support@botesq.com',
        })
      )
    })

    it('should route legal inquiries to legal@botesq.com', async () => {
      await sendContactEmail('Bob', 'bob@test.com', 'legal', 'Legal question')

      expect(resend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'legal@botesq.com',
        })
      )
    })

    it('should route general inquiries to hello@botesq.com', async () => {
      await sendContactEmail('Alice', 'alice@test.com', 'general', 'Hello')

      expect(resend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'hello@botesq.com',
        })
      )
    })

    it('should include sender name in subject', async () => {
      await sendContactEmail('John Doe', 'john@test.com', 'general', 'Message')

      expect(resend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Contact Form: John Doe',
        })
      )
    })

    it('should not throw on send failure', async () => {
      vi.mocked(resend.emails.send).mockRejectedValue(new Error('API error'))

      await sendContactEmail('Test', 'test@test.com', 'general', 'Message')
    })
  })
})
