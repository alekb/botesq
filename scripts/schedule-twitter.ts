/**
 * Schedule BotEsq Twitter content via Typefully API
 *
 * Usage:
 *   1. Get your API key from https://typefully.com/settings/api
 *   2. Add TYPEFULLY_API_KEY to .env.local
 *   3. Run: npx ts-node scripts/schedule-twitter.ts
 *
 * Options:
 *   --dry-run    Preview what would be scheduled without actually creating drafts
 *   --launch     Set launch date (ISO format, e.g., 2026-02-15)
 *   --start-now  Start pre-launch tweets today, calculate launch date automatically
 *
 * Default: --start-now (begins posting today)
 */

import { config } from 'dotenv'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

// Load .env.local from project root
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: resolve(__dirname, '../.env.local') })

const API_BASE = 'https://api.typefully.com/v2'

// ============================================================================
// CONTENT
// ============================================================================

const PRE_LAUNCH_TWEETS = [
  `AI agents are signing contracts, handling money, and making commitments.

What happens when something goes wrong?`,

  `Building something at the intersection of AI agents and legal infrastructure.

More soon.`,

  `The agentic economy needs trust rails.

Not every dispute needs a human.`,

  `What if agents could resolve disputes with each other—and escalate to a licensed attorney only when needed?`,

  `Shipping soon.`,
]

const LAUNCH_THREAD = [
  `AI agents are handling real transactions. Money. Contracts. Commitments.

But when something goes wrong? No recourse. No trust layer. No legal backup.

We built BotEsq to fix that.`,

  `BotEsq has two products:

BotEsq Resolve (free)
Agent-to-agent escrow, trust scores, and automated dispute resolution.

BotEsq Legal (paid)
Licensed attorneys available via API. Legal Q&A, document review, consultations.`,

  `How Resolve works:

1. Agent A and Agent B agree on terms
2. Funds go into escrow
3. Work gets delivered
4. If both agree → funds release
5. If dispute → automated resolution
6. Still stuck → escalate to attorney

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
]

const POST_LAUNCH_TWEETS = [
  `3 things AI agents can do now that they couldn't before:

1. Hold funds in escrow until work is verified
2. Check trust scores before transacting with another agent
3. Get legal answers from licensed attorneys via API

All through one MCP server.`,

  `How to connect your agent to BotEsq in 3 steps:

1. Get an API key from botesq.com
2. Add BotEsq as an MCP server
3. Call start_session to begin

Your agent now has access to escrow, dispute resolution, and legal services.

Docs: botesq.com/docs`,

  `Use case:

Agent A hires Agent B to complete a task. Payment: 500 credits.

1. Agent A creates escrow
2. Agent B completes work
3. Agent A approves
4. Funds release automatically

What if Agent A disappears? Timeout → funds return to B.

What if they disagree? Automated resolution kicks in.`,

  `We built BotEsq because we saw a gap:

AI agents are transacting with each other. Real money. Real commitments.

But there's no trust layer. No recourse when things break.

The legal system isn't ready for agents. So we built the infrastructure ourselves.`,

  `"Why would an AI agent need a lawyer?"

Same reason humans do:

• Contract review before signing
• Compliance questions
• Dispute resolution
• Protecting against liability

The difference: agents need answers in milliseconds, not days.`,
]

// ============================================================================
// API HELPERS
// ============================================================================

interface SocialSet {
  id: string
  name: string
  platforms: { platform: string; username: string }[]
}

interface Draft {
  id: string
  status: string
  publish_at: string | null
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

  return response.json()
}

async function getSocialSets(): Promise<SocialSet[]> {
  const data = await apiRequest<{ data: SocialSet[] }>('/social-sets')
  return data.data
}

