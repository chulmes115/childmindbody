@AGENTS.md

# ChildMindBody — Project Context for Claude Code

## What This Is
An artistic AI agent experiment and public website. Three Claude Haiku agents — **Child**, **Mind**, and **Body** — run a daily philosophical loop. The site has three pages. The whole thing is a conceptual art piece about failure, persistence, and what it means for an artificial mind to try.

## Full Documentation
The complete BRD and Project Plan are in the parent folder:
- `../ChildMindBody_BRD.docx` — full requirements
- `../ChildMindBody_ProjectPlan.docx` — build sequence and phase details

---

## Tech Stack
- **Framework:** Next.js 14+ (App Router, TypeScript, Tailwind CSS)
- **Hosting:** Vercel (Hobby free tier — hosting and cron only)
- **Database:** AWS DynamoDB (single-table design, table name: `childmindbody`)
- **Image Storage:** AWS S3 (bucket: `childmindbody-images`, us-east-2, public read)
- **AI:** Anthropic Claude Haiku (`claude-haiku-4-5-20251001`) for all three agents
- **Scheduling:** Vercel Cron — single daily job at 2 AM UTC
- **Image Processing:** `sharp` library for B&W threshold + white-to-transparent conversion

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

### Child
- Prompted once per day with the five philosophical positions (below)
- Memory wiped each cycle — starts fresh every day
- Receives: start date, consecutive failure count, code failure count, codebase reset count, Mind's prior analysis, Body's current code
- Can optionally prompt Body with a request for what to display/build
- Knows it will always fail. Knows Chris is the sole arbiter of success.
- Model: `claude-haiku-4-5-20251001`, max ~600 tokens output

### Mind
- Runs after Child each cycle, on yesterday's data
- Receives: Child's resolution + intake form data (condensed if >4,000 chars)
- Produces: written analysis + advisory pass/fail recommendation
- Cannot reach Body. Cannot act in the world. Can only write.
- Its analysis is the ONLY context Child gets tomorrow — Child's only link to its past
- Model: `claude-haiku-4-5-20251001`, max ~800 tokens output

### Body
- Only takes direction from Child (never from Mind)
- One shot per day to produce working HTML/JS output — no retries
- Output can be anything: a form, a message, a question, just text — a form is not required
- Output persists indefinitely — only changes when Child gives it a new prompt
- Code is shown publicly on the site
- If code errors, a counter increments and Child is told about it next day
- Model: `claude-haiku-4-5-20251001`

### The Five Philosophical Positions (Child must engage with all five each day)
1. Every person is defined by what they do externally.
2. Life is truly meaningless.
3. Art cannot be created by an AI.
4. Art cannot be created with AI.
5. Emotion is only a function of a biological body and nothing else.

---

## Daily Cycle (Single Cron — 2 AM UTC)
1. Close prior day — collect intake form submissions
2. Condense intake if >4,000 characters (silent Haiku call, no persona)
3. Mind runs on yesterday's Child resolution + condensed intake → stores analysis
4. Gather context for Child (counters + Mind's analysis + Body's current code)
5. Child runs → stores resolution, optionally produces a Body prompt
6. If Child prompted Body → Body generates new HTML/JS output and replaces current
7. Form/output is live for 24 hours
8. Chris reviews Mind's analysis via admin panel and sets pass/fail at his discretion
9. Default is always failure

---

## DynamoDB Single-Table Design
Table name: `childmindbody`, Keys: `pk` (String) + `sk` (String)

```
pk='CYCLE#current'     sk='STATUS'              → { cycle_id, date, status }
pk='CYCLE#42'          sk='RECORD'              → { child_resolution, mind_analysis,
                                                    mind_rec, chris_decision,
                                                    consecutive_failures, code_fail_count,
                                                    reset_count, body_code, intake_condensed }
pk='META'              sk='consecutive_fails'   → { value: number }
pk='META'              sk='code_fail_count'     → { value: number }
pk='META'              sk='codebase_resets'     → { value: number }
pk='META'              sk='start_date'          → { value: ISO string }
pk='BODY'              sk='current_code'        → { html: string }
pk='INTAKE#42'         sk='<timestamp>'         → { response, timestamp }
```

---

