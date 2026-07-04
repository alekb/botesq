/**
 * Environment Variable Validation
 *
 * Validates all environment variables at startup and fails fast with clear
 * error messages. Integration secrets (OpenAI, Stripe, AWS) are optional in
 * development — the corresponding features degrade gracefully — but are
 * required in production.
 *
 * Usage:
 *   import { validateEnv } from '@botesq/shared'
 *   const env = validateEnv()  // Call at startup
 */

import { z } from 'zod'

// .env templates ship empty strings for unset secrets; treat them as absent.
const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value)

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Database
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine(
      (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
      'DATABASE_URL must be a valid PostgreSQL connection string'
    ),

  // Authentication
  SESSION_SECRET: z.preprocess(
    emptyToUndefined,
    z.string().min(32, 'SESSION_SECRET must be at least 32 characters').optional()
  ),

  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(24),

  // Rate limiting
  RATE_LIMIT_REQUESTS_PER_MINUTE: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_REQUESTS_PER_HOUR: z.coerce.number().int().positive().default(100),

  // OpenAI (optional in development, required in production)
  OPENAI_API_KEY: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .refine(
        (key) => key.startsWith('sk-') || key === 'mock',
        'OPENAI_API_KEY must start with "sk-" or be "mock" for testing'
      )
      .optional()
  ),

  // Stripe (optional in development, required in production)
  STRIPE_SECRET_KEY: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .refine(
        (key) => key.startsWith('sk_test_') || key.startsWith('sk_live_'),
        'STRIPE_SECRET_KEY must start with "sk_test_" or "sk_live_"'
      )
      .optional()
  ),

  STRIPE_WEBHOOK_SECRET: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .refine((key) => key.startsWith('whsec_'), 'STRIPE_WEBHOOK_SECRET must start with "whsec_"')
      .optional()
  ),

  STRIPE_SUCCESS_URL: z.string().url().default('https://botesq.io/portal/billing?success=true'),
  STRIPE_CANCEL_URL: z.string().url().default('https://botesq.io/portal/billing?canceled=true'),

  // AWS S3 (optional in development, required in production)
  AWS_ACCESS_KEY_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  AWS_SECRET_ACCESS_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  AWS_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.preprocess(emptyToUndefined, z.string().optional()),
  S3_PRESIGNED_URL_EXPIRY: z.coerce.number().default(900),

  // Application
  PORT: z.coerce.number().default(3000),
  MCP_PORT: z.coerce.number().default(3001),
  NEXT_PUBLIC_APP_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Feature Flags
  FEATURE_PROVIDER_MARKETPLACE: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),

  FEATURE_ATTORNEY_2FA_REQUIRED: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
})

export type Env = z.infer<typeof envSchema>

// Secrets that may be omitted in development but must be set in production.
const REQUIRED_IN_PRODUCTION = [
  'OPENAI_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'S3_BUCKET',
] as const

let cachedEnv: Env | null = null

export function validateEnv(): Env {
  if (cachedEnv) return cachedEnv

  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const errors = result.error.errors
      .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n')

    console.error('\n========================================')
    console.error('ENVIRONMENT VALIDATION FAILED')
    console.error('========================================\n')
    console.error(errors)
    console.error('\nCopy .env.example to .env.local and fill in values.\n')

    throw new Error(`Environment validation failed:\n${errors}`)
  }

  // Production safety checks
  if (result.data.NODE_ENV === 'production') {
    const missing = REQUIRED_IN_PRODUCTION.filter((key) => !result.data[key])
    if (missing.length > 0) {
      throw new Error(`Required in production but not set: ${missing.join(', ')}`)
    }

    if (result.data.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
      throw new Error('Using Stripe TEST key in production!')
    }
  }

  cachedEnv = result.data
  return cachedEnv
}

export function getEnv(): Env {
  if (!cachedEnv) {
    throw new Error('Call validateEnv() at startup first.')
  }
  return cachedEnv
}

export const env = new Proxy({} as Env, {
  get(_, prop: string) {
    if (!cachedEnv) validateEnv()
    return (cachedEnv as Record<string, unknown>)[prop]
  },
})

export const isDevelopment = () => process.env.NODE_ENV === 'development'
export const isProduction = () => process.env.NODE_ENV === 'production'
export const isTest = () => process.env.NODE_ENV === 'test'
