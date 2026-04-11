import Anthropic from '@anthropic-ai/sdk'
import {
  CHILD_SYSTEM_PROMPT,
  MIND_SYSTEM_PROMPT,
  BODY_SYSTEM_PROMPT,
} from './prompts'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-haiku-4-5-20251001'

// Parser delimiter — must match the separator in CHILD_SYSTEM_PROMPT
const BODY_PROMPT_DELIMITER = '---BODY PROMPT---'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChildContext = {
  startDate: string
  consecutiveFails: number
  codeFailCount: number
  codebaseResets: number
  priorAnalysis: string
  bodyCurrentCode: string
}

// ─── Child ────────────────────────────────────────────────────────────────────

export async function runChild(
  ctx: ChildContext
): Promise<{ resolution: string; bodyPrompt?: string }> {
  const userMessage = `\
Start date: ${ctx.startDate}
Consecutive failures: ${ctx.consecutiveFails}
Code failures (Body errors): ${ctx.codeFailCount}
Codebase resets: ${ctx.codebaseResets}

MIND'S ANALYSIS — your only link to yesterday:
${ctx.priorAnalysis || '[No prior analysis — this is the first cycle.]'}

BODY'S CURRENT CODE:
${ctx.bodyCurrentCode || '[Nothing is displayed yet.]'}`

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 700,
    system: [
      { type: 'text', text: CHILD_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: userMessage }],
  })

  const raw = (msg.content[0] as Anthropic.TextBlock).text
  const delimiterIndex = raw.indexOf(BODY_PROMPT_DELIMITER)

  if (delimiterIndex === -1) {
    return { resolution: raw.trim() }
  }

  const resolution = raw.slice(0, delimiterIndex).trim()
  const bodyPrompt = raw.slice(delimiterIndex + BODY_PROMPT_DELIMITER.length).trim()
  return { resolution, bodyPrompt: bodyPrompt || undefined }
}

// ─── Mind ─────────────────────────────────────────────────────────────────────

export async function runMind(
  childResolution: string,
  intakeData: string
): Promise<{ analysis: string; recommendation: 'pass' | 'fail' }> {
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

  const raw = (msg.content[0] as Anthropic.TextBlock).text.trim()

  // Extract recommendation from final line
  const lines = raw.split('\n')
  const lastLine = lines[lines.length - 1].trim()
  const recommendation =
    lastLine === 'RECOMMENDATION: pass' ? 'pass' : 'fail'

  const analysis = lines
    .slice(0, lastLine.startsWith('RECOMMENDATION:') ? -1 : undefined)
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

  const raw = (msg.content[0] as Anthropic.TextBlock).text.trim()

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
  return (msg.content[0] as Anthropic.TextBlock).text.trim()
}
