import { PutObjectCommand } from '@aws-sdk/client-s3'
import { s3, BUCKET } from '@/lib/s3'

export async function GET() {
  const key = 'test/connection-check.txt'
  const body = `Connection test at ${new Date().toISOString()}`
  const region = process.env.AWS_REGION ?? 'us-east-2'

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: 'text/plain',
    })
  )

  const url = `https://${BUCKET}.s3.${region}.amazonaws.com/${key}`

  return Response.json({ ok: true, url })
}
