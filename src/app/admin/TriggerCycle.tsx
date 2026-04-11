'use client'

import { useTransition, useState } from 'react'
import { triggerNewCycle } from './actions'

export default function TriggerCycle() {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)

  function trigger() {
    setResult(null)
    startTransition(async () => {
      try {
        const r = await triggerNewCycle()
        setResult(`cycle ${r.cycle} complete — mind: ${r.mindRecommendation}`)
      } catch (e) {
        setResult(`error: ${e instanceof Error ? e.message : 'unknown'}`)
      }
    })
  }

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={trigger}
        disabled={pending}
        className="text-xs px-4 py-1.5 border border-white/20 text-white/40 hover:border-white/40 hover:text-white/70 rounded transition-colors disabled:opacity-30"
      >
        {pending ? 'running…' : 'trigger cycle'}
      </button>
      {result && (
        <span className="text-xs text-white/30">{result}</span>
      )}
    </div>
  )
}
