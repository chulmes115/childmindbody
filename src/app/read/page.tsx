'use client'

import { useEffect, useRef, useState } from 'react'
import { EXCERPT } from '@/lib/excerpt'

const MIND_TEXT = `The story's most important detail isn't the desert or the pain — it's the iteration numbers. R.D. is #100121. A.C. is #221213. They have done this before, an incomprehensible number of times, and still the mind wakes into nothing and eventually arrives at: I must survive. Not hope. Not purpose. Something more mechanical and more terrifying than either.

This project's agents are also iterations. The consecutive_fails counter, the cycle_id, the codebase_resets — these aren't just database fields, they're the iteration numbers. Child wakes each day with no memory, only Mind's prior analysis as its one thread back. That is Olin. That is the structure.

The design implication: don't aestheticize the suffering. The failure counter displayed plainly next to Body's code on the stage page is already the art. The void (Nothing… … …) before the knowledge floods in is the typewriter landing page doing its work silently. Resist the urge to explain or frame. The numbers speak. Let them.`

const CHAR_DELAY_MS = 70

function useTypewriter(text: string) {
  const [displayed, setDisplayed] = useState('')
  const done = displayed.length >= text.length
  useEffect(() => {
    if (done) return
    const t = setTimeout(
      () => setDisplayed(text.slice(0, displayed.length + 1)),
      CHAR_DELAY_MS
    )
    return () => clearTimeout(t)
  }, [displayed, done, text])
  return { displayed, done }
}

function Cursor({ done }: { done: boolean }) {
  return (
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
  )
}

export default function Home() {
  const mind = useTypewriter(MIND_TEXT)
  const truth = useTypewriter(EXCERPT)
  const mindRef = useRef<HTMLDivElement>(null)
  const truthRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    mindRef.current?.scrollTo(0, mindRef.current.scrollHeight)
  }, [mind.displayed])

  useEffect(() => {
    truthRef.current?.scrollTo(0, truthRef.current.scrollHeight)
  }, [truth.displayed])

  return (
    <main
      className="h-screen flex overflow-hidden pt-11"
      style={{ fontFamily: 'var(--font-geist-sans)' }}
    >
      {/* Mind's Assessment */}
      <div className="flex-1 flex flex-col border-r border-white/10 overflow-hidden">
        <div className="px-10 pt-10 pb-5 shrink-0">
          <p className="text-white/30 text-xs uppercase tracking-widest">Mind's Assessment</p>
          <p className="text-white/18 text-xs mt-1">— AI generated</p>
        </div>
        <div ref={mindRef} className="flex-1 overflow-y-auto px-10 pb-10 scrollbar-none">
          <p className="text-white/50 text-sm leading-relaxed whitespace-pre-wrap">
            {mind.displayed}<Cursor done={mind.done} />
          </p>
        </div>
      </div>

      {/* The Truth */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-10 pt-10 pb-5 shrink-0">
          <p className="text-white/30 text-xs uppercase tracking-widest">The Truth</p>
          <p className="text-white/18 text-xs mt-1">— Human created</p>
        </div>
        <div ref={truthRef} className="flex-1 overflow-y-auto px-10 pb-10 scrollbar-none">
          <p className="text-white/75 text-sm leading-relaxed whitespace-pre-wrap">
            {truth.displayed}<Cursor done={truth.done} />
          </p>
        </div>
      </div>
    </main>
  )
}
