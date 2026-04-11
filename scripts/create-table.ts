/**
 * One-time setup script — creates the DynamoDB table if it doesn't already exist.
 *
 * Run from the project root:
 *   npx tsx scripts/create-table.ts
 */

import { readFileSync } from 'node:fs'
import {
  DynamoDBClient,
  CreateTableCommand,
  ResourceInUseException,
} from '@aws-sdk/client-dynamodb'

// Load credentials from .env.local (not available in script context otherwise)
try {
  readFileSync('.env.local', 'utf-8')
    .split('\n')
    .forEach((line) => {
      const match = line.match(/^([^=\s#][^=\s]*)\s*=\s*(.*)$/)
      if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
    })
} catch {
  // No .env.local — rely on env vars already being set
}

const region = process.env.AWS_REGION ?? 'us-east-2'
const tableName = process.env.AWS_DYNAMODB_TABLE ?? 'childmindbody'

const client = new DynamoDBClient({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

async function main() {
  console.log(`Creating table "${tableName}" in ${region}...`)

  try {
    await client.send(
      new CreateTableCommand({
        TableName: tableName,
        BillingMode: 'PAY_PER_REQUEST',
        AttributeDefinitions: [
          { AttributeName: 'pk', AttributeType: 'S' },
          { AttributeName: 'sk', AttributeType: 'S' },
        ],
        KeySchema: [
          { AttributeName: 'pk', KeyType: 'HASH' },
          { AttributeName: 'sk', KeyType: 'RANGE' },
        ],
      })
    )
    console.log(`✓ Table "${tableName}" created (on-demand capacity, pk+sk).`)
  } catch (err) {
    if (err instanceof ResourceInUseException) {
      console.log(`✓ Table "${tableName}" already exists — nothing to do.`)
    } else {
      throw err
    }
  }
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
