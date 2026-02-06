/**
 * List ALL drafts in Typefully (scheduled, published, etc)
 */

import { config } from 'dotenv'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: resolve(__dirname, '../.env.local') })

const API_BASE = 'https://api.typefully.com/v2'

interface Draft {
  id: string
  status: string
  publish_at: string | null
  created_at: string
}

interface DraftDetail {
  id: string
  status: string
  publish_at: string | null
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

async function apiRequest<T>(endpoint: string): Promise<T> {
  const apiKey = process.env.TYPEFULLY_API_KEY
  if (!apiKey) {
    throw new Error('TYPEFULLY_API_KEY not found')
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API error ${response.status}: ${error}`)
  }

  return (await response.json()) as T
}

async function listAllDrafts() {
  console.log('📋 Fetching ALL drafts from Typefully...\n')

  // Get social sets
  const socialSetsResponse = await apiRequest<{ results: { id: number; username: string }[] }>(
    '/social-sets'
  )
  const socialSet = socialSetsResponse.results[0]
  if (!socialSet) {
    console.log('No social accounts found')
    return
  }

  console.log(`Account: @${socialSet.username}\n`)

  // Get drafts by status
  const statuses = ['scheduled', 'draft', 'published']
  let totalCount = 0

  for (const status of statuses) {
    const draftsResponse = await apiRequest<DraftsResponse>(
      `/social-sets/${socialSet.id}/drafts?status=${status}&limit=50`
    )

    if (draftsResponse.results.length === 0) {
      console.log(`${status.toUpperCase()}: None`)
      continue
    }

    console.log(`\n${'='.repeat(80)}`)
    console.log(`${status.toUpperCase()}: ${draftsResponse.results.length} draft(s)`)
    console.log('='.repeat(80))

    totalCount += draftsResponse.results.length

    // Fetch details for each draft
    for (let i = 0; i < draftsResponse.results.length; i++) {
      const draft = draftsResponse.results[i]!
      const detail = await apiRequest<DraftDetail>(
        `/social-sets/${socialSet.id}/drafts/${draft.id}`
      )

      const posts = detail.platforms?.x?.posts ?? []
      const isThread = posts.length > 1
      const firstPost = posts[0]?.text ?? '(no content)'
      const preview = firstPost.split('\n')[0]!.slice(0, 60)

      const publishDate = draft.publish_at
        ? new Date(draft.publish_at).toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'short',
          })
        : 'No date set'

      console.log(`\n${i + 1}. ${publishDate}`)
      console.log(`   ${isThread ? `Thread (${posts.length} tweets)` : 'Single tweet'}`)
      console.log(`   "${preview}${firstPost.length > 60 ? '...' : ''}"`)
      console.log(`   Draft ID: ${draft.id}`)
    }
  }

  console.log(`\n${'='.repeat(80)}`)
  console.log(`\nTotal drafts: ${totalCount}`)
  console.log(`\n💡 View/edit at: https://typefully.com/drafts`)
}

listAllDrafts().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
