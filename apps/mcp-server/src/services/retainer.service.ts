import { createHash, timingSafeEqual } from 'crypto'
import { prisma, RetainerStatus, FeeArrangement, MatterStatus } from '@botesq/database'
import { nanoid } from 'nanoid'
import { ApiError } from '../types.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

/**
 * Generate a retainer external ID
 */
function generateRetainerId(): string {
  return `RET-${nanoid(8).toUpperCase()}`
}

/**
 * Standard engagement terms template
 */
const ENGAGEMENT_TERMS_TEMPLATE = `LEGAL SERVICES ENGAGEMENT AGREEMENT

This Engagement Agreement ("Agreement") is entered into between BotEsq, Inc. ("Firm") and the Client identified below.

1. SCOPE OF REPRESENTATION
The Firm agrees to provide legal services related to the matter described in the associated Matter record. The scope of representation is limited to the specific matter type and does not extend to other legal matters unless separately agreed.

2. FEE ARRANGEMENT
Fees for legal services will be charged according to the fee arrangement specified in this retainer. Credits will be deducted from the Client's account as services are rendered.

3. CLIENT RESPONSIBILITIES
Client agrees to:
- Provide accurate and complete information
- Respond promptly to requests for information
- Maintain sufficient credit balance for services

4. CONFIDENTIALITY
All communications between Client and Firm are protected by attorney-client privilege to the extent permitted by law.

5. LIMITATIONS
- AI-assisted responses are for informational purposes and reviewed by licensed attorneys
- This agreement does not create a general attorney-client relationship beyond the specified matter
- Emergency or time-sensitive matters require express acknowledgment

6. TERMINATION
Either party may terminate this agreement with written notice. Client remains responsible for fees incurred prior to termination.

7. GOVERNING LAW
This Agreement shall be governed by the laws of the State of Delaware.

By accepting this retainer, Client acknowledges reading and agreeing to these terms.`

export interface RetainerWithMatter {
  id: string
  externalId: string
  operatorId: string
  scope: string
  feeArrangement: FeeArrangement
  estimatedFee: number | null
  conflictCheck: string | null
  engagementTerms: string
  status: RetainerStatus
  acceptedAt: Date | null
  acceptedBy: string | null
  expiresAt: Date
  createdAt: Date
  matter: {
    id: string
    externalId: string
    type: string
    title: string
    status: string
  } | null
}

/**
 * Create a retainer for a matter
 */
export async function createRetainer(params: {
  operatorId: string
  matterId: string
  scope: string
  feeArrangement?: FeeArrangement
  estimatedFee?: number
}): Promise<RetainerWithMatter> {
  const { operatorId, matterId, scope, feeArrangement, estimatedFee } = params

  // Get the matter to link
  const matter = await prisma.matter.findFirst({
    where: {
      OR: [{ id: matterId }, { externalId: matterId }],
      operatorId,
    },
  })

  if (!matter) {
    throw new ApiError('MATTER_NOT_FOUND', 'Matter not found', 404)
  }

  // Check if matter already has a retainer
  if (matter.retainerId) {
    const existing = await prisma.retainer.findUnique({
      where: { id: matter.retainerId },
      include: {
        matter: {
          select: {
            id: true,
            externalId: true,
            type: true,
            title: true,
            status: true,
          },
        },
      },
    })
    if (existing) {
      return existing
    }
  }

  // Create retainer with 30-day expiration
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  const retainer = await prisma.retainer.create({
    data: {
      externalId: generateRetainerId(),
      operatorId,
      scope,
      feeArrangement: feeArrangement ?? FeeArrangement.FLAT_FEE,
      estimatedFee,
      engagementTerms: ENGAGEMENT_TERMS_TEMPLATE,
      status: RetainerStatus.PENDING,
      expiresAt,
    },
    include: {
      matter: {
        select: {
          id: true,
          externalId: true,
          type: true,
          title: true,
          status: true,
        },
      },
    },
  })

  // Link retainer to matter
  await prisma.matter.update({
    where: { id: matter.id },
    data: { retainerId: retainer.id },
  })

  logger.info(
    {
      retainerId: retainer.externalId,
      matterId: matter.externalId,
      operatorId,
    },
    'Retainer created'
  )

  // Fetch updated retainer with matter
  const updated = await prisma.retainer.findUnique({
    where: { id: retainer.id },
    include: {
      matter: {
        select: {
          id: true,
          externalId: true,
          type: true,
          title: true,
          status: true,
        },
      },
    },
  })

  return updated!
}

/**
 * Get retainer by ID
 */
export async function getRetainer(
  retainerId: string,
  operatorId: string
): Promise<RetainerWithMatter | null> {
  const retainer = await prisma.retainer.findFirst({
    where: {
      OR: [{ id: retainerId }, { externalId: retainerId }],
      operatorId,
    },
    include: {
      matter: {
        select: {
          id: true,
          externalId: true,
          type: true,
          title: true,
          status: true,
        },
      },
    },
  })

  return retainer
}

