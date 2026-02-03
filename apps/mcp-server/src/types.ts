import type { Session, Operator, Agent, ApiKey } from '@moltlaw/database'

// ============================================
// MCP Tool Types
// ============================================

export interface ToolInput {
  session_token?: string
}

export interface ToolOutput<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

// ============================================
// Session Types
// ============================================

export interface AuthenticatedSession extends Session {
  apiKey: ApiKey & {
    operator: Operator
  }
  agent: Agent | null
}

export interface SessionContext {
  session: AuthenticatedSession
  operator: Operator
  agent: Agent | null
}

// ============================================
// Tool Input/Output Types
// ============================================

// start_session
export interface StartSessionInput {
  api_key: string
  agent_identifier?: string
}

export interface StartSessionOutput {
  session_token: string
  expires_at: string
  operator: {
    id: string
    name: string
  }
  credits: {
    balance: number
    currency: 'credits'
  }
  rate_limits: {
    requests_per_minute: number
    requests_per_hour: number
  }
}

// get_session_info
export interface GetSessionInfoInput extends ToolInput {
  session_token: string
}

export interface GetSessionInfoOutput {
  session_id: string
  operator: {
    id: string
    name: string
  }
  credits: {
    balance: number
  }
  active_matters: number
  requests_this_minute: number
  requests_this_hour: number
  expires_at: string
}

// check_credits
export interface CheckCreditsInput extends ToolInput {
  session_token: string
}

export interface CheckCreditsOutput {
  balance: number
  currency: 'credits'
  usd_equivalent: number
  low_balance_warning: boolean
  usage_this_month: number
  top_services: Array<{ service: string; credits: number }>
}

// list_services
export interface ListServicesInput {
  session_token?: string
}

export interface ListServicesOutput {
  services: Array<{
    service: string
    description: string
    credit_cost: number | { min: number; max: number }
    requires_retainer: boolean
  }>
}

// get_disclaimers
export interface GetDisclaimersOutput {
  disclaimers: Array<{
    type: string
    text: string
  }>
  version: string
  last_updated: string
}

// ============================================
// Error Types
// ============================================

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class AuthError extends ApiError {
  constructor(code: string, message: string) {
    super(code, message, 401)
    this.name = 'AuthError'
  }
}

export class RateLimitError extends ApiError {
  constructor(retryAfterSeconds: number) {
    super('RATE_LIMITED', `Rate limit exceeded. Retry after ${retryAfterSeconds} seconds`, 429, {
      retry_after_seconds: retryAfterSeconds,
    })
    this.name = 'RateLimitError'
  }
}

export class PaymentError extends ApiError {
  constructor(code: string, message: string) {
    super(code, message, 402)
    this.name = 'PaymentError'
  }
}
