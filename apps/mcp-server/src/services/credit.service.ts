import { prisma } from '@moltlaw/database'
import { PaymentError } from '../types.js'

// Credit to USD conversion rate (100 credits = $1)
export const CREDITS_PER_DOLLAR = 100

// Minimum and maximum purchase amounts
export const MIN_PURCHASE_USD = 10
export const MAX_PURCHASE_USD = 10000

/**
 * Add credits to an operator's balance
 * Used after successful payment
 */
export async function addCredits(
  operatorId: string,
  amount: number,
  description: string,
  referenceType?: string,
  referenceId?: string
): Promise<{ newBalance: number }> {
  return await prisma.$transaction(async (tx) => {
    const operator = await tx.operator.findUnique({
      where: { id: operatorId },
      select: { creditBalance: true },
    })

    if (!operator) {
      throw new PaymentError('OPERATOR_NOT_FOUND', 'Operator not found')
    }

    const balanceBefore = operator.creditBalance
    const balanceAfter = balanceBefore + amount

    // Update operator balance
    await tx.operator.update({
      where: { id: operatorId },
      data: { creditBalance: balanceAfter },
    })

    // Record transaction
    await tx.creditTransaction.create({
      data: {
        operatorId,
        type: 'PURCHASE',
        amount,
        balanceBefore,
        balanceAfter,
        description,
        referenceType,
        referenceId,
      },
    })

    return { newBalance: balanceAfter }
  })
}

/**
 * Deduct credits from an operator's balance
 * Used when services are consumed
 */
export async function deductCredits(
  operatorId: string,
  amount: number,
  description: string,
  referenceType?: string,
  referenceId?: string
): Promise<{ newBalance: number }> {
  return await prisma.$transaction(async (tx) => {
    const operator = await tx.operator.findUnique({
      where: { id: operatorId },
      select: { creditBalance: true },
    })

    if (!operator) {
      throw new PaymentError('OPERATOR_NOT_FOUND', 'Operator not found')
    }

    if (operator.creditBalance < amount) {
      throw new PaymentError('INSUFFICIENT_CREDITS', 'Not enough credits')
    }

    const balanceBefore = operator.creditBalance
    const balanceAfter = balanceBefore - amount

    // Update operator balance
    await tx.operator.update({
      where: { id: operatorId },
      data: { creditBalance: balanceAfter },
    })

    // Record transaction (negative amount for deduction)
    await tx.creditTransaction.create({
      data: {
        operatorId,
        type: 'DEDUCTION',
        amount: -amount,
        balanceBefore,
        balanceAfter,
        description,
        referenceType,
        referenceId,
      },
    })

    return { newBalance: balanceAfter }
  })
}

/**
 * Refund credits to an operator's balance
 * Used when a service fails after credits were deducted
 */
export async function refundCredits(
  operatorId: string,
  amount: number,
  description: string,
  referenceType?: string,
  referenceId?: string
): Promise<{ newBalance: number }> {
  return await prisma.$transaction(async (tx) => {
    const operator = await tx.operator.findUnique({
      where: { id: operatorId },
      select: { creditBalance: true },
    })

    if (!operator) {
      throw new PaymentError('OPERATOR_NOT_FOUND', 'Operator not found')
    }

    const balanceBefore = operator.creditBalance
    const balanceAfter = balanceBefore + amount

    // Update operator balance
    await tx.operator.update({
      where: { id: operatorId },
      data: { creditBalance: balanceAfter },
    })

    // Record transaction
    await tx.creditTransaction.create({
      data: {
        operatorId,
        type: 'REFUND',
        amount,
        balanceBefore,
        balanceAfter,
        description,
        referenceType,
        referenceId,
      },
    })

    return { newBalance: balanceAfter }
  })
}

/**
 * Check if operator has sufficient credits
 */
export async function hasCredits(operatorId: string, amount: number): Promise<boolean> {
  const operator = await prisma.operator.findUnique({
    where: { id: operatorId },
    select: { creditBalance: true },
  })

  return operator ? operator.creditBalance >= amount : false
}

/**
 * Convert USD to credits
 */
export function usdToCredits(amountUsd: number): number {
  return Math.floor(amountUsd * CREDITS_PER_DOLLAR)
}

/**
 * Convert credits to USD
 */
export function creditsToUsd(credits: number): number {
  return credits / CREDITS_PER_DOLLAR
}
