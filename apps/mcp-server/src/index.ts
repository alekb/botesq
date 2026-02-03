import { config } from './config.js'
import { runServer } from './server.js'
import pino from 'pino'

const logger = pino({
  level: config.env === 'production' ? 'info' : 'debug',
})

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
