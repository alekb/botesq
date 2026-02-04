import { prisma, Prisma } from '@botesq/database'
import { headers } from 'next/headers'

/**
 * Log an admin action to the audit log
 * All admin mutations should call this function
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  resourceType: string,
  resourceId: string | null,
  details?: Record<string, unknown>
): Promise<void> {
  const headersList = await headers()
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] ?? null
  const userAgent = headersList.get('user-agent') ?? null

  await prisma.auditLog.create({
    data: {
      actorType: 'ADMIN',
      actorId: adminId,
      action,
      resourceType,
      resourceId,
      details: details ? (details as Prisma.InputJsonValue) : Prisma.JsonNull,
      ipAddress,
      userAgent,
    },
  })
}

// Common admin action constants for consistency
export const AdminActions = {
  // Operator actions
  OPERATOR_VIEW: 'OPERATOR_VIEW',
  OPERATOR_UPDATE: 'OPERATOR_UPDATE',
  OPERATOR_SUSPEND: 'OPERATOR_SUSPEND',
  OPERATOR_REACTIVATE: 'OPERATOR_REACTIVATE',

  // Attorney actions
  ATTORNEY_CREATE: 'ATTORNEY_CREATE',
  ATTORNEY_VIEW: 'ATTORNEY_VIEW',
  ATTORNEY_UPDATE: 'ATTORNEY_UPDATE',
  ATTORNEY_SUSPEND: 'ATTORNEY_SUSPEND',
  ATTORNEY_REACTIVATE: 'ATTORNEY_REACTIVATE',

  // Provider actions
  PROVIDER_VIEW: 'PROVIDER_VIEW',
  PROVIDER_APPROVE: 'PROVIDER_APPROVE',
  PROVIDER_REJECT: 'PROVIDER_REJECT',
  PROVIDER_SUSPEND: 'PROVIDER_SUSPEND',
  PROVIDER_REACTIVATE: 'PROVIDER_REACTIVATE',

  // Settlement actions
  SETTLEMENT_GENERATE: 'SETTLEMENT_GENERATE',
  SETTLEMENT_PROCESS: 'SETTLEMENT_PROCESS',
  SETTLEMENT_RETRY: 'SETTLEMENT_RETRY',

  // Admin session actions
  ADMIN_LOGIN: 'ADMIN_LOGIN',
  ADMIN_LOGOUT: 'ADMIN_LOGOUT',
} as const

export type AdminAction = (typeof AdminActions)[keyof typeof AdminActions]
