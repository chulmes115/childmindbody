import { cookies } from 'next/headers'
import { getBodyMessageStatus, saveBodyMessageStatus, getInspirationImages } from '@/lib/db'
import { runBodyMessageStep } from '@/lib/bodyMessage'

export const maxDuration = 60

async function assertAdmin() {
  const store = await cookies()
  if (store.get('cmb_admin')?.value !== process.env.ADMIN_SECRET)
    throw new Error('Unauthorized')
}

export async function POST() {
  try {
    await assertAdmin()
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [status, inspirationImages] = await Promise.all([
      getBodyMessageStatus(),
      getInspirationImages(),
    ])

    const result = await runBodyMessageStep({
      wordPosition:            status.wordPosition,
      lastImageUrl:            status.lastImageUrl,
      inspirationDescriptions: inspirationImages.map((img) => img.analysis),
    })

    await saveBodyMessageStatus({
      wordPosition: result.nextWordPosition,
      lastImageUrl: result.imageUrl,
      lastPrompt:   result.prompt,
    })

    return Response.json({ imageUrl: result.imageUrl, cycleLabel: result.cycleLabel })
  } catch (err) {
    console.error('[cycle/run-message]', err)
    // Non-fatal — cycle continues even if image generation fails
    return Response.json({ imageUrl: null, error: err instanceof Error ? err.message : 'Image generation failed' })
  }
}
