'use client'

import { useState } from 'react'

export default function TriggerCycle() {
  const [pending, setPending] = useState(false)
  const [result, setResult]   = useState<string | null>(null)

  async function trigger() {
    setPending(true)
    setResult(null)
    try {
      const res  = await fetch('/api/admin/trigger-cycle', { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        setResult(`error: ${data.error}`)
      } else {
        setResult(`cycle ${data.cycle} complete — mind: ${data.mindRecommendation}`)
      }
    } catch {
      setResult('error: request failed')
    }
    setPending(false)
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
