import { cookies } from 'next/headers'
import { runCycle } from '@/lib/cycle'

export const maxDuration = 60

export async function POST() {
  const store = await cookies()
  if (store.get('cmb_admin')?.value !== process.env.ADMIN_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runCycle()
  return Response.json(result)
}
