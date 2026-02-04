'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { prisma } from '@botesq/database'
import { hashPassword, verifyPassword } from './password'
import { generateShortToken, hashToken } from './tokens'
import {
  createSession,
  getCurrentSession,
  invalidateSession,
  invalidateAllSessions,
} from './session'
import { sendVerificationEmail, sendPasswordResetEmail } from '../email/send'

// Validation schemas
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
})

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

export type AuthResult = {
  success: boolean
  error?: string
  fieldErrors?: Record<string, string[]>
}

/**
 * Sign up a new operator
 */
export async function signup(formData: FormData): Promise<AuthResult> {
  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
    companyName: formData.get('companyName'),
  }

  const result = signupSchema.safeParse(rawData)
  if (!result.success) {
    return {
      success: false,
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const { email, password, companyName } = result.data

  // Check if email already exists
  const existingOperator = await prisma.operator.findUnique({
    where: { email: email.toLowerCase() },
  })

  if (existingOperator) {
    return {
      success: false,
      error: 'An account with this email already exists',
    }
  }

  // Hash password
  const passwordHash = await hashPassword(password)

  // Create operator with PENDING_VERIFICATION status
  const operator = await prisma.operator.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      companyName,
      status: 'PENDING_VERIFICATION',
    },
  })

  // Generate verification token
  const token = generateShortToken()
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  await prisma.emailVerificationToken.create({
    data: {
      operatorId: operator.id,
      token: tokenHash,
      expiresAt,
    },
  })

  // Send verification email
  await sendVerificationEmail(email, token, companyName)

  return { success: true }
}

/**
 * Log in an operator
 */
