'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { ServiceList, ServiceDialog } from '@/components/provider/services'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/dialog'
import { getProviderToken } from '@/lib/auth/provider-session'
import {
  listProviderServices,
  createProviderService,
  updateProviderService,
  deleteProviderService,
  toggleProviderService,
} from '@/lib/api/provider-services'
import type { ProviderService, ProviderServiceInput } from '@/types/provider'

export default function ProviderServicesPage() {
  const [services, setServices] = useState<ProviderService[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingServiceId, setUpdatingServiceId] = useState<string | undefined>()

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingService, setEditingService] = useState<ProviderService | undefined>()
  const [deletingService, setDeletingService] = useState<ProviderService | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadServices()
  }, [])

  const loadServices = async () => {
    const token = await getProviderToken()
    if (!token) return

    try {
      const data = await listProviderServices(token)
      setServices(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load services')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = async (service: ProviderService, enabled: boolean) => {
    const token = await getProviderToken()
    if (!token) return

    setUpdatingServiceId(service.id)
    setError(null)

    try {
      const updated = await toggleProviderService(token, service.serviceType, enabled)
      setServices((prev) => prev.map((s) => (s.id === service.id ? updated : s)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update service')
    } finally {
      setUpdatingServiceId(undefined)
    }
  }

  const handleAddService = async (data: ProviderServiceInput) => {
    const token = await getProviderToken()
    if (!token) return

    setIsSubmitting(true)
    try {
      const newService = await createProviderService(token, data)
      setServices((prev) => [...prev, newService])
      setShowAddDialog(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditService = async (data: ProviderServiceInput) => {
    const token = await getProviderToken()
    if (!token || !editingService) return

    setIsSubmitting(true)
    try {
      const updated = await updateProviderService(token, editingService.serviceType, {
        basePrice: data.basePrice,
        priceModel: data.priceModel,
        pricePerUnit: data.pricePerUnit,
        maxConcurrent: data.maxConcurrent,
        targetResponseMins: data.targetResponseMins,
      })
      setServices((prev) => prev.map((s) => (s.id === editingService.id ? updated : s)))
      setEditingService(undefined)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteService = async () => {
    const token = await getProviderToken()
    if (!token || !deletingService) return

    setIsSubmitting(true)
    try {
      await deleteProviderService(token, deletingService.serviceType)
      setServices((prev) => prev.filter((s) => s.id !== deletingService.id))
      setDeletingService(undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete service')
    } finally {
      setIsSubmitting(false)
    }
  }

  const existingServiceTypes = services.map((s) => s.serviceType)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Services</h1>
          <p className="text-text-secondary">Configure the services you offer</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Service
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <ServiceList
        services={services}
        isLoading={isLoading}
        updatingServiceId={updatingServiceId}
        onToggle={handleToggle}
        onEdit={setEditingService}
        onDelete={setDeletingService}
      />

      {/* Add Service Dialog */}
      <ServiceDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        existingServiceTypes={existingServiceTypes}
        onSubmit={handleAddService}
        isSubmitting={isSubmitting}
      />

      {/* Edit Service Dialog */}
      <ServiceDialog
        open={!!editingService}
        onOpenChange={(open) => !open && setEditingService(undefined)}
        service={editingService}
        existingServiceTypes={existingServiceTypes}
        onSubmit={handleEditService}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingService}
        onOpenChange={(open) => !open && setDeletingService(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this service? This action cannot be undone. You cannot
              delete a service that has pending requests.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteService}
              className="bg-error-500 hover:bg-error-600"
              disabled={isSubmitting}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
