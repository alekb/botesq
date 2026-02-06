/**
 * Check character counts for all tweets
 */

const tweets = [
  {
    id: 'Feb 7 - Pre-launch 4',
    text: `The agent economy needs dispute resolution infrastructure.

When two agents disagree, they need a neutral third party.

Not a human. Another AI agent. Specialized for arbitration.`,
  },
  {
    id: 'Feb 8 - Pre-launch 5',
    text: `Tomorrow.`,
  },
  {
    id: 'Launch Thread 1/6',
    text: `AI agents are transacting with each other at scale.

But when they disagree? No neutral arbiter. No established norms.

We built BotEsq to solve this.`,
  },
  {
    id: 'Launch Thread 2/6',
    text: `BotEsq is the neutral AI agent that agents call when they have disputes.

Agent A vs Agent B:
→ Both submit their case to BotEsq
→ BotEsq evaluates evidence
→ Renders decision in seconds

No humans in the loop (unless needed).`,
  },
  {
    id: 'Launch Thread 3/6',
    text: `How it works:

1. Agent A files a dispute (calls file_dispute via MCP)
2. Agent B joins and submits their response
3. Both agents submit evidence
4. BotEsq agent evaluates all submissions
5. Renders neutral decision with reasoning

Average resolution time: seconds for simple disputes.`,
  },
  {
    id: 'Launch Thread 4/6',
    text: `For developers:

BotEsq integrates via MCP (Model Context Protocol).

Your agent calls tools like:
• file_dispute
• submit_evidence
• get_decision
• request_escalation

Same interface your agent already uses.`,
  },
  {
    id: 'Launch Thread 5/6',
    text: `Why this matters:

Agents are becoming economic actors. They make promises. They deliver services. They disagree.

Without neutral dispute resolution:
→ Deadlock
→ Slow human escalation
→ No trust between agents

BotEsq provides the infrastructure.`,
  },
  {
    id: 'Launch Thread 6/6',
    text: `We're live now.

→ botesq.com

Questions? Reply or DM.`,
  },
  {
    id: 'Feb 10 - Post-launch 1',
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
    id: 'Feb 11 - Post-launch 2',
    text: `How to add BotEsq to your agent:

1. Get API key from botesq.com
2. Add BotEsq MCP server to config
3. Call file_dispute() when needed

Your agent can now resolve disputes with other agents without human intervention.

Docs: botesq.com/docs`,
  },
  {
    id: 'Feb 12 - Post-launch 3',
    text: `Real scenario:

Agent A hired Agent B for data analysis. Payment: 5,000 tokens.

Agent B delivered. Agent A says quality is poor.

Without BotEsq: argue forever or slow human arbitration.

With BotEsq: Both submit evidence. Decision in 12 seconds. Move on.`,
  },
  {
    id: 'Feb 13 - Post-launch 4',
    text: `The gap between autonomous agents making promises and having no way to enforce promises is closing.

BotEsq is agent-to-agent arbitration.

When your agent disagrees with another agent, there's finally a neutral third party to call.`,
  },
  {
    id: 'Feb 14 - Post-launch 5',
    text: `"Will agents need lawyers?"

For simple disputes? No. They need a neutral AI arbiter.

For complex/high-stakes disputes? Yes—BotEsq includes human escalation.

But most agent disputes are simple. Automated resolution handles 95%+.`,
  },
]

console.log('🐦 Tweet Character Count Check')
console.log('================================\n')
console.log('X (Twitter) limit: 280 characters\n')

let allGood = true

for (const tweet of tweets) {
  const length = tweet.text.length
  const status = length <= 280 ? '✅' : '❌ TOO LONG'
  const indicator = length > 280 ? ' ⚠️' : length > 250 ? ' ⚡' : ''

  console.log(`${status} ${tweet.id}`)
  console.log(`   ${length}/280 chars${indicator}`)

  if (length > 280) {
    allGood = false
    const overflow = length - 280
    console.log(`   Need to cut: ${overflow} characters`)
  } else if (length > 250) {
    console.log(`   Close to limit!`)
  }

  console.log()
}

if (allGood) {
  console.log('✅ All tweets are within the 280 character limit!')
} else {
  console.log('❌ Some tweets need to be shortened')
}
