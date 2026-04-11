import { PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { s3, BUCKET } from '@/lib/s3'

async function processImage(input: Buffer): Promise<Buffer> {
  // Greyscale + hard threshold → binary black/white
  const { data, info } = await sharp(input)
    .greyscale()
    .threshold(128)
    .raw()
    .toBuffer({ resolveWithObject: true })

  // Build RGBA: black marks on transparent background
  const rgba = Buffer.alloc(info.width * info.height * 4)
  for (let i = 0; i < data.length; i++) {
    rgba[i * 4 + 0] = 0                       // R
    rgba[i * 4 + 1] = 0                       // G
    rgba[i * 4 + 2] = 0                       // B
    rgba[i * 4 + 3] = data[i] < 128 ? 255 : 0 // A: black → opaque, white → transparent
  }

  return sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer()
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('image') as File | null

  if (!file) {
    return Response.json({ error: 'No image provided' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const processed = await processImage(buffer)

  const key = `enso/submitted/${Date.now()}.png`
  const region = process.env.AWS_REGION ?? 'us-east-2'

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: processed,
      ContentType: 'image/png',
    })
  )

  const url = `https://${BUCKET}.s3.${region}.amazonaws.com/${key}`
  return Response.json({ ok: true, url })
}
