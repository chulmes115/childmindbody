import {
  getCurrentCycleId,
  getDisquietMessages,
  getDisquietCount,
  incrementDisquietCount,
  saveDisquietMessage,
  getDisquietMemory,
} from '@/lib/db'
import { runDisquiet } from '@/lib/agents'

export const maxDuration = 60

const MAX_QUESTIONS = 5
const MAX_WORDS     = 5

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export async function GET() {
  const cycleId   = await getCurrentCycleId()
  const [messages, count] = await Promise.all([
    getDisquietMessages(cycleId),
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

  if (!question) {
    return Response.json({ error: 'Question is required' }, { status: 400 })
  }

  if (countWords(question) > MAX_WORDS) {
    return Response.json({ error: `${MAX_WORDS} words maximum` }, { status: 400 })
  }

  const cycleId = await getCurrentCycleId()
  const count   = await getDisquietCount(cycleId)

  if (count >= MAX_QUESTIONS) {
    return Response.json({ error: 'Child has fallen silent. This cycle is over.' }, { status: 429 })
  }

  // Fetch history and memory in parallel, then save question
  const [history, memory] = await Promise.all([
    getDisquietMessages(cycleId),
    getDisquietMemory(),
  ])

  await saveDisquietMessage(cycleId, 'user', question)
  await incrementDisquietCount(cycleId)

  const answer = await runDisquiet(question, history, memory)

  await saveDisquietMessage(cycleId, 'child', answer)

  return Response.json({ answer })
}
