import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApiError } from '../types.js'

// Store original config
const mockConfig = {
  env: 'test',
  openai: {
    apiKey: undefined as string | undefined,
  },
}

// Mock config
vi.mock('../config.js', () => ({
  config: mockConfig,
}))

// Mock OpenAI
const mockCreate = vi.fn()

class MockAPIError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'APIError'
    this.status = status
  }
}

class MockOpenAI {
  chat = {
    completions: {
      create: mockCreate,
    },
  }
  static APIError = MockAPIError
}

vi.mock('openai', () => ({
  default: MockOpenAI,
  OpenAI: MockOpenAI,
}))

describe('llm.service', () => {
  beforeEach(() => {
    vi.resetModules()
    mockCreate.mockReset()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('isLLMAvailable', () => {
    it('should return false when API key is not set', async () => {
      mockConfig.openai.apiKey = undefined
      const { isLLMAvailable } = await import('../services/llm.service.js')

      expect(isLLMAvailable()).toBe(false)
    })

    it('should return true when API key is set', async () => {
      mockConfig.openai.apiKey = 'test-api-key'
      const { isLLMAvailable } = await import('../services/llm.service.js')

      expect(isLLMAvailable()).toBe(true)
    })
  })

  describe('getOpenAIClient', () => {
    it('should throw ApiError when API key is not configured', async () => {
      mockConfig.openai.apiKey = undefined
      const { getOpenAIClient } = await import('../services/llm.service.js')

      expect(() => getOpenAIClient()).toThrow('OpenAI API key not configured')

      try {
        getOpenAIClient()
        expect.fail('Should have thrown')
      } catch (error) {
        expect((error as Error).name).toBe('ApiError')
        expect((error as ApiError).code).toBe('LLM_NOT_CONFIGURED')
        expect((error as ApiError).statusCode).toBe(503)
      }
    })

    it('should return OpenAI client when API key is configured', async () => {
      mockConfig.openai.apiKey = 'test-api-key'
      vi.resetModules()
      const { getOpenAIClient } = await import('../services/llm.service.js')

      const client = getOpenAIClient()
      expect(client).toBeDefined()
      expect(client.chat.completions.create).toBeDefined()
    })

    it('should return same client instance on subsequent calls', async () => {
      mockConfig.openai.apiKey = 'test-api-key'
      vi.resetModules()
      const { getOpenAIClient } = await import('../services/llm.service.js')

      const client1 = getOpenAIClient()
      const client2 = getOpenAIClient()
      expect(client1).toBe(client2)
    })
  })

  describe('chatCompletion', () => {
    beforeEach(() => {
      mockConfig.openai.apiKey = 'test-api-key'
    })

    it('should return formatted response on success', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: { content: 'Test response' },
            finish_reason: 'stop',
          },
        ],
        model: 'gpt-4-turbo',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      })

      vi.resetModules()
      const { chatCompletion } = await import('../services/llm.service.js')

      const result = await chatCompletion([{ role: 'user', content: 'Hello' }])

      expect(result.content).toBe('Test response')
      expect(result.model).toBe('gpt-4-turbo')
      expect(result.usage.totalTokens).toBe(15)
      expect(result.finishReason).toBe('stop')
    })

    it('should use default options when not specified', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'Test' }, finish_reason: 'stop' }],
        model: 'gpt-4-turbo',
        usage: { total_tokens: 10 },
      })

      vi.resetModules()
      const { chatCompletion } = await import('../services/llm.service.js')

      await chatCompletion([{ role: 'user', content: 'Hello' }])

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4-turbo',
          temperature: 0.3,
          max_tokens: 2048,
        }),
        expect.any(Object)
      )
    })

    it('should use custom options when specified', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'Test' }, finish_reason: 'stop' }],
        model: 'gpt-3.5-turbo',
        usage: { total_tokens: 10 },
      })

      vi.resetModules()
      const { chatCompletion } = await import('../services/llm.service.js')

      await chatCompletion([{ role: 'user', content: 'Hello' }], {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 1000,
      })

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          max_tokens: 1000,
        }),
        expect.any(Object)
      )
    })

    it('should throw ApiError for empty response', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: null }, finish_reason: 'stop' }],
        model: 'gpt-4-turbo',
        usage: { total_tokens: 10 },
      })

      vi.resetModules()
      const { chatCompletion } = await import('../services/llm.service.js')

      try {
        await chatCompletion([{ role: 'user', content: 'Hello' }])
        expect.fail('Should have thrown')
      } catch (error) {
        expect((error as Error).message).toBe('LLM returned empty response')
        expect((error as ApiError).code).toBe('LLM_EMPTY_RESPONSE')
      }
    })

    it('should handle missing usage data gracefully', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'Test' }, finish_reason: 'stop' }],
        model: 'gpt-4-turbo',
        usage: undefined,
      })

      vi.resetModules()
      const { chatCompletion } = await import('../services/llm.service.js')

      const result = await chatCompletion([{ role: 'user', content: 'Hello' }])

      expect(result.usage.promptTokens).toBe(0)
      expect(result.usage.completionTokens).toBe(0)
      expect(result.usage.totalTokens).toBe(0)
    })

    it('should handle missing finish_reason gracefully', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'Test' } }],
        model: 'gpt-4-turbo',
        usage: { total_tokens: 10 },
      })

      vi.resetModules()
      const { chatCompletion } = await import('../services/llm.service.js')

      const result = await chatCompletion([{ role: 'user', content: 'Hello' }])

      expect(result.finishReason).toBe('unknown')
    })
  })

  describe('ChatMessage type', () => {
    it('should accept valid message roles', async () => {
      mockConfig.openai.apiKey = 'test-api-key'
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'Test' }, finish_reason: 'stop' }],
        model: 'gpt-4-turbo',
        usage: { total_tokens: 10 },
      })

      vi.resetModules()
      const { chatCompletion } = await import('../services/llm.service.js')

      // Should accept all valid roles
      await expect(
        chatCompletion([
          { role: 'system', content: 'You are helpful' },
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
        ])
      ).resolves.toBeDefined()
    })
  })
})
