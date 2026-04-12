import { cookies } from 'next/headers'
import {
  incrementCycleId,
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
    const { newCycleId } = await request.json() as { newCycleId: number }
    const endingCycleId = newCycleId - 1

    // Summarize Disquiet conversation from the cycle that just ended
    if (endingCycleId > 0) {
      const disquietMessages = await getDisquietMessages(endingCycleId)
      if (disquietMessages.length > 0) {
        const [summary, existingMemory] = await Promise.all([
          summarizeDisquietConversation(disquietMessages),
          getDisquietMemory(),
        ])
        if (summary) {
          const appended = existingMemory
            ? `${existingMemory}\n\nCycle ${endingCycleId}: ${summary}`
            : `Cycle ${endingCycleId}: ${summary}`
          await saveDisquietMemory(appended.length > 2000 ? appended.slice(-2000) : appended)
        }
      }
    }

    await incrementCycleId()
    return Response.json({ done: true, cycle: newCycleId })
  } catch (err) {
    console.error('[cycle/finalize]', err)
    return Response.json({ error: err instanceof Error ? err.message : 'Step failed' }, { status: 500 })
  }
}
