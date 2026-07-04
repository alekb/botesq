import pino from 'pino'
import { config } from './config.js'

// The MCP server speaks its protocol over stdio (stdout). Logs MUST go to
// stderr or they corrupt the protocol stream. A single shared instance also
// keeps the log level consistent across the codebase. Level honors the
// documented LOG_LEVEL env var (default 'info'); sensitive tool args are
// redacted regardless of level (see redact.ts).
export const logger = pino({ level: config.logLevel }, pino.destination(2))
