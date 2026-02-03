import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { tools, executeTool } from './tools/index.js'
import { ApiError, AuthError, RateLimitError } from './types.js'
import pino from 'pino'

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
})

export function createServer() {
  const server = new Server(
    {
      name: 'moltlaw-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
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

  // Execute a tool
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    logger.debug({ tool: name, args }, 'Executing tool')

    try {
      const result = await executeTool(name, args)

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      }
    } catch (error) {
      logger.error({ tool: name, error }, 'Tool execution failed')

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

export async function runServer() {
  const server = createServer()
  const transport = new StdioServerTransport()

  logger.info('Starting MoltLaw MCP Server')

  await server.connect(transport)

  logger.info('MoltLaw MCP Server running on stdio')
}
