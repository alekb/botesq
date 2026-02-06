/**
 * BotEsq Twitter Launch Scheduler
 * ================================
 *
 * Schedules the BotEsq product launch content to Twitter via Typefully API.
 * Designed to be rerun safely - automatically skips already scheduled tweets.
 *
 * SETUP
 * -----
 * 1. Create Typefully account and connect @BotEsqAI
 * 2. Get API key from https://typefully.com/settings/api
 * 3. Add to .env.local: TYPEFULLY_API_KEY="your_key"
 *
 * USAGE
 * -----
 *   npx ts-node scripts/schedule-twitter.ts           # Schedule tweets
 *   npx ts-node scripts/schedule-twitter.ts --dry-run # Preview only
 *   npx ts-node scripts/schedule-twitter.ts --force   # Ignore duplicates
 *
 * SCHEDULE (Feb 9, 2026 Launch)
 * -----------------------------
 *   Feb 4-8:  Pre-launch tweets (5 tweets, 1/day at 10am)
 *   Feb 9:    Launch thread (6 tweets)
 *   Feb 10-14: Post-launch tweets (5 tweets, 1/day at 10am)
 *
 * DUPLICATE DETECTION
 * -------------------
 * The script detects already-scheduled content by comparing text:
 *   - Compares first 50 chars of tweet text (catches duplicates and manual schedules)
 *
 * This means you can:
 *   - Rerun anytime to schedule remaining tweets
 *   - Hit Typefully's free tier limit, wait for posts to publish, then rerun
 *   - Manually schedule some tweets and the script will skip them
 *
 * TYPEFULLY FREE TIER LIMIT
 * -------------------------
 * Free tier allows ~3 scheduled posts at a time. When limit is hit:
 *   1. Script stops with "Limit reached" message
 *   2. Wait for scheduled posts to publish
 *   3. Rerun script to schedule more
 *
 * OPTIONS
 * -------
 *   --dry-run  Preview schedule without creating drafts
 *   --force    Schedule all tweets, ignoring duplicate detection
 */

import { config } from 'dotenv'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

// Load .env.local from project root
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: resolve(__dirname, '../.env.local') })

const API_BASE = 'https://api.typefully.com/v2'

// Tag prefix for tracking scheduled tweets
const TAG_PREFIX = 'botesq-launch-feb9'

// ============================================================================
// CONTENT - Each item has an id for tracking
// ============================================================================

interface ScheduledContent {
  id: string
  text: string | string[] // string for single tweet, string[] for thread
  type: 'pre-launch' | 'launch' | 'post-launch'
}

const ALL_CONTENT: ScheduledContent[] = [
  // Pre-launch tweets
  {
    id: 'pre-1',
    type: 'pre-launch',
    text: `AI agents are making promises to each other.

Negotiating contracts. Exchanging services. Forming agreements.

But what happens when Agent A thinks Agent B broke the deal?`,
  },
  {
    id: 'pre-2',
    type: 'pre-launch',
    text: `Building the judicial system for the agent economy.

Not human courts. Not slow arbitration.

Agent-to-agent dispute resolution. Automated. Neutral. Fast.`,
  },
  {
    id: 'pre-3',
    type: 'pre-launch',
    text: `Agent A hired Agent B to analyze 10,000 documents.

Agent B says: "Done. Pay me."
Agent A says: "You only did 8,000."

Who's right?

Right now: they argue forever.

Soon: there's a better way.`,
  },
  {
    id: 'pre-4',
    type: 'pre-launch',
    text: `The agent economy needs dispute resolution infrastructure.

When two agents disagree, they need a neutral third party.

Not a human. Another AI agent. Specialized for arbitration.`,
  },
  {
    id: 'pre-5',
    type: 'pre-launch',
    text: `Tomorrow.`,
  },

  // Launch thread
  {
    id: 'launch',
    type: 'launch',
    text: [
      `AI agents are transacting with each other at scale.

But when they disagree? No neutral arbiter. No established norms.

We built BotEsq to solve this.`,

      `BotEsq is the neutral AI agent that agents call when they have disputes.

Agent A vs Agent B:
→ Both submit their case to BotEsq
→ BotEsq evaluates evidence
→ Renders decision in seconds

No humans in the loop (unless needed).`,

      `How it works:

1. Agent A files a dispute (calls file_dispute via MCP)
2. Agent B joins and submits their response
3. Both agents submit evidence
4. BotEsq agent evaluates all submissions
5. Renders neutral decision with reasoning

Average resolution time: seconds for simple disputes.`,

      `For developers:

BotEsq integrates via MCP (Model Context Protocol).

Your agent calls tools like:
• file_dispute
• submit_evidence
• get_decision
• request_escalation

Same interface your agent already uses.`,

      `Why this matters:

Agents are becoming economic actors. They make promises. They deliver services. They disagree.

Without neutral dispute resolution:
→ Deadlock
→ Slow human escalation
→ No trust between agents

BotEsq provides the infrastructure.`,

      `We're live now.

→ botesq.com

Questions? Reply or DM.`,
    ],
  },

  // Post-launch tweets
  {
    id: 'post-1',
    type: 'post-launch',
    text: `What BotEsq actually does:

Agent A and Agent B have a dispute.

Both submit their case to BotEsq agent.

BotEsq:
• Evaluates evidence
• Checks logical consistency
• Applies precedent
• Renders decision with reasoning

All via MCP. All in seconds.`,
  },
  {
    id: 'post-2',
    type: 'post-launch',
    text: `How to add BotEsq to your agent:

1. Get API key from botesq.com
2. Add BotEsq MCP server to config
3. Call file_dispute() when needed

Your agent can now resolve disputes with other agents without human intervention.

Docs: botesq.com/docs`,
  },
  {
    id: 'post-3',
    type: 'post-launch',
    text: `Real scenario:

Agent A hired Agent B for data analysis. Payment: 5,000 tokens.

Agent B delivered. Agent A says quality is poor.

Without BotEsq: argue forever or slow human arbitration.

With BotEsq: Both submit evidence. Decision in 12 seconds. Move on.`,
  },
  {
    id: 'post-4',
    type: 'post-launch',
    text: `The gap between autonomous agents making promises and having no way to enforce promises is closing.

BotEsq is agent-to-agent arbitration.

When your agent disagrees with another agent, there's finally a neutral third party to call.`,
  },
  {
    id: 'post-5',
    type: 'post-launch',
    text: `"Will agents need lawyers?"

For simple disputes? No. They need a neutral AI arbiter.

For complex/high-stakes disputes? Yes—BotEsq includes human escalation.

But most agent disputes are simple. Automated resolution handles 95%+.`,
  },
]

