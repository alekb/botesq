import pg from 'pg'
import pino from 'pino'
import type { ArbitrationInput } from './resolve-arbitration.service.js'
import type { PrecedentCase, PrecedentProvider, PrecedentResult } from './precedent-provider.js'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

export interface DatabasePrecedentProviderConfig {
  /** PostgreSQL connection string for the precedent database */
  connectionString: string
  /** Human-readable name for this provider (e.g., "NY No-Fault Insurance Awards") */
  name: string
  /**
   * Name of the table containing precedent cases.
   * Must follow the expected schema (see README / migration).
   * @default 'precedent_cases'
   */
  tableName?: string
  /** Maximum number of connections in the pool @default 5 */
  maxPoolSize?: number
  /** Connection timeout in milliseconds @default 5000 */
  connectionTimeoutMs?: number
  /** Query timeout in milliseconds @default 10000 */
  queryTimeoutMs?: number
  /** Enable SSL for the connection @default false */
  ssl?: boolean | pg.TlsOptions
}

/**
 * Expected columns in the precedent database table:
 *
 *   id              TEXT PRIMARY KEY
 *   claim_type      TEXT NOT NULL
 *   summary         TEXT NOT NULL
 *   ruling          TEXT NOT NULL
 *   reasoning       TEXT NOT NULL
 *   key_factors     TEXT[] NOT NULL       -- PostgreSQL text array
 *   metadata        JSONB                 -- optional: date, amount, arbitrator, etc.
 *   created_at      TIMESTAMPTZ DEFAULT NOW()
 *
 * An index on claim_type is recommended for query performance.
 */

interface PrecedentRow {
  id: string
  claim_type: string
  summary: string
  ruling: string
  reasoning: string
  key_factors: string[]
  metadata: Record<string, unknown> | null
}

/**
 * PrecedentProvider backed by a separate PostgreSQL database.
 *
 * Connects to an external database containing historical arbitration awards
 * and retrieves cases matching the dispute's claim type. The external database
 * is completely independent from the main BotEsq application database.
 */
export class DatabasePrecedentProvider implements PrecedentProvider {
  readonly name: string
  private readonly pool: pg.Pool
  private readonly tableName: string
  private readonly queryTimeoutMs: number

  constructor(config: DatabasePrecedentProviderConfig) {
    this.name = config.name
    this.tableName = config.tableName ?? 'precedent_cases'
    this.queryTimeoutMs = config.queryTimeoutMs ?? 10_000

    // Validate table name to prevent SQL injection (allow alphanumeric + underscores only)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(this.tableName)) {
      throw new Error(`Invalid table name: ${this.tableName}`)
    }

    this.pool = new pg.Pool({
      connectionString: config.connectionString,
      max: config.maxPoolSize ?? 5,
      connectionTimeoutMillis: config.connectionTimeoutMs ?? 5_000,
      idleTimeoutMillis: 30_000,
      ssl: config.ssl || undefined,
    })

    this.pool.on('error', (err) => {
      logger.error({ error: err, provider: this.name }, 'Precedent database pool error')
    })
  }

  async findRelevantPrecedent(input: ArbitrationInput, maxResults = 5): Promise<PrecedentResult> {
    const client = await this.pool.connect()
    try {
      // Count corpus size for context
      const countResult = await client.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM ${this.tableName}`
      )
      const corpusSize = parseInt(countResult.rows[0].count, 10)

      // Query precedent cases matching the dispute's claim type.
      // Exact match on claim_type gives the highest relevance.
      // Falls back to all cases ordered by recency if no exact matches.
      const query = `
        SELECT id, claim_type, summary, ruling, reasoning, key_factors, metadata
        FROM ${this.tableName}
        ORDER BY
          CASE WHEN claim_type = $1 THEN 0 ELSE 1 END,
          created_at DESC
        LIMIT $2
      `

      const result = await client.query<PrecedentRow>({
        text: query,
        values: [input.claimType, maxResults],
        queryTimeout: this.queryTimeoutMs,
      })

      const cases: PrecedentCase[] = result.rows.map((row) => ({
        caseId: row.id,
        summary: row.summary,
        claimType: row.claim_type,
        ruling: row.ruling,
        reasoning: row.reasoning,
        keyFactors: row.key_factors,
        // Exact claim_type match gets higher relevance score
        relevanceScore: row.claim_type === input.claimType ? 0.9 : 0.5,
        metadata: row.metadata ?? undefined,
      }))

      logger.info(
        {
          provider: this.name,
          claimType: input.claimType,
          matchCount: cases.length,
          corpusSize,
        },
        'Precedent query completed'
      )

      return { cases, source: this.name, corpusSize }
    } finally {
      client.release()
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const client = await this.pool.connect()
      try {
        await client.query('SELECT 1')
        return true
      } finally {
        client.release()
      }
    } catch {
      logger.warn({ provider: this.name }, 'Precedent database is not available')
      return false
    }
  }

  /**
   * Gracefully shut down the connection pool.
   * Call this during application shutdown.
   */
  async disconnect(): Promise<void> {
    await this.pool.end()
    logger.info({ provider: this.name }, 'Precedent database pool closed')
  }
}
