import { cookies } from 'next/headers'
import {
  getCurrentCycleId,
  getDisquietMessages,
  getDisquietMemory,
  saveDisquietMemory,
} from '@/lib/db'
import { summarizeDisquietConversation } from '@/lib/agents'

export const maxDuration = 60

async function assertAdmin() {
  const store = await cookies()
  if (store.get('cmb_admin')?.value !== process.env.ADMIN_SECRET)
    throw new Error('Unauthorized')
}

export async function POST(request: Request) {
  try {
    await assertAdmin()
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { cycleId: requestedCycleId } = await request.json() as { cycleId?: number }
    const cycleId = requestedCycleId ?? (await getCurrentCycleId())

    const messages = await getDisquietMessages(cycleId)
    if (messages.length === 0) {
      return Response.json({ done: true, skipped: true, reason: 'No messages to summarize' })
    }

    const [summary, existingMemory] = await Promise.all([
      summarizeDisquietConversation(messages),
      getDisquietMemory(),
    ])

    if (!summary) {
      return Response.json({ done: true, skipped: true, reason: 'Summary was empty' })
    }

    const appended = existingMemory
      ? `${existingMemory}\n\nCycle ${cycleId}: ${summary}`
      : `Cycle ${cycleId}: ${summary}`

    const final = appended.length > 2000 ? appended.slice(-2000) : appended
    await saveDisquietMemory(final)

    return Response.json({ done: true, summary, cycleId })
  } catch (err) {
    console.error('[admin/disquiet/condense]', err)
    return Response.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
