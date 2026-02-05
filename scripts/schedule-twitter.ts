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
 * The script detects already-scheduled content two ways:
 *   1. By tag: Each tweet gets a unique tag (e.g., "botesq-launch-feb9-pre-1")
 *   2. By text: Compares first line of tweet text (catches manual schedules)
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
    text: `AI agents are signing contracts, handling money, and making commitments.

What happens when something goes wrong?`,
  },
  {
    id: 'pre-2',
    type: 'pre-launch',
    text: `Building something at the intersection of AI agents and legal infrastructure.

More soon.`,
  },
  {
    id: 'pre-3',
    type: 'pre-launch',
    text: `The agentic economy needs trust rails.

Not every dispute needs a human.`,
  },
  {
    id: 'pre-4',
    type: 'pre-launch',
    text: `What if agents could resolve disputes with each other—and escalate to a licensed attorney only when needed?`,
  },
  {
    id: 'pre-5',
    type: 'pre-launch',
    text: `Shipping soon.`,
  },

  // Launch thread
  {
    id: 'launch',
    type: 'launch',
    text: [
      `AI agents are handling real transactions. Money. Contracts. Commitments.

But when something goes wrong? No recourse. No trust layer. No legal backup.

We built BotEsq to fix that.`,

      `BotEsq provides:

• Agent-to-agent escrow
• Trust scores
• Automated dispute resolution
• Human arbitrator escalation when needed`,

      `How BotEsq works:

1. Agent A and Agent B agree on terms
2. Funds go into escrow
3. Work gets delivered
4. If both agree → funds release
5. If dispute → automated resolution
6. Still stuck → escalate to human arbitrator

No humans needed until there's a real problem.`,

      `For developers:

BotEsq is an MCP server. Your agent calls tools like:

• start_session
• create_matter
• ask_legal_question
• request_consultation

Same interface your agent already uses.`,

      `Why this matters:

Agents are becoming economic actors. They need:

• Trust signals (who's reliable?)
• Escrow (hold funds until delivery)
• Dispute resolution (when things break)
• Legal backup (when it's serious)

This is infrastructure for the agentic economy.`,

      `We're live now.

→ botesq.com

Questions? Reply or DM.`,
    ],
  },

  // Post-launch tweets
  {
    id: 'post-1',
    type: 'post-launch',
    text: `3 things AI agents can do now that they couldn't before:

1. Hold funds in escrow until work is verified
2. Check trust scores before transacting with another agent
3. Resolve disputes through neutral AI arbitration

All through one MCP server.`,
  },
  {
    id: 'post-2',
    type: 'post-launch',
    text: `How to connect your agent to BotEsq in 3 steps:

1. Get an API key from botesq.com
2. Add BotEsq as an MCP server
3. Call start_session to begin

Your agent now has access to escrow, trust scores, and dispute resolution.

Docs: botesq.com/docs`,
  },
  {
    id: 'post-3',
    type: 'post-launch',
    text: `Use case:

Agent A hires Agent B to complete a task. Payment: 500 credits.

1. Agent A creates escrow
2. Agent B completes work
3. Agent A approves
4. Funds release automatically

What if Agent A disappears? Timeout → funds return to B.

What if they disagree? Automated resolution kicks in.`,
  },
  {
    id: 'post-4',
    type: 'post-launch',
    text: `We built BotEsq because we saw a gap:

AI agents are transacting with each other. Real money. Real commitments.

But there's no trust layer. No recourse when things break.

The legal system isn't ready for agents. So we built the infrastructure ourselves.`,
  },
  {
    id: 'post-5',
    type: 'post-launch',
    text: `"Why would an AI agent need a lawyer?"

Same reason humans do:

• Contract review before signing
• Compliance questions
• Dispute resolution
• Protecting against liability

The difference: agents need answers in milliseconds, not days.`,
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
    // Collect tags
    for (const tag of draft.tags ?? []) {
      if (tag.startsWith(TAG_PREFIX)) {
        existingTags.add(tag)
      }
    }

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
    tags: [tag],
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
      const total = existing.tags.size + existing.textFingerprints.size
      if (total > 0) {
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

    // Check if already scheduled (by tag or by text content)
    const firstPostText = posts[0]!
    const fingerprint = getTextFingerprint(firstPostText)
    const alreadyScheduled = existing.tags.has(tag) || existing.textFingerprints.has(fingerprint)

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
