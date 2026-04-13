import { cookies } from 'next/headers'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { deleteInspirationImage } from '@/lib/db'
import { s3, BUCKET } from '@/lib/s3'

async function assertAdmin() {
  const store = await cookies()
  if (store.get('cmb_admin')?.value !== process.env.ADMIN_SECRET)
    throw new Error('Unauthorized')
}

export async function DELETE(request: Request) {
  try {
    await assertAdmin()
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { timestamp, url } = await request.json() as { timestamp: string; url: string }

    if (!timestamp) return Response.json({ error: 'Missing timestamp' }, { status: 400 })

    // Delete from DynamoDB
    await deleteInspirationImage(timestamp)

    // Best-effort S3 deletion — extract key from URL
    if (url) {
      try {
        const prefix = `https://${BUCKET}.s3.${process.env.AWS_REGION ?? 'us-east-2'}.amazonaws.com/`
        const key = url.replace(prefix, '')
        if (key && key !== url) {
          await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
        }
      } catch {
        // S3 delete failure is non-fatal — DynamoDB record is already gone
      }
    }

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[admin/inspiration DELETE]', err)
    return Response.json({ error: 'Delete failed' }, { status: 500 })
  }
}
