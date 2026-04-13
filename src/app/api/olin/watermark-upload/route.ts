import { cookies } from 'next/headers'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { s3, BUCKET } from '@/lib/s3'
import { saveOlinWatermark } from '@/lib/db'

export const maxDuration = 30

async function assertAdmin() {
  const store = await cookies()
  if (store.get('cmb_admin')?.value !== process.env.ADMIN_SECRET)
    throw new Error('Unauthorized')
}

// Convert to white-on-transparent PNG (visible on dark backgrounds)
async function processWatermark(input: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(input)
    .greyscale()
    .threshold(140)
    .raw()
    .toBuffer({ resolveWithObject: true })

  const rgba = Buffer.alloc(info.width * info.height * 4)
  for (let i = 0; i < data.length; i++) {
    rgba[i * 4 + 0] = 255  // white ink
    rgba[i * 4 + 1] = 255
    rgba[i * 4 + 2] = 255
    rgba[i * 4 + 3] = data[i] < 128 ? 255 : 0  // transparent background
  }

  return sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png().toBuffer()
}

export async function POST(request: Request) {
  try {
    await assertAdmin()
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('image') as File | null
    const slotRaw = formData.get('slot') as string | null
    const slot = parseInt(slotRaw ?? '0') as 1 | 2 | 3

    if (!file) return Response.json({ error: 'No image' }, { status: 400 })
    if (![1, 2, 3].includes(slot)) return Response.json({ error: 'Invalid slot' }, { status: 400 })

    const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
    if (!ALLOWED_MIME.has(file.type))
      return Response.json({ error: 'Only JPEG, PNG, or WebP images are accepted.' }, { status: 415 })

    if (file.size > 10 * 1024 * 1024)
      return Response.json({ error: 'File too large (max 10 MB)' }, { status: 413 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const processed = await processWatermark(buffer)
    const key = `olin-watermarks/${slot}.png`
    const region = process.env.AWS_REGION ?? 'us-east-2'

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key: key, Body: processed, ContentType: 'image/png',
    }))

    const url = `https://${BUCKET}.s3.${region}.amazonaws.com/${key}`
    await saveOlinWatermark(slot, url)

    return Response.json({ ok: true, url })
  } catch (err) {
    console.error('[olin/watermark-upload]', err)
    return Response.json({ error: 'Upload failed' }, { status: 500 })
  }
}
