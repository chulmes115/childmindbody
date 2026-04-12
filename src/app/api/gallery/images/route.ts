import { listImages } from '@/lib/s3'
import { getGalleryCompliment } from '@/lib/db'

export async function GET() {
  try {
    const [originals, submitted, compliment] = await Promise.all([
      listImages('enso/original/'),
      listImages('enso/submitted/'),
      getGalleryCompliment(),
    ])
    return Response.json({ images: [...originals, ...submitted], compliment })
  } catch (err) {
    console.error('[gallery/images]', err)
    return Response.json({ error: 'Failed to load images' }, { status: 500 })
  }
}
