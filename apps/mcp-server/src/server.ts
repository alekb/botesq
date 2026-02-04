import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import Fastify from 'fastify'
import { tools, executeTool } from './tools/index.js'
import { prompts, buildPrompt } from './prompts/index.js'
import { ApiError, AuthError, RateLimitError } from './types.js'
import { logger, generateCorrelationId, logToolExecution } from './lib/logger.js'
import { registerHealthRoutes } from './routes/health.js'
import { config } from './config.js'

export function createServer() {
  const server = new Server(
    {
      name: 'botesq-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
        prompts: {},
      },
    }
  )

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    }
  })

  // List available prompts
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: prompts.map((prompt) => ({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments,
      })),
    }
  })

  // Get a specific prompt
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    const promptContent = buildPrompt(name, args ?? {})

    if (!promptContent) {
      throw new ApiError('UNKNOWN_PROMPT', `Unknown prompt: ${name}`, 400)
    }

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: promptContent,
          },
        },
      ],
    }
  })

  // Execute a tool
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    const correlationId = generateCorrelationId()
    const startTime = Date.now()

    logger.debug({ tool: name, correlationId }, 'Executing tool')

    try {
      const result = await executeTool(name, args)
      const duration = Date.now() - startTime

      logToolExecution(correlationId, name, duration, true)

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      }
    } catch (error) {
      const duration = Date.now() - startTime
      const errorCode = error instanceof ApiError ? error.code : 'INTERNAL_ERROR'

      logToolExecution(correlationId, name, duration, false, errorCode)
      logger.error({ tool: name, error, correlationId }, 'Tool execution failed')

      if (error instanceof AuthError) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: {
                  code: error.code,
                  message: error.message,
                },
              }),
            },
          ],
          isError: true,
        }
      }

      if (error instanceof RateLimitError) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: {
                  code: error.code,
                  message: error.message,
                  details: error.details,
                },
              }),
            },
          ],
          isError: true,
        }
      }

      if (error instanceof ApiError) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: {
                  code: error.code,
                  message: error.message,
                  details: error.details,
                },
              }),
            },
          ],
          isError: true,
        }
      }

      // Unknown error
      const message = error instanceof Error ? error.message : 'Unknown error'
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: {
                code: 'INTERNAL_ERROR',
                message,
              },
            }),
          },
        ],
        isError: true,
      }
    }
  })

  return server
}

/**
 * Create and start the HTTP health check server
 */
export async function createHealthServer() {
  const app = Fastify({
    logger: false, // We use our own logger
  })

  // Register health check routes
  registerHealthRoutes(app)

  // Start the HTTP server
  const port = config.port
  await app.listen({ port, host: '0.0.0.0' })

  logger.info({ port }, `Health check server listening on port ${port}`)

  return app
}

export async function runServer() {
  const server = createServer()
  const transport = new StdioServerTransport()

  logger.info('Starting BotEsq MCP Server')

  // Start health check HTTP server in parallel
  const healthServer = await createHealthServer()

  await server.connect(transport)

  logger.info('BotEsq MCP Server running on stdio')

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...')
    await healthServer.close()
    process.exit(0)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}
