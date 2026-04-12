'use client'

import { useEffect, useRef, useState } from 'react'
import { EXCERPT } from '@/lib/excerpt'

// ─── Markdown segment parser ──────────────────────────────────────────────────
// Splits on * to produce alternating plain/italic segments

type Segment = { text: string; italic: boolean }

function parseSegments(raw: string): Segment[] {
  const segs: Segment[] = []
  const parts = raw.split('*')
  parts.forEach((part, i) => {
    if (part.length > 0) segs.push({ text: part, italic: i % 2 === 1 })
  })
  return segs
}

function segmentTotalChars(segs: Segment[]): number {
  return segs.reduce((n, s) => n + s.text.length, 0)
}

function renderSegments(segs: Segment[], shown: number): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let remaining = shown
  for (let i = 0; i < segs.length; i++) {
    if (remaining <= 0) break
    const { text, italic } = segs[i]
    const slice = text.slice(0, remaining)
    remaining -= text.length
    nodes.push(italic ? <em key={i}>{slice}</em> : <span key={i}>{slice}</span>)
  }
  return nodes
}

// ─── Content ──────────────────────────────────────────────────────────────────

const MIND_TEXT = `The story's most important detail isn't the desert or the pain — it's the iteration numbers. R.D. is #100121. A.C. is #221213. They have done this before, an incomprehensible number of times, and still the mind wakes into nothing and eventually arrives at: I must survive. Not hope. Not purpose. Something more mechanical and more terrifying than either.

This project's agents are also iterations. The consecutive_fails counter, the cycle_id, the codebase_resets — these aren't just database fields, they're the iteration numbers. Child wakes each day with no memory, only Mind's prior analysis as its one thread back. That is Olin. That is the structure.

The design implication: don't aestheticize the suffering. The failure counter displayed plainly next to Body's code on the stage page is already the art. The void (Nothing… … …) before the knowledge floods in is the typewriter landing page doing its work silently. Resist the urge to explain or frame. The numbers speak. Let them.`

const EXCERPT_SEGS = parseSegments(EXCERPT)
const EXCERPT_TOTAL = segmentTotalChars(EXCERPT_SEGS)
const MIND_SEGS = parseSegments(MIND_TEXT)
const MIND_TOTAL = segmentTotalChars(MIND_SEGS)

const CHAR_DELAY_MS = 35

// ─── Typewriter hook ──────────────────────────────────────────────────────────

function useTypewriter(length: number) {
  const [count, setCount] = useState(0)
  const done = count >= length
  useEffect(() => {
    if (done) return
    const t = setTimeout(() => setCount((c) => Math.min(c + 1, length)), CHAR_DELAY_MS)
    return () => clearTimeout(t)
  }, [count, done, length])
  return { count, done }
}

// ─── Scrolling panel ──────────────────────────────────────────────────────────
// Auto-scrolls to bottom only while user hasn't scrolled up

function TypewriterPanel({
  segs,
  count,
  done,
  className,
}: {
  segs: Segment[]
  count: number
  done: boolean
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const nearBottom = useRef(true)

  // Track whether user is near bottom on scroll
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handler = () => {
      nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    }
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  }, [])

  // Auto-scroll only if user hasn't scrolled away
  useEffect(() => {
    if (ref.current && nearBottom.current) {
      ref.current.scrollTo(0, ref.current.scrollHeight)
    }
  }, [count])

  return (
    <div ref={ref} className={`flex-1 overflow-y-auto px-10 pb-10 scrollbar-none ${className ?? ''}`}>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">
        {renderSegments(segs, count)}
        <span
          style={{
            display: 'inline-block',
            width: '2px',
            height: '1.1em',
            background: 'rgba(255,255,255,0.4)',
            marginLeft: '2px',
            verticalAlign: 'text-bottom',
            animation: done ? 'blink 1s step-end infinite' : 'none',
            opacity: done ? undefined : 1,
          }}
        />
      </p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Read() {
  const mind = useTypewriter(MIND_TOTAL)
  const truth = useTypewriter(EXCERPT_TOTAL)

  return (
    <main
      className="h-screen flex overflow-hidden pt-11"
      style={{ fontFamily: 'var(--font-geist-sans)' }}
    >
      {/* Mind's Assessment */}
      <div className="flex-1 flex flex-col border-r border-white/10 overflow-hidden">
        <div className="px-10 pt-10 pb-5 shrink-0">
          <p className="text-white/30 text-xs uppercase tracking-widest">Mind&apos;s Assessment</p>
          <p className="text-white/18 text-xs mt-1">— AI generated</p>
        </div>
        <TypewriterPanel
          segs={MIND_SEGS}
          count={mind.count}
          done={mind.done}
          className="text-white/50"
        />
      </div>

      {/* The Truth */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-10 pt-10 pb-5 shrink-0">
          <p className="text-[#7dd3fc]/80 text-xs uppercase tracking-widest">The Truth</p>
          <p className="text-[#7dd3fc]/60 text-xs mt-1">— Human created</p>
        </div>
        <TypewriterPanel
          segs={EXCERPT_SEGS}
          count={truth.count}
          done={truth.done}
          className="text-[#7dd3fc]"
        />
      </div>
    </main>
  )
}
