import {
  getCurrentCycleId,
  getDisquietMessages,
  getDisquietCount,
  incrementDisquietCount,
  saveDisquietMessage,
  getDisquietMemory,
} from '@/lib/db'

// Messages persist across cycles — only the per-cycle count resets
import { runDisquiet } from '@/lib/agents'

export const maxDuration = 60

const MAX_QUESTIONS = 10
const MAX_CHARS     = 50

export async function GET() {
  const cycleId = await getCurrentCycleId()
  const [messages, count] = await Promise.all([
    getDisquietMessages(),
    getDisquietCount(cycleId),
  ])
  return Response.json({
    messages,
    questionsLeft: Math.max(0, MAX_QUESTIONS - count),
    cycleId,
  })
}

export async function POST(request: Request) {
  let question: string
  try {
    const body = await request.json() as { question?: string }
    question = (body.question ?? '').trim()
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Sanitize: strip control characters, normalize whitespace
  question = question
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CHARS)

  if (!question) {
    return Response.json({ error: 'Question is required' }, { status: 400 })
  }

  if (question.length > MAX_CHARS) {
    return Response.json({ error: `${MAX_CHARS} characters maximum` }, { status: 400 })
  }

  try {
    const cycleId = await getCurrentCycleId()
    const count   = await getDisquietCount(cycleId)

    if (count >= MAX_QUESTIONS) {
      return Response.json({ error: 'Child has fallen silent. This cycle is over.' }, { status: 429 })
    }

    const [history, memory] = await Promise.all([
      getDisquietMessages(),
      getDisquietMemory(),
    ])

    await saveDisquietMessage(cycleId, 'user', question)
    await incrementDisquietCount(cycleId)

    const answer = await runDisquiet(question, history, memory)

    await saveDisquietMessage(cycleId, 'child', answer)

    return Response.json({ answer })
  } catch (err) {
    console.error('[disquiet]', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
