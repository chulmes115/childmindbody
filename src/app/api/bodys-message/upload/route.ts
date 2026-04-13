import { cookies } from 'next/headers'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { s3, BUCKET } from '@/lib/s3'
import { saveInspirationImage } from '@/lib/db'
import { analyzeInspirationImage } from '@/lib/bodyMessage'

export const maxDuration = 60

export async function POST(request: Request) {
  // Admin-only — inspiration images are Olin's personal artwork
  const store = await cookies()
  if (store.get('cmb_admin')?.value !== process.env.ADMIN_SECRET)
    return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('image') as File | null
    if (!file) return Response.json({ error: 'No image provided' }, { status: 400 })

    const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
    if (!ALLOWED_MIME.has(file.type))
      return Response.json({ error: 'Only JPEG, PNG, or WebP images are accepted.' }, { status: 415 })

    if (file.size > 10 * 1024 * 1024)
      return Response.json({ error: 'File too large (max 10 MB)' }, { status: 413 })

    const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp'])
    const rawExt = file.name.split('.').pop()?.toLowerCase() ?? ''
    const ext    = ALLOWED_EXT.has(rawExt) ? rawExt : 'jpg'

    const buffer    = Buffer.from(await file.arrayBuffer())
    const timestamp = new Date().toISOString()
    const key       = `inspiration/${Date.now()}.${ext}`
    const region    = process.env.AWS_REGION ?? 'us-east-2'

    await s3.send(new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         key,
      Body:        buffer,
      ContentType: file.type || 'image/jpeg',
    }))

    const url      = `https://${BUCKET}.s3.${region}.amazonaws.com/${key}`
    const analysis = await analyzeInspirationImage(url)

    // Save to DB only after both S3 and analysis succeed — no orphaned records
    await saveInspirationImage({ url, analysis, filename: file.name, timestamp })

    return Response.json({ ok: true, url, analysis })
  } catch (err) {
    console.error('[bodys-message/upload]', err)
    return Response.json({ error: 'Upload failed' }, { status: 500 })
  }
}
