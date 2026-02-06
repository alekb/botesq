import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma } from '@botesq/database'
import { hashPassword, verifyPassword } from '../services/auth.service.js'
import { generateToken } from '../utils/secure-id.js'
import { logger } from '../lib/logger.js'
import { AuthError, ApiError } from '../types.js'

// Session expiry: 7 days
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Provider login request schema
 */
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

/**
 * Valid MatterType values for specialties
 */
const matterTypeValues = [
  'CONTRACT_REVIEW',
  'ENTITY_FORMATION',
  'COMPLIANCE',
  'IP_TRADEMARK',
  'IP_COPYRIGHT',
  'GENERAL_CONSULTATION',
  'LITIGATION_CONSULTATION',
] as const

/**
 * Provider registration request schema
 */
const registerSchema = z.object({
  name: z.string().min(2).max(100),
  legalName: z.string().min(2).max(200),
  email: z.string().email(),
  password: z.string().min(8),
  description: z.string().optional(),
  jurisdictions: z.array(z.string()).min(1),
  specialties: z.array(z.enum(matterTypeValues)).min(1),
})

/**
 * Provider session info
 */
interface ProviderSession {
  token: string
  providerId: string
  expiresAt: Date
  ipAddress?: string
  userAgent?: string
}

/**
 * Create a session for a provider
 */
async function createProviderSession(
  providerId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<ProviderSession> {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS)

  await prisma.providerSession.create({
    data: {
      providerId,
      token,
      expiresAt,
      ipAddress,
      userAgent,
    },
  })

  return { token, providerId, expiresAt, ipAddress, userAgent }
}

/**
 * Validate a provider session token
 */
export async function validateProviderSession(token: string) {
  const session = await prisma.providerSession.findUnique({
    where: { token },
    include: { provider: true },
  })

  if (!session) {
    throw new AuthError('INVALID_SESSION', 'Invalid session token')
  }

  if (session.expiresAt < new Date()) {
    // Clean up expired session
    await prisma.providerSession.delete({ where: { id: session.id } })
    throw new AuthError('SESSION_EXPIRED', 'Session has expired')
  }

  if (session.provider.status !== 'ACTIVE') {
    throw new AuthError(
      'PROVIDER_SUSPENDED',
      `Provider account is ${session.provider.status.toLowerCase()}`
    )
  }

  return session
}

/**
 * Register provider auth routes
 */
export function registerProviderAuthRoutes(app: FastifyInstance): void {
  /**
   * POST /provider/auth/register — Register a new provider
   */
  app.post('/provider/auth/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = registerSchema.parse(request.body)

    // Check if email already exists
    const existing = await prisma.provider.findUnique({
      where: { email: body.email },
    })

    if (existing) {
      throw new ApiError('EMAIL_EXISTS', 'Email is already registered', 409)
    }

    // Hash password
    const passwordHash = await hashPassword(body.password)

    // Generate external ID
    const externalId = `PRV-${Date.now().toString(36).toUpperCase()}`

    // Create provider
    const provider = await prisma.provider.create({
      data: {
        externalId,
        name: body.name,
        legalName: body.legalName,
        email: body.email,
        passwordHash,
        description: body.description,
        jurisdictions: body.jurisdictions,
        specialties: body.specialties,
        status: 'PENDING_APPROVAL',
      },
    })

    logger.info({ providerId: provider.id, email: provider.email }, 'New provider registered')

    return reply.status(201).send({
      success: true,
      data: {
        id: provider.externalId,
        email: provider.email,
        status: provider.status,
        message: 'Registration successful. Your account is pending approval.',
      },
    })
  })

  /**
   * POST /provider/auth/login — Provider login
   */
  app.post('/provider/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = loginSchema.parse(request.body)

    // Find provider by email
    const provider = await prisma.provider.findUnique({
      where: { email: body.email },
    })

    if (!provider) {
      throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password')
    }

    // Verify password
    const valid = await verifyPassword(body.password, provider.passwordHash)
    if (!valid) {
      throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password')
    }

    // Check provider status
    if (provider.status === 'PENDING_APPROVAL') {
      throw new AuthError('PENDING_APPROVAL', 'Your account is pending approval')
    }

    if (provider.status !== 'ACTIVE') {
      throw new AuthError('PROVIDER_SUSPENDED', `Your account is ${provider.status.toLowerCase()}`)
    }

    // Create session
    const ipAddress = request.ip
    const userAgent = request.headers['user-agent']
    const session = await createProviderSession(provider.id, ipAddress, userAgent)

    logger.info({ providerId: provider.id }, 'Provider logged in')

    return reply.status(200).send({
      success: true,
      data: {
        token: session.token,
        expiresAt: session.expiresAt.toISOString(),
        provider: {
          id: provider.externalId,
          name: provider.name,
          email: provider.email,
          status: provider.status,
        },
      },
    })
  })

  /**
   * POST /provider/auth/logout — Provider logout
   */
  app.post('/provider/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthError('MISSING_TOKEN', 'Authorization token required')
    }

    const token = authHeader.slice(7)

    // Delete the session
    const deleted = await prisma.providerSession.deleteMany({
      where: { token },
    })

    if (deleted.count === 0) {
      // Session was already invalid/expired, but logout still "succeeded"
      logger.debug('Logout attempted with invalid/expired token')
    }

    return reply.status(200).send({
      success: true,
      message: 'Logged out successfully',
    })
  })

  /**
   * GET /provider/auth/me — Get current provider info
   */
  app.get('/provider/auth/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthError('MISSING_TOKEN', 'Authorization token required')
    }

    const token = authHeader.slice(7)
    const session = await validateProviderSession(token)

    return reply.status(200).send({
      success: true,
      data: {
        provider: {
          id: session.provider.externalId,
          name: session.provider.name,
          email: session.provider.email,
          legalName: session.provider.legalName,
          description: session.provider.description,
          status: session.provider.status,
          jurisdictions: session.provider.jurisdictions,
          specialties: session.provider.specialties,
          verifiedAt: session.provider.verifiedAt?.toISOString(),
          createdAt: session.provider.createdAt.toISOString(),
        },
        session: {
          expiresAt: session.expiresAt.toISOString(),
        },
      },
    })
  })

  /**
   * POST /provider/auth/change-password — Change provider password
   */
  app.post(
    '/provider/auth/change-password',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) {
        throw new AuthError('MISSING_TOKEN', 'Authorization token required')
      }

      const token = authHeader.slice(7)
      const session = await validateProviderSession(token)

      const schema = z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8),
      })

      const body = schema.parse(request.body)

      // Verify current password
      const valid = await verifyPassword(body.currentPassword, session.provider.passwordHash)
      if (!valid) {
        throw new AuthError('INVALID_PASSWORD', 'Current password is incorrect')
      }

      // Hash new password
      const newPasswordHash = await hashPassword(body.newPassword)

      // Update password
      await prisma.provider.update({
        where: { id: session.provider.id },
        data: { passwordHash: newPasswordHash },
      })

      // Invalidate all other sessions for this provider
      await prisma.providerSession.deleteMany({
        where: {
          providerId: session.provider.id,
          token: { not: token },
        },
      })

      logger.info({ providerId: session.provider.id }, 'Provider password changed')

      return reply.status(200).send({
        success: true,
        message: 'Password changed successfully',
      })
    }
  )

  logger.info('Provider auth routes registered')
}