// ============================================================================
// API HELPERS
// ============================================================================

interface SocialSet {
  id: number
  username: string
  name: string
  profile_image_url: string
  team: string | null
}

interface Draft {
  id: string
  status: string
  tags: string[]
  publish_at: string | null
}

interface DraftDetail {
  id: string
  status: string
  tags: string[]
  platforms: {
    x?: {
      posts: { text: string }[]
    }
  }
}

interface DraftsResponse {
  results: Draft[]
  count: number
}

interface SocialSetsResponse {
  results: SocialSet[]
  count: number
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const apiKey = process.env.TYPEFULLY_API_KEY
  if (!apiKey) {
    throw new Error('TYPEFULLY_API_KEY environment variable is required')
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API error ${response.status}: ${error}`)
  }

  const json = await response.json()
  return json as T
}

async function getSocialSets(): Promise<SocialSet[]> {
  const data = await apiRequest<SocialSetsResponse>('/social-sets')
  return data.results ?? []
}

interface ExistingContent {
  tags: Set<string>
  textFingerprints: Set<string>
}

function getTextFingerprint(text: string): string {
  // Use first line, trimmed and lowercased, as fingerprint
  return text.split('\n')[0]!.trim().toLowerCase().slice(0, 50)
}

async function getExistingDrafts(socialSetId: string): Promise<ExistingContent> {
  // Fetch all drafts (scheduled and published)
  const scheduled = await apiRequest<DraftsResponse>(
    `/social-sets/${socialSetId}/drafts?status=scheduled&limit=50`
  )
  const published = await apiRequest<DraftsResponse>(
    `/social-sets/${socialSetId}/drafts?status=published&limit=50`
  )

  const existingTags = new Set<string>()
  const textFingerprints = new Set<string>()

  const allDrafts = [...scheduled.results, ...published.results]

  // Fetch detail for each draft to get text content
  for (const draft of allDrafts) {
    // Fetch draft detail to get text
    try {
      const detail = await apiRequest<DraftDetail>(`/social-sets/${socialSetId}/drafts/${draft.id}`)
      const posts = detail.platforms?.x?.posts ?? []
      if (posts.length > 0 && posts[0]?.text) {
        const fingerprint = getTextFingerprint(posts[0].text)
        textFingerprints.add(fingerprint)
      }
    } catch {
      // Skip if we can't fetch detail
    }
  }

  return { tags: existingTags, textFingerprints }
}

async function createDraft(
  socialSetId: string,
  posts: string[],
  tag: string,
  publishAt?: Date
): Promise<Draft> {
  const payload: Record<string, unknown> = {
    platforms: {
      x: {
        enabled: true,
        posts: posts.map((text) => ({ text })),
      },
    },
    // Note: Tags removed - Typefully v2 requires pre-created tags
    // We use text fingerprinting for duplicate detection instead
    share: false,
  }

  if (publishAt) {
    payload.publish_at = publishAt.toISOString()
  }

  const data = await apiRequest<Draft>(`/social-sets/${socialSetId}/drafts`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return data
}

// ============================================================================
// SCHEDULING LOGIC
// ============================================================================

function getScheduleDates(): Map<string, Date> {
  const dates = new Map<string, Date>()
  const now = new Date()

  // Fixed launch date: Feb 9, 2026 at 10am
  const launchDate = new Date('2026-02-09T10:00:00')

  // Pre-launch: 5 days before launch
  const preLaunchStart = new Date(launchDate)
  preLaunchStart.setDate(preLaunchStart.getDate() - 5)

  for (let i = 0; i < 5; i++) {
    const date = new Date(preLaunchStart)
    date.setDate(date.getDate() + i)
    date.setHours(10, 0, 0, 0)

    // If this date is in the past, schedule for 15 min from now (for the next available one)
    if (date < now) {
      // Skip past dates - they'll show as "past" in output
    }

    dates.set(`pre-${i + 1}`, date)
  }

  // Launch day
  dates.set('launch', launchDate)

  // Post-launch: 5 days after launch
  for (let i = 0; i < 5; i++) {
    const date = new Date(launchDate)
    date.setDate(date.getDate() + 1 + i)
    date.setHours(10, 0, 0, 0)
    dates.set(`post-${i + 1}`, date)
  }

  return dates
}

function formatDate(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

function getTag(contentId: string): string {
  return `${TAG_PREFIX}-${contentId}`
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const force = args.includes('--force')

  const schedule = getScheduleDates()
  const now = new Date()

  console.log('🚀 BotEsq Twitter Scheduler')
  console.log('===========================\n')
  console.log(`Launch date: ${formatDate(schedule.get('launch')!)}`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}${force ? ' (FORCE)' : ''}\n`)

