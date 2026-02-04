'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { prisma } from '@botesq/database'
import { verifyPassword } from '../auth/password'
import { verifyTotp } from '../attorney-auth/totp'
import { createAdminSession, getCurrentAdminSession, invalidateAdminSession } from './session'
import { logAdminAction, AdminActions } from './audit'
import { appendFileSync } from 'fs'

function debugLog(msg: string) {
  const timestamp = new Date().toISOString()
  const line = `[${timestamp}] ${msg}\n`
  try {
    appendFileSync('/tmp/admin-login-debug.log', line)
  } catch {
    // ignore
  }
  console.log(msg)
}

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

const totpSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
})

export type AdminAuthResult = {
  success: boolean
  error?: string
  fieldErrors?: Record<string, string[]>
  requiresTwoFactor?: boolean
  adminId?: string
}

/**
 * First step of admin login - verify email, password, and admin role
 * Admins MUST have 2FA enabled to log in
 */
export async function adminLogin(formData: FormData): Promise<AdminAuthResult> {
  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  debugLog('[ADMIN LOGIN] Attempting login for:', rawData.email)

  const result = loginSchema.safeParse(rawData)
  if (!result.success) {
    debugLog('[ADMIN LOGIN] Validation failed:', result.error.flatten().fieldErrors)
    return {
      success: false,
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const { email, password } = result.data

  // Find attorney
  debugLog('[ADMIN LOGIN] Looking up attorney:', email.toLowerCase())
  const attorney = await prisma.attorney.findUnique({
    where: { email: email.toLowerCase() },
  })
  debugLog('[ADMIN LOGIN] Attorney found:', attorney ? 'yes' : 'no')

  if (!attorney) {
    return {
      success: false,
      error: 'Invalid email or password',
    }
  }

  // Verify password
  console.log(
    '[ADMIN LOGIN] Verifying password, hash starts with:',
    attorney.passwordHash.substring(0, 30)
  )
  const isValid = await verifyPassword(password, attorney.passwordHash)
  debugLog('[ADMIN LOGIN] Password valid:', isValid)
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
      error: 'Your account has been suspended. Please contact support.',
    }
  }

  // CRITICAL: Enforce ADMIN role
  if (attorney.role !== 'ADMIN') {
    return {
      success: false,
      error: 'Access denied. Admin privileges required.',
    }
  }

  // CRITICAL: Admins MUST have 2FA enabled
  if (!attorney.totpEnabled || !attorney.totpSecret) {
    return {
      success: false,
      error: '2FA is required for admin accounts. Please contact support to enable 2FA.',
    }
  }

  // Admin has 2FA, require verification
  return {
    success: true,
    requiresTwoFactor: true,
    adminId: attorney.id,
  }
}

/**
 * Second step of admin login - verify TOTP code
 */
export async function adminVerifyTotp(
  adminId: string,
  formData: FormData
): Promise<AdminAuthResult> {
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
    where: { id: adminId },
  })

  if (!attorney || !attorney.totpSecret) {
    return {
      success: false,
      error: 'Invalid session. Please log in again.',
    }
  }

  // Re-verify admin role
  if (attorney.role !== 'ADMIN') {
    return {
      success: false,
      error: 'Access denied. Admin privileges required.',
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

  await createAdminSession(attorney.id, ipAddress, userAgent)

  // Log successful login
  await logAdminAction(attorney.id, AdminActions.ADMIN_LOGIN, 'ATTORNEY', attorney.id, {
    email: attorney.email,
  })

  return { success: true }
}

/**
 * Log out the current admin
 */
export async function adminLogout(): Promise<void> {
  const { session, admin } = await getCurrentAdminSession()
  if (session && admin) {
    await logAdminAction(admin.id, AdminActions.ADMIN_LOGOUT, 'ATTORNEY', admin.id, {
      email: admin.email,
    })
    await invalidateAdminSession(session.id)
  }
  redirect('/admin/login')
}
