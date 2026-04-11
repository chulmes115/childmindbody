/**
 * Generates 5 placeholder Enso circles and uploads them to S3 at enso/original/.
 * Run once to preview the gallery layout before uploading your real circles.
 *
 *   npx tsx scripts/seed-enso.ts
 *
 * Delete them anytime from the AWS S3 console once your real images are uploaded.
 */

import { readFileSync } from 'node:fs'
import sharp from 'sharp'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// Load .env.local
try {
  readFileSync('.env.local', 'utf-8')
    .split('\n')
    .forEach((line) => {
      const match = line.match(/^([^=\s#][^=\s]*)\s*=\s*(.*)$/)
      if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
    })
} catch { /* rely on existing env */ }

const BUCKET = process.env.AWS_S3_BUCKET ?? 'childmindbody-images'
const REGION = process.env.AWS_REGION ?? 'us-east-2'

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

// ─── Draw a circle arc into a greyscale pixel buffer ─────────────────────────

function drawEnso(options: {
  size: number
  radius: number
  strokeWidth: number
  gapDeg: number      // size of the opening in the circle, in degrees
  startDeg: number    // where the opening starts, in degrees (0 = right)
}): Buffer {
  const { size, radius, strokeWidth, gapDeg, startDeg } = options
  const cx = size / 2
  const cy = size / 2
  const half = strokeWidth / 2
  const endDeg = startDeg + (360 - gapDeg)

  const buf = Buffer.alloc(size * size, 255) // white

  // Walk angles at fine resolution, painting pixels on the arc
  for (let deg = startDeg; deg <= endDeg; deg += 0.15) {
    const rad = (deg * Math.PI) / 180
    // Paint across the stroke width using distance from ideal arc
    for (let dr = -half; dr <= half; dr += 0.5) {
      const px = Math.round(cx + (radius + dr) * Math.cos(rad))
      const py = Math.round(cy + (radius + dr) * Math.sin(rad))
      if (px >= 0 && px < size && py >= 0 && py < size) {
        // Soft edge: darker near centre of stroke, lighter at edges
        const alpha = 1 - Math.abs(dr) / half
        const current = buf[py * size + px]
        const next = Math.round(255 * (1 - alpha))
        buf[py * size + px] = Math.min(current, next)
      }
    }
  }

  return buf
}

// ─── Convert greyscale buf → RGBA (black marks on transparent bg) ────────────

async function toTransparentPng(greyBuf: Buffer, size: number): Promise<Buffer> {
  const rgba = Buffer.alloc(size * size * 4)
  for (let i = 0; i < greyBuf.length; i++) {
    rgba[i * 4 + 0] = 0
    rgba[i * 4 + 1] = 0
    rgba[i * 4 + 2] = 0
    rgba[i * 4 + 3] = greyBuf[i] < 200 ? 255 - greyBuf[i] : 0
  }
  return sharp(rgba, { raw: { width: size, height: size, channels: 4 } })
    .png()
    .toBuffer()
}

// ─── Five distinct placeholder circles ───────────────────────────────────────

const PLACEHOLDERS = [
  { size: 400, radius: 150, strokeWidth: 22, gapDeg: 25,  startDeg: 10  },
  { size: 400, radius: 140, strokeWidth: 16, gapDeg: 40,  startDeg: 200 },
  { size: 400, radius: 155, strokeWidth: 28, gapDeg: 15,  startDeg: 330 },
  { size: 400, radius: 145, strokeWidth: 12, gapDeg: 55,  startDeg: 90  },
  { size: 400, radius: 160, strokeWidth: 20, gapDeg: 30,  startDeg: 150 },
]

async function main() {
  for (let i = 0; i < PLACEHOLDERS.length; i++) {
    const cfg = PLACEHOLDERS[i]
    console.log(`Generating placeholder-${i + 1}…`)

    const grey = drawEnso(cfg)
    const png  = await toTransparentPng(grey, cfg.size)
    const key  = `enso/original/placeholder-${i + 1}.png`

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: png,
        ContentType: 'image/png',
      })
    )

    console.log(`  ✓ uploaded → https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`)
  }

  console.log('\nDone. Visit /gallery to see them floating.')
  console.log('Delete from S3 (enso/original/) once your real circles are ready.')
}

main().catch((err) => { console.error(err); process.exit(1) })
