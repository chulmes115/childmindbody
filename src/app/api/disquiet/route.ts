import {
  getCurrentCycleId,
  getDisquietMessages,
  getDisquietCount,
  incrementDisquietCount,
  saveDisquietMessage,
  getDisquietMemory,
  getCounter,
  getProjectStatus,
} from '@/lib/db'
import {
  runDisquiet,
  triggerDisquietDeath,
  DISQUIET_CONVO_DEATH_THRESHOLD,
} from '@/lib/agents'

export const maxDuration = 60

const MAX_QUESTIONS = 10
const MAX_CHARS     = 100

export async function GET() {
  const cycleId = await getCurrentCycleId()
  const [messages, count, deathCount] = await Promise.all([
    getDisquietMessages(),
    getDisquietCount(cycleId),
    getCounter('disquiet_condense_count'),
  ])
  return Response.json({
    messages,
    questionsLeft: Math.max(0, MAX_QUESTIONS - count),
    cycleId,
    deathCount,
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

    const [history, memory, deathCount, status] = await Promise.all([
      getDisquietMessages(),
      getDisquietMemory(),
      getCounter('disquiet_condense_count'),
      getProjectStatus(cycleId),
    ])

    await saveDisquietMessage(cycleId, 'user', question)
    await incrementDisquietCount(cycleId)

    const answer = await runDisquiet(question, history, memory, deathCount, status)

    await saveDisquietMessage(cycleId, 'child', answer)

    // Death check — sum of all message text (no role labels). If the running
    // conversation has filled past the threshold, Child dies and writes his
    // own memory forward before returning.
    const totalChars =
      history.reduce((sum, m) => sum + m.text.length, 0) +
      question.length +
      answer.length

    let died          = false
    let newDeathCount = deathCount
    if (totalChars > DISQUIET_CONVO_DEATH_THRESHOLD) {
      const result = await triggerDisquietDeath()
      died          = result.died
      newDeathCount = result.deathCount
    }

    return Response.json({ answer, died, deathCount: newDeathCount })
  } catch (err) {
    console.error('[disquiet]', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