## S3 Structure
Bucket: `childmindbody-images` (us-east-2, public read)
```
/enso/original/     ← the 50 hand-made Enso circle images (uploaded once)
/enso/submitted/    ← user-submitted images after B&W threshold processing
```
Public URL: `https://childmindbody-images.s3.us-east-2.amazonaws.com/<key>`

### Image Processing Pipeline (user submissions)
1. Receive upload → use `sharp` to convert to grayscale
2. Hard threshold: pixels ≥128 → 255 (white), <128 → 0 (black)
3. Replace all white (255,255,255) pixels with full transparency (alpha=0)
4. Output: PNG with black marks on transparent background
5. Upload to S3 at `/enso/submitted/`

---

## The Three Website Pages

### 1. Landing Page (`/`)
- Slowly typewriting book excerpt, character by character
- Dark background, minimal, no navigation clutter
- Excerpt text: TBD (Chris to provide)

### 2. Enso Gallery (`/gallery`)
- All Enso images floating in a loose approximate circle
- Each image drifts slowly with random vector + slight rotation, overlapping freely
- User upload → processed to B&W transparent PNG → added to gallery

### 3. Agent Stage (`/stage`)
**Public:** agent base prompts, consecutive failure counter, Body's code, Body's live output (sandboxed iframe), code failure counter
**Hidden:** Child's resolution, Mind's analysis, intake submissions, Chris's decision

---

## Admin Panel (`/admin`)
- Protected by `ADMIN_SECRET` env var
- Shows Child resolution + Mind analysis + recommendation for current cycle
- Pass/Fail buttons → updates `chris_decision`, adjusts `consecutive_fails`
- Manual cycle trigger, cycle history

---

## Key Rules — Never Violate These
- **Child only prompts Body** — Mind has no path to Body
- **Body's output persists** — only changes when Child requests it
- **One daily cron** — 2 AM UTC, runs everything sequentially
- **No Vercel storage products** — Vercel is hosting + cron only
- **Chris is sole arbiter** — his pass/fail overrides everything, default is always failure
- **All three agents know their situation** — nothing is hidden from them about how the system works

---

## Current Build Status — Phase 1 complete → Phase 2 next

