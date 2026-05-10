import {
  getCurrentCycleId,
  incrementCycleId,
  getCycleRecord,
  saveCycleRecord,
  getCounter,
  setCounter,
  bumpCounter,
  getStartDate,
  setStartDate,
  getProjectStatus,
  getCurrentBodyCode,
  saveBodyCode,
  getIntakeResponses,
  countRealIntakeResponses,
  saveHateWound,
  getBodyMessageStatus,
  saveBodyMessageStatus,
  getInspirationImages,
} from './db'
import { runChild, runMind, runBody, condenseIntake } from './agents'
import { runBodyMessageStep } from './bodyMessage'

export type CycleResult = {
  ok: boolean
  cycle: number
  isFirstRun: boolean
  childResolution: string
  bodyUpdated: boolean
  mindRecommendation: 'pass' | 'fail' | null
}

export async function runCycle(): Promise<CycleResult> {
  // ── Step 1: Read current state ──────────────────────────────────────────────
  const lastCycleId = await getCurrentCycleId() // 0 = no cycles yet
  const newCycleId = lastCycleId + 1
  const isFirstRun = lastCycleId === 0

  const [priorRecord, consecutiveFails, codeFailCount, codebaseResets, existingStartDate, bodyCode] =
    await Promise.all([
      isFirstRun ? Promise.resolve(null) : getCycleRecord(lastCycleId),
      getCounter('consecutive_fails'),
      getCounter('code_fail_count'),
      getCounter('codebase_resets'),
      getStartDate(),
      getCurrentBodyCode(),
    ])

  // On first run, record the start date
  const startDate =
    existingStartDate ??
    (() => {
      const today = new Date().toISOString().split('T')[0]
      setStartDate(today) // fire-and-forget, intentional
      return today
    })()

  const priorAnalysis = priorRecord?.mind_analysis ?? ''
  const olinNote = priorRecord?.olin_note

  // ── Step 1.5: Hate wound punishment ─────────────────────────────────────────
  // If no real visitors responded last cycle, inject stacked hate wounds into
  // the new cycle's intake. Reset the count when someone actually responds.
  if (!isFirstRun) {
    const [realCount, prevWounds] = await Promise.all([
      countRealIntakeResponses(lastCycleId),
      getCounter('hate_wound_count'),
    ])
    if (realCount === 0) {
      const newWoundCount = prevWounds + 1
      await setCounter('hate_wound_count', newWoundCount)
      await Promise.all(
        Array.from({ length: newWoundCount }, (_, i) => saveHateWound(newCycleId, i))
      )
    } else {
      await setCounter('hate_wound_count', 0)
    }
  }

  // ── Step 1.7: Fetch full project snapshot for Child's context ───────────────
  const snapshot = await getProjectStatus(newCycleId)

  // ── Step 2: Run Child ───────────────────────────────────────────────────────
  const childResult = await runChild({
    startDate,
    consecutiveFails,
    codeFailCount,
    codebaseResets,
    priorAnalysis,
    bodyCurrentCode: bodyCode ?? '',
    olinNote,
    snapshot,
  })

  await saveCycleRecord({
    id: newCycleId,
    child_resolution: childResult.resolution,
    body_direction: childResult.bodyDirection,
    consecutive_failures: consecutiveFails,
    code_fail_count: codeFailCount,
    reset_count: codebaseResets,
  })

  // ── Step 3: Run Body if Child directed it to change ─────────────────────────
  const shouldUpdateBody = childResult.bodyDirection.toLowerCase().trim() !== 'change nothing'

  if (shouldUpdateBody) {
    // 8K guard: if stored code is huge, clear it and increment reset counter
    if (bodyCode && bodyCode.length > 8000) {
      await Promise.all([
        saveBodyCode(''),
        bumpCounter('codebase_resets'),
      ])
    }
    const bodyDeaths = await getCounter('body_deaths')
    const newBodyCode = await runBody(childResult.bodyDirection, bodyDeaths)
    await Promise.all([
      saveBodyCode(newBodyCode),
      saveCycleRecord({ id: newCycleId, body_code: newBodyCode }),
    ])
  }

  // ── Step 4: Run Mind on prior cycle's data ──────────────────────────────────
  const intakeResponses = isFirstRun ? [] : await getIntakeResponses(lastCycleId)
  const rawIntake = intakeResponses.join('\n\n---\n\n')
  const condensed = rawIntake.length > 4000 ? await condenseIntake(rawIntake) : rawIntake

  const mindResult = await runMind(priorRecord?.child_resolution ?? '', condensed)

  await saveCycleRecord({
    id: newCycleId,
    mind_analysis: mindResult.analysis,
    ...(mindResult.recommendation !== null ? { mind_rec: mindResult.recommendation } : {}),
    intake_condensed: condensed || undefined,
  })

  // Mind's failures: increments when recommendation is not 'fail' (pass or null)
  if (mindResult.recommendation !== 'fail') {
    await bumpCounter('mind_fail_count')
  }

  // ── Step 5: Increment cycle counter ────────────────────────────────────────
  await incrementCycleId()

  // Disquiet conversation now persists across cycles. It is wiped only when
  // Child dies (conversation > 4,000 chars or manual reset). No per-cycle action.

  // ── Step 6: Body's Message — image generation ───────────────────────────────
  const [bodyMsgStatus, inspirationImages] = await Promise.all([
    getBodyMessageStatus(),
    getInspirationImages(),
  ])

  const bodyMsgResult = await runBodyMessageStep({
    wordPosition:            bodyMsgStatus.wordPosition,
    lastImageUrl:            bodyMsgStatus.lastImageUrl,
    inspirationDescriptions: inspirationImages.map((img) => img.analysis),
  })

  await saveBodyMessageStatus({
    wordPosition:  bodyMsgResult.nextWordPosition,
    lastImageUrl:  bodyMsgResult.imageUrl,
    lastPrompt:    bodyMsgResult.prompt,
  })

  return {
    ok: true,
    cycle: newCycleId,
    isFirstRun,
    childResolution: childResult.resolution,
    bodyUpdated: shouldUpdateBody,
    mindRecommendation: mindResult.recommendation,
  }
}
