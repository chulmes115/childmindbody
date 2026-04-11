/**
 * Processes the source enso image into two brand assets:
 *
 *   1. public/enso-watermark.png  — white marks on transparent (page background)
 *   2. src/app/icon.png           — white marks on black (favicon)
 *
 * Usage:
 *   npx tsx scripts/process-brand.ts
 *   npx tsx scripts/process-brand.ts path/to/your-enso.jpg
 *
 * Default source: scripts/enso-source.jpg
 */

import sharp from 'sharp'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const sourcePath = process.argv[2] ?? 'scripts/enso-source.jpg'

async function main() {
  console.log(`Reading source: ${sourcePath}`)

  const { data, info } = await sharp(sourcePath)
    .greyscale()
    .threshold(140)   // slightly high to capture full brush strokes
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height } = info

  // ── 1. Watermark: white marks on transparent ────────────────────────────────
  const watermarkRgba = Buffer.alloc(width * height * 4)
  for (let i = 0; i < data.length; i++) {
    const isDark = data[i] < 128
    watermarkRgba[i * 4 + 0] = 255          // R
    watermarkRgba[i * 4 + 1] = 255          // G
    watermarkRgba[i * 4 + 2] = 255          // B
    watermarkRgba[i * 4 + 3] = isDark ? 255 : 0 // A: circle opaque, background transparent
  }

  const watermarkPng = await sharp(watermarkRgba, {
    raw: { width, height, channels: 4 },
  }).png().toBuffer()

  const watermarkPath = join('public', 'enso-watermark.png')
  writeFileSync(watermarkPath, watermarkPng)
  console.log(`✓ ${watermarkPath}`)

  // ── 2. Favicon: white marks on black, square crop, 512×512 ──────────────────
  const faviconRgba = Buffer.alloc(width * height * 4)
  for (let i = 0; i < data.length; i++) {
    const isDark = data[i] < 128
    faviconRgba[i * 4 + 0] = isDark ? 255 : 0  // R: white circle, black bg
    faviconRgba[i * 4 + 1] = isDark ? 255 : 0  // G
    faviconRgba[i * 4 + 2] = isDark ? 255 : 0  // B
    faviconRgba[i * 4 + 3] = 255               // A: fully opaque
  }

  // Trim excess black border, then resize the circle to 70% of the 512px square,
  // and extend canvas to full 512×512 with black — gives centered breathing room.
  const innerSize = Math.round(512 * 0.70)  // 358px — circle occupies 70% of icon
  const faviconPng = await sharp(faviconRgba, {
    raw: { width, height, channels: 4 },
  })
    .trim({ background: { r: 0, g: 0, b: 0 }, threshold: 10 })
    .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
    .extend({
      top:    Math.floor((512 - innerSize) / 2),
      bottom: Math.ceil((512 - innerSize) / 2),
      left:   Math.floor((512 - innerSize) / 2),
      right:  Math.ceil((512 - innerSize) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    })
    .png()
    .toBuffer()

  mkdirSync(join('src', 'app'), { recursive: true })
  const faviconPath = join('src', 'app', 'icon.png')
  writeFileSync(faviconPath, faviconPng)
  console.log(`✓ ${faviconPath}`)

  console.log('\nDone. Run `npm run dev` and check /bodys-message to preview.')
}

main().catch((err) => { console.error(err); process.exit(1) })
