import { prisma, type Prisma, type CreditTransactionType } from '@botesq/database'
import { PaymentError } from '../types.js'

// Credit to USD conversion rate (100 credits = $1)
export const CREDITS_PER_DOLLAR = 100

// Minimum and maximum purchase amounts
export const MIN_PURCHASE_USD = 10
export const MAX_PURCHASE_USD = 10000

type TxClient = Prisma.TransactionClient

function assertValidAmount(amount: number): void {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new PaymentError('INVALID_AMOUNT', 'Credit amount must be a positive integer')
  }
}

/**
 * Credit an operator inside an existing transaction.
 * The UPDATE takes the row lock, so the follow-up balance read is stable
 * until the transaction commits.
 */
export async function addCreditsInTx(
  tx: TxClient,
  operatorId: string,
  amount: number,
  type: Extract<CreditTransactionType, 'PURCHASE' | 'REFUND' | 'ADJUSTMENT' | 'PROMO'>,
  description: string,
  referenceType?: string,
  referenceId?: string
): Promise<{ newBalance: number }> {
  assertValidAmount(amount)

  const updated = await tx.operator.updateMany({
    where: { id: operatorId },
    data: { creditBalance: { increment: amount } },
  })

  if (updated.count === 0) {
    throw new PaymentError('OPERATOR_NOT_FOUND', 'Operator not found')
  }

  const operator = await tx.operator.findUniqueOrThrow({
    where: { id: operatorId },
    select: { creditBalance: true },
  })

  await tx.creditTransaction.create({
    data: {
      operatorId,
      type,
      amount,
      balanceBefore: operator.creditBalance - amount,
      balanceAfter: operator.creditBalance,
      description,
      referenceType,
      referenceId,
    },
  })

  return { newBalance: operator.creditBalance }
}

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
  return await prisma.$transaction((tx) =>
    addCreditsInTx(tx, operatorId, amount, 'PURCHASE', description, referenceType, referenceId)
  )
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
  return await prisma.$transaction((tx) =>
    addCreditsInTx(tx, operatorId, amount, 'REFUND', description, referenceType, referenceId)
  )
}

/**
 * Deduct credits inside an existing transaction.
 * Atomic check-and-decrement: the conditional UPDATE only succeeds if the
 * balance is sufficient, so concurrent deductions can never drive the
 * balance negative or lose an update.
 */
export async function deductCreditsInTx(
  tx: TxClient,
  operatorId: string,
  amount: number,
  description: string,
  referenceType?: string,
  referenceId?: string
): Promise<{ newBalance: number }> {
  assertValidAmount(amount)

  const updated = await tx.operator.updateMany({
    where: { id: operatorId, creditBalance: { gte: amount } },
    data: { creditBalance: { decrement: amount } },
  })

  if (updated.count === 0) {
    const exists = await tx.operator.findUnique({
      where: { id: operatorId },
      select: { id: true },
    })
    if (!exists) {
      throw new PaymentError('OPERATOR_NOT_FOUND', 'Operator not found')
    }
    throw new PaymentError('INSUFFICIENT_CREDITS', 'Not enough credits')
  }

  // The row lock from the update is held until commit, so this read is stable.
  const operator = await tx.operator.findUniqueOrThrow({
    where: { id: operatorId },
    select: { creditBalance: true },
  })

  await tx.creditTransaction.create({
    data: {
      operatorId,
      type: 'DEDUCTION',
      amount: -amount,
      balanceBefore: operator.creditBalance + amount,
      balanceAfter: operator.creditBalance,
      description,
      referenceType,
      referenceId,
    },
  })

  return { newBalance: operator.creditBalance }
}

/**
 * Deduct credits from an operator's balance (standalone transaction)
 */
export async function deductCredits(
  operatorId: string,
  amount: number,
  description: string,
  referenceType?: string,
  referenceId?: string
): Promise<{ newBalance: number }> {
  return await prisma.$transaction((tx) =>
    deductCreditsInTx(tx, operatorId, amount, description, referenceType, referenceId)
  )
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
 * Convert USD to credits.
 * Rounds to the nearest credit to avoid float artifacts (e.g. 29.99 * 100)
 * short-changing the buyer by a credit; callers should already pass
 * whole-cent amounts.
 */
export function usdToCredits(amountUsd: number): number {
  return Math.round(amountUsd * CREDITS_PER_DOLLAR)
}

/**
 * Convert credits to USD
 */
export function creditsToUsd(credits: number): number {
  return credits / CREDITS_PER_DOLLAR
}