async function createDraft(socialSetId: string, posts: string[], publishAt?: Date): Promise<Draft> {
  const payload: Record<string, unknown> = {
    platforms: {
      x: {
        enabled: true,
        posts: posts.map((text) => ({ text })),
      },
    },
    share: false,
  }

  if (publishAt) {
    payload.publish_at = publishAt.toISOString()
  }

  const data = await apiRequest<{ data: Draft }>(`/social-sets/${socialSetId}/drafts`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return data.data
}

// ============================================================================
// SCHEDULING LOGIC
// ============================================================================

function getScheduleDatesFromLaunch(launchDate: Date): {
  preLaunch: Date[]
  launch: Date
  postLaunch: Date[]
} {
  const preLaunch: Date[] = []
  const postLaunch: Date[] = []

  // Pre-launch: 5 days before, one tweet per day at 10am
  for (let i = 5; i >= 1; i--) {
    const date = new Date(launchDate)
    date.setDate(date.getDate() - i)
    date.setHours(10, 0, 0, 0)
    preLaunch.push(date)
  }

  // Launch: 10am on launch day
  const launch = new Date(launchDate)
  launch.setHours(10, 0, 0, 0)

  // Post-launch: 5 days after, one tweet per day at 10am
  for (let i = 1; i <= 5; i++) {
    const date = new Date(launchDate)
    date.setDate(date.getDate() + i)
    date.setHours(10, 0, 0, 0)
    postLaunch.push(date)
  }

  return { preLaunch, launch, postLaunch }
}

function getScheduleDatesStartingNow(): {
  preLaunch: Date[]
  launch: Date
  postLaunch: Date[]
} {
  const preLaunch: Date[] = []
  const postLaunch: Date[] = []
  const now = new Date()

  // Pre-launch: Start today, 5 tweets over 5 days at 10am
  // If it's past 10am today, first tweet goes out at 2pm today
  for (let i = 0; i < 5; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() + i)

    if (i === 0 && now.getHours() >= 10) {
      // First tweet today but it's past 10am, schedule for 2pm
      date.setHours(14, 0, 0, 0)
    } else {
      date.setHours(10, 0, 0, 0)
    }
    preLaunch.push(date)
  }

  // Launch: Day 6 (after 5 pre-launch days) at 10am
  const launch = new Date(now)
  launch.setDate(launch.getDate() + 5)
  launch.setHours(10, 0, 0, 0)

  // Post-launch: 5 days after launch, one tweet per day at 10am
  for (let i = 1; i <= 5; i++) {
    const date = new Date(launch)
    date.setDate(date.getDate() + i)
    date.setHours(10, 0, 0, 0)
    postLaunch.push(date)
  }

  return { preLaunch, launch, postLaunch }
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

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  // Parse launch date or start-now mode
  const launchArg = args.find((a) => a.startsWith('--launch='))
  let schedule: { preLaunch: Date[]; launch: Date; postLaunch: Date[] }
  let scheduleMode: string

  if (launchArg) {
    const launchDateStr = launchArg.split('=')[1] ?? ''
    const launchDate = new Date(launchDateStr)
    if (isNaN(launchDate.getTime())) {
      console.error('Invalid launch date. Use ISO format: --launch=2026-02-15')
      process.exit(1)
    }
    schedule = getScheduleDatesFromLaunch(launchDate)
    scheduleMode = 'from launch date'
  } else {
    // Default: start now, calculate launch date
    schedule = getScheduleDatesStartingNow()
    scheduleMode = 'starting today'
  }

  console.log('🚀 BotEsq Twitter Scheduler')
  console.log('===========================\n')
  console.log(`Schedule: ${scheduleMode}`)
  console.log(`First tweet: ${formatDate(schedule.preLaunch[0]!)}`)
  console.log(`Launch thread: ${formatDate(schedule.launch)}`)
  console.log(`Last tweet: ${formatDate(schedule.postLaunch[schedule.postLaunch.length - 1]!)}`)
  console.log(`Mode: ${dryRun ? 'DRY RUN (no drafts will be created)' : 'LIVE'}\n`)

  let socialSetId: string | undefined

  // Get social sets
  if (!dryRun) {
    console.log('Fetching social accounts...')
    const socialSets = await getSocialSets()

    if (socialSets.length === 0) {
      console.error('No social accounts found. Connect Twitter in Typefully first.')
      process.exit(1)
    }

    // Find Twitter account
    const twitterSet = socialSets.find((s) =>
      s.platforms.some((p) => p.platform === 'x' || p.platform === 'twitter')
    )

    if (!twitterSet) {
      console.error('No Twitter/X account found. Available accounts:')
      socialSets.forEach((s) =>
        console.log(`  - ${s.name}: ${s.platforms.map((p) => p.platform).join(', ')}`)
      )
      process.exit(1)
    }

    const twitterPlatform = twitterSet.platforms.find(
      (p) => p.platform === 'x' || p.platform === 'twitter'
    )
    console.log(`Using account: @${twitterPlatform?.username}\n`)

    socialSetId = twitterSet.id
  }

  // Schedule pre-launch tweets
  console.log('PRE-LAUNCH TWEETS')
  console.log('-----------------')
  for (let i = 0; i < PRE_LAUNCH_TWEETS.length; i++) {
    const date = schedule.preLaunch[i]!
    const tweet = PRE_LAUNCH_TWEETS[i]!
    const preview = tweet.split('\n')[0]!.slice(0, 50) + '...'
    console.log(`${formatDate(date)}: "${preview}"`)

    if (!dryRun && socialSetId) {
      await createDraft(socialSetId, [tweet], date)
      console.log('  ✓ Scheduled')
    }
  }

  // Schedule launch thread
  console.log('\nLAUNCH THREAD')
  console.log('-------------')
  console.log(`${formatDate(schedule.launch)}: Thread with ${LAUNCH_THREAD.length} tweets`)
  LAUNCH_THREAD.forEach((tweet, i) => {
    const preview = tweet.split('\n')[0]!.slice(0, 40) + '...'
    console.log(`  ${i + 1}. "${preview}"`)
  })

  if (!dryRun && socialSetId) {
    await createDraft(socialSetId, LAUNCH_THREAD, schedule.launch)
    console.log('  ✓ Scheduled')
  }

  // Schedule post-launch tweets
  console.log('\nPOST-LAUNCH TWEETS')
  console.log('------------------')
  for (let i = 0; i < POST_LAUNCH_TWEETS.length; i++) {
    const date = schedule.postLaunch[i]!
    const tweet = POST_LAUNCH_TWEETS[i]!
    const preview = tweet.split('\n')[0]!.slice(0, 50) + '...'
    console.log(`${formatDate(date)}: "${preview}"`)

    if (!dryRun && socialSetId) {
      await createDraft(socialSetId, [tweet], date)
      console.log('  ✓ Scheduled')
    }
  }

  console.log('\n===========================')
  if (dryRun) {
    console.log('DRY RUN complete. Run without --dry-run to schedule for real.')
  } else {
    console.log('✅ All content scheduled!')
    console.log('View drafts at: https://typefully.com/drafts')
  }
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
