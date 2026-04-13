'use client'

import { useState } from 'react'

function parseResponse(raw: string): string {
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      if (typeof parsed.response === 'string') return parsed.response
      return Object.values(parsed).filter((v) => typeof v === 'string').join(' — ')
    }
    return raw
  } catch {
    return raw
  }
}

export default function BodyOutput({
  html,
  bodyDirection,
  intakeResponses = [],
}: {
  html: string
  bodyDirection?: string
  intakeResponses?: string[]
}) {
  const [tab, setTab] = useState<'output' | 'code' | 'wounds'>('output')

  if (!html) {
    return <p className="text-white/50 text-sm italic">Body has not produced output yet.</p>
  }

  const tabs = [
    { id: 'output', label: 'output' },
    { id: 'code',   label: 'code' },
    { id: 'wounds', label: `collected wounds${intakeResponses.length > 0 ? ` (${intakeResponses.length})` : ''}` },
  ] as const

  return (
    <div>
      <div className="flex items-baseline gap-6 mb-4">
        <h2 className="text-xs tracking-widest uppercase text-white/50">Body&apos;s output</h2>
        <div className="flex gap-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`text-xs transition-colors ${
                t.id === 'wounds'
                  ? tab === t.id
                    ? 'text-[#7dd3fc]/80 underline underline-offset-4'
                    : 'text-[#7dd3fc]/30 hover:text-[#7dd3fc]/55'
                  : tab === t.id
                  ? 'text-white/80 underline underline-offset-4'
                  : 'text-white/30 hover:text-white/55'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'output' && (
        <iframe
          srcDoc={html}
          sandbox="allow-scripts allow-forms allow-same-origin"
          className="w-full border border-white/15 rounded bg-white"
          style={{ height: '520px' }}
          title="Body's current output"
        />
      )}

      {tab === 'code' && (
        <pre className="text-white/65 text-xs leading-relaxed whitespace-pre-wrap border border-white/15 p-5 rounded overflow-x-auto">
          {html}
        </pre>
      )}

      {tab === 'wounds' && (
        <div className="border border-white/15 rounded p-5 min-h-32">
          {intakeResponses.length === 0 ? (
            <p className="text-white/25 text-sm italic">No responses collected this cycle.</p>
          ) : (
            <ol className="space-y-3">
              {intakeResponses.map((raw, i) => (
                <li key={i} className="flex gap-4">
                  <span className="text-white/20 text-xs pt-0.5 shrink-0 tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[#7dd3fc]/65 text-sm leading-relaxed">
                    {parseResponse(raw)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {bodyDirection && (
        <div className="mt-5 border-t border-white/8 pt-5">
          <p className="text-xs tracking-widest uppercase text-white/30 mb-2">Child told Body</p>
          <pre className="text-white/45 text-xs leading-relaxed whitespace-pre-wrap border border-white/8 p-4 rounded">
            {bodyDirection}
          </pre>
        </div>
      )}
    </div>
  )
}
