import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { s3, BUCKET } from './s3'
import { EXCERPT_WORDS, EXCERPT_WORD_COUNT, WORDS_PER_CYCLE } from './excerpt'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const MODEL     = 'claude-haiku-4-5-20251001'
const REGION    = process.env.AWS_REGION ?? 'us-east-2'

// ─── Word-chunk logic ─────────────────────────────────────────────────────────

export function getChunk(wordPosition: number): {
  chunk: string
  nextPosition: number
  cycleLabel: string
} {
  const endPos  = Math.min(wordPosition + WORDS_PER_CYCLE, EXCERPT_WORD_COUNT)
  const chunk   = EXCERPT_WORDS.slice(0, endPos).join(' ')
  const isReset = endPos >= EXCERPT_WORD_COUNT
  return {
    chunk,
    nextPosition: isReset ? 0 : endPos,
    cycleLabel:   `words 1–${endPos} of ${EXCERPT_WORD_COUNT}${isReset ? ' (resetting)' : ''}`,
  }
}

// ─── Claude: generate DALL-E prompt ──────────────────────────────────────────

async function buildImagePrompt(
  chunk: string,
  lastImageUrl: string | undefined,
  inspirationDescriptions: string[]
): Promise<string> {
  const inspirationCtx = inspirationDescriptions.length > 0
    ? `\n\nThe artist's own works for stylistic reference:\n${inspirationDescriptions.map((d, i) => `${i + 1}. ${d}`).join('\n')}`
    : ''

  const instruction = `Generate a detailed DALL-E 3 image prompt that:
- Captures the mood, imagery, and emotional texture of this passage
- Maintains visual continuity with the prior image (if provided)
- Draws inspiration — loosely, not literally — from the artist's works described below
- Takes creative liberty with style, medium, and interpretation${inspirationCtx}

PASSAGE:
${chunk}

Return ONLY the image generation prompt. No preamble, no explanation.`

  const content: Anthropic.Messages.ContentBlockParam[] = lastImageUrl
    ? [
        { type: 'image', source: { type: 'url', url: lastImageUrl } },
        { type: 'text',  text: `This is the previously generated image — use it as visual continuity.\n\n${instruction}` },
      ]
    : [{ type: 'text', text: instruction }]

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 500,
    messages: [{ role: 'user', content }],
  })

  return (msg.content[0] as Anthropic.TextBlock).text.trim()
}

// ─── DALL-E 3: generate image, download, store in S3 ─────────────────────────

async function generateAndStore(prompt: string): Promise<string> {
  const response = await openai.images.generate({
    model:   'dall-e-3',
    prompt,
    n:       1,
    size:    '1024x1024',
    quality: 'standard',
  })

  const tempUrl = response.data?.[0]?.url
  if (!tempUrl) throw new Error('DALL-E returned no image URL')
  const imgRes  = await fetch(tempUrl)
  const buffer  = Buffer.from(await imgRes.arrayBuffer())
  const key     = `body-message/${Date.now()}.png`

  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        buffer,
    ContentType: 'image/png',
  }))

  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`
}

// ─── Claude vision: analyze an inspiration image ─────────────────────────────

export async function analyzeInspirationImage(imageUrl: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model:      MODEL,
    max_tokens: 400,
    messages: [{
      role:    'user',
      content: [
        { type: 'image', source: { type: 'url', url: imageUrl } },
        {
          type: 'text',
          text: 'Describe this artwork in detail: style, technique, medium, mood, color palette, subject matter, emotional tone, and notable visual elements. Be specific and evocative. This description will be used to inspire AI image generation.',
        },
      ],
    }],
  })
  return (msg.content[0] as Anthropic.TextBlock).text.trim()
}

// ─── Main cycle step ──────────────────────────────────────────────────────────

export async function runBodyMessageStep(params: {
  wordPosition: number
  lastImageUrl?: string
  inspirationDescriptions: string[]
}): Promise<{ imageUrl: string; nextWordPosition: number; prompt: string; cycleLabel: string }> {
  const { chunk, nextPosition, cycleLabel } = getChunk(params.wordPosition)
  const prompt   = await buildImagePrompt(chunk, params.lastImageUrl, params.inspirationDescriptions)
  const imageUrl = await generateAndStore(prompt)
  return { imageUrl, nextWordPosition: nextPosition, prompt, cycleLabel }
}
