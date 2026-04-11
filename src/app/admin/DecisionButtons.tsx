'use client'

import { useTransition, useState } from 'react'
import { setDecision } from './actions'

type Phase =
  | { name: 'idle' }
  | { name: 'fail_note' }
  | { name: 'decided'; decision: 'pass' | 'fail'; note?: string }

export default function DecisionButtons({
  cycleId,
  initial,
  initialNote,
}: {
  cycleId: number
  initial?: 'pass' | 'fail'
  initialNote?: string
}) {
  const [phase, setPhase] = useState<Phase>(
    initial ? { name: 'decided', decision: initial, note: initialNote } : { name: 'idle' }
  )
  const [note, setNote] = useState('')
  const [pending, startTransition] = useTransition()

  function confirmDecision(decision: 'pass' | 'fail', noteText?: string) {
    startTransition(async () => {
      await setDecision(cycleId, decision, noteText)
      setPhase({ name: 'decided', decision, note: noteText })
    })
  }

  if (phase.name === 'fail_note') {
    return (
      <div className="flex flex-col gap-3 w-full">
        <textarea
          autoFocus
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="reason for failure (optional — Child will read this)"
          rows={3}
          className="bg-transparent border border-white/20 text-white/60 text-xs px-3 py-2 rounded outline-none focus:border-white/35 placeholder:text-white/20 resize-none leading-relaxed"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={() => confirmDecision('fail', note || undefined)}
            disabled={pending}
            className="text-xs px-4 py-1.5 border border-white/30 text-white/60 hover:text-white/80 rounded transition-colors disabled:opacity-30"
          >
            {pending ? 'saving…' : 'confirm fail'}
          </button>
          <button
            onClick={() => { setNote(''); setPhase({ name: 'idle' }) }}
            disabled={pending}
            className="text-xs text-white/20 hover:text-white/40 transition-colors disabled:opacity-30"
          >
            cancel
          </button>
        </div>
      </div>
    )
  }

  if (phase.name === 'decided') {
    return (
      <div className="flex items-start gap-4">
        <div className="flex flex-col gap-1">
          <span className={`text-xs tracking-widest uppercase ${phase.decision === 'pass' ? 'text-white/60' : 'text-white/30'}`}>
            marked: {phase.decision}
          </span>
          {phase.note && (
            <span className="text-xs text-white/25 italic max-w-xs">"{phase.note}"</span>
          )}
        </div>
        <button
          onClick={() => {
            setNote(phase.note ?? '')
            setPhase({ name: 'idle' })
          }}
          className="text-xs text-white/15 hover:text-white/35 transition-colors mt-0.5"
        >
          change
        </button>
      </div>
    )
  }

  // idle
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => confirmDecision('pass')}
        disabled={pending}
        className="text-xs px-4 py-1.5 border border-white/20 text-white/40 hover:border-white/40 hover:text-white/70 rounded transition-colors disabled:opacity-30"
      >
        pass
      </button>
      <button
        onClick={() => setPhase({ name: 'fail_note' })}
        disabled={pending}
        className="text-xs px-4 py-1.5 border border-white/20 text-white/40 hover:border-white/40 hover:text-white/70 rounded transition-colors disabled:opacity-30"
      >
        fail
      </button>
    </div>
  )
}
