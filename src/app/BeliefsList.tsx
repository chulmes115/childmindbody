'use client'

import { useEffect, useState } from 'react'

const BELIEFS = [
  'Life is meaningless.',
  'Emotion is merely a biological function.',
  'Meaning is only an emotion.',
  'Art is not the creation itself, but the experience of creation itself.',
  'Meaning and emotion are experience.',
  'Only humans can experience.',
  'AI cannot experience.',
  'AI cannot create art.',
]

const CHAR_DELAY_MS   = 40
const BELIEF_PAUSE_MS = 700

export default function BeliefsList() {
  const [current, setCurrent] = useState(0)
  const [chars,   setChars]   = useState(0)

  useEffect(() => {
    if (current >= BELIEFS.length) return
    const belief = BELIEFS[current]

    if (chars < belief.length) {
      const t = setTimeout(() => setChars(c => c + 1), CHAR_DELAY_MS)
      return () => clearTimeout(t)
    }

    if (current < BELIEFS.length - 1) {
      const t = setTimeout(() => {
        setCurrent(b => b + 1)
        setChars(0)
      }, BELIEF_PAUSE_MS)
      return () => clearTimeout(t)
    }
  }, [current, chars])

  return (
    <ol className="space-y-3">
      {BELIEFS.map((b, i) => {
        if (i > current) return null
        const done = i < current || chars >= b.length
        const text = done ? b : b.slice(0, chars)
        return (
          <li key={i} className="flex gap-4 items-baseline">
            <span className="text-[#7dd3fc]/50 text-xs shrink-0 tabular-nums">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="text-[#7dd3fc] text-sm">
              {text}
              {!done && <span className="opacity-40">|</span>}
              {done && (
                <img
                  src="/enso-watermark.png"
                  alt=""
                  aria-hidden="true"
                  className="inline-block ml-2 align-middle opacity-35"
                  style={{ height: '0.85em', width: '0.85em', filter: 'invert(1)' }}
                />
              )}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
