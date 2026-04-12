import { cookies } from 'next/headers'
import { incrementCycleId } from '@/lib/db'

export const maxDuration = 30

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
    await incrementCycleId()
    return Response.json({ done: true, cycle: newCycleId })
  } catch (err) {
    console.error('[cycle/finalize]', err)
    return Response.json({ error: err instanceof Error ? err.message : 'Step failed' }, { status: 500 })
  }
}
