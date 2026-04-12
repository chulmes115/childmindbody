import { listImages } from '@/lib/s3'

export async function GET() {
  try {
    const [originals, submitted] = await Promise.all([
      listImages('enso/original/'),
      listImages('enso/submitted/'),
    ])
    return Response.json({ images: [...originals, ...submitted] })
  } catch (err) {
    console.error('[gallery/images]', err)
    return Response.json({ error: 'Failed to load images' }, { status: 500 })
  }
}
