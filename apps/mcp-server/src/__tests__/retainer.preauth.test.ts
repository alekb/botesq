import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHash } from 'crypto'

const mocks = vi.hoisted(() => {
  const prisma = {
    retainer: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
    operator: { findUnique: vi.fn() },
    matter: { update: vi.fn() },
  }
  return { prisma }
})

vi.mock('@botesq/database', () => ({
  prisma: mocks.prisma,
  RetainerStatus: {
    PENDING: 'PENDING',
    ACCEPTED: 'ACCEPTED',
    DECLINED: 'DECLINED',
    EXPIRED: 'EXPIRED',
  },
  MatterStatus: { PENDING_RETAINER: 'PENDING_RETAINER', ACTIVE: 'ACTIVE' },
  FeeArrangement: { FLAT_FEE: 'FLAT_FEE', HOURLY: 'HOURLY' },
}))

import { acceptRetainer, tokenMatchesHash } from '../services/retainer.service.js'

const VALID_TOKEN = 'preauth_valid_token'
const VALID_TOKEN_HASH = createHash('sha256').update(VALID_TOKEN).digest('hex')

const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000)

const PENDING_RETAINER = {
  id: 'ret_1',
  externalId: 'RET-TEST1',
  status: 'PENDING',
  expiresAt: FUTURE,
}

const ACCEPTED_RETAINER = {
  ...PENDING_RETAINER,
  status: 'ACCEPTED',
  acceptedAt: new Date(),
  matter: null,
}

function acceptParams(preAuthToken?: string) {
  return {
    retainerId: 'ret_1',
    operatorId: 'op_1',
    acceptedBy: 'agent:agt_1',
    signatureMethod: 'agent_preauth',
    preAuthToken,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.prisma.retainer.findFirst.mockResolvedValue(PENDING_RETAINER)
  mocks.prisma.operator.findUnique.mockResolvedValue({ preAuthTokenHash: VALID_TOKEN_HASH })
  mocks.prisma.retainer.updateMany.mockResolvedValue({ count: 1 })
  mocks.prisma.retainer.findUniqueOrThrow.mockResolvedValue(ACCEPTED_RETAINER)
  mocks.prisma.retainer.findUnique.mockResolvedValue(ACCEPTED_RETAINER)
})

describe('acceptRetainer pre-auth gate', () => {
  it('accepts with a valid token', async () => {
    const { retainer } = await acceptRetainer(acceptParams(VALID_TOKEN))

    expect(retainer.status).toBe('ACCEPTED')
    expect(mocks.prisma.retainer.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'ret_1', status: 'PENDING' } })
    )
  })

  it('rejects when no token is provided even though one is configured', async () => {
    await expect(acceptRetainer(acceptParams(undefined))).rejects.toMatchObject({
      code: 'INVALID_PREAUTH',
    })
    expect(mocks.prisma.retainer.updateMany).not.toHaveBeenCalled()
  })

  it('rejects a wrong token', async () => {
    await expect(acceptRetainer(acceptParams('wrong-token'))).rejects.toMatchObject({
      code: 'INVALID_PREAUTH',
    })
    expect(mocks.prisma.retainer.updateMany).not.toHaveBeenCalled()
  })

  it('rejects when the operator has no token configured', async () => {
    mocks.prisma.operator.findUnique.mockResolvedValue({ preAuthTokenHash: null })

    await expect(acceptRetainer(acceptParams(VALID_TOKEN))).rejects.toMatchObject({
      code: 'INVALID_PREAUTH',
    })
  })

  it('rejects a concurrent double-accept via the conditional claim', async () => {
    mocks.prisma.retainer.updateMany.mockResolvedValue({ count: 0 })
    mocks.prisma.retainer.findUnique.mockResolvedValue({ status: 'ACCEPTED' })

    await expect(acceptRetainer(acceptParams(VALID_TOKEN))).rejects.toMatchObject({
      code: 'RETAINER_NOT_PENDING',
    })
  })

  it('rejects an expired retainer', async () => {
    mocks.prisma.retainer.findFirst.mockResolvedValue({
      ...PENDING_RETAINER,
      expiresAt: new Date(Date.now() - 1000),
    })
    mocks.prisma.retainer.updateMany.mockResolvedValue({ count: 1 })

    await expect(acceptRetainer(acceptParams(VALID_TOKEN))).rejects.toMatchObject({
      code: 'RETAINER_EXPIRED',
    })
  })
})

describe('tokenMatchesHash', () => {
  it('matches the correct token', () => {
    expect(tokenMatchesHash(VALID_TOKEN_HASH, VALID_TOKEN)).toBe(true)
  })

  it('rejects a wrong token', () => {
    expect(tokenMatchesHash(VALID_TOKEN_HASH, 'nope')).toBe(false)
  })

  it('rejects a malformed stored hash without throwing', () => {
    expect(tokenMatchesHash('zz-not-hex', VALID_TOKEN)).toBe(false)
    expect(tokenMatchesHash('', VALID_TOKEN)).toBe(false)
  })
})
