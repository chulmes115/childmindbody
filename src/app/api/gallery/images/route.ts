import { listImages } from '@/lib/s3'
import { getGalleryCompliment, getCurrentCycleId, getGalleryUploadCount } from '@/lib/db'

const MAX_PER_CYCLE = 10

export async function GET() {
  try {
    const cycleId = await getCurrentCycleId()
    const [originals, submitted, compliment, uploadCount] = await Promise.all([
      listImages('enso/original/'),
      listImages('enso/submitted/'),
      getGalleryCompliment(),
      getGalleryUploadCount(cycleId),
    ])
    return Response.json({
      images: [...originals, ...submitted],
      compliment,
      uploadCount,
      maxPerCycle: MAX_PER_CYCLE,
    })
  } catch (err) {
    console.error('[gallery/images]', err)
    return Response.json({ error: 'Failed to load images' }, { status: 500 })
  }
}