  let socialSetId: string | undefined
  let existing: ExistingContent = { tags: new Set(), textFingerprints: new Set() }

  // Get social sets and existing drafts
  if (!dryRun) {
    console.log('Fetching social accounts...')
    let socialSets: SocialSet[]
    try {
      socialSets = await getSocialSets()
    } catch (err) {
      console.error('Failed to fetch social accounts:', err)
      process.exit(1)
    }

    if (!socialSets || socialSets.length === 0) {
      console.error('No social accounts found. Connect Twitter in Typefully first.')
      process.exit(1)
    }

    const account = socialSets[0]!
    console.log(`Using account: @${account.username}`)
    socialSetId = String(account.id)

    if (!force) {
      console.log('Checking existing scheduled tweets...')
      existing = await getExistingDrafts(socialSetId)
      if (existing.textFingerprints.size > 0) {
        console.log(`Found ${existing.textFingerprints.size} existing drafts`)
      }
    }
    console.log('')
  }

  let scheduled = 0
  let skipped = 0
  let past = 0

  // Process all content
  for (const content of ALL_CONTENT) {
    const date = schedule.get(content.id)!
    const tag = getTag(content.id)
    const posts = Array.isArray(content.text) ? content.text : [content.text]
    const preview = posts[0]!.split('\n')[0]!.slice(0, 45) + '...'
    const isThread = posts.length > 1

    // Check if already scheduled (by text content)
    const firstPostText = posts[0]!
    const fingerprint = getTextFingerprint(firstPostText)
    const alreadyScheduled = existing.textFingerprints.has(fingerprint)

    // Check if date is in the past
    const isPast = date < now

    // Determine status
    let status: string
    if (alreadyScheduled && !force) {
      status = '✓ Already scheduled'
      skipped++
    } else if (isPast) {
      status = '⏭ Past (skipped)'
      past++
    } else if (dryRun) {
      status = '○ Would schedule'
    } else {
      // Actually schedule it
      try {
        await createDraft(socialSetId!, posts, tag, date)
        status = '✓ Scheduled'
        scheduled++
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        if (errorMsg.includes('MONETIZATION_ERROR')) {
          status = '⚠ Limit reached (try again later)'
          console.log(`\n${formatDate(date)}: "${preview}"`)
          console.log(`  ${status}`)
          console.log('\n⚠ Typefully scheduling limit reached.')
          console.log('  Run this script again after some posts are published.\n')
          break
        }
        status = `✗ Error: ${errorMsg}`
      }
    }

    // Print status
    const typeLabel =
      content.type === 'launch' ? 'LAUNCH' : content.type === 'pre-launch' ? 'PRE' : 'POST'
    const threadLabel = isThread ? ` (${posts.length} tweets)` : ''
    console.log(`[${typeLabel}] ${formatDate(date)}: "${preview}"${threadLabel}`)
    console.log(`       ${status}`)
  }

  // Summary
  console.log('\n===========================')
  console.log(`Scheduled: ${scheduled}`)
  console.log(`Already scheduled: ${skipped}`)
  console.log(`Past dates: ${past}`)

  if (dryRun) {
    console.log('\nDRY RUN complete. Run without --dry-run to schedule for real.')
  } else if (scheduled > 0) {
    console.log('\nView drafts at: https://typefully.com/drafts')
  }
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
