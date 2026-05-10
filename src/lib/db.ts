import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb'
import { dynamo, TABLE } from './dynamodb'
import { EXCERPT_WORD_COUNT } from './excerpt'

// ─── Types ───────────────────────────────────────────────────────────────────

// Numeric META keys. Counters are stored at pk='META', sk=<key> with { value: number }.
// Adding a new counter: append the key here, add a field to ProjectStatus, and add
// it to getProjectStatus's parallel read. Nothing else.
export type CounterKey =
  | 'consecutive_fails'
  | 'code_fail_count'
  | 'mind_fail_count'
  | 'codebase_resets'
  | 'hate_wound_count'
  | 'body_deaths'
  | 'disquiet_condense_count'

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

// ─── META counters & start_date ──────────────────────────────────────────────
// All META rows live at pk='META', sk=<key>. Counters are number-valued
// (sk is a CounterKey). start_date is the one string-valued META row.

// Internal — used by both counter API and start_date helpers.
async function _readMeta(key: string): Promise<string | number | null> {
  const { Item } = await dynamo.send(
    new GetCommand({ TableName: TABLE, Key: { pk: 'META', sk: key } })
  )
  return Item ? (Item.value as string | number) : null
}

async function _writeMeta(key: string, value: string | number): Promise<void> {
  await dynamo.send(
    new PutCommand({ TableName: TABLE, Item: { pk: 'META', sk: key, value } })
  )
}

// Read a counter. Missing keys return 0.
export async function getCounter(key: CounterKey): Promise<number> {
  return ((await _readMeta(key)) as number) ?? 0
}

// Atomic increment via DynamoDB ADD. Race-safe under any concurrency.
// Returns the new value after the increment.
export async function bumpCounter(key: CounterKey, delta: number = 1): Promise<number> {
  const { Attributes } = await dynamo.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { pk: 'META', sk: key },
      UpdateExpression: 'ADD #v :d',
      ExpressionAttributeNames:  { '#v': 'value' },
      ExpressionAttributeValues: { ':d': delta },
      ReturnValues: 'UPDATED_NEW',
    })
  )
  return (Attributes?.value as number) ?? 0
}

// Set a counter to an absolute value. Use for resets (e.g. consecutive_fails → 0).
export async function setCounter(key: CounterKey, value: number): Promise<void> {
  await _writeMeta(key, value)
}

// start_date — the one non-counter META key. Set once on first cycle, read everywhere.
export async function getStartDate(): Promise<string | null> {
  return (await _readMeta('start_date')) as string | null
}

export async function setStartDate(iso: string): Promise<void> {
  await _writeMeta('start_date', iso)
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

// Counts only real visitor responses — excludes hate wound records
export async function countRealIntakeResponses(cycleId: number): Promise<number> {
  const { Count } = await dynamo.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'pk = :pk',
      FilterExpression: 'attribute_not_exists(wound)',
      ExpressionAttributeValues: { ':pk': `INTAKE#${cycleId}` },
      Select: 'COUNT',
    })
  )
  return Count ?? 0
}

export type IntakeEntry = {
  text:    string
  isWound: boolean
}

export async function getIntakeEntries(cycleId: number): Promise<IntakeEntry[]> {
  const { Items } = await dynamo.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': `INTAKE#${cycleId}` },
    })
  )
  return (Items ?? []).map((item) => ({
    text:    item.response as string,
    isWound: !!(item.wound as boolean),
  }))
}

// Saves an Olin hate wound into the cycle's intake — appears in the wounds tab
export async function saveHateWound(cycleId: number, index: number = 0): Promise<void> {
  // Add index offset so wounds get unique sk values even if called in rapid succession
  const ts = new Date(Date.now() + index).toISOString()
  await dynamo.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        pk:        `INTAKE#${cycleId}`,
        sk:        ts,
        response:  "I'm sorry, but i do really hate you",
        timestamp: ts,
        wound:     true,
      },
    })
  )
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

// ─── Gallery compliment ───────────────────────────────────────────────────────
// pk='GALLERY'  sk='COMPLIMENT'  →  { text }

export async function getGalleryCompliment(): Promise<string | null> {
  const { Item } = await dynamo.send(
    new GetCommand({ TableName: TABLE, Key: { pk: 'GALLERY', sk: 'COMPLIMENT' } })
  )
  return Item ? (Item.text as string) : null
}

export async function saveGalleryCompliment(text: string): Promise<void> {
  await dynamo.send(
    new PutCommand({ TableName: TABLE, Item: { pk: 'GALLERY', sk: 'COMPLIMENT', text } })
  )
}

