/**
 * Quick test to verify Typefully API key works
 */

import { config } from 'dotenv'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: resolve(__dirname, '../.env.local') })

const API_BASE = 'https://api.typefully.com/v2'

async function testApiKey() {
  const apiKey = process.env.TYPEFULLY_API_KEY

  if (!apiKey) {
    console.error('❌ TYPEFULLY_API_KEY not found in .env.local')
    process.exit(1)
  }

  console.log('🔑 Testing Typefully API key...\n')
  console.log(`Key: ${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`)

  try {
    const response = await fetch(`${API_BASE}/social-sets`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`\n❌ API key is invalid or expired`)
      console.error(`Status: ${response.status}`)
      console.error(`Error: ${error}`)
      console.log(`\n→ Get a new key at: https://typefully.com/settings/api`)
      process.exit(1)
    }

    const data = await response.json()
    const accounts = data.results || []

    console.log(`\n✅ API key is valid!`)
    console.log(`\nConnected accounts (${accounts.length}):`)

    if (accounts.length === 0) {
      console.log('  (none - connect Twitter at https://typefully.com)')
    } else {
      for (const account of accounts) {
        console.log(`  - @${account.username} (${account.name})`)
      }
    }

    console.log(`\n✅ Ready to schedule tweets!`)
  } catch (err) {
    console.error('\n❌ Network error:', err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

testApiKey()
