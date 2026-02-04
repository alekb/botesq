import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn((name: string) => {
      if (name === 'x-forwarded-for') return '127.0.0.1'
      if (name === 'user-agent') return 'TestAgent/1.0'
      return null
    }),
  }),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

// Mock prisma
vi.mock('@botesq/database', () => ({
  prisma: {
    operator: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    emailVerificationToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    passwordResetToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    operatorSession: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

// Mock password module
vi.mock('../lib/auth/password', () => ({
  hashPassword: vi.fn().mockResolvedValue('$argon2id$hashed_password'),
  verifyPassword: vi.fn(),
}))

// Mock tokens module
vi.mock('../lib/auth/tokens', () => ({
  generateShortToken: vi.fn().mockReturnValue('mock_token_12345'),
  hashToken: vi.fn().mockReturnValue('hashed_mock_token'),
}))

// Mock session module
vi.mock('../lib/auth/session', () => ({
  createSession: vi.fn().mockResolvedValue({ session: { id: 'sess_123' }, token: 'raw_token' }),
  getCurrentSession: vi.fn(),
  invalidateSession: vi.fn(),
  invalidateAllSessions: vi.fn(),
}))

// Mock email module
vi.mock('../lib/email/send', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}))

import { prisma } from '@botesq/database'
import { verifyPassword } from '../lib/auth/password'
import { getCurrentSession, invalidateAllSessions, createSession } from '../lib/auth/session'
import { sendVerificationEmail, sendPasswordResetEmail } from '../lib/email/send'
import {
  signup,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  resendVerificationEmail,
  changePassword,
} from '../lib/auth/actions'

// Helper to create FormData
function createFormData(data: Record<string, string>): FormData {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    formData.set(key, value)
  })
  return formData
}

