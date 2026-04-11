import { getCurrentCycleId, saveIntakeResponse } from '@/lib/db'

export async function POST(request: Request) {
  const cycleId = await getCurrentCycleId()

  if (cycleId === 0) {
    return Response.json({ error: 'No active cycle' }, { status: 400 })
  }

  // Accept any form encoding Body might use
  const contentType = request.headers.get('content-type') ?? ''
  let response: string

  if (contentType.includes('application/json')) {
    const body = await request.json()
    response = JSON.stringify(body)
  } else {
    // application/x-www-form-urlencoded or multipart/form-data
    const formData = await request.formData()
    const fields: Record<string, string> = {}
    formData.forEach((value, key) => {
      fields[key] = value.toString()
    })
    response = JSON.stringify(fields)
  }

  await saveIntakeResponse(cycleId, response)

  return Response.json({ ok: true })
}
