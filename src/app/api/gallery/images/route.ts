import { listImages } from '@/lib/s3'

export async function GET() {
  const [originals, submitted] = await Promise.all([
    listImages('enso/original/'),
    listImages('enso/submitted/'),
  ])
  return Response.json({ images: [...originals, ...submitted] })
}
