'use client'

import { useState } from 'react'

export default function CondenseDisquiet({ cycleId }: { cycleId: number }) {
  const [running, setRunning] = useState(false)
  const [result,  setResult]  = useState<string | null>(null)
  const [error,   setError]   = useState<string | null>(null)

  async function condense() {
    setRunning(true)
    setResult(null)
    setError(null)
    try {
      const res  = await fetch('/api/admin/disquiet/condense', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ cycleId }),
      })
      const data = await res.json() as { done?: boolean; skipped?: boolean; reason?: string; summary?: string; error?: string }
      if (data.error) throw new Error(data.error)
      if (data.skipped) setResult(data.reason ?? 'nothing to summarize')
      else              setResult('condensed — reload to see memory')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown error')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <button
        onClick={condense}
        disabled={running}
        className="text-xs text-white/50 border border-white/20 px-3 py-1.5 rounded hover:text-white/75 hover:border-white/40 transition-colors disabled:opacity-30"
      >
        {running ? 'summarizing…' : 'condense memory'}
      </button>
      {result && <span className="text-xs text-white/30">{result}</span>}
      {error  && <span className="text-xs text-red-400/60">error: {error}</span>}
    </div>
  )
}
