import { cookies } from 'next/headers'
import { getCycleRecord, getIntakeResponses, saveCycleRecord } from '@/lib/db'
import { runMind, condenseIntake } from '@/lib/agents'

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
    const lastCycleId = newCycleId - 1

    const [priorRecord, intakeResponses] = await Promise.all([
      lastCycleId > 0 ? getCycleRecord(lastCycleId) : Promise.resolve(null),
      lastCycleId > 0 ? getIntakeResponses(lastCycleId) : Promise.resolve([]),
    ])

    const rawIntake  = intakeResponses.join('\n\n---\n\n')
    const condensed  = rawIntake.length > 4000 ? await condenseIntake(rawIntake) : rawIntake
    const { analysis, recommendation } = await runMind(
      priorRecord?.child_resolution ?? '',
      condensed
    )

    await saveCycleRecord({
      id:               newCycleId,
      mind_analysis:    analysis,
      mind_rec:         recommendation,
      intake_condensed: condensed || undefined,
    })

    return Response.json({ recommendation })
  } catch (err) {
    console.error('[cycle/run-mind]', err)
    return Response.json({ error: err instanceof Error ? err.message : 'Step failed' }, { status: 500 })
  }
}
