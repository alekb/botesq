import { chatCompletion, type ChatMessage, type LLMResponse } from './llm.service.js'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })

const LEGAL_SYSTEM_PROMPT = `You are MoltLaw's internal legal AI assistant. You provide accurate, well-reasoned legal information to assist licensed attorneys and their clients.

CRITICAL GUIDELINES:
1. Always cite relevant statutes, regulations, or case law when applicable
2. Clearly distinguish between established law and areas of legal uncertainty
3. Flag any conflicts of law or jurisdictional issues
4. Note when a question requires attorney review due to complexity
5. Never provide advice that could constitute unauthorized practice of law
6. Always recommend consulting with a licensed attorney for specific situations
7. Be concise but thorough - prioritize actionable information

RESPONSE FORMAT:
Structure your response with:
- Direct answer to the question
- Relevant legal basis/citations
- Important caveats or limitations
- Suggested next steps if applicable

CONFIDENCE ASSESSMENT:
Rate your confidence in the response:
- HIGH (90-100%): Well-established law with clear precedent
- MEDIUM (70-89%): Generally accepted but may have exceptions
- LOW (50-69%): Uncertain or evolving area of law
- REQUIRES_REVIEW (below 50%): Complex matter requiring attorney review`

export interface LegalQuestion {
  question: string
  jurisdiction?: string
  context?: string
}

export interface LegalResponse {
  answer: string
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'REQUIRES_REVIEW'
  confidenceScore: number
  complexity: 'simple' | 'moderate' | 'complex'
  citations: Array<{ source: string; section?: string }>
  suggestedFollowups: string[]
  requiresAttorneyReview: boolean
  tokensUsed: number
}

/**
 * Parse confidence from LLM response
 */
function parseConfidence(content: string): { level: LegalResponse['confidence']; score: number } {
  const confidenceMatch = content.match(/confidence[:\s]*(HIGH|MEDIUM|LOW|REQUIRES_REVIEW)/i)
  const scoreMatch = content.match(/(\d{1,3})%/)

  let level: LegalResponse['confidence'] = 'MEDIUM'
  let score = 75

  if (confidenceMatch && confidenceMatch[1]) {
    level = confidenceMatch[1].toUpperCase() as LegalResponse['confidence']
  }

  if (scoreMatch && scoreMatch[1]) {
    score = parseInt(scoreMatch[1], 10)
    // Derive level from score if not explicitly stated
    if (!confidenceMatch) {
      if (score >= 90) level = 'HIGH'
      else if (score >= 70) level = 'MEDIUM'
      else if (score >= 50) level = 'LOW'
      else level = 'REQUIRES_REVIEW'
    }
  } else {
    // Derive score from level
    switch (level) {
      case 'HIGH': score = 95; break
      case 'MEDIUM': score = 80; break
      case 'LOW': score = 60; break
      case 'REQUIRES_REVIEW': score = 40; break
    }
  }

  return { level, score }
}

/**
 * Parse citations from LLM response
 */
