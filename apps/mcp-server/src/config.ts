import { validateEnv } from '@botesq/shared'

// Fails fast at import time with a clear report of what's missing/invalid.
const env = validateEnv()

export const config = {
  env: env.NODE_ENV,
  port: env.MCP_PORT,
  databaseUrl: env.DATABASE_URL,
  logLevel: env.LOG_LEVEL,

  session: {
    ttlHours: env.SESSION_TTL_HOURS,
  },

  rateLimit: {
    requestsPerMinute: env.RATE_LIMIT_REQUESTS_PER_MINUTE,
    requestsPerHour: env.RATE_LIMIT_REQUESTS_PER_HOUR,
  },

  openai: {
    apiKey: env.OPENAI_API_KEY,
  },

  aws: {
    region: env.AWS_REGION,
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    s3Bucket: env.S3_BUCKET,
  },

  stripe: {
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    successUrl: env.STRIPE_SUCCESS_URL,
    cancelUrl: env.STRIPE_CANCEL_URL,
  },

  s3PresignedUrlExpiry: env.S3_PRESIGNED_URL_EXPIRY,
} as const

export type Config = typeof config
