'use server'

import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@botesq/database'
import { getCurrentAttorneySession } from './session'

/**
 * Send webhook notification to operator
 */
async function sendOperatorWebhook(
  operatorId: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const operator = await prisma.operator.findUnique({
      where: { id: operatorId },
      select: { webhookUrl: true, webhookSecret: true },
    })

    if (!operator?.webhookUrl || !operator?.webhookSecret) {
      return // No webhook configured
    }

    const payload = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data,
    })

    const timestamp = Math.floor(Date.now() / 1000).toString()
    const signaturePayload = `${timestamp}.${payload}`
    const signature = crypto
      .createHmac('sha256', operator.webhookSecret)
      .update(signaturePayload)
      .digest('hex')

    await fetch(operator.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BotEsq-Signature': signature,
        'X-BotEsq-Timestamp': timestamp,
      },
      body: payload,
      signal: AbortSignal.timeout(10000),
    })
  } catch (error) {
    // Log but don't fail the main operation
    console.error('Failed to send webhook:', error)
  }
}

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

    const completedAt = new Date()

    await prisma.consultation.update({
      where: { id: consultationId },
      data: {
        finalResponse: response.trim(),
        status: 'COMPLETED',
        completedAt,
        responseMetadata: {
          attorneyId: attorney.id,
          attorneyName: `${attorney.firstName} ${attorney.lastName}`,
          submittedAt: completedAt.toISOString(),
        },
      },
    })

    // Create matter assignment record if matter exists
    if (consultation.matterId) {
      await prisma.matterAssignment.create({
        data: {
          matterId: consultation.matterId,
          attorneyId: attorney.id,
          completedAt,
        },
      })
    }

    // Send webhook notification to operator (async, don't await)
    sendOperatorWebhook(consultation.operatorId, 'consultation.completed', {
      consultation_id: consultation.externalId,
      matter_id: consultation.matterId,
      status: 'completed',
      question: consultation.question,
      response: response.trim(),
      attorney_reviewed: true,
      completed_at: completedAt.toISOString(),
    })

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