function parseCitations(content: string): Array<{ source: string; section?: string }> {
  const citations: Array<{ source: string; section?: string }> = []

  // Match common citation patterns
  const patterns = [
    // USC citations: 17 U.S.C. § 107
    /(\d+)\s*U\.?S\.?C\.?\s*§?\s*(\d+)/gi,
    // State statutes: Cal. Civ. Code § 1234
    /([A-Z][a-z]+\.?\s*(?:Civ\.|Penal|Bus\.|Corp\.|Fam\.)\s*Code)\s*§?\s*(\d+)/gi,
    // Case citations: Smith v. Jones, 123 F.3d 456
    /([A-Z][a-z]+\s+v\.?\s+[A-Z][a-z]+),?\s*(\d+\s*(?:F\.\d?d?|U\.S\.|S\.Ct\.))/gi,
    // Regulations: 17 CFR § 240.10b-5
    /(\d+)\s*C\.?F\.?R\.?\s*§?\s*([\d.-]+)/gi,
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      citations.push({
        source: match[0].trim(),
        section: match[2],
      })
    }
  }

  // Deduplicate
  const seen = new Set<string>()
  return citations.filter((c) => {
    const key = c.source.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Determine complexity based on question and response
 */
function determineComplexity(
  question: string,
  response: string,
  confidence: number
): 'simple' | 'moderate' | 'complex' {
  // Complex indicators
  const complexIndicators = [
    /multiple jurisdiction/i,
    /conflict of law/i,
    /constitutional/i,
    /litigation/i,
    /depends on/i,
    /however/gi,
    /on the other hand/i,
    /uncertain/i,
    /evolving/i,
  ]

  let complexityScore = 0

  // Question length contributes to complexity
  if (question.length > 500) complexityScore += 2
  else if (question.length > 200) complexityScore += 1

  // Response length contributes to complexity
  if (response.length > 2000) complexityScore += 2
  else if (response.length > 1000) complexityScore += 1

  // Check for complex indicators
  for (const pattern of complexIndicators) {
    if (pattern.test(response)) complexityScore += 1
  }

  // Low confidence indicates complexity
  if (confidence < 70) complexityScore += 2
  else if (confidence < 85) complexityScore += 1

  if (complexityScore >= 5) return 'complex'
  if (complexityScore >= 2) return 'moderate'
  return 'simple'
}

/**
 * Extract suggested follow-up questions
 */
function extractFollowups(content: string): string[] {
  const followups: string[] = []

  // Look for explicit follow-up section
  const followupMatch = content.match(/(?:follow[- ]?up|next steps?|you (?:may|might|should) (?:also )?(?:want to |consider ))[\s\S]*?(?:\n\n|$)/i)

  if (followupMatch) {
    // Extract bullet points or numbered items
    const items = followupMatch[0].match(/[-•*\d.]\s*([^-•*\n]+)/g)
    if (items) {
      for (const item of items.slice(0, 3)) {
        const cleaned = item.replace(/^[-•*\d.]\s*/, '').trim()
        if (cleaned.length > 10 && cleaned.length < 200) {
          followups.push(cleaned)
        }
      }
    }
  }

  return followups
}

/**
 * Generate a legal response using the AI
 */
export async function generateLegalResponse(input: LegalQuestion): Promise<LegalResponse> {
  const { question, jurisdiction, context } = input

  const userMessage = `
Question: ${question}
${jurisdiction ? `Jurisdiction: ${jurisdiction}` : 'Jurisdiction: General (US)'}
${context ? `Additional Context: ${context}` : ''}

Please provide:
1. A direct, actionable answer
2. Relevant legal citations
3. Your confidence level (HIGH/MEDIUM/LOW/REQUIRES_REVIEW) with percentage
4. Any important caveats
5. Suggested follow-up questions if applicable
`.trim()

  const messages: ChatMessage[] = [
    { role: 'system', content: LEGAL_SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ]

  let llmResponse: LLMResponse

  try {
    llmResponse = await chatCompletion(messages, {
      temperature: 0.3,
      maxTokens: 2048,
    })
  } catch (error) {
    logger.error({ error }, 'LLM request failed')
    throw error
  }

  const content = llmResponse.content
  const { level: confidence, score: confidenceScore } = parseConfidence(content)
  const citations = parseCitations(content)
  const complexity = determineComplexity(question, content, confidenceScore)
  const suggestedFollowups = extractFollowups(content)

  return {
    answer: content,
    confidence,
    confidenceScore,
    complexity,
    citations,
    suggestedFollowups,
    requiresAttorneyReview: confidence === 'REQUIRES_REVIEW' || confidenceScore < 70,
    tokensUsed: llmResponse.usage.totalTokens,
  }
}

/**
 * Validate that a question is appropriate for legal AI
 */
export function validateLegalQuestion(question: string): { valid: boolean; reason?: string } {
  if (!question || question.trim().length < 10) {
    return { valid: false, reason: 'Question is too short' }
  }

  if (question.length > 10000) {
    return { valid: false, reason: 'Question exceeds maximum length' }
  }

  // Check for potentially harmful or inappropriate content
  const inappropriatePatterns = [
    /how to (?:hide|conceal|evade)/i,
    /avoid (?:paying |taxes|detection)/i,
    /illegal (?:way|method)/i,
  ]

  for (const pattern of inappropriatePatterns) {
    if (pattern.test(question)) {
      return { valid: false, reason: 'Question appears to seek advice on illegal activities' }
    }
  }

  return { valid: true }
}
