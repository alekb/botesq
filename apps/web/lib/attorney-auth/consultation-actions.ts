'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@botesq/database'
import { getCurrentAttorneySession } from './session'

export type ConsultationActionResult = {
  success: boolean
  error?: string
}

/**
 * Claim a consultation for review (form action version)
 */
export async function claimConsultationAction(consultationId: string): Promise<void> {
  await claimConsultation(consultationId)
  revalidatePath('/attorney/queue')
  redirect(`/attorney/queue/${consultationId}`)
}

/**
 * Claim a consultation for review
 */
export async function claimConsultation(consultationId: string): Promise<ConsultationActionResult> {
  const { attorney } = await getCurrentAttorneySession()

  if (!attorney) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
    })

    if (!consultation) {
      return { success: false, error: 'Consultation not found' }
    }

    if (consultation.status !== 'QUEUED') {
      return { success: false, error: 'Consultation is not available for claiming' }
    }

    await prisma.consultation.update({
      where: { id: consultationId },
      data: {
        attorneyId: attorney.id,
        status: 'IN_REVIEW',
      },
    })

    revalidatePath('/attorney/queue')
    revalidatePath(`/attorney/queue/${consultationId}`)

    return { success: true }
  } catch (error) {
    console.error('Failed to claim consultation:', error)
    return { success: false, error: 'Failed to claim consultation' }
  }
}

/**
 * Release a claimed consultation back to the queue
 */
export async function releaseConsultation(
  consultationId: string
): Promise<ConsultationActionResult> {
  const { attorney } = await getCurrentAttorneySession()

  if (!attorney) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
    })

    if (!consultation) {
      return { success: false, error: 'Consultation not found' }
    }

    if (consultation.attorneyId !== attorney.id) {
      return { success: false, error: 'Not authorized to release this consultation' }
    }

    if (consultation.status !== 'IN_REVIEW') {
      return { success: false, error: 'Consultation cannot be released' }
    }

    await prisma.consultation.update({
      where: { id: consultationId },
      data: {
        attorneyId: null,
        status: 'QUEUED',
      },
    })

    revalidatePath('/attorney/queue')
    redirect('/attorney/queue')
  } catch (error) {
    console.error('Failed to release consultation:', error)
    return { success: false, error: 'Failed to release consultation' }
  }
}

/**
 * Submit the final response for a consultation
 */
export async function submitConsultationResponse(
  consultationId: string,
  response: string
): Promise<ConsultationActionResult> {
  const { attorney } = await getCurrentAttorneySession()

  if (!attorney) {
    return { success: false, error: 'Not authenticated' }
  }

  if (!response.trim()) {
    return { success: false, error: 'Response cannot be empty' }
  }

  try {
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
    })

    if (!consultation) {
      return { success: false, error: 'Consultation not found' }
    }

    if (consultation.attorneyId !== attorney.id) {
      return { success: false, error: 'Not authorized to respond to this consultation' }
    }

    if (consultation.status !== 'IN_REVIEW') {
      return { success: false, error: 'Consultation is not in review status' }
    }

    await prisma.consultation.update({
      where: { id: consultationId },
      data: {
        finalResponse: response.trim(),
        status: 'COMPLETED',
        completedAt: new Date(),
        responseMetadata: {
          attorneyId: attorney.id,
          attorneyName: `${attorney.firstName} ${attorney.lastName}`,
          submittedAt: new Date().toISOString(),
        },
      },
    })

    // Create matter assignment record if matter exists
    if (consultation.matterId) {
      await prisma.matterAssignment.create({
        data: {
          matterId: consultation.matterId,
          attorneyId: attorney.id,
          completedAt: new Date(),
        },
      })
    }

    revalidatePath('/attorney/queue')
    revalidatePath(`/attorney/queue/${consultationId}`)
    revalidatePath('/attorney')

    return { success: true }
  } catch (error) {
    console.error('Failed to submit consultation response:', error)
    return { success: false, error: 'Failed to submit response' }
  }
}

/**
 * Save draft response (auto-save)
 */
export async function saveDraftResponse(
  consultationId: string,
  response: string
): Promise<ConsultationActionResult> {
  const { attorney } = await getCurrentAttorneySession()

  if (!attorney) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
    })

    if (!consultation) {
      return { success: false, error: 'Consultation not found' }
    }

    if (consultation.attorneyId !== attorney.id) {
      return { success: false, error: 'Not authorized' }
    }

    if (consultation.status !== 'IN_REVIEW') {
      return { success: false, error: 'Consultation is not in review status' }
    }

    await prisma.consultation.update({
      where: { id: consultationId },
      data: {
        finalResponse: response,
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to save draft:', error)
    return { success: false, error: 'Failed to save draft' }
  }
}
