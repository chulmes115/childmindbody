import {
  getCurrentCycleId,
  incrementCycleId,
  getCycleRecord,
  saveCycleRecord,
  getMeta,
  setMeta,
  getCurrentBodyCode,
  saveBodyCode,
  getIntakeResponses,
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

  const [priorRecord, consecutiveFails, codeFailCount, codebaseResets, startDateMeta, bodyCode] =
    await Promise.all([
      isFirstRun ? Promise.resolve(null) : getCycleRecord(lastCycleId),
      getMeta('consecutive_fails'),
      getMeta('code_fail_count'),
      getMeta('codebase_resets'),
      getMeta('start_date'),
      getCurrentBodyCode(),
    ])

  // On first run, record the start date
  const startDate =
    (startDateMeta as string | null) ??
    (() => {
      const today = new Date().toISOString().split('T')[0]
      setMeta('start_date', today) // fire-and-forget, intentional
      return today
    })()

  const priorAnalysis = priorRecord?.mind_analysis ?? ''
  const olinNote = priorRecord?.olin_note

  // ── Step 2: Run Child ───────────────────────────────────────────────────────
  const childResult = await runChild({
    startDate,
    consecutiveFails: (consecutiveFails as number) ?? 0,
    codeFailCount: (codeFailCount as number) ?? 0,
    codebaseResets: (codebaseResets as number) ?? 0,
    priorAnalysis,
    bodyCurrentCode: bodyCode ?? '',
    olinNote,
  })

  await saveCycleRecord({
    id: newCycleId,
    child_resolution: childResult.resolution,
    body_direction: childResult.bodyDirection,
    consecutive_failures: (consecutiveFails as number) ?? 0,
    code_fail_count: (codeFailCount as number) ?? 0,
    reset_count: (codebaseResets as number) ?? 0,
  })

  // ── Step 3: Run Body if Child directed it to change ─────────────────────────
  const shouldUpdateBody = childResult.bodyDirection.toLowerCase().trim() !== 'change nothing'

  if (shouldUpdateBody) {
    // 8K guard: if stored code is huge, clear it and increment reset counter
    if (bodyCode && bodyCode.length > 8000) {
      await Promise.all([
        saveBodyCode(''),
        setMeta('codebase_resets', ((codebaseResets as number) ?? 0) + 1),
      ])
    }
    const newBodyCode = await runBody(childResult.bodyDirection)
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
    const current = ((await getMeta('mind_fail_count')) as number) ?? 0
    await setMeta('mind_fail_count', current + 1)
  }

  // ── Step 5: Increment cycle counter ────────────────────────────────────────
  await incrementCycleId()

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
