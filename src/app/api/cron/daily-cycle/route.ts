import { runCycle } from '@/lib/cycle'

export const maxDuration = 60

export async function GET(request: Request) {
  const auth = request.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runCycle()
  return Response.json(result)
}
