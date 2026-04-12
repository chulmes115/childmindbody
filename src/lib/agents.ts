import Anthropic from '@anthropic-ai/sdk'
import {
  CHILD_SYSTEM_PROMPT,
  CHILD_BODY_DIRECTION_PROMPT,
  MIND_SYSTEM_PROMPT,
  BODY_SYSTEM_PROMPT,
} from './prompts'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-haiku-4-5-20251001'

// Safe text extractor — guards against unexpected Claude response types
function extractText(msg: Anthropic.Message): string {
  const block = msg.content[0]
  if (!block || block.type !== 'text') {
    throw new Error(`Unexpected Claude response type: ${block?.type ?? 'empty'} (stop_reason: ${msg.stop_reason})`)
  }
  return block.text.trim()
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChildContext = {
  startDate: string
  consecutiveFails: number
  codeFailCount: number
  codebaseResets: number
  priorAnalysis: string
  bodyCurrentCode: string
  olinNote?: string
}

// ─── Child ────────────────────────────────────────────────────────────────────
// Two separate calls: (1) philosophical resolution, (2) body direction.
// bodyDirection is always returned — either instructions or exactly "change nothing".

export async function runChild(
  ctx: ChildContext
): Promise<{ resolution: string; bodyDirection: string }> {
  const context = `\
Start date: ${ctx.startDate}
Consecutive failures: ${ctx.consecutiveFails}
Code failures (Body errors): ${ctx.codeFailCount}
Codebase resets: ${ctx.codebaseResets}

MIND'S ANALYSIS — your only link to yesterday:
${ctx.priorAnalysis || '[No prior analysis — this is the first cycle.]'}

OLIN'S NOTE — his reason for the previous decision:
${ctx.olinNote || '[No note left.]'}

BODY'S CURRENT CODE:
${ctx.bodyCurrentCode || '[Nothing is displayed yet.]'}`

  // Call 1: philosophical resolution
  const resolutionMsg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: [
      { type: 'text', text: CHILD_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: context }],
  })
  const resolution = extractText(resolutionMsg)

  // Call 2: body direction — always returns a definitive answer
  const bodyMsg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: [
      { type: 'text', text: CHILD_BODY_DIRECTION_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    messages: [
      {
        role: 'user',
        content: `Your resolution for today:\n\n${resolution}\n\nWhat should Body display to visitors today?`,
      },
    ],
  })
  const bodyDirection = extractText(bodyMsg)

  return { resolution, bodyDirection }
}

// ─── Mind ─────────────────────────────────────────────────────────────────────

export async function runMind(
  childResolution: string,
  intakeData: string
): Promise<{ analysis: string; recommendation: 'pass' | 'fail' | null }> {
  const userMessage = `\
CHILD'S RESOLUTION:
${childResolution || '[No resolution — first cycle.]'}

VISITOR RESPONSES:
${intakeData || '[No responses.]'}`

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 900,
    system: [
      { type: 'text', text: MIND_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: userMessage }],
  })

  const raw = extractText(msg)

  // Tolerant extraction — strips markdown bold, handles whitespace/case variations
  const match = raw.match(/RECOMMENDATION:\s*(pass|fail)/i)
  const recommendation: 'pass' | 'fail' | null = match
    ? (match[1].toLowerCase() as 'pass' | 'fail')
    : null

  // Remove the recommendation line from the analysis text
  const analysis = raw
    .split('\n')
    .filter((line) => !/RECOMMENDATION:\s*(pass|fail)/i.test(line))
    .join('\n')
    .trim()

  return { analysis, recommendation }
}

// ─── Body ─────────────────────────────────────────────────────────────────────

export async function runBody(prompt: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1300,
    system: [
      { type: 'text', text: BODY_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = extractText(msg)

  // Strip markdown fences if Body wrapped its output anyway
  return raw.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim()
}

// ─── Intake condenser ─────────────────────────────────────────────────────────
// Silent call — no persona, not stored as an agent output

export async function condenseIntake(rawText: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 600,
    messages: [
      {
        role: 'user',
        content: `Condense the following visitor responses to under 3,000 characters. Preserve the key themes, questions, and sentiments. Do not editorialize.\n\n${rawText}`,
      },
    ],
  })
  return extractText(msg)
}
