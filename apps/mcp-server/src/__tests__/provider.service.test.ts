import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  MatterType,
  ProviderServiceType,
  PriceModel,
  ProviderRequestStatus,
} from '@botesq/database'

// Mock prisma
vi.mock('@botesq/database', async () => {
  const actual = await vi.importActual('@botesq/database')
  return {
    ...actual,
    prisma: {
      provider: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      providerService: {
        create: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      providerRequest: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
        aggregate: vi.fn(),
      },
      providerReview: {
        findMany: vi.fn(),
        aggregate: vi.fn(),
      },
      providerSettlement: {
        findMany: vi.fn(),
        aggregate: vi.fn(),
      },
      operatorProviderPreference: {
        findMany: vi.fn(),
        upsert: vi.fn(),
        delete: vi.fn(),
      },
    },
    Prisma: {
      JsonNull: null,
    },
  }
})

// Mock auth service
vi.mock('../services/auth.service.js', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed_password'),
  verifyPassword: vi.fn().mockResolvedValue(true),
}))

// Mock utils
vi.mock('../utils/id', () => ({
  generateId: vi.fn().mockReturnValue('PRV-ABC123'),
}))

vi.mock('../utils/webhook', () => ({
  generateWebhookSecret: vi.fn().mockReturnValue('whsec_test123'),
}))

import { prisma } from '@botesq/database'
import { hashPassword, verifyPassword } from '../services/auth.service.js'
import {
  createProvider,
  getProviderById,
  getProviderByEmail,
  getProviderByExternalId,
  updateProvider,
  updateProviderStatus,
  regenerateWebhookSecret,
  authenticateProvider,
  updateProviderPassword,
  createProviderService,
  getProviderServices,
  updateProviderService,
  deleteProviderService,
  listProviderRequests,
  getProviderRequest,
  updateProviderRequestStatus,
  getProviderReviews,
  getProviderAverageRating,
  getProviderSettlements,
  getProviderEarningsSummary,
  listActiveProviders,
  getOperatorProviderPreferences,
  setOperatorProviderPreference,
  removeOperatorProviderPreference,
} from '../services/provider.service.js'

