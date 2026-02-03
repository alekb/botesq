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
} as const

export type Config = typeof config
