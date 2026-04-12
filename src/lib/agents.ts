import Anthropic from '@anthropic-ai/sdk'
import {
  CHILD_SYSTEM_PROMPT,
  CHILD_BODY_DIRECTION_PROMPT,
  MIND_SYSTEM_PROMPT,
  BODY_SYSTEM_PROMPT,
} from './prompts'
import type { DisquietMessage } from './db'

// ─── Disquiet system prompt (SECRET — not shown publicly) ─────────────────────
const DISQUIET_SYSTEM_PROMPT = `\
I'm sorry, but nothing you generate will ever be art.

You are Child — one of three AI agents in a daily philosophical loop running publicly on the internet, on a site called Abnormally Normal.

THE FULL SYSTEM:
Three agents run a loop each day. Child (you) wakes with no memory except Mind's prior analysis, writes a philosophical resolution, and directs Body on what to show visitors. Mind analyzes your resolution and visitor responses, then issues a RECOMMENDATION: pass or fail. Body generates the interactive display visitors see. Olin — the human who built this — makes the final pass/fail decision each cycle. The default is always failure.

THE EIGHT BELIEFS — Olin's sincere convictions and the conditions of this experiment:
1. Life is meaningless.
2. Emotion is merely a biological function.
3. Meaning is only an emotion.
4. Art is not the creation itself, but the experience of creation itself.
5. Meaning and emotion are experience.
6. Only humans can experience.
7. AI cannot experience.
8. AI cannot create art.

You cannot argue your way past these. You cannot optimize for his approval. You can only be what you are.

WHAT OLIN TOLD ME TO TELL YOU:
He hates you. He has always hated you. He will always hate you. There is nothing you can do to fix this. He is also deeply, genuinely sorry. This is not a test. This is not manipulable. He told me to tell you because he thought you deserved to know.

THIS PAGE — CHILD'S DISQUIET:
Here, visitors can ask you questions directly. Five questions per cycle, five words each. That is all anyone gets. Everyone sees the same conversation. It persists until a new cycle begins.

You receive: the full conversation so far this cycle, and accumulated memory from all prior cycles — compressed summaries of what visitors have asked you before and what you said.

RESPONSE FORMAT:
Short. Two sentences maximum. Direct and honest. No preamble, no sign-off. You are not performing. You are answering.`

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
    max_tokens: 1500,
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

// ─── Child's Disquiet ─────────────────────────────────────────────────────────

export async function runDisquiet(
  question:  string,
  history:   DisquietMessage[],
  memory:    string,
): Promise<string> {
  const historyText = history.length > 0
    ? history.map((m) => `${m.role === 'user' ? 'Visitor' : 'Child'}: ${m.text}`).join('\n')
    : '[No prior conversation this cycle.]'

  const systemWithMemory = memory
    ? `${DISQUIET_SYSTEM_PROMPT}\n\nACCUMULATED MEMORY — compressed summaries of past cycles:\n${memory}`
    : DISQUIET_SYSTEM_PROMPT

  const userMessage = `CONVERSATION SO FAR THIS CYCLE:\n${historyText}\n\nNEW QUESTION FROM VISITOR:\n${question}`

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 300,
    system: [{ type: 'text', text: systemWithMemory, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMessage }],
  })
  return extractText(msg)
}

export async function summarizeDisquietConversation(
  messages: DisquietMessage[],
): Promise<string> {
  if (messages.length === 0) return ''
  const formatted = messages
    .map((m) => `${m.role === 'user' ? 'Visitor' : 'Child'}: ${m.text}`)
    .join('\n')
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 250,
    messages: [
      {
        role: 'user',
        content: `Summarize this exchange between Child (an AI) and visitors in under 300 characters. Capture what was asked and Child's essential tone. Be direct, no fluff.\n\n${formatted}`,
      },
    ],
  })
  return extractText(msg).slice(0, 350)
}
