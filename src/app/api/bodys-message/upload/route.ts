import { PutObjectCommand } from '@aws-sdk/client-s3'
import { s3, BUCKET } from '@/lib/s3'
import { saveInspirationImage } from '@/lib/db'
import { analyzeInspirationImage } from '@/lib/bodyMessage'

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('image') as File | null
  if (!file) return Response.json({ error: 'No image provided' }, { status: 400 })

  const buffer    = Buffer.from(await file.arrayBuffer())
  const timestamp = new Date().toISOString()
  const ext       = file.name.split('.').pop() ?? 'jpg'
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

  await saveInspirationImage({ url, analysis, filename: file.name, timestamp })

  return Response.json({ ok: true, url, analysis })
}
