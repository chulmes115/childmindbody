import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLE } from './dynamodb'

// ─── Types ───────────────────────────────────────────────────────────────────

export type MetaKey =
  | 'consecutive_fails'
  | 'code_fail_count'
  | 'codebase_resets'
  | 'start_date'

export type CycleRecord = {
  id: number
  child_resolution?: string
  body_direction?: string
  mind_analysis?: string
  mind_rec?: 'pass' | 'fail'
  chris_decision?: 'pass' | 'fail'
  olin_note?: string
  consecutive_failures?: number
  code_fail_count?: number
  reset_count?: number
  body_code?: string
  intake_condensed?: string
  intake_killed?: boolean
}

// ─── META counters ────────────────────────────────────────────────────────────
// pk='META'  sk='{key}'  →  { value }

export async function getMeta(key: MetaKey): Promise<string | number | null> {
  const { Item } = await dynamo.send(
    new GetCommand({ TableName: TABLE, Key: { pk: 'META', sk: key } })
  )
  return Item ? (Item.value as string | number) : null
}

export async function setMeta(key: MetaKey, value: string | number): Promise<void> {
  await dynamo.send(
    new PutCommand({ TableName: TABLE, Item: { pk: 'META', sk: key, value } })
  )
}

// ─── Body code ────────────────────────────────────────────────────────────────
// pk='BODY'  sk='current_code'  →  { html }

export async function getCurrentBodyCode(): Promise<string | null> {
  const { Item } = await dynamo.send(
    new GetCommand({ TableName: TABLE, Key: { pk: 'BODY', sk: 'current_code' } })
  )
  return Item ? (Item.html as string) : null
}

export async function saveBodyCode(html: string): Promise<void> {
  await dynamo.send(
    new PutCommand({ TableName: TABLE, Item: { pk: 'BODY', sk: 'current_code', html } })
  )
}

// ─── Cycle counter ────────────────────────────────────────────────────────────
// pk='CYCLE#current'  sk='STATUS'  →  { cycle_id, date }

export async function getCurrentCycleId(): Promise<number> {
  const { Item } = await dynamo.send(
    new GetCommand({ TableName: TABLE, Key: { pk: 'CYCLE#current', sk: 'STATUS' } })
  )
  return Item ? (Item.cycle_id as number) : 0
}

export async function incrementCycleId(): Promise<void> {
  const current = await getCurrentCycleId()
  await dynamo.send(
    new PutCommand({
      TableName: TABLE,
      Item: { pk: 'CYCLE#current', sk: 'STATUS', cycle_id: current + 1, date: new Date().toISOString() },
    })
  )
}

// ─── Cycle records ────────────────────────────────────────────────────────────
// pk='CYCLE#{id}'  sk='RECORD'  →  { ...CycleRecord fields }

export async function getCycleRecord(id: number): Promise<CycleRecord | null> {
  const { Item } = await dynamo.send(
    new GetCommand({ TableName: TABLE, Key: { pk: `CYCLE#${id}`, sk: 'RECORD' } })
  )
  if (!Item) return null
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { pk: _pk, sk: _sk, ...rest } = Item
  return { id, ...rest } as CycleRecord
}

export async function saveCycleRecord(
  record: Partial<CycleRecord> & { id: number }
): Promise<void> {
  const { id, ...fields } = record
  const sets: string[] = []
  const names: Record<string, string> = {}
  const values: Record<string, unknown> = {}

  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) {
      sets.push(`#${k} = :${k}`)
      names[`#${k}`] = k
      values[`:${k}`] = v
    }
  }

  if (sets.length === 0) return

  await dynamo.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { pk: `CYCLE#${id}`, sk: 'RECORD' },
      UpdateExpression: `SET ${sets.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    })
  )
}

// ─── Intake responses ─────────────────────────────────────────────────────────
// pk='INTAKE#{cycleId}'  sk='<timestamp>'  →  { response, timestamp }

export async function saveIntakeResponse(cycleId: number, response: string): Promise<void> {
  await dynamo.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        pk: `INTAKE#${cycleId}`,
        sk: new Date().toISOString(),
        response,
        timestamp: new Date().toISOString(),
      },
    })
  )
}

export async function getIntakeResponses(cycleId: number): Promise<string[]> {
  const { Items } = await dynamo.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': `INTAKE#${cycleId}` },
    })
  )
  return (Items ?? []).map((item) => item.response as string)
}

export async function countIntakeResponses(cycleId: number): Promise<number> {
  const { Count } = await dynamo.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': `INTAKE#${cycleId}` },
      Select: 'COUNT',
    })
  )
  return Count ?? 0
}

// ─── Body's Message state ─────────────────────────────────────────────────────
// pk='BODY_MESSAGE'  sk='STATUS'  →  { word_position, last_image_url, last_prompt }

export type BodyMessageStatus = {
  wordPosition: number
  lastImageUrl?: string
  lastPrompt?: string
}

export async function getBodyMessageStatus(): Promise<BodyMessageStatus> {
  const { Item } = await dynamo.send(
    new GetCommand({ TableName: TABLE, Key: { pk: 'BODY_MESSAGE', sk: 'STATUS' } })
  )
  if (!Item) return { wordPosition: 0 }
  return {
    wordPosition: (Item.word_position as number) ?? 0,
    lastImageUrl: Item.last_image_url as string | undefined,
    lastPrompt: Item.last_prompt as string | undefined,
  }
}

export async function saveBodyMessageStatus(status: BodyMessageStatus): Promise<void> {
  await dynamo.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        pk: 'BODY_MESSAGE',
        sk: 'STATUS',
        word_position: status.wordPosition,
        ...(status.lastImageUrl ? { last_image_url: status.lastImageUrl } : {}),
        ...(status.lastPrompt   ? { last_prompt:    status.lastPrompt   } : {}),
      },
    })
  )
}

// ─── Gallery upload counter (per-cycle cap) ───────────────────────────────────
// pk='GALLERY_CYCLE'  sk='STATUS'  →  { cycle_id, count }

export async function getGalleryUploadCount(cycleId: number): Promise<number> {
  const { Item } = await dynamo.send(
    new GetCommand({ TableName: TABLE, Key: { pk: 'GALLERY_CYCLE', sk: 'STATUS' } })
  )
  if (!Item || Item.cycle_id !== cycleId) return 0
  return (Item.count as number) ?? 0
}

export async function incrementGalleryUploadCount(cycleId: number): Promise<number> {
  const current = await getGalleryUploadCount(cycleId)
  const next = current + 1
  await dynamo.send(
    new PutCommand({
      TableName: TABLE,
      Item: { pk: 'GALLERY_CYCLE', sk: 'STATUS', cycle_id: cycleId, count: next },
    })
  )
  return next
}

// ─── Inspiration images ───────────────────────────────────────────────────────
// pk='INSPIRATION'  sk='<timestamp>'  →  { url, analysis, filename }

export type InspirationImage = {
  url: string
  analysis: string
  filename: string
  timestamp: string
}

export async function saveInspirationImage(img: InspirationImage): Promise<void> {
  await dynamo.send(
    new PutCommand({
      TableName: TABLE,
      Item: { pk: 'INSPIRATION', sk: img.timestamp, ...img },
    })
  )
}

export async function getInspirationImages(): Promise<InspirationImage[]> {
  const { Items } = await dynamo.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': 'INSPIRATION' },
    })
  )
  return (Items ?? []).map((item) => ({
    url:       item.url       as string,
    analysis:  item.analysis  as string,
    filename:  item.filename  as string,
    timestamp: item.sk        as string,
  }))
}
