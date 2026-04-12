import { getCurrentCycleId, saveIntakeResponse } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const cycleId = await getCurrentCycleId()
    if (cycleId === 0)
      return Response.json({ error: 'No active cycle' }, { status: 400 })

    const contentType = request.headers.get('content-type') ?? ''
    let response: string

    if (contentType.includes('application/json')) {
      const body = await request.json()
      response = JSON.stringify(body)
    } else {
      const formData = await request.formData()
      const fields: Record<string, string> = {}
      formData.forEach((value, key) => { fields[key] = value.toString() })
      response = JSON.stringify(fields)
    }

    if (response.length > 8000)
      return Response.json({ error: 'Submission too long' }, { status: 413 })

    await saveIntakeResponse(cycleId, response)
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[intake]', err)
    return Response.json({ error: 'Failed to save response' }, { status: 500 })
  }
}
