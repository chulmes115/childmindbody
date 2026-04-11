import { getMeta, getCurrentBodyCode, getCurrentCycleId } from '@/lib/db'
import { CHILD_SYSTEM_PROMPT, MIND_SYSTEM_PROMPT, BODY_SYSTEM_PROMPT } from '@/lib/prompts'

export const dynamic = 'force-dynamic'

export default async function Stage() {
  const [consecutiveFails, codeFailCount, cycleId, bodyCode] = await Promise.all([
    getMeta('consecutive_fails'),
    getMeta('code_fail_count'),
    getCurrentCycleId(),
    getCurrentBodyCode(),
  ])

  const fails = (consecutiveFails as number) ?? 0
  const codeFails = (codeFailCount as number) ?? 0
  const html = bodyCode ?? ''

  return (
    <main className="min-h-screen bg-black text-white/80 pt-20" style={{ fontFamily: 'var(--font-geist-mono)' }}>

      {/* Header */}
      <header className="border-b border-white/10 px-8 py-6 flex items-baseline gap-8">
        <h1 className="text-white text-sm tracking-widest uppercase">childmindbody</h1>
        <span className="text-white/40 text-xs">cycle {cycleId}</span>
        <span className="ml-auto text-xs text-white/40">
          consecutive failures: <span className="text-white/80">{fails}</span>
          <span className="mx-4 text-white/20">·</span>
          code failures: <span className="text-white/80">{codeFails}</span>
        </span>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-12 space-y-16">

        {/* Agent prompts */}
        <section>
          <h2 className="text-xs tracking-widest uppercase text-white/30 mb-8">The Prompts</h2>
          <div className="space-y-10">
            {[
              { label: 'CHILD', prompt: CHILD_SYSTEM_PROMPT },
              { label: 'MIND',  prompt: MIND_SYSTEM_PROMPT  },
              { label: 'BODY',  prompt: BODY_SYSTEM_PROMPT  },
            ].map(({ label, prompt }) => (
              <div key={label}>
                <p className="text-xs tracking-widest text-white/30 mb-3">{label}</p>
                <pre className="text-white/60 text-xs leading-relaxed whitespace-pre-wrap border border-white/10 p-5 rounded">
                  {prompt}
                </pre>
              </div>
            ))}
          </div>
        </section>

        {/* Body's live output */}
        <section>
          <h2 className="text-xs tracking-widest uppercase text-white/30 mb-4">Body&apos;s Output</h2>
          {html ? (
            <iframe
              srcDoc={html}
              sandbox="allow-scripts allow-forms allow-same-origin"
              className="w-full border border-white/10 rounded bg-white"
              style={{ height: '480px' }}
              title="Body's current output"
            />
          ) : (
            <p className="text-white/30 text-sm italic">Body has not produced output yet.</p>
          )}
        </section>

        {/* Body's raw code */}
        {html && (
          <section>
            <h2 className="text-xs tracking-widest uppercase text-white/30 mb-4">Body&apos;s Code</h2>
            <pre className="text-white/50 text-xs leading-relaxed whitespace-pre-wrap border border-white/10 p-5 rounded overflow-x-auto">
              {html}
            </pre>
          </section>
        )}

      </div>
    </main>
  )
}
