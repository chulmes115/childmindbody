import { NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { s3, BUCKET } from '@/lib/s3'
import { getCurrentCycleId, getGalleryUploadCount, incrementGalleryUploadCount } from '@/lib/db'

const MAX_PER_CYCLE   = 10
const COOLDOWN_MS     = 2 * 60 * 1000   // 2 minutes between uploads per visitor
const COOLDOWN_COOKIE = 'gallery_cd'

async function processImage(input: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(input)
    .greyscale()
    .threshold(128)
    .raw()
    .toBuffer({ resolveWithObject: true })

  const rgba = Buffer.alloc(info.width * info.height * 4)
  for (let i = 0; i < data.length; i++) {
    rgba[i * 4 + 0] = 0
    rgba[i * 4 + 1] = 0
    rgba[i * 4 + 2] = 0
    rgba[i * 4 + 3] = data[i] < 128 ? 255 : 0
  }

  return sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer()
}

export async function POST(request: Request) {
  // ── Per-visitor cooldown ─────────────────────────────────────────────────────
  const cookieHeader = request.headers.get('cookie') ?? ''
  const cdMatch = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOLDOWN_COOKIE}=(\\d+)`))
  if (cdMatch) {
    const elapsed = Date.now() - parseInt(cdMatch[1])
    if (elapsed < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 60000)
      return NextResponse.json(
        { error: `Please wait ${remaining} minute${remaining !== 1 ? 's' : ''} before uploading again.` },
        { status: 429 }
      )
    }
  }

  // ── Per-cycle upload cap ─────────────────────────────────────────────────────
  const cycleId = await getCurrentCycleId()
  const uploadCount = await getGalleryUploadCount(cycleId)
  if (uploadCount >= MAX_PER_CYCLE) {
    return NextResponse.json(
      { error: `The gallery has reached its limit for this cycle (${MAX_PER_CYCLE} images). Check back next cycle.` },
      { status: 429 }
    )
  }

  // ── Parse and validate file ──────────────────────────────────────────────────
  const formData = await request.formData()
  const file = formData.get('image') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 })
  }

  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, or WebP images are accepted.' }, { status: 415 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 413 })
  }

  try {
    const buffer    = Buffer.from(await file.arrayBuffer())
    const processed = await processImage(buffer)
    const key       = `enso/submitted/${Date.now()}.png`
    const region    = process.env.AWS_REGION ?? 'us-east-2'

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key: key, Body: processed, ContentType: 'image/png',
    }))

    await incrementGalleryUploadCount(cycleId)

    const res = NextResponse.json({
      ok: true,
      url: `https://${BUCKET}.s3.${region}.amazonaws.com/${key}`,
    })
    res.cookies.set(COOLDOWN_COOKIE, String(Date.now()), {
      maxAge: COOLDOWN_MS / 1000,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    })
    return res

  } catch (err) {
    console.error('[gallery/upload]', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
