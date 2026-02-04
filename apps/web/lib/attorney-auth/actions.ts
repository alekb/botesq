'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { prisma } from '@botesq/database'
import { verifyPassword } from '../auth/password'
import { verifyTotp, generateTotpSecret, generateTotpUri } from './totp'
import {
  createAttorneySession,
  getCurrentAttorneySession,
  invalidateAttorneySession,
} from './session'

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

const totpSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
})

export type AttorneyAuthResult = {
  success: boolean
  error?: string
  fieldErrors?: Record<string, string[]>
  requiresTwoFactor?: boolean
  attorneyId?: string
}

/**
 * First step of attorney login - verify email and password
 */
export async function attorneyLogin(formData: FormData): Promise<AttorneyAuthResult> {
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

  // Find attorney
  const attorney = await prisma.attorney.findUnique({
    where: { email: email.toLowerCase() },
  })

  if (!attorney) {
    return {
      success: false,
      error: 'Invalid email or password',
    }
  }

  // Verify password
  const isValid = await verifyPassword(password, attorney.passwordHash)
  if (!isValid) {
    return {
      success: false,
      error: 'Invalid email or password',
    }
  }

  // Check if account is active
  if (attorney.status !== 'ACTIVE') {
    return {
      success: false,
      error: 'Your account has been suspended. Please contact an administrator.',
    }
  }

  // Check if 2FA is enabled
  if (attorney.totpEnabled && attorney.totpSecret) {
    return {
      success: true,
      requiresTwoFactor: true,
      attorneyId: attorney.id,
    }
  }

  // No 2FA, create session directly
  const headersList = await headers()
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] ?? undefined
  const userAgent = headersList.get('user-agent') ?? undefined

  await createAttorneySession(attorney.id, ipAddress, userAgent)

  return { success: true }
}

/**
 * Second step of attorney login - verify TOTP code
 */
export async function attorneyVerifyTotp(
  attorneyId: string,
  formData: FormData
): Promise<AttorneyAuthResult> {
  const rawData = {
    code: formData.get('code'),
  }

  const result = totpSchema.safeParse(rawData)
  if (!result.success) {
    return {
      success: false,
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const { code } = result.data

  // Get attorney
  const attorney = await prisma.attorney.findUnique({
    where: { id: attorneyId },
  })

  if (!attorney || !attorney.totpSecret) {
    return {
      success: false,
      error: 'Invalid session. Please log in again.',
    }
  }

  // Verify TOTP code
  if (!verifyTotp(attorney.totpSecret, code)) {
    return {
      success: false,
      error: 'Invalid verification code',
    }
  }

  // Create session
  const headersList = await headers()
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] ?? undefined
  const userAgent = headersList.get('user-agent') ?? undefined

  await createAttorneySession(attorney.id, ipAddress, userAgent)

  return { success: true }
}

/**
 * Log out the current attorney
 */
export async function attorneyLogout(): Promise<void> {
  const { session } = await getCurrentAttorneySession()
  if (session) {
    await invalidateAttorneySession(session.id)
  }
  redirect('/attorney/login')
}

/**
 * Enable 2FA for an attorney - step 1: generate secret
 */
export async function enableTwoFactorStart(): Promise<{
  success: boolean
  secret?: string
  uri?: string
  error?: string
}> {
  const { attorney } = await getCurrentAttorneySession()

  if (!attorney) {
    return { success: false, error: 'Not authenticated' }
  }

  if (attorney.totpEnabled) {
    return { success: false, error: '2FA is already enabled' }
  }

  const secret = generateTotpSecret()
  const uri = generateTotpUri(secret, attorney.email)

  // Store the secret temporarily (not enabled yet)
  await prisma.attorney.update({
    where: { id: attorney.id },
    data: { totpSecret: secret },
  })

  return { success: true, secret, uri }
}

/**
 * Enable 2FA for an attorney - step 2: verify and enable
 */
export async function enableTwoFactorVerify(formData: FormData): Promise<AttorneyAuthResult> {
  const { attorney } = await getCurrentAttorneySession()

  if (!attorney) {
    return { success: false, error: 'Not authenticated' }
  }

  if (!attorney.totpSecret) {
    return { success: false, error: 'Please start 2FA setup first' }
  }

  const code = formData.get('code') as string

  if (!verifyTotp(attorney.totpSecret, code)) {
    return { success: false, error: 'Invalid verification code' }
  }

  // Enable 2FA
  await prisma.attorney.update({
    where: { id: attorney.id },
    data: { totpEnabled: true },
  })

  return { success: true }
}

/**
 * Disable 2FA for an attorney
 */
export async function disableTwoFactor(formData: FormData): Promise<AttorneyAuthResult> {
  const { attorney } = await getCurrentAttorneySession()

  if (!attorney) {
    return { success: false, error: 'Not authenticated' }
  }

  const password = formData.get('password') as string

  // Verify password first
  const isValid = await verifyPassword(password, attorney.passwordHash)
  if (!isValid) {
    return { success: false, error: 'Invalid password' }
  }

  // Disable 2FA
  await prisma.attorney.update({
    where: { id: attorney.id },
    data: {
      totpEnabled: false,
      totpSecret: null,
    },
  })

  return { success: true }
}

/**
 * Change password for logged-in attorney
 */
export async function attorneyChangePassword(formData: FormData): Promise<AttorneyAuthResult> {
  const { session, attorney } = await getCurrentAttorneySession()

  if (!session || !attorney) {
    return {
      success: false,
      error: 'You must be logged in to change your password',
    }
  }

  const currentPassword = formData.get('currentPassword') as string
  const newPassword = formData.get('newPassword') as string

  // Verify current password
  const isValid = await verifyPassword(currentPassword, attorney.passwordHash)
  if (!isValid) {
    return {
      success: false,
      error: 'Current password is incorrect',
    }
  }

  // Validate new password
  const passwordSchema = z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

  const result = passwordSchema.safeParse(newPassword)
  if (!result.success) {
    return {
      success: false,
      fieldErrors: { newPassword: result.error.issues.map((e) => e.message) },
    }
  }

  // Hash and update password
  const { hashPassword } = await import('../auth/password')
  const passwordHash = await hashPassword(newPassword)
  await prisma.attorney.update({
    where: { id: attorney.id },
    data: { passwordHash },
  })

  // Invalidate all other sessions
  await prisma.attorneySession.deleteMany({
    where: {
      attorneyId: attorney.id,
      id: { not: session.id },
    },
  })

  return { success: true }
}