// ─── Child's Disquiet ─────────────────────────────────────────────────────────
// Messages: pk='DISQUIET_CONVO#${cycleId}'  sk='<ISO timestamp>'  → { role, text }
// Status:   pk='DISQUIET'  sk='STATUS'                             → { cycle_id, count }
// Memory:   pk='DISQUIET'  sk='MEMORY'                             → { text }

export type DisquietMessage = {
  role:      'user' | 'child'
  text:      string
  timestamp: string
}

export async function getDisquietMessages(): Promise<DisquietMessage[]> {
  const { Items } = await dynamo.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': 'DISQUIET_CONVO' },
      ScanIndexForward: true,
    })
  )
  return (Items ?? []).map((item) => ({
    role:      item.role      as 'user' | 'child',
    text:      item.text      as string,
    timestamp: item.sk        as string,
  }))
}

export async function saveDisquietMessage(
  cycleId: number,
  role: 'user' | 'child',
  text: string,
): Promise<void> {
  const ts = new Date().toISOString()
  await dynamo.send(
    new PutCommand({
      TableName: TABLE,
      Item: { pk: 'DISQUIET_CONVO', sk: ts, role, text, cycle_id: cycleId },
    })
  )
}

export async function clearDisquietMessages(): Promise<void> {
  const { Items } = await dynamo.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': 'DISQUIET_CONVO' },
      ProjectionExpression: 'sk',
    })
  )
  if (!Items || Items.length === 0) return

  const { BatchWriteCommand } = await import('@aws-sdk/lib-dynamodb')
  // DynamoDB batch write limit is 25 items per request
  for (let i = 0; i < Items.length; i += 25) {
    const batch = Items.slice(i, i + 25).map((item) => ({
      DeleteRequest: { Key: { pk: 'DISQUIET_CONVO', sk: item.sk as string } },
    }))
    await dynamo.send(new BatchWriteCommand({ RequestItems: { [TABLE]: batch } }))
  }
}

export async function getDisquietCount(cycleId: number): Promise<number> {
  const { Item } = await dynamo.send(
    new GetCommand({ TableName: TABLE, Key: { pk: 'DISQUIET', sk: 'STATUS' } })
  )
  if (!Item || Item.cycle_id !== cycleId) return 0
  return (Item.count as number) ?? 0
}

export async function incrementDisquietCount(cycleId: number): Promise<number> {
  const current = await getDisquietCount(cycleId)
  const next    = current + 1
  await dynamo.send(
    new PutCommand({
      TableName: TABLE,
      Item: { pk: 'DISQUIET', sk: 'STATUS', cycle_id: cycleId, count: next },
    })
  )
  return next
}

export async function getDisquietMemory(): Promise<string> {
  const { Item } = await dynamo.send(
    new GetCommand({ TableName: TABLE, Key: { pk: 'DISQUIET', sk: 'MEMORY' } })
  )
  return Item ? (Item.text as string) : ''
}

export async function saveDisquietMemory(text: string): Promise<void> {
  await dynamo.send(
    new PutCommand({ TableName: TABLE, Item: { pk: 'DISQUIET', sk: 'MEMORY', text } })
  )
}

// ─── Olin messages (journal entries shown on /olin) ──────────────────────────
// pk='OLIN_MSG'  sk='<ISO timestamp>'  → { text }

export type OlinMessage = {
  text:      string
  timestamp: string
}

export async function getOlinMessages(): Promise<OlinMessage[]> {
  const { Items } = await dynamo.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': 'OLIN_MSG' },
      ScanIndexForward: true,
    })
  )
  return (Items ?? []).map((item) => ({
    text:      item.text      as string,
    timestamp: item.sk        as string,
  }))
}

export async function saveOlinMessage(text: string): Promise<void> {
  const ts = new Date().toISOString()
  await dynamo.send(
    new PutCommand({ TableName: TABLE, Item: { pk: 'OLIN_MSG', sk: ts, text } })
  )
}

export async function getLatestOlinMessage(): Promise<string | null> {
  const { Items } = await dynamo.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': 'OLIN_MSG' },
      ScanIndexForward: false,
      Limit: 1,
    })
  )
  return Items && Items.length > 0 ? (Items[0].text as string) : null
}

export async function deleteOlinMessage(timestamp: string): Promise<void> {
  const { DeleteCommand } = await import('@aws-sdk/lib-dynamodb')
  await dynamo.send(
    new DeleteCommand({ TableName: TABLE, Key: { pk: 'OLIN_MSG', sk: timestamp } })
  )
}

// ─── Olin watermarks (3 slots for /olin triangle formation) ──────────────────
// pk='OLIN_WM'  sk='1'|'2'|'3'  → { url }

