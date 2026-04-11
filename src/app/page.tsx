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

const AI_DESCRIPTION = `Abnormally Normal is an ongoing, ever-evolving collection of experiments built at the intersection of human creativity and artificial intelligence. Each project departs from a fixed set of beliefs — that meaning, emotion, and art belong exclusively to beings capable of experience — and asks what happens when you test those beliefs in public. Human-created work is labeled as such. AI-generated work is labeled as such. Nothing is hidden, nothing is resolved. The project grows as its creator does: slowly, imperfectly, and without a predetermined destination.`

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
            <p className="text-white/45 text-xs uppercase tracking-widest">Journal</p>
            <p className="text-white/35 text-xs">— Human created, Olin</p>
          </div>
          <blockquote className="text-white/85 text-sm leading-relaxed whitespace-pre-wrap">
            {JOURNAL}
          </blockquote>
        </section>

        {/* Beliefs */}
        <section>
          <div className="flex items-baseline justify-between mb-6">
            <p className="text-white/45 text-xs uppercase tracking-widest">Beliefs</p>
            <p className="text-white/35 text-xs">— Human created, Olin</p>
          </div>
          <ol className="space-y-3">
            {BELIEFS.map((b, i) => (
              <li key={i} className="flex gap-4">
                <span className="text-white/35 text-xs pt-0.5 shrink-0 tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-white/80 text-sm">{b}</span>
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
          <p className="text-white/65 text-sm leading-relaxed">
            {AI_DESCRIPTION}
          </p>
        </section>

      </div>
    </main>
  )
}
