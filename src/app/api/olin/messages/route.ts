import { getOlinMessages } from '@/lib/db'

export async function GET() {
  const messages = await getOlinMessages()
  return Response.json({ messages })
}
