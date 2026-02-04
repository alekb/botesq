/**
 * Environment Variable Validation
 *
 * Validates all required environment variables at startup.
 * Fails fast with clear error messages if any are missing or invalid.
 *
 * Usage:
 *   import { env, validateEnv } from '@botesq/shared/env'
 *   validateEnv()  // Call at startup
 *   const dbUrl = env.DATABASE_URL
 */

import { z } from 'zod'

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
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters').optional(),

  API_KEY_SALT: z.string().min(32, 'API_KEY_SALT must be at least 32 characters').optional(),

  // OpenAI
  OPENAI_API_KEY: z
    .string()
    .min(1, 'OPENAI_API_KEY is required')
    .refine(
      (key) => key.startsWith('sk-') || key === 'mock',
      'OPENAI_API_KEY must start with "sk-" or be "mock" for testing'
    ),

  // Stripe
  STRIPE_SECRET_KEY: z
    .string()
    .min(1, 'STRIPE_SECRET_KEY is required')
    .refine(
      (key) => key.startsWith('sk_test_') || key.startsWith('sk_live_'),
      'STRIPE_SECRET_KEY must start with "sk_test_" or "sk_live_"'
    ),

  STRIPE_WEBHOOK_SECRET: z
    .string()
    .min(1, 'STRIPE_WEBHOOK_SECRET is required')
    .refine((key) => key.startsWith('whsec_'), 'STRIPE_WEBHOOK_SECRET must start with "whsec_"'),

  STRIPE_SUCCESS_URL: z.string().url().optional(),
  STRIPE_CANCEL_URL: z.string().url().optional(),

  // AWS S3
  AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS_ACCESS_KEY_ID is required'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS_SECRET_ACCESS_KEY is required'),
  AWS_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().min(1, 'S3_BUCKET is required'),
  S3_PRESIGNED_URL_EXPIRY: z.coerce.number().default(900),

  // Application
  PORT: z.coerce.number().default(3000),
  MCP_PORT: z.coerce.number().default(3001),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

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
    if (result.data.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
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
