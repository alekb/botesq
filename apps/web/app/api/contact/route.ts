import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendContactEmail } from '@/lib/email/send'

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  inquiryType: z.enum(['sales', 'support', 'legal', 'general']),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  website: z.string(),
  timestamp: z.number(),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const result = contactSchema.safeParse(body)
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors
    return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 })
  }

  const { name, email, inquiryType, message, website, timestamp } = result.data

  // Honeypot check — bots fill hidden fields
  if (website !== '') {
    return NextResponse.json({ success: true })
  }

  // Time-based check — humans take >3s to fill a form
  if (Date.now() - timestamp < 3000) {
    return NextResponse.json({ success: true })
  }

  await sendContactEmail(name, email, inquiryType, message)

  return NextResponse.json({ success: true })
}
