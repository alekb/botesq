import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  DATABASE_URL: z.string(),

  // Session
  SESSION_TTL_HOURS: z.string().default('24'),

  // Rate limiting
  RATE_LIMIT_REQUESTS_PER_MINUTE: z.string().default('10'),
  RATE_LIMIT_REQUESTS_PER_HOUR: z.string().default('100'),

  // OpenAI (optional for now)
  OPENAI_API_KEY: z.string().optional(),

  // AWS S3 (optional for now)
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),

  // Stripe (optional for now)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_SUCCESS_URL: z.string().default('https://moltlaw.io/portal/billing?success=true'),
  STRIPE_CANCEL_URL: z.string().default('https://moltlaw.io/portal/billing?canceled=true'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = {
  env: parsed.data.NODE_ENV,
  port: parseInt(parsed.data.PORT, 10),
  databaseUrl: parsed.data.DATABASE_URL,

  session: {
    ttlHours: parseInt(parsed.data.SESSION_TTL_HOURS, 10),
  },

  rateLimit: {
    requestsPerMinute: parseInt(parsed.data.RATE_LIMIT_REQUESTS_PER_MINUTE, 10),
    requestsPerHour: parseInt(parsed.data.RATE_LIMIT_REQUESTS_PER_HOUR, 10),
  },

  openai: {
    apiKey: parsed.data.OPENAI_API_KEY,
  },

  aws: {
    region: parsed.data.AWS_REGION,
    accessKeyId: parsed.data.AWS_ACCESS_KEY_ID,
    secretAccessKey: parsed.data.AWS_SECRET_ACCESS_KEY,
    s3Bucket: parsed.data.AWS_S3_BUCKET,
  },

  stripe: {
    secretKey: parsed.data.STRIPE_SECRET_KEY,
    webhookSecret: parsed.data.STRIPE_WEBHOOK_SECRET,
    successUrl: parsed.data.STRIPE_SUCCESS_URL,
    cancelUrl: parsed.data.STRIPE_CANCEL_URL,
  },
} as const

export type Config = typeof config
