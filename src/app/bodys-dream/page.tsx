import { getBodyMessageStatus, getInspirationImages } from '@/lib/db'
import { STORY_WORD_COUNT, STORY_WORDS, WORDS_PER_CYCLE } from '@/lib/excerpt'
import InspirationUpload from './InspirationUpload'

export const dynamic = 'force-dynamic'

const CHUNK_SIZE = WORDS_PER_CYCLE

export default async function BodysMessage() {
  const [status, inspirationImages] = await Promise.all([
    getBodyMessageStatus(),
    getInspirationImages(),
  ])

  const cycleNumber  = status.wordPosition === 0 ? 0 : Math.ceil(status.wordPosition / CHUNK_SIZE)
  const totalCycles  = Math.ceil(STORY_WORD_COUNT / CHUNK_SIZE)
  const progressPct  = status.wordPosition === 0 ? 0 : Math.round((status.wordPosition / STORY_WORD_COUNT) * 100)

  // Word window: previous chunk (dim) + current chunk (vivid)
  const currentEnd   = status.wordPosition
  const currentStart = Math.max(0, currentEnd - CHUNK_SIZE)
  const pastStart    = Math.max(0, currentStart - CHUNK_SIZE)
  const pastChunk    = currentStart > 0 ? STORY_WORDS.slice(pastStart, currentStart).join(' ') : ''
  const currentChunk = currentEnd   > 0 ? STORY_WORDS.slice(currentStart, currentEnd).join(' ') : ''

  return (
    <main
      className="min-h-screen text-white/80 pt-20"
      style={{ fontFamily: 'var(--font-geist-sans)' }}
    >
      <div className="max-w-3xl mx-auto px-8 py-12 space-y-20">

        {/* AI Generated — current image */}
        <section>
          <div className="flex items-baseline justify-between mb-6">
            <p className="text-white/45 text-xs uppercase tracking-widest">Body's dream</p>
            <p className="text-white/35 text-xs">— AI generated</p>
          </div>

          {status.lastImageUrl ? (
            <div className="space-y-5">
              <img
                src={status.lastImageUrl}
                alt="Body's current message"
                className="w-full rounded border border-white/10"
              />
              <div className="flex items-center justify-between text-xs text-white/45">
                <span>
                  cycle {cycleNumber} of {totalCycles} · words 1–{status.wordPosition} of {STORY_WORD_COUNT}
                </span>
                <span>{progressPct}%</span>
              </div>
              {/* Progress bar */}
              <div className="h-px bg-white/8 w-full">
                <div
                  className="h-px bg-white/30 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              {status.lastPrompt && (
                <details className="group">
                  <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60 transition-colors list-none">
                    prompt used ↓
                  </summary>
                  <p className="mt-3 text-white/50 text-xs leading-relaxed border border-white/15 rounded p-4">
                    {status.lastPrompt}
                  </p>
                </details>
              )}

              {/* Word window — past chunk (dim) + current chunk (vivid) */}
              {currentChunk && (
                <div className="pt-2">
                  <div className="flex items-baseline justify-between mb-3">
                    <p className="text-white/30 text-xs uppercase tracking-widest">words it&apos;s reading</p>
                    <p className="text-[#7dd3fc]/60 text-xs">— Human created, Olin</p>
                  </div>
                  <p className="text-sm leading-relaxed">
                    {pastChunk && (
                      <span className="text-[#7dd3fc]/30">{pastChunk}{' '}</span>
                    )}
                    <span className="text-[#7dd3fc]/80">{currentChunk}</span>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="border border-white/8 rounded aspect-square flex items-center justify-center">
              <p className="text-white/20 text-sm italic">No image generated yet. Trigger a cycle to begin.</p>
            </div>
          )}
        </section>

        {/* Human Created — Inspiration */}
        <section>
          <div className="flex items-baseline justify-between mb-6">
            <p className="text-[#7dd3fc]/80 text-xs uppercase tracking-widest">Inspiration</p>
            <div className="flex flex-col items-end gap-1">
              <p className="text-[#7dd3fc]/60 text-xs">— Images human created, Olin</p>
              <p className="text-white/35 text-xs">— Descriptions AI generated</p>
            </div>
          </div>
          <InspirationUpload initial={inspirationImages.slice().reverse()} />
        </section>

      </div>
    </main>
  )
}
