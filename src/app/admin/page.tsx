import { cookies } from 'next/headers'
import { getMeta, getCurrentCycleId, getCycleRecord, getInspirationImages, getDisquietMemory, getDisquietCount, getOlinMessages, getOlinWatermarks } from '@/lib/db'
import { login, logout, seedBodyCode } from './actions'
import DecisionButtons from './DecisionButtons'
import TriggerCycle from './TriggerCycle'
import CondenseDisquiet from './CondenseDisquiet'
import OlinAdmin from './OlinAdmin'
import InspirationUpload from '@/app/bodys-message/InspirationUpload'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const store = await cookies()
  const isAuthed = store.get('cmb_admin')?.value === process.env.ADMIN_SECRET

  if (!isAuthed) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ fontFamily: 'var(--font-geist-mono)' }}>
        <form action={login} className="flex flex-col gap-4 w-64">
          <p className="text-white/30 text-xs uppercase tracking-widest mb-2">admin</p>
          <input
            name="secret"
            type="password"
            autoFocus
            placeholder="secret"
            className="bg-transparent border border-white/20 text-white/70 text-sm px-3 py-2 rounded outline-none focus:border-white/40 placeholder:text-white/20"
          />
          <button
            type="submit"
            className="text-xs text-white/40 border border-white/20 px-4 py-2 rounded hover:text-white/70 hover:border-white/40 transition-colors"
          >
            enter
          </button>
        </form>
      </main>
    )
  }

  // ── Fetch current state ─────────────────────────────────────────────────────
  const [cycleId, consecutiveFails, codeFailCount, mindFailCount, inspirationImages, disquietMemory, disquietCount, olinMessages, olinWatermarks] = await Promise.all([
    getCurrentCycleId(),
    getMeta('consecutive_fails'),
    getMeta('code_fail_count'),
    getMeta('mind_fail_count'),
    getInspirationImages(),
    getDisquietMemory(),
    getCurrentCycleId().then((id) => getDisquietCount(id)),
    getOlinMessages(),
    getOlinWatermarks(),
  ])

  const currentRecord = cycleId > 0 ? await getCycleRecord(cycleId) : null

  // History: last 15 cycles in reverse order (excluding current)
  const historyIds = Array.from(
    { length: Math.min(cycleId - 1, 15) },
    (_, i) => cycleId - 1 - i
  ).filter((id) => id > 0)
  const history = await Promise.all(historyIds.map((id) => getCycleRecord(id)))

  const childFails = (consecutiveFails as number) ?? 0
  const bodyFails  = (codeFailCount   as number) ?? 0
  const mindFails  = (mindFailCount   as number) ?? 0

  return (
    <main className="min-h-screen text-white/80" style={{ fontFamily: 'var(--font-geist-mono)' }}>

      {/* Header */}
      <header className="border-b border-white/10 px-8 py-5 flex items-baseline gap-6">
        <p className="text-white/30 text-xs uppercase tracking-widest">admin</p>
        <span className="text-white/20 text-xs">cycle {cycleId}</span>
        <span className="text-white/20 text-xs">
          Child: <span className="text-white/50">{childFails}</span>
        </span>
        <span className="text-white/20 text-xs">
          Body: <span className="text-white/50">{bodyFails}</span>
        </span>
        <span className="text-white/20 text-xs">
          Mind: <span className="text-white/50">{mindFails}</span>
        </span>
        <form action={logout} className="ml-auto">
          <button type="submit" className="text-xs text-white/20 hover:text-white/40 transition-colors">
            logout
          </button>
        </form>
      </header>

      <div className="max-w-3xl mx-auto px-8 py-12 space-y-16">

        {/* Current cycle */}
        <section>
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="text-xs tracking-widest uppercase text-white/30">Current Cycle</h2>
            <div className="flex items-center gap-4">
              <form action={seedBodyCode}>
                <button
                  type="submit"
                  className="text-xs text-white/50 border border-white/20 px-3 py-1.5 rounded hover:text-white/75 hover:border-white/40 transition-colors"
                >
                  seed body
                </button>
              </form>
              <TriggerCycle />
            </div>
          </div>

          {!currentRecord ? (
            <p className="text-white/20 text-sm italic">No cycles run yet.</p>
          ) : (
            <div className="space-y-8">

              {/* Mind's recommendation badge */}
              <div className="flex items-center gap-4">
                <span className="text-xs text-white/30">mind recommends:</span>
                <span className={`text-xs px-3 py-1 border rounded uppercase tracking-wider ${
                  currentRecord.mind_rec === 'pass'
                    ? 'border-white/30 text-white/60'
                    : 'border-white/10 text-white/25'
                }`}>
                  {currentRecord.mind_rec ?? '—'}
                </span>
                <span className="text-white/20 text-xs mx-2">·</span>
                <span className="text-xs text-white/30">your decision:</span>
                <DecisionButtons
                  cycleId={cycleId}
                  initial={currentRecord.chris_decision}
                  initialNote={currentRecord.olin_note}
                />
              </div>

              {/* Child's resolution */}
              <div>
                <p className="text-xs tracking-widest uppercase text-white/25 mb-3">Child</p>
                <pre className="text-white/60 text-xs leading-relaxed whitespace-pre-wrap border border-white/10 p-5 rounded">
                  {currentRecord.child_resolution ?? 'not yet run'}
                </pre>
              </div>

              {/* Mind's analysis */}
              <div>
                <p className="text-xs tracking-widest uppercase text-white/25 mb-3">Mind</p>
                <pre className="text-white/60 text-xs leading-relaxed whitespace-pre-wrap border border-white/10 p-5 rounded">
                  {currentRecord.mind_analysis ?? 'not yet run'}
                </pre>
              </div>

              {/* Intake */}
              {currentRecord.intake_condensed && (
                <div>
                  <p className="text-xs tracking-widest uppercase text-white/25 mb-3">Intake (condensed)</p>
                  <pre className="text-white/40 text-xs leading-relaxed whitespace-pre-wrap border border-white/10 p-5 rounded">
                    {currentRecord.intake_condensed}
                  </pre>
                </div>
              )}

            </div>
          )}
        </section>

        {/* History */}
        {history.length > 0 && (
          <section>
            <h2 className="text-xs tracking-widest uppercase text-white/30 mb-6">History</h2>
            <div className="space-y-3">
              {history.map((record) => {
                if (!record) return null
                return (
                  <div
                    key={record.id}
                    className="border border-white/10 rounded p-4 grid grid-cols-[3rem_1fr_auto_auto] gap-4 items-start"
                  >
                    <span className="text-white/25 text-xs pt-0.5">#{record.id}</span>
                    <p className="text-white/50 text-xs leading-relaxed line-clamp-2">
                      {record.child_resolution ?? '—'}
                    </p>
                    <span className={`text-xs ${record.mind_rec === 'pass' ? 'text-white/40' : 'text-white/20'}`}>
                      {record.mind_rec ?? '—'}
                    </span>
                    <span className={`text-xs ${record.chris_decision ? 'text-white/60' : 'text-white/15 italic'}`}>
                      {record.chris_decision ?? 'undecided'}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Disquiet memory */}
        <section>
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-xs tracking-widest uppercase text-white/30">Child&apos;s Disquiet</h2>
            <div className="flex items-center gap-4">
              <span className="text-white/20 text-xs">{disquietCount} / 10 questions used this cycle</span>
              <CondenseDisquiet cycleId={cycleId} />
            </div>
          </div>
          <p className="text-white/20 text-xs mb-4">
            Accumulated memory from past cycles. Click &ldquo;condense memory&rdquo; to summarize and append the current cycle&apos;s conversation before triggering a new cycle.
          </p>
          {disquietMemory ? (
            <pre className="text-white/40 text-xs leading-relaxed whitespace-pre-wrap border border-white/10 p-5 rounded">
              {disquietMemory}
            </pre>
          ) : (
            <p className="text-white/20 text-xs italic">No memory yet.</p>
          )}
        </section>

        {/* Olin — journal messages + watermarks */}
        <section>
          <h2 className="text-xs tracking-widest uppercase text-white/30 mb-6">Olin</h2>
          <OlinAdmin initialMessages={olinMessages} initialWatermarks={olinWatermarks} />
        </section>

        {/* Inspiration — Body's message reference art */}
        <section>
          <h2 className="text-xs tracking-widest uppercase text-white/30 mb-6">Inspiration</h2>
          <p className="text-white/20 text-xs mb-6">
            Your uploaded artwork. Analyzed by Claude and used as creative reference for Body&apos;s message image generation.
          </p>
          <InspirationUpload
            initial={inspirationImages.slice().reverse()}
            showUpload={true}
          />
        </section>

      </div>
    </main>
  )
}
