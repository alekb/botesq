import { prisma, MatterType, MatterStatus, MatterUrgency } from '@moltlaw/database'
import { nanoid } from 'nanoid'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

/**
 * Generate a matter external ID
 */
function generateMatterId(): string {
  return `MATTER-${nanoid(6).toUpperCase()}`
}

export interface CreateMatterParams {
  operatorId: string
  agentId?: string
  type: MatterType
  title: string
  description?: string
  urgency?: MatterUrgency
}

export interface MatterWithCounts {
  id: string
  externalId: string
  type: MatterType
  title: string
  description: string | null
  urgency: MatterUrgency
  status: MatterStatus
  retainerId: string | null
  createdAt: Date
  updatedAt: Date
  _count: {
    documents: number
    messages: number
  }
  assignments: Array<{
    attorney: {
      firstName: string
      lastName: string
    }
  }>
  retainer: {
    externalId: string
    status: string
  } | null
}

/**
 * Create a new matter
 */
export async function createMatter(params: CreateMatterParams): Promise<{
  matter: MatterWithCounts
  retainerRequired: boolean
}> {
  const { operatorId, agentId, type, title, description, urgency } = params

  // Create the matter
  const matter = await prisma.matter.create({
    data: {
      externalId: generateMatterId(),
      operatorId,
      agentId,
      type,
      title,
      description,
      urgency: urgency ?? MatterUrgency.STANDARD,
      status: MatterStatus.PENDING_RETAINER,
    },
    include: {
      _count: {
        select: {
          documents: true,
          messages: true,
        },
      },
      assignments: {
        include: {
          attorney: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        where: {
          completedAt: null,
        },
      },
      retainer: {
        select: {
          externalId: true,
          status: true,
        },
      },
    },
  })

  logger.info(
    {
      matterId: matter.externalId,
      operatorId,
      type,
    },
    'Matter created'
  )

  return {
    matter,
    retainerRequired: true, // Always require retainer for new matters
  }
}

/**
 * Get matter by ID (internal or external)
 */
export async function getMatter(
  matterId: string,
  operatorId: string
): Promise<MatterWithCounts | null> {
  const matter = await prisma.matter.findFirst({
    where: {
      OR: [{ id: matterId }, { externalId: matterId }],
      operatorId,
    },
    include: {
      _count: {
        select: {
          documents: true,
          messages: true,
        },
      },
      assignments: {
        include: {
          attorney: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        where: {
          completedAt: null,
        },
      },
      retainer: {
        select: {
          externalId: true,
          status: true,
        },
      },
    },
  })

  return matter
}

/**
 * List matters for an operator
 */
export async function listMatters(params: {
  operatorId: string
  status?: MatterStatus
  limit?: number
  offset?: number
}): Promise<{
  matters: MatterWithCounts[]
  total: number
  hasMore: boolean
}> {
  const { operatorId, status, limit = 20, offset = 0 } = params

  const where = {
    operatorId,
    ...(status && { status }),
  }

  const [matters, total] = await Promise.all([
    prisma.matter.findMany({
      where,
      include: {
        _count: {
          select: {
            documents: true,
            messages: true,
          },
        },
        assignments: {
          include: {
            attorney: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          where: {
            completedAt: null,
          },
        },
        retainer: {
          select: {
            externalId: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.matter.count({ where }),
  ])

  return {
    matters,
    total,
    hasMore: offset + matters.length < total,
  }
}

/**
 * Update matter status
 */
export async function updateMatterStatus(
  matterId: string,
  operatorId: string,
  status: MatterStatus
): Promise<MatterWithCounts | null> {
  const matter = await prisma.matter.findFirst({
    where: {
      OR: [{ id: matterId }, { externalId: matterId }],
      operatorId,
    },
  })

  if (!matter) {
    return null
  }

  const updated = await prisma.matter.update({
    where: { id: matter.id },
    data: {
      status,
      ...(status === MatterStatus.RESOLVED && { resolvedAt: new Date() }),
      ...(status === MatterStatus.CLOSED && { closedAt: new Date() }),
    },
    include: {
      _count: {
        select: {
          documents: true,
          messages: true,
        },
      },
      assignments: {
        include: {
          attorney: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        where: {
          completedAt: null,
        },
      },
      retainer: {
        select: {
          externalId: true,
          status: true,
        },
      },
    },
  })

  logger.info(
    {
      matterId: updated.externalId,
      status,
    },
    'Matter status updated'
  )

  return updated
}

/**
 * Activate matter (after retainer accepted)
 */
export async function activateMatter(
  matterId: string,
  retainerId: string
): Promise<MatterWithCounts | null> {
  const matter = await prisma.matter.findFirst({
    where: {
      OR: [{ id: matterId }, { externalId: matterId }],
    },
  })

  if (!matter) {
    return null
  }

  const updated = await prisma.matter.update({
    where: { id: matter.id },
    data: {
      status: MatterStatus.ACTIVE,
      retainerId,
    },
    include: {
      _count: {
        select: {
          documents: true,
          messages: true,
        },
      },
      assignments: {
        include: {
          attorney: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        where: {
          completedAt: null,
        },
      },
      retainer: {
        select: {
          externalId: true,
          status: true,
        },
      },
    },
  })

  logger.info(
    {
      matterId: updated.externalId,
      retainerId,
    },
    'Matter activated'
  )

  return updated
}