export async function login(formData: FormData): Promise<AuthResult> {
  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const result = loginSchema.safeParse(rawData)
  if (!result.success) {
    return {
      success: false,
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const { email, password } = result.data

  // Find operator
  const operator = await prisma.operator.findUnique({
    where: { email: email.toLowerCase() },
  })

  if (!operator) {
    return {
      success: false,
      error: 'Invalid email or password',
    }
  }

  // Verify password
  const isValid = await verifyPassword(password, operator.passwordHash)
  if (!isValid) {
    return {
      success: false,
      error: 'Invalid email or password',
    }
  }

  // Check if email is verified
  if (operator.status === 'PENDING_VERIFICATION') {
    return {
      success: false,
      error: 'Please verify your email before logging in',
    }
  }

  // Check if account is suspended
  if (operator.status === 'SUSPENDED' || operator.status === 'CLOSED') {
    return {
      success: false,
      error: 'Your account has been suspended. Please contact support.',
    }
  }

  // Get client info for session
  const headersList = await headers()
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] ?? undefined
  const userAgent = headersList.get('user-agent') ?? undefined

  // Create session
  await createSession(operator.id, ipAddress, userAgent)

  return { success: true }
}

/**
 * Log out the current operator
 */
export async function logout(): Promise<void> {
  const { session } = await getCurrentSession()
  if (session) {
    await invalidateSession(session.id)
  }
  redirect('/login')
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<AuthResult> {
  const tokenHash = hashToken(token)

  const verificationToken = await prisma.emailVerificationToken.findUnique({
    where: { token: tokenHash },
    include: { operator: true },
  })

  if (!verificationToken) {
    return {
      success: false,
      error: 'Invalid or expired verification link',
    }
  }

  if (verificationToken.expiresAt < new Date()) {
    return {
      success: false,
      error: 'Verification link has expired. Please request a new one.',
    }
  }

  if (verificationToken.usedAt) {
    return {
      success: false,
      error: 'This verification link has already been used',
    }
  }

  // Mark token as used and activate operator
  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: verificationToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.operator.update({
      where: { id: verificationToken.operatorId },
      data: {
        status: 'ACTIVE',
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    }),
  ])

  return { success: true }
}

/**
 * Request password reset
 */
export async function forgotPassword(formData: FormData): Promise<AuthResult> {
  const rawData = {
    email: formData.get('email'),
  }

  const result = forgotPasswordSchema.safeParse(rawData)
  if (!result.success) {
    return {
      success: false,
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const { email } = result.data

  // Find operator (don't reveal if email exists)
  const operator = await prisma.operator.findUnique({
    where: { email: email.toLowerCase() },
  })

  // Always return success to prevent email enumeration
  if (!operator) {
    return { success: true }
  }

  // Generate reset token
  const token = generateShortToken()
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  // Invalidate any existing reset tokens
  await prisma.passwordResetToken.updateMany({
    where: { operatorId: operator.id, usedAt: null },
    data: { usedAt: new Date() },
  })

  await prisma.passwordResetToken.create({
    data: {
      operatorId: operator.id,
      token: tokenHash,
      expiresAt,
    },
  })

  // Send reset email
  await sendPasswordResetEmail(email, token, operator.companyName)

  return { success: true }
}

/**
 * Reset password with token
 */
export async function resetPassword(formData: FormData): Promise<AuthResult> {
  const rawData = {
    token: formData.get('token'),
    password: formData.get('password'),
  }

  const result = resetPasswordSchema.safeParse(rawData)
  if (!result.success) {
    return {
      success: false,
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const { token, password } = result.data
  const tokenHash = hashToken(token)

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token: tokenHash },
    include: { operator: true },
  })

  if (!resetToken) {
    return {
      success: false,
      error: 'Invalid or expired reset link',
    }
  }

  if (resetToken.expiresAt < new Date()) {
    return {
      success: false,
      error: 'Reset link has expired. Please request a new one.',
    }
  }

  if (resetToken.usedAt) {
    return {
      success: false,
      error: 'This reset link has already been used',
    }
  }

  // Hash new password
  const passwordHash = await hashPassword(password)

  // Update password and mark token as used
  await prisma.$transaction([
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.operator.update({
      where: { id: resetToken.operatorId },
      data: { passwordHash },
    }),
  ])

  // Invalidate all existing sessions (security measure)
  await invalidateAllSessions(resetToken.operatorId)

  return { success: true }
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(email: string): Promise<AuthResult> {
  const operator = await prisma.operator.findUnique({
    where: { email: email.toLowerCase() },
  })

  if (!operator || operator.status !== 'PENDING_VERIFICATION') {
    // Don't reveal if email exists
    return { success: true }
  }

  // Invalidate existing verification tokens
  await prisma.emailVerificationToken.updateMany({
    where: { operatorId: operator.id, usedAt: null },
    data: { usedAt: new Date() },
  })

  // Generate new token
  const token = generateShortToken()
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  await prisma.emailVerificationToken.create({
    data: {
      operatorId: operator.id,
      token: tokenHash,
      expiresAt,
    },
  })

  // Send verification email
  await sendVerificationEmail(operator.email, token, operator.companyName)

  return { success: true }
}

/**
 * Change password (for logged-in users)
 */
export async function changePassword(formData: FormData): Promise<AuthResult> {
  const { session, operator } = await getCurrentSession()

  if (!session || !operator) {
    return {
      success: false,
      error: 'You must be logged in to change your password',
    }
  }

  const currentPassword = formData.get('currentPassword') as string
  const newPassword = formData.get('newPassword') as string

  // Verify current password
  const isValid = await verifyPassword(currentPassword, operator.passwordHash)
  if (!isValid) {
    return {
      success: false,
      error: 'Current password is incorrect',
    }
  }

  // Validate new password
  const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')

  const result = passwordSchema.safeParse(newPassword)
  if (!result.success) {
    return {
      success: false,
      fieldErrors: { newPassword: result.error.issues.map((e) => e.message) },
    }
  }

  // Hash and update password
  const passwordHash = await hashPassword(newPassword)
  await prisma.operator.update({
    where: { id: operator.id },
    data: { passwordHash },
  })

  // Invalidate all other sessions (keep current one)
  await prisma.operatorSession.deleteMany({
    where: {
      operatorId: operator.id,
      id: { not: session.id },
    },
  })

  return { success: true }
}