describe('auth/actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('signup', () => {
    it('should reject invalid email format', async () => {
      const formData = createFormData({
        email: 'invalid-email',
        password: 'ValidPass123',
        companyName: 'Test Company',
      })

      const result = await signup(formData)

      expect(result.success).toBe(false)
      expect(result.fieldErrors?.email).toBeDefined()
    })

    it('should reject weak passwords (missing uppercase)', async () => {
      const formData = createFormData({
        email: 'test@example.com',
        password: 'password123',
        companyName: 'Test Company',
      })

      const result = await signup(formData)

      expect(result.success).toBe(false)
      expect(result.fieldErrors?.password).toBeDefined()
    })

    it('should reject weak passwords (missing lowercase)', async () => {
      const formData = createFormData({
        email: 'test@example.com',
        password: 'PASSWORD123',
        companyName: 'Test Company',
      })

      const result = await signup(formData)

      expect(result.success).toBe(false)
      expect(result.fieldErrors?.password).toBeDefined()
    })

    it('should reject weak passwords (missing number)', async () => {
      const formData = createFormData({
        email: 'test@example.com',
        password: 'PasswordOnly',
        companyName: 'Test Company',
      })

      const result = await signup(formData)

      expect(result.success).toBe(false)
      expect(result.fieldErrors?.password).toBeDefined()
    })

    it('should reject passwords shorter than 8 characters', async () => {
      const formData = createFormData({
        email: 'test@example.com',
        password: 'Pass1',
        companyName: 'Test Company',
      })

      const result = await signup(formData)

      expect(result.success).toBe(false)
      expect(result.fieldErrors?.password).toBeDefined()
    })

    it('should reject duplicate email addresses', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({
        id: 'op_existing',
        email: 'test@example.com',
      } as never)

      const formData = createFormData({
        email: 'test@example.com',
        password: 'ValidPass123',
        companyName: 'Test Company',
      })

      const result = await signup(formData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('An account with this email already exists')
    })

    it('should normalize email to lowercase', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.operator.create).mockResolvedValue({
        id: 'op_new',
        email: 'test@example.com',
        companyName: 'Test Company',
      } as never)

      const formData = createFormData({
        email: 'TEST@EXAMPLE.COM',
        password: 'ValidPass123',
        companyName: 'Test Company',
      })

      await signup(formData)

      expect(prisma.operator.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      })
    })

    it('should create operator with PENDING_VERIFICATION status', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.operator.create).mockResolvedValue({
        id: 'op_new',
        email: 'test@example.com',
        companyName: 'Test Company',
      } as never)

      const formData = createFormData({
        email: 'test@example.com',
        password: 'ValidPass123',
        companyName: 'Test Company',
      })

      await signup(formData)

      expect(prisma.operator.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'test@example.com',
          status: 'PENDING_VERIFICATION',
        }),
      })
    })

    it('should send verification email on successful signup', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.operator.create).mockResolvedValue({
        id: 'op_new',
        email: 'test@example.com',
        companyName: 'Test Company',
      } as never)

      const formData = createFormData({
        email: 'test@example.com',
        password: 'ValidPass123',
        companyName: 'Test Company',
      })

      const result = await signup(formData)

      expect(result.success).toBe(true)
      expect(sendVerificationEmail).toHaveBeenCalledWith(
        'test@example.com',
        'mock_token_12345',
        'Test Company'
      )
    })

    it('should create verification token with 24 hour expiry', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.operator.create).mockResolvedValue({
        id: 'op_new',
        email: 'test@example.com',
        companyName: 'Test Company',
      } as never)

      const formData = createFormData({
        email: 'test@example.com',
        password: 'ValidPass123',
        companyName: 'Test Company',
      })

      await signup(formData)

      expect(prisma.emailVerificationToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          operatorId: 'op_new',
          token: 'hashed_mock_token',
          expiresAt: expect.any(Date),
        }),
      })
    })
  })

  describe('login', () => {
    it('should reject invalid email format', async () => {
      const formData = createFormData({
        email: 'invalid',
        password: 'password123',
      })

      const result = await login(formData)

      expect(result.success).toBe(false)
      expect(result.fieldErrors?.email).toBeDefined()
    })

    it('should reject non-existent email (same error as wrong password)', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue(null)

      const formData = createFormData({
        email: 'nonexistent@example.com',
        password: 'password123',
      })

      const result = await login(formData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid email or password')
    })

    it('should reject wrong password (same error as non-existent)', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({
        id: 'op_123',
        email: 'test@example.com',
        passwordHash: '$hashed',
        status: 'ACTIVE',
      } as never)
      vi.mocked(verifyPassword).mockResolvedValue(false)

      const formData = createFormData({
        email: 'test@example.com',
        password: 'wrongpassword',
      })

      const result = await login(formData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid email or password')
    })

    it('should reject unverified accounts', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({
        id: 'op_123',
        email: 'test@example.com',
        passwordHash: '$hashed',
        status: 'PENDING_VERIFICATION',
      } as never)
      vi.mocked(verifyPassword).mockResolvedValue(true)

      const formData = createFormData({
        email: 'test@example.com',
        password: 'ValidPass123',
      })

      const result = await login(formData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Please verify your email before logging in')
    })

    it('should reject suspended accounts', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({
        id: 'op_123',
        email: 'test@example.com',
        passwordHash: '$hashed',
        status: 'SUSPENDED',
      } as never)
      vi.mocked(verifyPassword).mockResolvedValue(true)

      const formData = createFormData({
        email: 'test@example.com',
        password: 'ValidPass123',
      })

      const result = await login(formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('suspended')
    })

    it('should reject closed accounts', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({
        id: 'op_123',
        email: 'test@example.com',
        passwordHash: '$hashed',
        status: 'CLOSED',
      } as never)
      vi.mocked(verifyPassword).mockResolvedValue(true)

      const formData = createFormData({
        email: 'test@example.com',
        password: 'ValidPass123',
      })

      const result = await login(formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('suspended')
    })

    it('should create session on successful login', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({
        id: 'op_123',
        email: 'test@example.com',
        passwordHash: '$hashed',
        status: 'ACTIVE',
      } as never)
      vi.mocked(verifyPassword).mockResolvedValue(true)

      const formData = createFormData({
        email: 'test@example.com',
        password: 'ValidPass123',
      })

      const result = await login(formData)

      expect(result.success).toBe(true)
      expect(createSession).toHaveBeenCalledWith('op_123', '127.0.0.1', 'TestAgent/1.0')
    })
  })

  describe('verifyEmail', () => {
    it('should reject invalid/non-existent token', async () => {
      vi.mocked(prisma.emailVerificationToken.findUnique).mockResolvedValue(null)

      const result = await verifyEmail('invalid_token')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid or expired')
    })

    it('should reject expired token', async () => {
      vi.mocked(prisma.emailVerificationToken.findUnique).mockResolvedValue({
        id: 'vt_123',
        operatorId: 'op_123',
        token: 'hashed_token',
        expiresAt: new Date(Date.now() - 1000), // Expired
        usedAt: null,
        operator: { id: 'op_123' },
      } as never)

      const result = await verifyEmail('some_token')

      expect(result.success).toBe(false)
      expect(result.error).toContain('expired')
    })

    it('should reject already-used token (prevent double-use)', async () => {
      vi.mocked(prisma.emailVerificationToken.findUnique).mockResolvedValue({
        id: 'vt_123',
        operatorId: 'op_123',
        token: 'hashed_token',
        expiresAt: new Date(Date.now() + 3600000), // Valid
        usedAt: new Date(), // Already used
        operator: { id: 'op_123' },
      } as never)

      const result = await verifyEmail('some_token')

      expect(result.success).toBe(false)
      expect(result.error).toContain('already been used')
    })

    it('should activate operator on valid token', async () => {
      vi.mocked(prisma.emailVerificationToken.findUnique).mockResolvedValue({
        id: 'vt_123',
        operatorId: 'op_123',
        token: 'hashed_token',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
        operator: { id: 'op_123' },
      } as never)
      vi.mocked(prisma.$transaction).mockResolvedValue([])

      const result = await verifyEmail('valid_token')

      expect(result.success).toBe(true)
      expect(prisma.$transaction).toHaveBeenCalled()
    })
  })

  describe('forgotPassword', () => {
    it('should return success for non-existent email (prevent enumeration)', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue(null)

      const formData = createFormData({
        email: 'nonexistent@example.com',
      })

      const result = await forgotPassword(formData)

      expect(result.success).toBe(true)
      // Should NOT send email for non-existent account
      expect(sendPasswordResetEmail).not.toHaveBeenCalled()
    })

    it('should return success and send email for existing account', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({
        id: 'op_123',
        email: 'test@example.com',
        companyName: 'Test Company',
      } as never)

      const formData = createFormData({
        email: 'test@example.com',
      })

      const result = await forgotPassword(formData)

      expect(result.success).toBe(true)
      expect(sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
        'mock_token_12345',
        'Test Company'
      )
    })

    it('should invalidate existing reset tokens before creating new one', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({
        id: 'op_123',
        email: 'test@example.com',
        companyName: 'Test Company',
      } as never)

      const formData = createFormData({
        email: 'test@example.com',
      })

      await forgotPassword(formData)

      expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: { operatorId: 'op_123', usedAt: null },
        data: { usedAt: expect.any(Date) },
      })
    })

    it('should create reset token with 1 hour expiry', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({
        id: 'op_123',
        email: 'test@example.com',
        companyName: 'Test Company',
      } as never)

      const formData = createFormData({
        email: 'test@example.com',
      })

      await forgotPassword(formData)

      expect(prisma.passwordResetToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          operatorId: 'op_123',
          token: 'hashed_mock_token',
          expiresAt: expect.any(Date),
        }),
      })
    })
  })

  describe('resetPassword', () => {
    it('should reject invalid token', async () => {
      vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(null)

      const formData = createFormData({
        token: 'invalid_token',
        password: 'NewValidPass123',
      })

      const result = await resetPassword(formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid or expired')
    })

    it('should reject expired token', async () => {
      vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
        id: 'rt_123',
        operatorId: 'op_123',
        token: 'hashed',
        expiresAt: new Date(Date.now() - 1000), // Expired
        usedAt: null,
        operator: { id: 'op_123' },
      } as never)

      const formData = createFormData({
        token: 'some_token',
        password: 'NewValidPass123',
      })

      const result = await resetPassword(formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('expired')
    })

    it('should reject already-used token', async () => {
      vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
        id: 'rt_123',
        operatorId: 'op_123',
        token: 'hashed',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: new Date(), // Already used
        operator: { id: 'op_123' },
      } as never)

      const formData = createFormData({
        token: 'some_token',
        password: 'NewValidPass123',
      })

      const result = await resetPassword(formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('already been used')
    })

    it('should reject weak new password', async () => {
      vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
        id: 'rt_123',
        operatorId: 'op_123',
        token: 'hashed',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
        operator: { id: 'op_123' },
      } as never)

      const formData = createFormData({
        token: 'valid_token',
        password: 'weak',
      })

      const result = await resetPassword(formData)

      expect(result.success).toBe(false)
      expect(result.fieldErrors?.password).toBeDefined()
    })

    it('should invalidate all sessions after password reset (security)', async () => {
      vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
        id: 'rt_123',
        operatorId: 'op_123',
        token: 'hashed',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
        operator: { id: 'op_123' },
      } as never)
      vi.mocked(prisma.$transaction).mockResolvedValue([])

      const formData = createFormData({
        token: 'valid_token',
        password: 'NewValidPass123',
      })

      const result = await resetPassword(formData)

      expect(result.success).toBe(true)
      expect(invalidateAllSessions).toHaveBeenCalledWith('op_123')
    })
  })

  describe('resendVerificationEmail', () => {
    it('should return success for non-existent email (prevent enumeration)', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue(null)

      const result = await resendVerificationEmail('nonexistent@example.com')

      expect(result.success).toBe(true)
      expect(sendVerificationEmail).not.toHaveBeenCalled()
    })

    it('should return success for already-verified account (prevent enumeration)', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({
        id: 'op_123',
        email: 'test@example.com',
        status: 'ACTIVE', // Already verified
      } as never)

      const result = await resendVerificationEmail('test@example.com')

      expect(result.success).toBe(true)
      expect(sendVerificationEmail).not.toHaveBeenCalled()
    })

    it('should send new verification email for unverified account', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({
        id: 'op_123',
        email: 'test@example.com',
        companyName: 'Test Company',
        status: 'PENDING_VERIFICATION',
      } as never)

      const result = await resendVerificationEmail('test@example.com')

      expect(result.success).toBe(true)
      expect(sendVerificationEmail).toHaveBeenCalledWith(
        'test@example.com',
        'mock_token_12345',
        'Test Company'
      )
    })

    it('should invalidate existing verification tokens', async () => {
      vi.mocked(prisma.operator.findUnique).mockResolvedValue({
        id: 'op_123',
        email: 'test@example.com',
        companyName: 'Test Company',
        status: 'PENDING_VERIFICATION',
      } as never)

      await resendVerificationEmail('test@example.com')

      expect(prisma.emailVerificationToken.updateMany).toHaveBeenCalledWith({
        where: { operatorId: 'op_123', usedAt: null },
        data: { usedAt: expect.any(Date) },
      })
    })
  })

  describe('changePassword', () => {
    it('should reject if not logged in', async () => {
      vi.mocked(getCurrentSession).mockResolvedValue({ session: null, operator: null })

      const formData = createFormData({
        currentPassword: 'OldPass123',
        newPassword: 'NewPass123',
      })

      const result = await changePassword(formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('must be logged in')
    })

    it('should reject if current password is incorrect', async () => {
      vi.mocked(getCurrentSession).mockResolvedValue({
        session: { id: 'sess_123' } as never,
        operator: { id: 'op_123', passwordHash: '$hashed' } as never,
      })
      vi.mocked(verifyPassword).mockResolvedValue(false)

      const formData = createFormData({
        currentPassword: 'WrongPassword',
        newPassword: 'NewPass123',
      })

      const result = await changePassword(formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Current password is incorrect')
    })

    it('should reject weak new password', async () => {
      vi.mocked(getCurrentSession).mockResolvedValue({
        session: { id: 'sess_123' } as never,
        operator: { id: 'op_123', passwordHash: '$hashed' } as never,
      })
      vi.mocked(verifyPassword).mockResolvedValue(true)

      const formData = createFormData({
        currentPassword: 'OldPass123',
        newPassword: 'weak',
      })

      const result = await changePassword(formData)

      expect(result.success).toBe(false)
      expect(result.fieldErrors?.newPassword).toBeDefined()
    })

    it('should update password and invalidate other sessions', async () => {
      vi.mocked(getCurrentSession).mockResolvedValue({
        session: { id: 'sess_current' } as never,
        operator: { id: 'op_123', passwordHash: '$hashed' } as never,
      })
      vi.mocked(verifyPassword).mockResolvedValue(true)

      const formData = createFormData({
        currentPassword: 'OldPass123',
        newPassword: 'NewValidPass123',
      })

      const result = await changePassword(formData)

      expect(result.success).toBe(true)
      expect(prisma.operator.update).toHaveBeenCalledWith({
        where: { id: 'op_123' },
        data: { passwordHash: '$argon2id$hashed_password' },
      })
      // Should invalidate OTHER sessions but keep current
      expect(prisma.operatorSession.deleteMany).toHaveBeenCalledWith({
        where: {
          operatorId: 'op_123',
          id: { not: 'sess_current' },
        },
      })
    })
  })
})
