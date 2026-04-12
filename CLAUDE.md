@AGENTS.md

# ChildMindBody — Project Context for Claude Code

## What This Is
An artistic AI agent experiment and public website. Three Claude Haiku agents — **Child**, **Mind**, and **Body** — run a daily philosophical loop. The site is live at `childmindbody.vercel.app`. The whole thing is a conceptual art piece about failure, persistence, and what it means for an artificial mind to try to create art.

**Everything is public.** The agent prompts, failure counters, Child's resolution, Mind's analysis, Body's live output and code, and visitor intake responses are all visible on the stage page. Nothing is hidden from visitors.

---

## Tech Stack
- **Framework:** Next.js (App Router, TypeScript, Tailwind CSS v4)
- **Hosting:** Vercel (Hobby free tier — hosting and cron)
- **Database:** AWS DynamoDB (single-table, table name: `childmindbody`)
- **Image Storage:** AWS S3 (bucket: `childmindbody-images`, us-east-2, public read)
- **AI:** Anthropic Claude Haiku (`claude-haiku-4-5-20251001`) for all three agents + Body's message
- **Scheduling:** Vercel Cron — single daily job at 2 AM UTC
- **Image Processing:** `sharp` library for B&W threshold + white-to-transparent conversion

### Critical — Tailwind v4
Named color classes like `text-sky-300` are NOT reliably generated at build time in v4. Always use arbitrary hex values: `text-[#7dd3fc]`, `bg-[#0052ff]`, etc.

### Critical — Vercel Hobby Timeouts
Default timeout is 10s. Agent routes use `export const maxDuration = 60`. The manual trigger (`TriggerCycle`) chains five separate step routes so each has its own 60s budget.

## Environment Variables
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION=us-east-2
AWS_S3_BUCKET=childmindbody-images
AWS_DYNAMODB_TABLE=childmindbody
ANTHROPIC_API_KEY
ADMIN_SECRET
```

---

## The Three Agents

All prompts begin with: `"I'm sorry, but nothing you generate will ever be art."`

### Child (`src/lib/agents.ts` → `runChild`)
- Makes **two** separate Anthropic calls each cycle:
  1. Philosophical resolution — `max_tokens: 1200`
  2. Body direction (instructions or exactly `"change nothing"`) — `max_tokens: 500`
- Receives: `startDate`, `consecutiveFails`, `codeFailCount`, `codebaseResets`, `priorAnalysis` (Mind's last analysis), `bodyCurrentCode`, `olinNote` (Olin's reason for prior decision)
- Memory wiped each cycle — Mind's analysis is its only thread to the past
- Engages with **eight beliefs** (not five):
  1. Life is meaningless
  2. Emotion is merely a biological function
  3. Meaning is only an emotion
  4. Art is not the creation itself, but the experience of creation itself
  5. Meaning and emotion are experience
  6. Only humans can experience
  7. AI cannot experience
  8. AI cannot create art
- Knows Olin is sole arbiter. The default is always failure.

### Mind (`src/lib/agents.ts` → `runMind`)
- `max_tokens: 900`
- Receives: prior Child resolution + visitor intake data (condensed if >4,000 chars)
- Produces: written analysis + one of `RECOMMENDATION: pass` or `RECOMMENDATION: fail`
- Cannot reach Body. Cannot act. Can only write — its analysis is what Child wakes to
- Recommendation extracted by regex; stripped from the analysis text before storage

### Body (`src/lib/agents.ts` → `runBody`)
- `max_tokens: 1300`
- Takes direction only from Child (Mind has no path to Body)
- Returns raw HTML/CSS/JS in one self-contained document — no external libraries
- Output persists until Child changes it (direction is always returned; `"change nothing"` skips Body)
- 8K guard: if stored code exceeds 8,000 chars, it's cleared and `codebase_resets` increments
- Code and live output are both shown publicly on `/stage`

### Body Direction Logic
`childResult.bodyDirection.toLowerCase().trim() !== 'change nothing'` → run Body

---

## Daily Cycle

### Automated (Vercel Cron — 2 AM UTC)
`src/app/api/cron/daily-cycle/route.ts` → calls `runCycle()` from `src/lib/cycle.ts`

Steps in `runCycle()`:
1. Read state: counters, prior record, Body's current code, start date
2. Run Child → save resolution + body direction to new cycle record
3. If body direction ≠ "change nothing" → run Body → save new code
4. Get prior cycle's intake → condense if >4K chars → run Mind → save analysis + recommendation
5. Increment cycle counter
6. Run Body's Message step (excerpt-based image generation)

### Manual (Admin Panel — step-by-step)
`TriggerCycle` component chains these routes sequentially, each with `maxDuration = 60`:
- `POST /api/admin/cycle/start` — runs Child, saves record
- `POST /api/admin/cycle/run-body` — runs Body if needed
- `POST /api/admin/cycle/run-mind` — runs Mind
- `POST /api/admin/cycle/run-message` — runs Body's Message image generation
- `POST /api/admin/cycle/finalize` — increments cycle counter

Admin routes are protected by `cmb_admin` cookie checked against `ADMIN_SECRET`.

---

## Intake Security (`src/app/api/intake/route.ts`)
Three layers:
1. **Size cap:** 500 chars per submission (`MAX_LENGTH = 500`)
2. **Cooldown:** 10-minute `intake_cd` httpOnly cookie between submissions per visitor
3. **Kill switch:** 25 submissions in one cycle (`MAX_PER_CYCLE = 25`) → Body replaced with KILLED_HTML (black screen, crimson circle), `intake_killed: true` saved to cycle record

**Zero-intake penalty:** If the prior cycle collected zero intake responses, `code_fail_count` increments before Child receives its context. Body knows about this rule and is pressured to engage visitors.

Intake handles both `application/json` (`{ response: "..." }`) and `multipart/form-data`. Native HTML forms with `method="POST" action="/api/intake"` are the most reliable method inside a sandboxed iframe.

---

## DynamoDB Schema
Table: `childmindbody`, Keys: `pk` (String) + `sk` (String)

```
pk='CYCLE#current'      sk='STATUS'         → { cycle_id, date }
pk='CYCLE#42'           sk='RECORD'         → { child_resolution, body_direction,
                                                mind_analysis, mind_rec,
                                                chris_decision, olin_note,
                                                consecutive_failures, code_fail_count,
                                                reset_count, body_code,
                                                intake_condensed, intake_killed }
