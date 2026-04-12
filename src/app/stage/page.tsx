import { getMeta, getCurrentBodyCode, getCurrentCycleId, getCycleRecord, getIntakeResponses } from '@/lib/db'
import { CHILD_SYSTEM_PROMPT, MIND_SYSTEM_PROMPT, BODY_SYSTEM_PROMPT } from '@/lib/prompts'
import BodyOutput from './BodyOutput'

export const dynamic = 'force-dynamic'

const PROMPTS = [
  { label: 'inside Child', prompt: CHILD_SYSTEM_PROMPT },
  { label: 'inside Mind',  prompt: MIND_SYSTEM_PROMPT  },
  { label: 'inside Body',  prompt: BODY_SYSTEM_PROMPT  },
]

export default async function Stage() {
  const [consecutiveFails, codeFailCount, cycleId, bodyCode] = await Promise.all([
    getMeta('consecutive_fails'),
    getMeta('code_fail_count'),
    getCurrentCycleId(),
    getCurrentBodyCode(),
  ])

  const [currentRecord, intakeResponses] = await Promise.all([
    cycleId > 0 ? getCycleRecord(cycleId) : Promise.resolve(null),
    cycleId > 0 ? getIntakeResponses(cycleId) : Promise.resolve([]),
  ])

  const fails     = (consecutiveFails as number) ?? 0
  const codeFails = (codeFailCount as number) ?? 0
  const html      = bodyCode ?? ''

  return (
    <main className="min-h-screen text-white/80 pt-20" style={{ fontFamily: 'var(--font-geist-mono)' }}>

      {/* Header */}
      <header className="border-b border-white/10 px-8 py-6 flex items-baseline gap-8">
        <h1 className="text-white text-sm tracking-widest uppercase">childmindbody</h1>
        <span className="text-white/55 text-xs">cycle {cycleId}</span>
        <span className="ml-auto text-xs text-white/55">
          consecutive failures: <span className="text-white/90">{fails}</span>
          <span className="mx-4 text-white/30">·</span>
          code failures: <span className="text-white/90">{codeFails}</span>
        </span>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-12 space-y-16">

        {/* Prompt drawers — inside Child / Mind / Body */}
        <section className="flex gap-3 flex-wrap">
          {PROMPTS.map(({ label, prompt }) => (
            <details key={label} className="group w-full">
              <summary className="inline-flex items-center gap-2 text-xs text-white/40 border border-white/15 px-4 py-2 rounded cursor-pointer hover:text-white/65 hover:border-white/30 transition-colors list-none w-fit">
                <span className="group-open:hidden">↓</span>
                <span className="hidden group-open:inline">↑</span>
                {label}
              </summary>
              <pre className="mt-3 text-white/65 text-xs leading-relaxed whitespace-pre-wrap border border-white/10 p-5 rounded">
                {prompt}
              </pre>
            </details>
          ))}
        </section>

        {/* Body's output (with output / code tab) */}
        <section>
          <BodyOutput html={html} bodyDirection={currentRecord?.body_direction} intakeResponses={intakeResponses} />
        </section>

        {/* Child's attempt */}
        <section>
          <p className="text-xs tracking-widest uppercase text-white/50 mb-4">Child&apos;s attempt</p>
          {currentRecord?.child_resolution ? (
            <pre className="text-white/75 text-xs leading-relaxed whitespace-pre-wrap border border-white/15 p-5 rounded">
              {currentRecord.child_resolution}
            </pre>
          ) : (
            <p className="text-white/30 text-sm italic">No resolution yet — trigger a cycle to begin.</p>
          )}
        </section>

        {/* Mind's analysis */}
        <section>
          <div className="flex items-baseline gap-4 mb-4">
            <p className="text-xs tracking-widest uppercase text-white/50">Mind&apos;s analysis</p>
            {currentRecord?.mind_rec && (
              <span className={`text-xs px-2 py-0.5 border rounded uppercase tracking-wider ${
                currentRecord.mind_rec === 'pass'
                  ? 'border-white/30 text-white/60'
                  : 'border-white/10 text-white/25'
              }`}>
                {currentRecord.mind_rec}
              </span>
            )}
          </div>
          {currentRecord?.mind_analysis ? (
            <pre className="text-white/75 text-xs leading-relaxed whitespace-pre-wrap border border-white/15 p-5 rounded">
              {currentRecord.mind_analysis}
            </pre>
          ) : (
            <p className="text-white/30 text-sm italic">No analysis yet — trigger a cycle to begin.</p>
          )}
        </section>

      </div>
    </main>
  )
}
