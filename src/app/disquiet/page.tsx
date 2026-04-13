'use client'

import { useEffect, useRef, useState } from 'react'

type Message = {
  role:      'user' | 'child'
  text:      string
  timestamp: string
}

const MAX_QUESTIONS = 10
const MAX_CHARS     = 50
const POLL_INTERVAL = 15_000

export default function Disquiet() {
  const [messages,      setMessages]      = useState<Message[]>([])
  const [questionsLeft, setQuestionsLeft] = useState<number | null>(null)
  const [cycleId,       setCycleId]       = useState<number>(0)
  const [input,         setInput]         = useState('')
  const [submitting,    setSubmitting]    = useState(false)
  const [error,         setError]         = useState('')
  const [childTyping,   setChildTyping]   = useState(false)

  const listRef    = useRef<HTMLDivElement>(null)
  const nearBottom = useRef(true)

  const charCount = input.trim().length
  const overLimit = charCount > MAX_CHARS
  const canSubmit = !submitting && !overLimit && charCount > 0 && (questionsLeft ?? 0) > 0

  async function fetchState() {
    const res = await fetch('/api/disquiet')
    if (!res.ok) return
    const data = await res.json() as { messages: Message[]; questionsLeft: number; cycleId: number }
    setMessages(data.messages)
    setQuestionsLeft(data.questionsLeft)
    setCycleId(data.cycleId)
  }

  useEffect(() => { fetchState() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setInterval(fetchState, POLL_INTERVAL)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const handler = () => {
      nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    }
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    if (nearBottom.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, childTyping])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    const question = input.trim()
    setInput('')
    setError('')
    setSubmitting(true)
    setChildTyping(true)

    const optimistic: Message = { role: 'user', text: question, timestamp: new Date().toISOString() }
    setMessages((prev) => [...prev, optimistic])
    setQuestionsLeft((q) => (q !== null ? Math.max(0, q - 1) : null))

    try {
      const res  = await fetch('/api/disquiet', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ question }),
      })
      const data = await res.json() as { answer?: string; error?: string }

      if (!res.ok || data.error) {
        setError(data.error ?? 'Something went wrong')
        setMessages((prev) => prev.filter((m) => m !== optimistic))
        setQuestionsLeft((q) => (q !== null ? q + 1 : null))
      } else if (data.answer) {
        setMessages((prev) => [
          ...prev,
          { role: 'child', text: data.answer!, timestamp: new Date().toISOString() },
        ])
      }
    } catch {
      setError('Connection failed')
      setMessages((prev) => prev.filter((m) => m !== optimistic))
      setQuestionsLeft((q) => (q !== null ? q + 1 : null))
    } finally {
      setSubmitting(false)
      setChildTyping(false)
    }
  }

  const exhausted = questionsLeft === 0

  return (
    <div
      className="min-h-screen flex flex-col pt-11"
      style={{ background: '#0a0a0a', fontFamily: 'var(--font-geist-mono)' }}
    >

      {/* Header */}
      <div className="border-b border-white/8 px-6 py-4 flex items-baseline justify-between">
        <div>
          <p className="text-white/30 text-xs uppercase tracking-widest">Child&apos;s disquiet</p>
          {cycleId > 0 && (
            <p className="text-white/15 text-xs mt-0.5">cycle {cycleId}</p>
          )}
        </div>
        <div className="text-right">
          {questionsLeft !== null && (
            <p className={`text-xs tabular-nums ${exhausted ? 'text-white/20' : 'text-white/40'}`}>
              {questionsLeft} / {MAX_QUESTIONS} questions remain
            </p>
          )}
        </div>
      </div>

      {/* Conversation */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-6 py-8 space-y-6"
        style={{ maxHeight: 'calc(100vh - 160px)' }}
      >
        {messages.length === 0 && !childTyping && (
          <p className="text-white/20 text-xs italic">No one has spoken yet this cycle.</p>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'user' ? (
              <div
                className="max-w-xs text-xs leading-relaxed px-4 py-3 rounded"
                style={{
                  background: 'rgba(0, 56, 180, 0.25)',
                  border:     '1px solid rgba(30, 80, 200, 0.35)',
                  color:      'rgba(180, 210, 255, 0.85)',
                }}
              >
                <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'rgba(100, 160, 255, 0.5)' }}>
                  Human created
                </p>
                <p style={{ wordBreak: 'break-word' }}>{msg.text}</p>
              </div>
            ) : (
              <div className="max-w-xs text-xs leading-relaxed px-4 py-3 rounded border border-white/12">
                <p className="text-white/25 text-[10px] uppercase tracking-widest mb-1.5">AI generated</p>
                <p className="text-white/80" style={{ wordBreak: 'break-word' }}>{msg.text}</p>
              </div>
            )}
          </div>
        ))}

        {childTyping && (
          <div className="flex justify-start">
            <div className="border border-white/12 px-4 py-3 rounded">
              <p className="text-white/25 text-[10px] uppercase tracking-widest mb-1.5">AI generated</p>
              <span className="text-white/30 text-xs">…</span>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-white/8 px-6 py-5">
        {!exhausted ? (
          <>
            <p className="text-white/25 text-xs mb-4 leading-relaxed">
              Ask Child a question. Be careful what you say. It takes one poorly chosen word to wound him forever.
            </p>
            <form onSubmit={handleSubmit} className="flex items-end gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => { setInput(e.target.value); setError('') }}
                  placeholder="your question"
                  maxLength={MAX_CHARS + 20}
                  disabled={submitting}
                  className="w-full bg-transparent border border-white/15 text-[#7dd3fc]/70 text-xs px-3 py-2 rounded outline-none focus:border-white/30 placeholder:text-white/20 disabled:opacity-40"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(e) } }}
                />
                <span
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tabular-nums pointer-events-none ${
                    overLimit ? 'text-red-400/70' : 'text-white/20'
                  }`}
                >
                  {charCount}/{MAX_CHARS}
                </span>
              </div>
              <button
                type="submit"
                disabled={!canSubmit}
                className="text-xs text-white/40 border border-white/15 px-4 py-2 rounded hover:text-white/70 hover:border-white/30 transition-colors disabled:opacity-25 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {submitting ? '…' : 'ask'}
              </button>
            </form>
            {error && (
              <p className="text-red-400/60 text-xs mt-2">{error}</p>
            )}
          </>
        ) : (
          <p className="text-white/20 text-xs italic">
            Child has fallen silent. This cycle is over.
          </p>
        )}
      </div>

    </div>
  )
}
