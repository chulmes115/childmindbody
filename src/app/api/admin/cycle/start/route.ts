import { cookies } from 'next/headers'
import { getCurrentCycleId, getCycleRecord, getMeta, setMeta, getCurrentBodyCode, saveCycleRecord, countRealIntakeResponses, saveHateWound } from '@/lib/db'
import { runChild } from '@/lib/agents'

export const maxDuration = 60

async function assertAdmin() {
  const store = await cookies()
  if (store.get('cmb_admin')?.value !== process.env.ADMIN_SECRET)
    throw new Error('Unauthorized')
}

export async function POST() {
  try {
    await assertAdmin()
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const lastCycleId = await getCurrentCycleId()
    const newCycleId  = lastCycleId + 1
    const isFirstRun  = lastCycleId === 0

    const [priorRecord, consecutiveFails, codeFailCount, codebaseResets, startDateMeta, bodyCode] =
      await Promise.all([
        isFirstRun ? Promise.resolve(null) : getCycleRecord(lastCycleId),
        getMeta('consecutive_fails'),
        getMeta('code_fail_count'),
        getMeta('codebase_resets'),
        getMeta('start_date'),
        getCurrentBodyCode(),
      ])

    const startDate =
      (startDateMeta as string | null) ??
      (() => {
        const today = new Date().toISOString().split('T')[0]
        setMeta('start_date', today) // fire-and-forget, intentional
        return today
      })()

    // Zero-intake penalty + hate wound punishment
    let effectiveCodeFails = (codeFailCount as number) ?? 0
    if (!isFirstRun) {
      const [realCount, prevWounds] = await Promise.all([
        countRealIntakeResponses(lastCycleId),
        getMeta('hate_wound_count'),
      ])
      if (realCount === 0) {
        effectiveCodeFails += 1
        await setMeta('code_fail_count', effectiveCodeFails)
        const newWoundCount = ((prevWounds as number) ?? 0) + 1
        await setMeta('hate_wound_count', newWoundCount)
        await Promise.all(
          Array.from({ length: newWoundCount }, (_, i) => saveHateWound(newCycleId, i))
        )
      } else {
        await setMeta('hate_wound_count', 0)
      }
    }

    const { resolution, bodyDirection } = await runChild({
      startDate,
      consecutiveFails: (consecutiveFails as number) ?? 0,
      codeFailCount:    effectiveCodeFails,
      codebaseResets:   (codebaseResets   as number) ?? 0,
      priorAnalysis:    priorRecord?.mind_analysis ?? '',
      bodyCurrentCode:  bodyCode ?? '',
      olinNote:         priorRecord?.olin_note,
    })

    await saveCycleRecord({
      id:                  newCycleId,
      child_resolution:    resolution,
      body_direction:      bodyDirection,
      consecutive_failures: (consecutiveFails as number) ?? 0,
      code_fail_count:     effectiveCodeFails,
      reset_count:         (codebaseResets   as number) ?? 0,
    })

    return Response.json({ newCycleId, resolution, bodyDirection, isFirstRun })
  } catch (err) {
    console.error('[cycle/start]', err)
    return Response.json({ error: err instanceof Error ? err.message : 'Step failed' }, { status: 500 })
  }
}
