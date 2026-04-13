import { cookies } from 'next/headers'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
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
    const { url } = await request.json() as { url: string }
    if (!url) return Response.json({ error: 'Missing url' }, { status: 400 })

    const prefix = `https://${BUCKET}.s3.${process.env.AWS_REGION ?? 'us-east-2'}.amazonaws.com/`
    const key = url.replace(prefix, '')
    if (!key || key === url) return Response.json({ error: 'Invalid url' }, { status: 400 })

    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[admin/gallery DELETE]', err)
    return Response.json({ error: 'Delete failed' }, { status: 500 })
  }
}
