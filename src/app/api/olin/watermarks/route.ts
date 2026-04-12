import { getOlinWatermarks } from '@/lib/db'

export async function GET() {
  const watermarks = await getOlinWatermarks()
  return Response.json({ watermarks })
}
