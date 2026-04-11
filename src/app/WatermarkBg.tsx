'use client'

import { usePathname } from 'next/navigation'

// Pages where the watermark should NOT appear
const EXCLUDED = ['/gallery']

export default function WatermarkBg() {
  const path = usePathname()
  if (EXCLUDED.includes(path)) return null

  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none flex items-center justify-center overflow-hidden"
      style={{ zIndex: 0 }}
    >
      <img
        src="/enso-watermark.png"
        alt=""
        style={{
          width:   '65vmin',
          height:  '65vmin',
          objectFit: 'contain',
          opacity: 0.20,
        }}
      />
    </div>
  )
}