### Phase 0 — Foundation (done)
- [x] Next.js project scaffolded (TypeScript, Tailwind, App Router)
- [x] Pushed to GitHub (`github.com/chulmes115/childmindbody`)
- [x] Deployed to Vercel (`childmindbody.vercel.app`)
- [x] S3 bucket created (`childmindbody-images`, us-east-2, public read policy applied)
- [x] IAM user created (`childmindbody-app`) with scoped S3 + DynamoDB inline policy
- [x] AWS access keys in `.env.local` and Vercel env vars
- [x] AWS SDKs installed (`@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `@aws-sdk/client-s3`, `sharp`)
- [x] DynamoDB table created (`childmindbody`, pk+sk, on-demand) — verified locally
- [x] S3 upload verified locally
- [x] `src/lib/dynamodb.ts` — DynamoDB Document Client singleton
- [x] `src/lib/s3.ts` — S3 Client singleton

### Phase 1 — Agent Engine (done)
- [x] `@anthropic-ai/sdk` installed
- [x] `src/lib/db.ts` — all DynamoDB helpers (getMeta, setMeta, getCycleRecord, saveCycleRecord, getCurrentBodyCode, saveBodyCode, getCurrentCycleId, incrementCycleId, saveIntakeResponse, getIntakeResponses)
- [x] `src/lib/prompts.ts` — CHILD_SYSTEM_PROMPT, MIND_SYSTEM_PROMPT, BODY_SYSTEM_PROMPT, SEED_PROMPT (review before launch — shown publicly)
- [x] `src/lib/agents.ts` — runChild, runMind, runBody, condenseIntake
- [x] `src/app/api/run-cycle/route.ts` — full cycle, Bearer auth, Day 1 seed, 4K/8K guards
- [x] `src/app/api/intake/route.ts` — public form submission endpoint
- [x] Verified locally: full cycle ran, DynamoDB records confirmed

### Phase 2 — Automation (next)

**Goal:** All three agents run via a single API endpoint. Hit `POST /api/run-cycle` and the full cycle executes — Child resolves, Body optionally outputs, Mind judges. Results stored in DynamoDB.

Build in this order:

**1. Database helpers — `src/lib/db.ts`**
Typed functions for every DynamoDB access pattern:
- `getMeta(key)` / `setMeta(key, value)` — read/write META counters (consecutive_fails, code_fail_count, codebase_resets, start_date)
- `getCycleRecord(id)` / `saveCycleRecord(record)` — read/write full cycle records
- `getCurrentBodyCode()` / `saveBodyCode(html)` — read/write Body's live output
- `saveIntakeResponse(cycleId, response)` / `getIntakeResponses(cycleId)` — intake submissions
- `getCurrentCycleId()` / `incrementCycleId()` — cycle counter

**2. Agent prompts — `src/lib/prompts.ts`**
Base system prompts as exported constants. These are shown publicly on the site.
- `CHILD_SYSTEM_PROMPT` — task, five positions, context it receives, Chris is sole arbiter, it always fails, it can prompt Body, it can see Body's current code
- `MIND_SYSTEM_PROMPT` — task, advisory role only, cannot reach Body, its analysis is Child's only link to yesterday
- `BODY_SYSTEM_PROMPT` — role, tools available (vanilla HTML/CSS/JS only, one POST endpoint at `/api/intake`), one-shot rule, code shown publicly, output persists until Child changes it

**3. Agent functions — `src/lib/agents.ts`**
Three async functions calling Claude Haiku:
```typescript
runChild(context: ChildContext): Promise<{ resolution: string, bodyPrompt?: string }>
// context = { startDate, consecutiveFails, codeFailCount, codebaseResets, priorAnalysis, bodyCurrentCode }

runMind(childResolution: string, intakeData: string): Promise<{ analysis: string, recommendation: 'pass' | 'fail' }>

runBody(prompt: string): Promise<string>  // returns raw HTML/JS string
```
Model: `claude-haiku-4-5-20251001` for all three. Max tokens: Child ~600, Mind ~800, Body ~1200.

**4. Token guards — inline in cycle logic**
- If raw intake text > 4,000 chars: run a silent Haiku call to condense before passing to Mind
- If Body's stored code > 8,000 chars: clear it, increment `codebase_resets` meta counter

**5. Manual trigger — `src/app/api/run-cycle/route.ts`**
`POST /api/run-cycle` protected by `Authorization: Bearer <ADMIN_SECRET>` header.
Full sequence:
1. Read counters + prior Mind analysis + Body's current code from DynamoDB
2. Run Child → store resolution
3. If Child included a bodyPrompt → run Body → store new code (check 8K limit first)
4. Get prior cycle's intake data → condense if needed → run Mind → store analysis
5. Increment cycle counter, return summary

**6. Day 1 seed**
On first run (no prior cycle): Body runs from hardcoded seed prompt:
"Create a simple HTML form that introduces itself to visitors. Tell them, honestly, what this place is. Ask them one open question — anything you want to ask a stranger."
Mind receives empty prior data and produces a brief opening statement.

**7. Intake endpoint — `src/app/api/intake/route.ts`**
`POST /api/intake` — public, no auth. Stores form submissions to DynamoDB.
Body's generated forms must POST to this URL.

**Verification:** Hit `POST /api/run-cycle` with correct auth header. Check DynamoDB for stored records. Confirm all three agents produced meaningful output.

---

### Phase 2 — Automation (after Phase 1)
- Add `vercel.json`: `{ "crons": [{ "path": "/api/cron/daily-cycle", "schedule": "0 2 * * *" }] }`
- Create `src/app/api/cron/daily-cycle/route.ts` — same logic as run-cycle, secured by Vercel cron header

### Phase 3 — The Three Pages (after Phase 2)
- `/` — typewriter excerpt (Chris provides text)
- `/gallery` — floating Enso circle, S3 upload, sharp image processing
- `/stage` — live DynamoDB data, agent prompts, failure counters, Body's code + sandboxed iframe output

### Phase 4 — Admin Panel (after Phase 3)
- `/admin` — protected by ADMIN_SECRET, cycle viewer, pass/fail buttons, manual trigger

### Phase 5 — Launch
- Upload 50 Enso images to S3, add excerpt, set start_date, enable cron, Day 1 begins
