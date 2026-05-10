import { cookies } from 'next/headers'
import { triggerDisquietDeath } from '@/lib/agents'

export const maxDuration = 60

async function assertAdmin() {
  const store = await cookies()
  if (store.get('cmb_admin')?.value !== process.env.ADMIN_SECRET)
    throw new Error('Unauthorized')
}

// Manual reset of Child's disquiet — kills Child, writes the curated memory,
// wipes the conversation. Same death event the 4,000-char threshold triggers.
export async function POST() {
  try {
    await assertAdmin()
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await triggerDisquietDeath()

    if (!result.died) {
      return Response.json({ done: true, skipped: true, reason: 'No conversation to summarize' })
    }

    return Response.json({ done: true, deathCount: result.deathCount })
  } catch (err) {
    console.error('[admin/disquiet/condense]', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
