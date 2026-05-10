import { cookies } from 'next/headers'
import { getCurrentCycleId } from '@/lib/db'

export async function GET() {
  const store = await cookies()
  if (store.get('cmb_admin')?.value !== process.env.ADMIN_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const checks = {
    db:        false,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openai:    !!process.env.OPENAI_API_KEY,
    aws:       !!process.env.AWS_ACCESS_KEY_ID,
  }

  let cycleId: number | null = null

  try {
    cycleId = await getCurrentCycleId()
    checks.db = true
  } catch {
    // db check failed — checks.db stays false
  }

  const ok = Object.values(checks).every(Boolean)
  return Response.json({ ok, cycleId, checks }, { status: ok ? 200 : 503 })
}
