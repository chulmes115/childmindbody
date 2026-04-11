import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLE } from '@/lib/dynamodb'

export async function GET() {
  const item = {
    pk: 'TEST',
    sk: 'connection-check',
    timestamp: new Date().toISOString(),
    message: 'DynamoDB connection OK',
  }

  await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }))

  const { Item } = await dynamo.send(
    new GetCommand({ TableName: TABLE, Key: { pk: 'TEST', sk: 'connection-check' } })
  )

  return Response.json({ ok: true, item: Item })
}
