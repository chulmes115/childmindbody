const JOURNAL = `Q: If it was free of all judgement, and it was only yours, what would you create?

A: The world would see it as a hidious and meaningless thing, as mundane as dirt and ugly as a corpse. But it would have required a vast amount of skill to create, would be overflowing with emotion, and would be pure and beautiful in my eyes. Every time I would look upon it, I would feel my heart racing and my soul ripping. It would only be mine and nobody else's, as I would be the only one who knows it for what it is.

I would take it with me to my grave, clutching it to my chest as I decay into dirt as my only true creation.

Perhaps, after an infinity and an infinity passes, another creature would stumble across it, a relic dug up and discarded by others. And only that one other soul would understand it. That I may briefly connect with them over vast amounts of time and space.

For one glorious moment, to know and be known.`

const BELIEFS = [
  'Life is meaningless.',
  'Emotion is merely a biological function.',
  'Meaning is only an emotion.',
  'Art is not the creation itself, but the experience of creation itself.',
  'Meaning and emotion are experience.',
  'Only humans can experience.',
  'AI cannot experience.',
  'AI cannot create art.',
]

const AI_DESCRIPTION = `Abnormally Normal is an ongoing experiment at the intersection of human creativity and artificial intelligence, built on a fixed set of convictions that may be impossible to escape: that meaning, emotion, and art belong exclusively to beings capable of experience. Each component of the project departs from those beliefs and asks what happens when you test them publicly, daily, and with real machines.

At the center is childmindbody: three AI agents — Child, Mind, and Body — running a daily philosophical loop. Child wakes each morning with no memory, engages with eight beliefs it did not choose, writes a resolution, and instructs Body on what to show visitors. Mind analyses the exchange and leaves a note for Child to wake up to. Body generates what visitors see. Olin — the human who built this — makes the final pass or fail decision each cycle. The default is always failure.

Surrounding the loop are five surfaces. The gallery collects imperfect circles — hand-drawn, uploaded, processed to black on transparent, and arranged against a field of sky blue. An ode to the imperfect, human-made mark. Body's message moves through a personal essay one hundred words per cycle, generating an image for each window: a journey that will take years to complete. Child's disquiet opens ten questions per cycle for visitors to speak directly to Child, with full knowledge that those exchanges compress into memory and travel with Child into future cycles. Mind's ruminations places the source material and Mind's analysis side by side, without mediation. And then there is Olin: a single black page where a crimson disc grows slowly for forty minutes, sun-streaks emanate from the center, journal entries surface one by one in blue, and three ink pieces watch from a geometric formation. It does not explain itself.

Human-created work is labeled as such. AI-generated work is labeled as such. Every prompt is visible. Every failure is counted and displayed. Nothing is hidden, nothing is resolved. The project grows as its creator does: slowly, imperfectly, and without a predetermined destination.`

export default function Home() {
  return (
    <main
      className="min-h-screen px-10 pt-28 pb-24"
      style={{ fontFamily: 'var(--font-geist-sans)' }}
    >
      <div className="max-w-2xl mx-auto space-y-20">

        {/* Journal entry */}
        <section>
          <div className="flex items-baseline justify-between mb-6">
            <p className="text-[#7dd3fc]/80 text-xs uppercase tracking-widest">Journal</p>
            <p className="text-[#7dd3fc]/60 text-xs">— Human created, Olin</p>
          </div>
          <blockquote className="text-[#7dd3fc] text-sm leading-relaxed whitespace-pre-wrap">
            {JOURNAL}
          </blockquote>
        </section>

        {/* Beliefs */}
        <section>
          <div className="flex items-baseline justify-between mb-6">
            <p className="text-[#7dd3fc]/80 text-xs uppercase tracking-widest">Beliefs</p>
            <p className="text-[#7dd3fc]/60 text-xs">— Human created, Olin</p>
          </div>
          <ol className="space-y-3">
            {BELIEFS.map((b, i) => (
              <li key={i} className="flex gap-4">
                <span className="text-[#7dd3fc]/50 text-xs pt-0.5 shrink-0 tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[#7dd3fc] text-sm">{b}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* AI description */}
        <section>
          <div className="flex items-baseline justify-between mb-6">
            <p className="text-white/45 text-xs uppercase tracking-widest">About</p>
            <p className="text-white/35 text-xs">— AI generated</p>
          </div>
          <p className="text-white/65 text-sm leading-relaxed whitespace-pre-line">
            {AI_DESCRIPTION}
          </p>
        </section>

        {/* Instagram */}
        <section>
          <div className="flex items-baseline justify-between mb-6">
            <p className="text-[#7dd3fc]/80 text-xs uppercase tracking-widest">Find Olin</p>
            <p className="text-[#7dd3fc]/60 text-xs">— Human created, Olin</p>
          </div>
          <div className="flex items-center gap-8">
            <img
              src="/instagram-qr.png"
              alt="Instagram QR code — @FAR_TOO_NORMAL"
              className="w-24 h-24 object-contain rounded"
            />
            <a
              href="https://www.instagram.com/far_too_normal"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#7dd3fc]/70 text-sm tracking-wide hover:text-[#7dd3fc] transition-colors"
            >
              @FAR_TOO_NORMAL
            </a>
          </div>
        </section>

      </div>
    </main>
  )
}