describe('provider.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createProvider', () => {
    const baseInput = {
      name: 'Test Provider',
      legalName: 'Test Provider LLC',
      description: 'A test provider',
      email: 'test@provider.com',
      password: 'password123',
      jurisdictions: ['CA', 'NY'],
      specialties: [MatterType.CONTRACT_REVIEW],
      serviceTypes: [ProviderServiceType.CONSULTATION],
    }

    const mockProvider = {
      id: 'prov_123',
      externalId: 'PRV-ABC123',
      name: 'Test Provider',
      legalName: 'Test Provider LLC',
      email: 'test@provider.com',
      status: 'PENDING_APPROVAL',
    }

    it('should create provider with PENDING_APPROVAL status', async () => {
      vi.mocked(prisma.provider.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.provider.create).mockResolvedValue(mockProvider as never)

      const result = await createProvider(baseInput)

      expect(prisma.provider.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'PENDING_APPROVAL',
        }),
      })
      expect(result.status).toBe('PENDING_APPROVAL')
    })

    it('should generate external ID with PRV prefix', async () => {
      vi.mocked(prisma.provider.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.provider.create).mockResolvedValue(mockProvider as never)

      await createProvider(baseInput)

      expect(prisma.provider.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          externalId: 'PRV-ABC123',
        }),
      })
    })

    it('should hash password before storing', async () => {
      vi.mocked(prisma.provider.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.provider.create).mockResolvedValue(mockProvider as never)

      await createProvider(baseInput)

      expect(hashPassword).toHaveBeenCalledWith('password123')
      expect(prisma.provider.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          passwordHash: 'hashed_password',
        }),
      })
    })

    it('should generate webhook secret', async () => {
      vi.mocked(prisma.provider.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.provider.create).mockResolvedValue(mockProvider as never)

      await createProvider(baseInput)

      expect(prisma.provider.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          webhookSecret: 'whsec_test123',
        }),
      })
    })

    it('should throw if email already registered', async () => {
      vi.mocked(prisma.provider.findUnique).mockResolvedValue(mockProvider as never)

      await expect(createProvider(baseInput)).rejects.toThrow('Email already registered')
    })

    it('should store jurisdictions and specialties', async () => {
      vi.mocked(prisma.provider.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.provider.create).mockResolvedValue(mockProvider as never)

      await createProvider(baseInput)

      expect(prisma.provider.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jurisdictions: ['CA', 'NY'],
          specialties: [MatterType.CONTRACT_REVIEW],
          serviceTypes: [ProviderServiceType.CONSULTATION],
        }),
      })
    })
  })

  describe('getProviderById', () => {
    it('should return provider with services included', async () => {
      vi.mocked(prisma.provider.findUnique).mockResolvedValue({
        id: 'prov_123',
        services: [{ serviceType: 'CONSULTATION' }],
      } as never)

      const result = await getProviderById('prov_123')

      expect(prisma.provider.findUnique).toHaveBeenCalledWith({
        where: { id: 'prov_123' },
        include: { services: true },
      })
      expect((result as never as { services: unknown[] })?.services).toBeDefined()
    })

    it('should return null for non-existent provider', async () => {
      vi.mocked(prisma.provider.findUnique).mockResolvedValue(null)

      const result = await getProviderById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('getProviderByEmail', () => {
    it('should find provider by email', async () => {
      vi.mocked(prisma.provider.findUnique).mockResolvedValue({
        id: 'prov_123',
        email: 'test@provider.com',
      } as never)

      const result = await getProviderByEmail('test@provider.com')

      expect(prisma.provider.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@provider.com' },
      })
      expect(result?.email).toBe('test@provider.com')
    })
  })

  describe('getProviderByExternalId', () => {
    it('should find provider by external ID', async () => {
      vi.mocked(prisma.provider.findUnique).mockResolvedValue({
        id: 'prov_123',
        externalId: 'PRV-ABC123',
        services: [],
      } as never)

      const result = await getProviderByExternalId('PRV-ABC123')

      expect(prisma.provider.findUnique).toHaveBeenCalledWith({
        where: { externalId: 'PRV-ABC123' },
        include: { services: true },
      })
      expect(result?.externalId).toBe('PRV-ABC123')
    })
  })

  describe('updateProvider', () => {
    it('should update provider fields', async () => {
      vi.mocked(prisma.provider.update).mockResolvedValue({
        id: 'prov_123',
        name: 'Updated Name',
      } as never)

      const result = await updateProvider('prov_123', { name: 'Updated Name' })

      expect(prisma.provider.update).toHaveBeenCalledWith({
        where: { id: 'prov_123' },
        data: { name: 'Updated Name' },
      })
      expect(result.name).toBe('Updated Name')
    })
  })

  describe('updateProviderStatus', () => {
    it('should set verifiedAt when status is ACTIVE', async () => {
      vi.mocked(prisma.provider.update).mockResolvedValue({
        id: 'prov_123',
        status: 'ACTIVE',
        verifiedAt: new Date(),
      } as never)

      await updateProviderStatus('prov_123', 'ACTIVE')

      expect(prisma.provider.update).toHaveBeenCalledWith({
        where: { id: 'prov_123' },
        data: {
          status: 'ACTIVE',
          verifiedAt: expect.any(Date),
        },
      })
    })

    it('should NOT set verifiedAt for other statuses', async () => {
      vi.mocked(prisma.provider.update).mockResolvedValue({
        id: 'prov_123',
        status: 'SUSPENDED',
      } as never)

      await updateProviderStatus('prov_123', 'SUSPENDED')

      expect(prisma.provider.update).toHaveBeenCalledWith({
        where: { id: 'prov_123' },
        data: { status: 'SUSPENDED' },
      })
    })
  })

  describe('regenerateWebhookSecret', () => {
    it('should generate and store new webhook secret', async () => {
      vi.mocked(prisma.provider.update).mockResolvedValue({} as never)

      const result = await regenerateWebhookSecret('prov_123')

      expect(result).toBe('whsec_test123')
      expect(prisma.provider.update).toHaveBeenCalledWith({
        where: { id: 'prov_123' },
        data: { webhookSecret: 'whsec_test123' },
      })
    })
  })

  describe('authenticateProvider', () => {
    const mockProvider = {
      id: 'prov_123',
      email: 'test@provider.com',
      passwordHash: 'hashed',
      status: 'ACTIVE',
    }

    it('should return provider for valid credentials', async () => {
      vi.mocked(prisma.provider.findUnique).mockResolvedValue(mockProvider as never)
      vi.mocked(verifyPassword).mockResolvedValue(true)

      const result = await authenticateProvider('test@provider.com', 'password')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('prov_123')
    })

    it('should return null for non-existent email', async () => {
      vi.mocked(prisma.provider.findUnique).mockResolvedValue(null)

      const result = await authenticateProvider('nonexistent@test.com', 'password')

      expect(result).toBeNull()
    })

    it('should return null for wrong password', async () => {
      vi.mocked(prisma.provider.findUnique).mockResolvedValue(mockProvider as never)
      vi.mocked(verifyPassword).mockResolvedValue(false)

      const result = await authenticateProvider('test@provider.com', 'wrong')

      expect(result).toBeNull()
    })

    it('should throw for non-active provider', async () => {
      const suspendedProvider = { ...mockProvider, status: 'SUSPENDED' }
      vi.mocked(prisma.provider.findUnique).mockResolvedValue(suspendedProvider as never)
      vi.mocked(verifyPassword).mockResolvedValue(true)

      await expect(authenticateProvider('test@provider.com', 'password')).rejects.toThrow(
        'Provider account is suspended'
      )
    })

    it('should throw for pending approval provider', async () => {
      const pendingProvider = { ...mockProvider, status: 'PENDING_APPROVAL' }
      vi.mocked(prisma.provider.findUnique).mockResolvedValue(pendingProvider as never)
      vi.mocked(verifyPassword).mockResolvedValue(true)

      await expect(authenticateProvider('test@provider.com', 'password')).rejects.toThrow(
        'Provider account is pending_approval'
      )
    })
  })

  describe('updateProviderPassword', () => {
    const mockProvider = {
      id: 'prov_123',
      passwordHash: 'old_hash',
    }

    it('should update password with valid current password', async () => {
      vi.mocked(prisma.provider.findUnique).mockResolvedValue(mockProvider as never)
      vi.mocked(verifyPassword).mockResolvedValue(true)
      vi.mocked(prisma.provider.update).mockResolvedValue({} as never)

      const result = await updateProviderPassword('prov_123', 'currentPassword', 'newPassword')

      expect(result).toBe(true)
      expect(hashPassword).toHaveBeenCalledWith('newPassword')
      expect(prisma.provider.update).toHaveBeenCalledWith({
        where: { id: 'prov_123' },
        data: { passwordHash: 'hashed_password' },
      })
    })

    it('should return false for non-existent provider', async () => {
      vi.mocked(prisma.provider.findUnique).mockResolvedValue(null)

      const result = await updateProviderPassword('nonexistent', 'current', 'new')

      expect(result).toBe(false)
    })

    it('should return false for wrong current password', async () => {
      vi.mocked(prisma.provider.findUnique).mockResolvedValue(mockProvider as never)
      vi.mocked(verifyPassword).mockResolvedValue(false)

      const result = await updateProviderPassword('prov_123', 'wrong', 'new')

      expect(result).toBe(false)
    })
  })

  describe('createProviderService', () => {
    it('should create service with defaults', async () => {
      const mockService = {
        id: 'svc_123',
        providerId: 'prov_123',
        serviceType: 'CONSULTATION',
        priceModel: 'FLAT',
        maxConcurrent: 5,
      }
      vi.mocked(prisma.providerService.create).mockResolvedValue(mockService as never)

      await createProviderService({
        providerId: 'prov_123',
        serviceType: ProviderServiceType.CONSULTATION,
        basePrice: 5000,
        targetResponseMins: 60,
      })

      expect(prisma.providerService.create).toHaveBeenCalledWith({
        data: {
          providerId: 'prov_123',
          serviceType: ProviderServiceType.CONSULTATION,
          basePrice: 5000,
          priceModel: 'FLAT',
          pricePerUnit: undefined,
          maxConcurrent: 5,
          targetResponseMins: 60,
        },
      })
    })

    it('should use provided price model', async () => {
      vi.mocked(prisma.providerService.create).mockResolvedValue({} as never)

      await createProviderService({
        providerId: 'prov_123',
        serviceType: ProviderServiceType.DOCUMENT_REVIEW,
        basePrice: 2500,
        priceModel: PriceModel.PER_PAGE,
        pricePerUnit: 100,
        targetResponseMins: 120,
      })

      expect(prisma.providerService.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          priceModel: PriceModel.PER_PAGE,
          pricePerUnit: 100,
        }),
      })
    })
  })

  describe('getProviderServices', () => {
    it('should return services ordered by service type', async () => {
      vi.mocked(prisma.providerService.findMany).mockResolvedValue([
        { serviceType: 'CONSULTATION' },
        { serviceType: 'DOCUMENT_REVIEW' },
      ] as never)

      const result = await getProviderServices('prov_123')

      expect(prisma.providerService.findMany).toHaveBeenCalledWith({
        where: { providerId: 'prov_123' },
        orderBy: { serviceType: 'asc' },
      })
      expect(result).toHaveLength(2)
    })
  })

  describe('updateProviderService', () => {
    it('should update service using composite key', async () => {
      vi.mocked(prisma.providerService.update).mockResolvedValue({} as never)

      await updateProviderService('prov_123', ProviderServiceType.CONSULTATION, {
        enabled: false,
        basePrice: 6000,
      })

      expect(prisma.providerService.update).toHaveBeenCalledWith({
        where: {
          providerId_serviceType: {
            providerId: 'prov_123',
            serviceType: ProviderServiceType.CONSULTATION,
          },
        },
        data: { enabled: false, basePrice: 6000 },
      })
    })
  })

  describe('deleteProviderService', () => {
    it('should delete service using composite key', async () => {
      vi.mocked(prisma.providerService.delete).mockResolvedValue({} as never)

      await deleteProviderService('prov_123', ProviderServiceType.CONSULTATION)

      expect(prisma.providerService.delete).toHaveBeenCalledWith({
        where: {
          providerId_serviceType: {
            providerId: 'prov_123',
            serviceType: ProviderServiceType.CONSULTATION,
          },
        },
      })
    })
  })

  describe('listProviderRequests', () => {
    it('should return paginated requests with total', async () => {
      vi.mocked(prisma.providerRequest.findMany).mockResolvedValue([{}, {}] as never)
      vi.mocked(prisma.providerRequest.count).mockResolvedValue(10)

      const result = await listProviderRequests({
        providerId: 'prov_123',
        limit: 20,
        offset: 0,
      })

      expect(result.requests).toHaveLength(2)
      expect(result.total).toBe(10)
    })

    it('should filter by status when provided', async () => {
      vi.mocked(prisma.providerRequest.findMany).mockResolvedValue([])
      vi.mocked(prisma.providerRequest.count).mockResolvedValue(0)

      await listProviderRequests({
        providerId: 'prov_123',
        status: ProviderRequestStatus.PENDING,
      })

      expect(prisma.providerRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            providerId: 'prov_123',
            status: ProviderRequestStatus.PENDING,
          },
        })
      )
    })

    it('should use default pagination values', async () => {
      vi.mocked(prisma.providerRequest.findMany).mockResolvedValue([])
      vi.mocked(prisma.providerRequest.count).mockResolvedValue(0)

      await listProviderRequests({ providerId: 'prov_123' })

      expect(prisma.providerRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 0,
        })
      )
    })
  })

  describe('getProviderRequest', () => {
    it('should return request for provider', async () => {
      vi.mocked(prisma.providerRequest.findFirst).mockResolvedValue({
        id: 'req_123',
        providerId: 'prov_123',
      } as never)

      const result = await getProviderRequest('prov_123', 'req_123')

      expect(prisma.providerRequest.findFirst).toHaveBeenCalledWith({
        where: {
          providerId: 'prov_123',
          id: 'req_123',
        },
      })
      expect(result?.id).toBe('req_123')
    })

    it('should return null for non-existent request', async () => {
      vi.mocked(prisma.providerRequest.findFirst).mockResolvedValue(null)

      const result = await getProviderRequest('prov_123', 'nonexistent')

      expect(result).toBeNull()
    })

    it('should enforce row-level security (provider must match)', async () => {
      // Even if request exists, it shouldn't return if providerId doesn't match
      vi.mocked(prisma.providerRequest.findFirst).mockResolvedValue(null)

      const result = await getProviderRequest('other_provider', 'req_123')

      expect(prisma.providerRequest.findFirst).toHaveBeenCalledWith({
        where: {
          providerId: 'other_provider',
          id: 'req_123',
        },
      })
      expect(result).toBeNull()
    })
  })

  describe('updateProviderRequestStatus', () => {
    it('should update status with response data', async () => {
      vi.mocked(prisma.providerRequest.update).mockResolvedValue({
        id: 'req_123',
        status: 'COMPLETED',
      } as never)

      await updateProviderRequestStatus('req_123', 'COMPLETED', {
        responsePayload: { answer: 'Legal advice here' },
        creditsCharged: 5000,
        providerEarnings: 3500,
      })

      expect(prisma.providerRequest.update).toHaveBeenCalledWith({
        where: { id: 'req_123' },
        data: {
          status: 'COMPLETED',
          responseAt: expect.any(Date),
          responsePayload: { answer: 'Legal advice here' },
          creditsCharged: 5000,
          providerEarnings: 3500,
        },
      })
    })

    it('should set responseAt when completing', async () => {
      vi.mocked(prisma.providerRequest.update).mockResolvedValue({} as never)

      await updateProviderRequestStatus('req_123', 'COMPLETED')

      expect(prisma.providerRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            responseAt: expect.any(Date),
          }),
        })
      )
    })

    it('should NOT set responseAt for other statuses', async () => {
      vi.mocked(prisma.providerRequest.update).mockResolvedValue({} as never)

      await updateProviderRequestStatus('req_123', 'IN_PROGRESS')

      expect(prisma.providerRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            responseAt: undefined,
          }),
        })
      )
    })
  })

  describe('getProviderReviews', () => {
    it('should return public reviews by default', async () => {
      vi.mocked(prisma.providerReview.findMany).mockResolvedValue([
        { rating: 5, isPublic: true },
      ] as never)

      await getProviderReviews('prov_123')

      expect(prisma.providerReview.findMany).toHaveBeenCalledWith({
        where: {
          providerId: 'prov_123',
          isPublic: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should return all reviews when publicOnly is false', async () => {
      vi.mocked(prisma.providerReview.findMany).mockResolvedValue([])

      await getProviderReviews('prov_123', false)

      expect(prisma.providerReview.findMany).toHaveBeenCalledWith({
        where: { providerId: 'prov_123' },
        orderBy: { createdAt: 'desc' },
      })
    })
  })

  describe('getProviderAverageRating', () => {
    it('should return average rating', async () => {
      vi.mocked(prisma.providerReview.aggregate).mockResolvedValue({
        _avg: { rating: 4.5 },
      } as never)

      const result = await getProviderAverageRating('prov_123')

      expect(result).toBe(4.5)
    })

    it('should return null for no reviews', async () => {
      vi.mocked(prisma.providerReview.aggregate).mockResolvedValue({
        _avg: { rating: null },
      } as never)

      const result = await getProviderAverageRating('prov_123')

      expect(result).toBeNull()
    })
  })

  describe('getProviderSettlements', () => {
    it('should return settlements ordered by period', async () => {
      vi.mocked(prisma.providerSettlement.findMany).mockResolvedValue([
        { periodStart: new Date('2024-02-01') },
        { periodStart: new Date('2024-01-01') },
      ] as never)

      const result = await getProviderSettlements('prov_123')

      expect(prisma.providerSettlement.findMany).toHaveBeenCalledWith({
        where: { providerId: 'prov_123' },
        orderBy: { periodStart: 'desc' },
        take: 12,
      })
      expect(result).toHaveLength(2)
    })

    it('should allow custom limit', async () => {
      vi.mocked(prisma.providerSettlement.findMany).mockResolvedValue([])

      await getProviderSettlements('prov_123', 6)

      expect(prisma.providerSettlement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 6 })
      )
    })
  })

  describe('getProviderEarningsSummary', () => {
    it('should return comprehensive earnings summary', async () => {
      vi.mocked(prisma.providerSettlement.aggregate)
        .mockResolvedValueOnce({ _sum: { providerShare: 50000 } } as never) // total paid
        .mockResolvedValueOnce({ _sum: { providerShare: 10000 } } as never) // pending
      vi.mocked(prisma.providerRequest.aggregate).mockResolvedValue({
        _sum: { providerEarnings: 5000 },
        _count: 5,
      } as never)
      vi.mocked(prisma.providerRequest.count).mockResolvedValue(100)

      const result = await getProviderEarningsSummary('prov_123')

      expect(result).toEqual({
        totalEarnings: 50000,
        pendingPayout: 10000,
        thisMonthEarnings: 5000,
        totalRequests: 100,
      })
    })

    it('should handle null values gracefully', async () => {
      vi.mocked(prisma.providerSettlement.aggregate)
        .mockResolvedValueOnce({ _sum: { providerShare: null } } as never)
        .mockResolvedValueOnce({ _sum: { providerShare: null } } as never)
      vi.mocked(prisma.providerRequest.aggregate).mockResolvedValue({
        _sum: { providerEarnings: null },
        _count: 0,
      } as never)
      vi.mocked(prisma.providerRequest.count).mockResolvedValue(0)

      const result = await getProviderEarningsSummary('prov_123')

      expect(result).toEqual({
        totalEarnings: 0,
        pendingPayout: 0,
        thisMonthEarnings: 0,
        totalRequests: 0,
      })
    })
  })

  describe('listActiveProviders', () => {
    it('should only return ACTIVE providers', async () => {
      vi.mocked(prisma.provider.findMany).mockResolvedValue([])
      vi.mocked(prisma.provider.count).mockResolvedValue(0)

      await listActiveProviders()

      expect(prisma.provider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        })
      )
    })

    it('should filter by service type', async () => {
      vi.mocked(prisma.provider.findMany).mockResolvedValue([])
      vi.mocked(prisma.provider.count).mockResolvedValue(0)

      await listActiveProviders({ serviceType: ProviderServiceType.CONSULTATION })

      expect(prisma.provider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            services: {
              some: {
                serviceType: ProviderServiceType.CONSULTATION,
                enabled: true,
              },
            },
          }),
        })
      )
    })

    it('should filter by jurisdiction', async () => {
      vi.mocked(prisma.provider.findMany).mockResolvedValue([])
      vi.mocked(prisma.provider.count).mockResolvedValue(0)

      await listActiveProviders({ jurisdiction: 'CA' })

      expect(prisma.provider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            jurisdictions: { has: 'CA' },
          }),
        })
      )
    })

    it('should filter by specialty', async () => {
      vi.mocked(prisma.provider.findMany).mockResolvedValue([])
      vi.mocked(prisma.provider.count).mockResolvedValue(0)

      await listActiveProviders({ specialty: MatterType.CONTRACT_REVIEW })

      expect(prisma.provider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            specialties: { has: MatterType.CONTRACT_REVIEW },
          }),
        })
      )
    })

    it('should order by quality score', async () => {
      vi.mocked(prisma.provider.findMany).mockResolvedValue([])
      vi.mocked(prisma.provider.count).mockResolvedValue(0)

      await listActiveProviders()

      expect(prisma.provider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { qualityScore: 'desc' },
        })
      )
    })
  })

  describe('getOperatorProviderPreferences', () => {
    it('should return preferences with provider details', async () => {
      vi.mocked(prisma.operatorProviderPreference.findMany).mockResolvedValue([
        {
          operatorId: 'op_123',
          providerId: 'prov_123',
          priority: 1,
          provider: { name: 'Test Provider' },
        },
      ] as never)

      const result = await getOperatorProviderPreferences('op_123')

      expect(prisma.operatorProviderPreference.findMany).toHaveBeenCalledWith({
        where: { operatorId: 'op_123' },
        include: {
          provider: {
            include: { services: true },
          },
        },
      })
      expect(result).toHaveLength(1)
    })
  })

  describe('setOperatorProviderPreference', () => {
    it('should upsert preference with defaults', async () => {
      vi.mocked(prisma.operatorProviderPreference.upsert).mockResolvedValue({} as never)

      await setOperatorProviderPreference('op_123', 'prov_123', {
        priority: 1,
      })

      expect(prisma.operatorProviderPreference.upsert).toHaveBeenCalledWith({
        where: {
          operatorId_providerId: { operatorId: 'op_123', providerId: 'prov_123' },
        },
        create: {
          operatorId: 'op_123',
          providerId: 'prov_123',
          enabled: true,
          priority: 1,
          serviceTypes: [],
        },
        update: { priority: 1 },
      })
    })

    it('should allow disabling a provider', async () => {
      vi.mocked(prisma.operatorProviderPreference.upsert).mockResolvedValue({} as never)

      await setOperatorProviderPreference('op_123', 'prov_123', {
        enabled: false,
      })

      expect(prisma.operatorProviderPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ enabled: false }),
          update: { enabled: false },
        })
      )
    })
  })

  describe('removeOperatorProviderPreference', () => {
    it('should delete preference using composite key', async () => {
      vi.mocked(prisma.operatorProviderPreference.delete).mockResolvedValue({} as never)

      await removeOperatorProviderPreference('op_123', 'prov_123')

      expect(prisma.operatorProviderPreference.delete).toHaveBeenCalledWith({
        where: {
          operatorId_providerId: { operatorId: 'op_123', providerId: 'prov_123' },
        },
      })
    })
  })
})
