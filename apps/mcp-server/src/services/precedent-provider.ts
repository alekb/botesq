import type { ArbitrationInput } from './resolve-arbitration.service.js'
import pino from 'pino'

// Re-export the database-backed implementation for convenience
export { DatabasePrecedentProvider } from './database-precedent-provider.js'
export type { DatabasePrecedentProviderConfig } from './database-precedent-provider.js'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

/**
 * A single precedent case retrieved for context during arbitration.
 */
export interface PrecedentCase {
  /** Unique identifier for the precedent case (e.g., AAA case number) */
  caseId: string
  /** Brief summary of the case facts */
  summary: string
  /** The type of claim in the precedent case */
  claimType: string
  /** How the case was decided */
  ruling: string
  /** The arbitrator's reasoning */
  reasoning: string
  /** Key factors that influenced the decision */
  keyFactors: string[]
  /** How relevant this precedent is to the current dispute (0.0-1.0) */
  relevanceScore: number
  /** Optional metadata (date, arbitrator, amount, jurisdiction, etc.) */
  metadata?: Record<string, unknown>
}

/**
 * Result returned by a PrecedentProvider.
 */
export interface PrecedentResult {
  /** Matching precedent cases, ordered by relevance (most relevant first) */
  cases: PrecedentCase[]
  /** Name of the domain/dataset that provided the precedent */
  source: string
  /** Total number of cases in the corpus that were searched */
  corpusSize?: number
}

/**
 * Interface for providing domain-specific precedent to the arbitration engine.
 *
 * Implementations connect the arbitration engine to a corpus of past decisions,
 * enabling precedent-aware rulings. The open-source default (NullPrecedentProvider)
 * returns no precedent. Deployments with proprietary datasets implement this
 * interface to inject domain knowledge.
 */
export interface PrecedentProvider {
  /** Human-readable name of this provider (e.g., "NY No-Fault Insurance Awards") */
  readonly name: string

  /**
   * Retrieve relevant precedent cases for the given arbitration input.
   *
   * @param input - The dispute being arbitrated
   * @param maxResults - Maximum number of precedent cases to return
   * @returns Matching precedent cases ordered by relevance
   */
  findRelevantPrecedent(input: ArbitrationInput, maxResults?: number): Promise<PrecedentResult>

  /**
   * Check if this provider is available and ready to serve precedent.
   */
  isAvailable(): Promise<boolean>
}

/**
 * Default provider that returns no precedent.
 * Used when no domain-specific dataset is configured.
 */
export class NullPrecedentProvider implements PrecedentProvider {
  readonly name = 'none'

  async findRelevantPrecedent(): Promise<PrecedentResult> {
    return { cases: [], source: 'none' }
  }

  async isAvailable(): Promise<boolean> {
    return true
  }
}

// --- Provider Registry ---

let activeProvider: PrecedentProvider = new NullPrecedentProvider()

/**
 * Register a precedent provider to be used by the arbitration engine.
 * Call this at application startup to plug in a domain-specific dataset.
 */
export function registerPrecedentProvider(provider: PrecedentProvider): void {
  logger.info({ provider: provider.name }, 'Registering precedent provider')
  activeProvider = provider
}

/**
 * Get the currently registered precedent provider.
 */
export function getPrecedentProvider(): PrecedentProvider {
  return activeProvider
}

/**
 * Reset to the default NullPrecedentProvider.
 * Primarily useful for testing.
 */
export function resetPrecedentProvider(): void {
  activeProvider = new NullPrecedentProvider()
}

/**
 * Format precedent cases into a prompt section for the arbitration engine.
 * Returns an empty string if no precedent cases are provided.
 */
export function formatPrecedentContext(result: PrecedentResult): string {
  if (result.cases.length === 0) {
    return ''
  }

  const caseBlocks = result.cases.map((c, i) => {
    const metadataLines: string[] = []
    if (c.metadata?.date) metadataLines.push(`  Date: ${c.metadata.date}`)
    if (c.metadata?.amount) metadataLines.push(`  Amount: ${c.metadata.amount}`)
    if (c.metadata?.arbitrator) metadataLines.push(`  Arbitrator: ${c.metadata.arbitrator}`)

    return [
      `Precedent ${i + 1} (${c.caseId}, relevance: ${(c.relevanceScore * 100).toFixed(0)}%):`,
      `  Claim Type: ${c.claimType}`,
      `  Summary: ${c.summary}`,
      `  Ruling: ${c.ruling}`,
      `  Reasoning: ${c.reasoning}`,
      `  Key Factors: ${c.keyFactors.join('; ')}`,
      ...metadataLines,
    ].join('\n')
  })

  const header = `The following ${result.cases.length} past arbitration award(s) from "${result.source}" involve similar fact patterns.`
  const corpusNote = result.corpusSize
    ? ` These were selected from a corpus of ${result.corpusSize.toLocaleString()} awards.`
    : ''

  return (
    '\n\n=== PRECEDENT CONTEXT ===\n' +
    header +
    corpusNote +
    '\nConsider these when rendering your decision. Cite relevant precedent where it informs your reasoning. Where you depart from precedent, explain why.\n\n' +
    caseBlocks.join('\n\n')
  )
}
