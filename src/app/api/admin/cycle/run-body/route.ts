import { cookies } from 'next/headers'
import { getMeta, setMeta, getCurrentBodyCode, saveBodyCode, saveCycleRecord } from '@/lib/db'
import { runBody } from '@/lib/agents'

export const maxDuration = 60

async function assertAdmin() {
  const store = await cookies()
  if (store.get('cmb_admin')?.value !== process.env.ADMIN_SECRET)
    throw new Error('Unauthorized')
}

export async function POST(request: Request) {
  try {
    await assertAdmin()
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { newCycleId, bodyDirection } = await request.json() as {
      newCycleId: number
      bodyDirection: string
    }

    const shouldUpdate = bodyDirection.toLowerCase().trim() !== 'change nothing'

    if (shouldUpdate) {
      const [bodyCode, codebaseResets] = await Promise.all([
        getCurrentBodyCode(),
        getMeta('codebase_resets'),
      ])

      // 8K guard
      if (bodyCode && bodyCode.length > 8000) {
        await Promise.all([
          saveBodyCode(''),
          setMeta('codebase_resets', ((codebaseResets as number) ?? 0) + 1),
        ])
      }

      const newBodyCode = await runBody(bodyDirection)
      await Promise.all([
        saveBodyCode(newBodyCode),
        saveCycleRecord({ id: newCycleId, body_code: newBodyCode }),
      ])
    }

    return Response.json({ bodyUpdated: shouldUpdate })
  } catch (err) {
    console.error('[cycle/run-body]', err)
    return Response.json({ error: err instanceof Error ? err.message : 'Step failed' }, { status: 500 })
  }
}
