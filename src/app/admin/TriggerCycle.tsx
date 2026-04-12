'use client'

import { useState } from 'react'

const STEPS = [
  { key: 'start',       label: 'Child thinking…'  },
  { key: 'run-body',    label: 'Body building…'    },
  { key: 'run-mind',    label: 'Mind analyzing…'   },
  { key: 'run-message', label: 'Body painting…'    },
  { key: 'finalize',    label: 'Wrapping up…'      },
]

async function post<T>(step: string, body: object): Promise<T> {
  const res  = await fetch(`/api/admin/cycle/${step}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  return res.json()
}

export default function TriggerCycle() {
  const [running,  setRunning]  = useState(false)
  const [stepIdx,  setStepIdx]  = useState(-1)
  const [result,   setResult]   = useState<string | null>(null)
  const [error,    setError]    = useState<string | null>(null)

  async function trigger() {
    setRunning(true)
    setResult(null)
    setError(null)

    try {
      // Step 1 — Child
      setStepIdx(0)
      const start = await post<{ newCycleId: number; bodyDirection: string; error?: string }>('start', {})
      if (start.error) throw new Error(start.error)

      // Step 2 — Body
      setStepIdx(1)
      const body = await post<{ bodyUpdated: boolean; error?: string }>('run-body', {
        newCycleId:    start.newCycleId,
        bodyDirection: start.bodyDirection,
      })
      if (body.error) throw new Error(body.error)

      // Step 3 — Mind
      setStepIdx(2)
      const mind = await post<{ recommendation: string; error?: string }>('run-mind', {
        newCycleId: start.newCycleId,
      })
      if (mind.error) throw new Error(mind.error)

      // Step 4 — Body's message image (non-fatal if DALL-E fails)
      setStepIdx(3)
      await post('run-message', { newCycleId: start.newCycleId })

      // Step 5 — Finalize
      setStepIdx(4)
      const final = await post<{ done: boolean; error?: string }>('finalize', {
        newCycleId: start.newCycleId,
      })
      if (final.error) throw new Error(final.error)

      setResult(`cycle ${start.newCycleId} complete — mind: ${mind.recommendation}${body.bodyUpdated ? ' · body updated' : ''}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown error')
    } finally {
      setRunning(false)
      setStepIdx(-1)
    }
  }

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <button
        onClick={trigger}
        disabled={running}
        className="text-xs px-4 py-1.5 border border-white/20 text-white/40 hover:border-white/40 hover:text-white/70 rounded transition-colors disabled:opacity-30"
      >
        {running ? STEPS[stepIdx]?.label ?? 'running…' : 'trigger cycle'}
      </button>
      {result && <span className="text-xs text-white/30">{result}</span>}
      {error  && <span className="text-xs text-red-400/60">error: {error}</span>}
    </div>
  )
}