/**
 * Get retainer for a matter
 */
export async function getRetainerForMatter(
  matterId: string,
  operatorId: string
): Promise<RetainerWithMatter | null> {
  const matter = await prisma.matter.findFirst({
    where: {
      OR: [{ id: matterId }, { externalId: matterId }],
      operatorId,
    },
    include: {
      retainer: {
        include: {
          matter: {
            select: {
              id: true,
              externalId: true,
              type: true,
              title: true,
              status: true,
            },
          },
        },
      },
    },
  })

  if (!matter?.retainer) {
    return null
  }

  return matter.retainer
}

/**
 * Accept a retainer
 */
export async function acceptRetainer(params: {
  retainerId: string
  operatorId: string
  acceptedBy: string
  signatureMethod: string
  signatureIp?: string
  preAuthToken?: string
}): Promise<{
  retainer: RetainerWithMatter
  matterActivated: boolean
}> {
  const { retainerId, operatorId, acceptedBy, signatureMethod, signatureIp, preAuthToken } = params

  // Get the retainer
  const retainer = await prisma.retainer.findFirst({
    where: {
      OR: [{ id: retainerId }, { externalId: retainerId }],
      operatorId,
    },
  })

  if (!retainer) {
    throw new ApiError('RETAINER_NOT_FOUND', 'Retainer not found', 404)
  }

  if (new Date() > retainer.expiresAt) {
    // Mark as expired (only if still pending)
    await prisma.retainer.updateMany({
      where: { id: retainer.id, status: RetainerStatus.PENDING },
      data: { status: RetainerStatus.EXPIRED },
    })
    throw new ApiError('RETAINER_EXPIRED', 'Retainer has expired. Please request new terms.', 400)
  }

  // Any non-manual acceptance must demonstrate possession of the operator's
  // pre-authorization token; having one configured is not itself authorization.
  if (signatureMethod !== 'manual') {
    const operator = await prisma.operator.findUnique({
      where: { id: operatorId },
      select: { preAuthTokenHash: true },
    })

    if (
      !operator?.preAuthTokenHash ||
      !preAuthToken ||
      !tokenMatchesHash(operator.preAuthTokenHash, preAuthToken)
    ) {
      throw new ApiError('INVALID_PREAUTH', 'Invalid pre-authorization token', 403)
    }
  }

  // Claim the retainer: the conditional update guarantees exactly one
  // concurrent acceptance wins.
  const claimed = await prisma.retainer.updateMany({
    where: { id: retainer.id, status: RetainerStatus.PENDING },
    data: {
      status: RetainerStatus.ACCEPTED,
      acceptedAt: new Date(),
      acceptedBy,
      signatureMethod,
      signatureIp,
    },
  })

  if (claimed.count === 0) {
    const current = await prisma.retainer.findUnique({
      where: { id: retainer.id },
      select: { status: true },
    })
    throw new ApiError(
      'RETAINER_NOT_PENDING',
      `Retainer is already ${(current?.status ?? retainer.status).toLowerCase()}`,
      400
    )
  }

  const updatedRetainer = await prisma.retainer.findUniqueOrThrow({
    where: { id: retainer.id },
    include: {
      matter: {
        select: {
          id: true,
          externalId: true,
          type: true,
          title: true,
          status: true,
        },
      },
    },
  })

  // Activate the matter if it exists and is pending retainer
  let matterActivated = false
  if (updatedRetainer.matter && updatedRetainer.matter.status === MatterStatus.PENDING_RETAINER) {
    await prisma.matter.update({
      where: { id: updatedRetainer.matter.id },
      data: { status: MatterStatus.ACTIVE },
    })
    matterActivated = true
  }

  logger.info(
    {
      retainerId: updatedRetainer.externalId,
      matterId: updatedRetainer.matter?.externalId,
      acceptedBy,
      signatureMethod,
      matterActivated,
    },
    'Retainer accepted'
  )

  // Fetch the final state
  const finalRetainer = await prisma.retainer.findUnique({
    where: { id: retainer.id },
    include: {
      matter: {
        select: {
          id: true,
          externalId: true,
          type: true,
          title: true,
          status: true,
        },
      },
    },
  })

  return {
    retainer: finalRetainer!,
    matterActivated,
  }
}

/**
 * Generate manual signing URL
 */
export function generateSigningUrl(retainerId: string): string {
  // In production, this would be a real signing URL
  return `https://botesq.io/sign/${retainerId}`
}

/**
 * Constant-time comparison of a provided token against its stored sha256 hex
 * hash. Exported for tests.
 */
export function tokenMatchesHash(storedHashHex: string, providedToken: string): boolean {
  const stored = Buffer.from(storedHashHex, 'hex')
  const provided = createHash('sha256').update(providedToken).digest()
  return stored.length === provided.length && timingSafeEqual(stored, provided)
}
