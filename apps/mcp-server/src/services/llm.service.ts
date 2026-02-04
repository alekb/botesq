import OpenAI from 'openai'
import { config } from '../config.js'
import { ApiError } from '../types.js'
import pino from 'pino'

const logger = pino({ level: config.env === 'production' ? 'info' : 'debug' })

let openaiClient: OpenAI | null = null

/**
 * Get or create OpenAI client
 */
export function getOpenAIClient(): OpenAI {
  if (!config.openai.apiKey) {
    throw new ApiError('LLM_NOT_CONFIGURED', 'OpenAI API key not configured', 503)
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: config.openai.apiKey,
    })
  }

  return openaiClient
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMResponse {
  content: string
  model: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  finishReason: string
}

/**
 * Send a chat completion request to OpenAI
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: {
    model?: string
    temperature?: number
    maxTokens?: number
    timeoutMs?: number
  } = {}
): Promise<LLMResponse> {
  const client = getOpenAIClient()

  const { model = 'gpt-4-turbo', temperature = 0.3, maxTokens = 2048, timeoutMs = 30000 } = options

  logger.debug({ model, messageCount: messages.length }, 'Sending chat completion request')

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    const response = await client.chat.completions.create(
      {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      },
      { signal: controller.signal }
    )

    clearTimeout(timeout)

    const choice = response.choices[0]
    if (!choice?.message?.content) {
      throw new ApiError('LLM_EMPTY_RESPONSE', 'LLM returned empty response', 500)
    }

    logger.debug(
      {
        model: response.model,
        tokens: response.usage?.total_tokens,
        finishReason: choice.finish_reason,
      },
      'Chat completion successful'
    )

    return {
      content: choice.message.content,
      model: response.model,
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
      finishReason: choice.finish_reason ?? 'unknown',
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('LLM_TIMEOUT', 'LLM request timed out', 504)
    }

    if (error instanceof OpenAI.APIError) {
      logger.error({ error: error.message, status: error.status }, 'OpenAI API error')

      if (error.status === 429) {
        throw new ApiError('LLM_RATE_LIMITED', 'LLM rate limit exceeded', 429)
      }

      throw new ApiError('LLM_ERROR', `LLM error: ${error.message}`, 502)
    }

    throw error
  }
}

/**
 * Check if LLM is available
 */
export function isLLMAvailable(): boolean {
  return !!config.openai.apiKey
}
