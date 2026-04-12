'use client'

import { useRef, useState, useTransition } from 'react'
import { addOlinMessage, removeOlinMessage } from './actions'
import type { OlinMessage } from '@/lib/db'

// ── Watermark slot upload ──────────────────────────────────────────────────────

function WatermarkSlot({
  slot,
  initialUrl,
}: {
  slot: 1 | 2 | 3
  initialUrl: string | null
}) {
  const [url,       setUrl]       = useState(initialUrl)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    const form = new FormData()
    form.append('image', file)
    form.append('slot', String(slot))
    try {
      const res  = await fetch('/api/olin/watermark-upload', { method: 'POST', body: form })
      const data = await res.json() as { ok?: boolean; url?: string; error?: string }
      if (data.ok && data.url) setUrl(data.url)
      else setError(data.error ?? 'Upload failed')
    } catch {
      setError('Upload failed')
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-white/20 text-[10px] uppercase tracking-widest">slot {slot}</p>
      {url ? (
        <img
          src={url}
          alt={`Watermark ${slot}`}
          className="w-20 h-20 object-contain rounded border border-white/10"
          style={{ background: '#111' }}
        />
      ) : (
        <div className="w-20 h-20 border border-white/10 rounded flex items-center justify-center">
          <span className="text-white/15 text-xs">empty</span>
        </div>
      )}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="text-[10px] text-white/30 border border-white/15 px-2 py-1 rounded hover:text-white/55 hover:border-white/30 transition-colors disabled:opacity-30 w-fit"
      >
        {uploading ? 'uploading…' : url ? 'replace' : 'upload'}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      {error && <p className="text-red-400/60 text-[10px]">{error}</p>}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OlinAdmin({
  initialMessages,
  initialWatermarks,
}: {
  initialMessages:  OlinMessage[]
  initialWatermarks: (string | null)[]
}) {
  const [messages,   setMessages]   = useState(initialMessages)
  const [isPending,  startTransition] = useTransition()

  async function handleDelete(timestamp: string) {
    startTransition(async () => {
      await removeOlinMessage(timestamp)
      setMessages((prev) => prev.filter((m) => m.timestamp !== timestamp))
    })
  }

  return (
    <div className="space-y-10">

      {/* Add message */}
      <div>
        <p className="text-white/20 text-xs mb-4">Journal entries — appear one by one on /olin every 10 seconds.</p>
        <form
          action={async (formData) => {
            const text = (formData.get('text') as string ?? '').trim()
            if (!text) return
            await addOlinMessage(formData)
            setMessages((prev) => [...prev, { text, timestamp: new Date().toISOString() }])
          }}
          className="flex items-center gap-3"
        >
          <input
            name="text"
            type="text"
            placeholder="i love you still"
            className="flex-1 bg-transparent border border-white/15 text-white/60 text-xs px-3 py-2 rounded outline-none focus:border-white/30 placeholder:text-white/20"
          />
          <button
            type="submit"
            disabled={isPending}
            className="text-xs text-white/40 border border-white/20 px-4 py-2 rounded hover:text-white/70 hover:border-white/40 transition-colors disabled:opacity-30 whitespace-nowrap"
          >
            add
          </button>
        </form>
      </div>

      {/* Message list */}
      {messages.length > 0 && (
        <div className="space-y-2">
          {messages.map((msg, i) => (
            <div key={msg.timestamp} className="flex items-center gap-3 group">
              <span className="text-white/15 text-[10px] tabular-nums w-5 shrink-0">{i + 1}</span>
              <p className="text-white/55 text-xs flex-1">{msg.text}</p>
              <button
                onClick={() => handleDelete(msg.timestamp)}
                className="text-[10px] text-white/15 hover:text-red-400/60 transition-colors opacity-0 group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Watermarks */}
      <div>
        <p className="text-white/20 text-xs mb-4">Watermarks — three ink pieces in triangle formation on /olin.</p>
        <div className="flex gap-8">
          {([1, 2, 3] as const).map((slot) => (
            <WatermarkSlot key={slot} slot={slot} initialUrl={initialWatermarks[slot - 1]} />
          ))}
        </div>
      </div>

    </div>
  )
}