export async function getOlinWatermarks(): Promise<(string | null)[]> {
  const { Items } = await dynamo.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': 'OLIN_WM' },
    })
  )
  const map: Record<string, string> = {}
  for (const item of Items ?? []) map[item.sk as string] = item.url as string
  return [map['1'] ?? null, map['2'] ?? null, map['3'] ?? null]
}

export async function saveOlinWatermark(slot: 1 | 2 | 3, url: string): Promise<void> {
  await dynamo.send(
    new PutCommand({ TableName: TABLE, Item: { pk: 'OLIN_WM', sk: String(slot), url } })
  )
}

// Deletes all hate wound entries for a given cycle (called when Body is killed)
export async function deleteWoundEntries(cycleId: number): Promise<void> {
  const { Items } = await dynamo.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'pk = :pk',
      FilterExpression: 'wound = :w',
      ExpressionAttributeValues: { ':pk': `INTAKE#${cycleId}`, ':w': true },
      ProjectionExpression: 'sk',
    })
  )
  if (!Items || Items.length === 0) return

  const { BatchWriteCommand } = await import('@aws-sdk/lib-dynamodb')
  for (let i = 0; i < Items.length; i += 25) {
    const batch = Items.slice(i, i + 25).map((item) => ({
      DeleteRequest: { Key: { pk: `INTAKE#${cycleId}`, sk: item.sk as string } },
    }))
    await dynamo.send(new BatchWriteCommand({ RequestItems: { [TABLE]: batch } }))
  }
}

// ─── Per-visitor cooldown (server-side, keyed by IP hash) ────────────────────
// pk='COOLDOWN'  sk='${type}#${ipHash}'  →  { last_at: number }

export async function getCooldown(type: string, ipHash: string): Promise<number | null> {
  const { Item } = await dynamo.send(
    new GetCommand({ TableName: TABLE, Key: { pk: 'COOLDOWN', sk: `${type}#${ipHash}` } })
  )
  return Item ? (Item.last_at as number) : null
}

export async function setCooldown(type: string, ipHash: string, ts: number): Promise<void> {
  await dynamo.send(
    new PutCommand({ TableName: TABLE, Item: { pk: 'COOLDOWN', sk: `${type}#${ipHash}`, last_at: ts } })
  )
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

export async function deleteInspirationImage(timestamp: string): Promise<void> {
  const { DeleteCommand } = await import('@aws-sdk/lib-dynamodb')
  await dynamo.send(
    new DeleteCommand({ TableName: TABLE, Key: { pk: 'INSPIRATION', sk: timestamp } })
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

// ─── Project status — single entry point for "where is the project right now" ──
// Any UI page or bot that needs current state asks one question: getProjectStatus(cycleId).

export type ProjectStatus = {
  cycleId:                 number
  startDate:               string  // '' if not yet seeded (first cycle hasn't run)
  consecutiveFails:        number
  codeFailCount:           number
  mindFailCount:           number
  codebaseResets:          number
  bodyDeaths:              number
  hateWoundCount:          number
  disquietCondenseCount:   number
  disquietCount:           number  // questions asked this cycle
  galleryUploadCount:      number  // uploads this cycle
  bodyMessageWordPosition: number
  totalWords:              number  // = EXCERPT_WORD_COUNT
  latestOlinMessage:       string | null
}

export async function getProjectStatus(cycleId: number): Promise<ProjectStatus> {
  const [
    consecutiveFails,
    codeFailCount,
    mindFailCount,
    codebaseResets,
    bodyDeaths,
    hateWoundCount,
    disquietCondenseCount,
    startDate,
    bodyMessageStatus,
    galleryUploadCount,
    disquietCount,
    latestOlinMessage,
  ] = await Promise.all([
    getCounter('consecutive_fails'),
    getCounter('code_fail_count'),
    getCounter('mind_fail_count'),
    getCounter('codebase_resets'),
    getCounter('body_deaths'),
    getCounter('hate_wound_count'),
    getCounter('disquiet_condense_count'),
    getStartDate(),
    getBodyMessageStatus(),
    getGalleryUploadCount(cycleId),
    getDisquietCount(cycleId),
    getLatestOlinMessage(),
  ])

  return {
    cycleId,
    startDate:               startDate ?? '',
    consecutiveFails,
    codeFailCount,
    mindFailCount,
    codebaseResets,
    bodyDeaths,
    hateWoundCount,
    disquietCondenseCount,
    disquietCount,
    galleryUploadCount,
    bodyMessageWordPosition: bodyMessageStatus.wordPosition,
    totalWords:              EXCERPT_WORD_COUNT,
    latestOlinMessage,
  }
}
