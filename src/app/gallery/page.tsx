'use client'

import { useEffect, useRef, useState } from 'react'

type FloatingImage = {
  url: string
  x: number
  y: number
  size: number
  initRot: number
  dx: string
  dy: string
  dr: string
  duration: number
  delay: number
  zIndex: number
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

export default function Gallery() {
  const [images, setImages] = useState<FloatingImage[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function loadImages() {
    const res = await fetch('/api/gallery/images')
    if (!res.ok) { console.error('gallery/images error', res.status); return }
    const data = await res.json()
    const urls: string[] = data.images ?? []
    if (urls.length === 0) { setImages([]); return }

    const n = urls.length
    const vw = window.innerWidth
    const vh = window.innerHeight
    const cx = vw / 2
    const cy = vh / 2
    const radius = Math.min(vw, vh) * 0.40

    setImages(
      urls.map((url, i) => {
        const angle = (2 * Math.PI / n) * i + rand(-0.25, 0.25)
        const r = radius + rand(-60, 60)
        const size = rand(100, 160)
        return {
          url,
          x: cx + r * Math.cos(angle) - size / 2,
          y: cy + r * Math.sin(angle) - size / 2,
          size,
          initRot: rand(-20, 20),
          dx: `${rand(-50, 50).toFixed(1)}px`,
          dy: `${rand(-50, 50).toFixed(1)}px`,
          dr: `${rand(-16, 16).toFixed(1)}deg`,
          duration: rand(14, 28),
          delay: rand(-30, 0),
          zIndex: Math.floor(rand(0, 10)),
        }
      })
    )
  }

  useEffect(() => { loadImages() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError('')

    const form = new FormData()
    form.append('image', file)

    const res = await fetch('/api/gallery/upload', { method: 'POST', body: form })
    const data = await res.json()

    if (data.ok) {
      await loadImages()
      if (fileRef.current) fileRef.current.value = ''
    } else {
      setUploadError(data.error ?? 'Upload failed')
    }
    setUploading(false)
  }

  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: 'linear-gradient(to bottom, #0052ff 0%, #a8d4ff 100%)' }}
    >

      {/* Floating images */}
      {images.map((img, i) => (
        <img
          key={`${img.url}-${i}`}
          src={img.url}
          alt=""
          style={{
            position: 'absolute',
            left: img.x,
            top: img.y,
            width: img.size,
            height: img.size,
            objectFit: 'contain',
            opacity: 0.78,
            zIndex: img.zIndex,
            '--init-rot': `${img.initRot}deg`,
            '--dx': img.dx,
            '--dy': img.dy,
            '--dr': img.dr,
            animationName: 'drift',
            animationDuration: `${img.duration}s`,
            animationDelay: `${img.delay}s`,
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
            animationDirection: 'alternate',
          } as React.CSSProperties}
        />
      ))}

      {/* Center title */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none"
        style={{ fontFamily: 'var(--font-geist-sans)' }}
      >
        <p className="text-white text-lg tracking-widest uppercase" style={{ letterSpacing: '0.2em' }}>
          ode to the blue sky
        </p>
        <p className="text-white/50 text-xs mt-1 tracking-wider">— Human created, Olin</p>
      </div>

      {images.length === 0 && (
        <p className="absolute inset-0 flex items-center justify-center text-white/40 text-sm">
          no images yet
        </p>
      )}

      {/* Upload form — fixed bottom-right */}
      <form
        onSubmit={handleUpload}
        className="fixed bottom-6 right-6 flex items-center gap-3 bg-white/20 backdrop-blur border border-white/30 rounded-full px-4 py-2 z-50"
        style={{ fontFamily: 'var(--font-geist-sans)' }}
      >
        <input
          ref={fileRef}
          type="file"
          name="image"
          accept="image/*"
          className="text-xs text-white/70 file:mr-3 file:text-xs file:border-0 file:bg-transparent file:text-white/30 file:cursor-pointer"
        />
        <button
          type="submit"
          disabled={uploading}
          className="text-xs text-white/70 hover:text-white/90 disabled:opacity-40 transition-colors whitespace-nowrap"
        >
          {uploading ? 'processing…' : 'add circle'}
        </button>
        {uploadError && (
          <span className="text-xs text-red-400/70">{uploadError}</span>
        )}
      </form>

    </div>
  )
}
