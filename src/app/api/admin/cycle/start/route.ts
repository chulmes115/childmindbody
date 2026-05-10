import { cookies } from 'next/headers'
import {
  getCurrentCycleId,
  getCycleRecord,
  getCounter,
  setCounter,
  getStartDate,
  setStartDate,
  getProjectStatus,
  getCurrentBodyCode,
  saveCycleRecord,
  countRealIntakeResponses,
  saveHateWound,
} from '@/lib/db'
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

    const [priorRecord, consecutiveFails, codeFailCount, codebaseResets, existingStartDate, bodyCode] =
      await Promise.all([
        isFirstRun ? Promise.resolve(null) : getCycleRecord(lastCycleId),
        getCounter('consecutive_fails'),
        getCounter('code_fail_count'),
        getCounter('codebase_resets'),
        getStartDate(),
        getCurrentBodyCode(),
      ])

    const startDate =
      existingStartDate ??
      (() => {
        const today = new Date().toISOString().split('T')[0]
        setStartDate(today) // fire-and-forget, intentional
        return today
      })()

    // Zero-intake penalty + hate wound punishment
    let effectiveCodeFails = codeFailCount
    if (!isFirstRun) {
      const [realCount, prevWounds] = await Promise.all([
        countRealIntakeResponses(lastCycleId),
        getCounter('hate_wound_count'),
      ])
      if (realCount === 0) {
        effectiveCodeFails += 1
        await setCounter('code_fail_count', effectiveCodeFails)
        const newWoundCount = prevWounds + 1
        await setCounter('hate_wound_count', newWoundCount)
        await Promise.all(
          Array.from({ length: newWoundCount }, (_, i) => saveHateWound(newCycleId, i))
        )
      } else {
        await setCounter('hate_wound_count', 0)
      }
    }

    // Snapshot is read AFTER any counter mutations above so it reflects current state.
    const snapshot = await getProjectStatus(newCycleId)

    const { resolution, bodyDirection } = await runChild({
      startDate,
      consecutiveFails,
      codeFailCount:    effectiveCodeFails,
      codebaseResets,
      priorAnalysis:    priorRecord?.mind_analysis ?? '',
      bodyCurrentCode:  bodyCode ?? '',
      olinNote:         priorRecord?.olin_note,
      snapshot,
    })

    await saveCycleRecord({
      id:                  newCycleId,
      child_resolution:    resolution,
      body_direction:      bodyDirection,
      consecutive_failures: consecutiveFails,
      code_fail_count:     effectiveCodeFails,
      reset_count:         codebaseResets,
    })

    return Response.json({ newCycleId, resolution, bodyDirection, isFirstRun })
  } catch (err) {
    console.error('[cycle/start]', err)
    return Response.json({ error: err instanceof Error ? err.message : 'Step failed' }, { status: 500 })
  }
}