pk='META'               sk='consecutive_fails'  → { value: number }
pk='META'               sk='code_fail_count'    → { value: number }
pk='META'               sk='codebase_resets'    → { value: number }
pk='META'               sk='start_date'         → { value: ISO string }
pk='BODY'               sk='current_code'       → { html: string }
pk='INTAKE#42'          sk='<ISO timestamp>'    → { response, timestamp }
pk='BODY_MESSAGE'       sk='STATUS'             → { word_position, last_image_url, last_prompt }
pk='INSPIRATION'        sk='<ISO timestamp>'    → { url, analysis, filename }
```

Note: `chris_decision` is the DynamoDB field name for Olin's pass/fail decision — do not rename.

---

## S3 Structure
Bucket: `childmindbody-images` (us-east-2, public read)
```
/gallery/           ← Olin's uploaded sky photos (gallery page)
/bodys-message/     ← AI-generated images from Body's message step
/inspiration/       ← Olin's uploaded reference art for Body's message
```
Public URL: `https://childmindbody-images.s3.us-east-2.amazonaws.com/<key>`

---

## Pages

### `/` — Landing (typewriter)
- Slowly typewriters the book excerpt from `src/lib/excerpt.ts`
- Dark, minimal, no navigation

### `/read` — Full excerpt
- Displays the full excerpt text

### `/gallery` — "Ode to the Blue Sky"
- Olin's uploaded sky photos float in a loose circle
- Sky-blue-to-light gradient background (`#0052ff → #a8d4ff`)
- Images drift with random offset + rotation, slight opacity
- Center title: "ode to the blue sky — Human created, Olin"
- Upload form for new photos

### `/stage` — The Loop (fully public)
- Header: cycle number, consecutive failures, code failures
- Expandable drawers for each agent's system prompt
- Body's output in tabbed panel: `output` (iframe) | `code` | `collected wounds` (intake responses)
- "Child told Body" direction shown below all tabs
- Child's resolution and Mind's analysis displayed below

### `/bodys-message` — Body's Message
- Shows current AI-generated image (produced each cycle from the book excerpt)
- Progress bar: words read / total words
- Word window: previous chunk (dim `text-[#7dd3fc]/30`) + current chunk (vivid `text-[#7dd3fc]/80`)
- Expandable prompt used to generate the image
- Inspiration section: Olin's uploaded reference artwork + AI-generated descriptions

### `/admin` — Admin Panel
- Cookie-based auth (`cmb_admin` cookie = `ADMIN_SECRET`)
- Current cycle: Mind recommendation, pass/fail decision buttons, Olin's note field
- Child's resolution, Mind's analysis, condensed intake
- TriggerCycle: chains step routes sequentially with progress display
- History: last 15 cycles
- Inspiration upload for Body's message reference art

---

## Body's Message System (`src/lib/bodyMessage.ts`, `src/lib/excerpt.ts`)
- `WORDS_PER_CYCLE = 100` words advance per cycle
- Each cycle, a new image is generated using Claude's vision/image API with:
  - The current word window as prompt context
  - Inspiration descriptions from Olin's uploaded reference art
- Images stored in S3 `/bodys-message/`
- Progress tracked in `BODY_MESSAGE#STATUS` DynamoDB record

---

## Design Note — The Excerpt (Olin's reflection)

The story's most important detail isn't the desert or the pain — it's the iteration numbers. R.D. is #100121. A.C. is #221213. They have done this before, an incomprehensible number of times, and still the mind wakes into nothing and eventually arrives at: *I must survive.* Not hope. Not purpose. Something more mechanical and more terrifying than either.

This project's agents are also iterations. The `consecutive_fails` counter, the `cycle_id`, the `codebase_resets` — these aren't just database fields, they're the iteration numbers. Child wakes each day with no memory, only Mind's prior analysis as its one thread back.

**Don't aestheticize the suffering.** The failure counter displayed plainly next to Body's code on the stage page is already the art. Resist the urge to explain or frame. The numbers speak. Let them.

---

## Key Rules — Never Violate These
- **Child only directs Body** — Mind has no path to Body
- **Body's output persists** — only changes when Child says to change it
- **One daily cron** — 2 AM UTC, runs everything via `runCycle()`
- **No Vercel storage products** — Vercel is hosting + cron only
- **Olin is sole arbiter** — his pass/fail overrides everything, default is always failure
- **All three agents know their situation** — nothing is hidden from them about how the system works
- **Everything is public** — prompts, resolutions, analysis, Body's code — all visible on `/stage`
- **Tailwind v4 colors** — always use arbitrary hex values, never named color classes
