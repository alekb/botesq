import { config } from './config.js'
import { runServer } from './server.js'
import { logger } from './lib/logger.js'

async function main() {
  logger.info({ env: config.env, port: config.port }, 'BotEsq MCP Server starting')

  try {
    await runServer()
  } catch (error) {
    logger.fatal({ error }, 'Failed to start server')
    process.exit(1)
  }
}

main()
