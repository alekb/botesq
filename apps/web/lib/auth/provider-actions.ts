'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import {
  providerLogin,
  providerRegister,
  providerLogout,
  providerChangePassword,
} from '../api/provider'
import {
  storeProviderSession,
  getCurrentProviderSession,
  invalidateProviderSession,
  getProviderToken,
} from './provider-session'

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  totpCode: z.string().optional(),
})

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  legalName: z.string().min(2, 'Legal name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  description: z.string().optional(),
  jurisdictions: z.array(z.string()).min(1, 'Select at least one jurisdiction'),
  specialties: z.array(z.string()).min(1, 'Select at least one specialty'),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
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
  requiresTwoFactor?: boolean
}

/**
 * Log in a provider
 */
export async function providerLoginAction(formData: FormData): Promise<AuthResult> {
  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
    totpCode: formData.get('totpCode') || undefined,
  }

  const result = loginSchema.safeParse(rawData)
  if (!result.success) {
    return {
      success: false,
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const { email, password, totpCode } = result.data

  try {
    const response = await providerLogin(email, password, totpCode)

    // Check if 2FA is required
    if (response.requiresTwoFactor) {
      return {
        success: false,
        requiresTwoFactor: true,
      }
    }

    // Check provider status
    if (response.provider.status === 'PENDING_APPROVAL') {
      // Store session but redirect to pending page
      await storeProviderSession(response.token)
      redirect('/provider-pending')
    }

    if (response.provider.status === 'SUSPENDED' || response.provider.status === 'INACTIVE') {
      return {
        success: false,
        error: 'Your account has been suspended. Please contact support.',
      }
    }

    // Store session token in cookie
    await storeProviderSession(response.token)

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
    }
  }
}

/**
 * Register a new provider
 */
export async function providerRegisterAction(formData: FormData): Promise<AuthResult> {
  const rawData = {
    name: formData.get('name'),
    legalName: formData.get('legalName'),
    email: formData.get('email'),
    password: formData.get('password'),
    description: formData.get('description') || undefined,
    jurisdictions: formData.getAll('jurisdictions') as string[],
    specialties: formData.getAll('specialties') as string[],
  }

  const result = registerSchema.safeParse(rawData)
  if (!result.success) {
    return {
      success: false,
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    await providerRegister(result.data)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed',
    }
  }
}

/**
 * Log out the current provider
 */
export async function providerLogoutAction(): Promise<void> {
  const token = await getProviderToken()
  if (token) {
    try {
      await providerLogout(token)
    } catch {
      // Ignore errors during logout
    }
  }
  await invalidateProviderSession()
  redirect('/provider-login')
}

/**
 * Change provider password
 */
export async function providerChangePasswordAction(formData: FormData): Promise<AuthResult> {
  const { token } = await getCurrentProviderSession()
  if (!token) {
    return {
      success: false,
      error: 'You must be logged in to change your password',
    }
  }

  const rawData = {
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
  }

  const result = changePasswordSchema.safeParse(rawData)
  if (!result.success) {
    return {
      success: false,
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const { currentPassword, newPassword } = result.data

  try {
    await providerChangePassword(token, currentPassword, newPassword)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to change password',
    }
  }
}

/**
 * Get the current provider (for use in server components)
 */
export async function getCurrentProvider() {
  return getCurrentProviderSession()
}
