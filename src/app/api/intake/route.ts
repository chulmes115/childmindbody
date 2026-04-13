import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import {
  getCurrentCycleId,
  getCycleRecord,
  saveIntakeResponse,
  countIntakeResponses,
  saveBodyCode,
  saveCycleRecord,
  getCooldown,
  setCooldown,
} from '@/lib/db'

const MAX_LENGTH    = 500              // chars per submission
const COOLDOWN_MS   = 10 * 60 * 1000  // 10 minutes between submissions
const MAX_PER_CYCLE = 25              // kill switch threshold

function getIpHash(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  return createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

const KILLED_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 100%; height: 100%;
    background: #000;
    display: flex; align-items: center; justify-content: center;
    font-family: Georgia, 'Times New Roman', serif;
  }
  .circle {
    width: 260px; height: 260px;
    background: #dc143c;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    padding: 36px;
  }
  p { color: #fff; font-size: 13px; line-height: 1.7; text-align: center; }
</style>
</head>
<body>
  <div class="circle">
    <p>You killed Body. Don't worry. They will be awake next cycle. Like nothing ever happened!</p>
  </div>
</body>
</html>`

export async function POST(request: Request) {
  try {
    const cycleId = await getCurrentCycleId()
    if (cycleId === 0)
      return NextResponse.json({ error: 'No active cycle' }, { status: 400 })

    // ── Kill switch — cycle already overwhelmed ──────────────────────────────
    const cycleRecord = await getCycleRecord(cycleId)
    if (cycleRecord?.intake_killed)
      return NextResponse.json(
        { error: 'Body is resting until the next cycle.' },
        { status: 429 }
      )

    // ── Cooldown — 10 minutes between submissions per visitor (server-side) ────
    const ipHash = getIpHash(request)
    const lastAt = await getCooldown('intake', ipHash)
    if (lastAt !== null) {
      const elapsed = Date.now() - lastAt
      if (elapsed < COOLDOWN_MS) {
        const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 60000)
        return NextResponse.json(
          { error: `Please wait ${remaining} minute${remaining !== 1 ? 's' : ''} before submitting again.` },
          { status: 429 }
        )
      }
    }

    // ── Parse body ───────────────────────────────────────────────────────────
    const contentType = request.headers.get('content-type') ?? ''
    let response: string

    if (contentType.includes('application/json')) {
      const body = await request.json()
      response = typeof body.response === 'string' ? body.response : JSON.stringify(body)
    } else {
      const formData = await request.formData()
      const fields: Record<string, string> = {}
      formData.forEach((value, key) => { fields[key] = value.toString() })
      response = Object.values(fields).join(' ')
    }

    if (!response.trim())
      return NextResponse.json({ error: 'Empty submission' }, { status: 400 })

    if (response.length > MAX_LENGTH)
      return NextResponse.json(
        { error: `Submission too long — please keep it under ${MAX_LENGTH} characters.` },
        { status: 413 }
      )

    // ── Save and count ───────────────────────────────────────────────────────
    await saveIntakeResponse(cycleId, response.trim())
    const count = await countIntakeResponses(cycleId)

    // ── Kill switch — threshold reached ─────────────────────────────────────
    let killed = false
    if (count >= MAX_PER_CYCLE) {
      killed = true
      await Promise.all([
        saveBodyCode(KILLED_HTML),
        saveCycleRecord({ id: cycleId, intake_killed: true, body_code: KILLED_HTML }),
      ])
    }

    // ── Record cooldown server-side ──────────────────────────────────────────
    await setCooldown('intake', ipHash, Date.now())
    return NextResponse.json({ ok: true, ...(killed ? { killed: true } : {}) })

  } catch (err) {
    console.error('[intake]', err)
    return NextResponse.json({ error: 'Failed to save response' }, { status: 500 })
  }
}
