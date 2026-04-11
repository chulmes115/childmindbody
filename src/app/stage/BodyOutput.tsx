'use client'

import { useState } from 'react'

export default function BodyOutput({ html }: { html: string }) {
  const [tab, setTab] = useState<'output' | 'code'>('output')

  if (!html) {
    return <p className="text-white/50 text-sm italic">Body has not produced output yet.</p>
  }

  return (
    <div>
      <div className="flex items-baseline gap-6 mb-4">
        <h2 className="text-xs tracking-widest uppercase text-white/50">Body&apos;s output</h2>
        <div className="flex gap-4">
          {(['output', 'code'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-xs transition-colors ${
                tab === t
                  ? 'text-white/80 underline underline-offset-4'
                  : 'text-white/30 hover:text-white/55'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'output' ? (
        <iframe
          srcDoc={html}
          sandbox="allow-scripts allow-forms allow-same-origin"
          className="w-full border border-white/15 rounded bg-white"
          style={{ height: '520px' }}
          title="Body's current output"
        />
      ) : (
        <pre className="text-white/65 text-xs leading-relaxed whitespace-pre-wrap border border-white/15 p-5 rounded overflow-x-auto">
          {html}
        </pre>
      )}
    </div>
  )
}
