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
    const radius = Math.min(vw, vh) * 0.32

    setImages(
      urls.map((url, i) => {
        const angle = (2 * Math.PI / n) * i + rand(-0.25, 0.25)
        const r = radius + rand(-60, 60)
        const size = rand(120, 190)
        return {
          url,
          x: cx + r * Math.cos(angle) - size / 2,
          y: cy + r * Math.sin(angle) - size / 2,
          size,
          initRot: rand(-20, 20),
          dx: `${rand(-35, 35).toFixed(1)}px`,
          dy: `${rand(-35, 35).toFixed(1)}px`,
          dr: `${rand(-12, 12).toFixed(1)}deg`,
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
    <div className="relative w-screen h-screen overflow-hidden bg-stone-50">

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

      {images.length === 0 && (
        <p className="absolute inset-0 flex items-center justify-center text-stone-300 text-sm">
          no images yet
        </p>
      )}

      {/* Upload form — fixed bottom-right */}
      <form
        onSubmit={handleUpload}
        className="fixed bottom-6 right-6 flex items-center gap-3 bg-white/80 backdrop-blur border border-stone-200 rounded-full px-4 py-2 shadow-sm z-50"
        style={{ fontFamily: 'var(--font-geist-sans)' }}
      >
        <input
          ref={fileRef}
          type="file"
          name="image"
          accept="image/*"
          className="text-xs text-stone-500 file:mr-2 file:text-xs file:border-0 file:bg-transparent file:text-stone-400 file:cursor-pointer"
        />
        <button
          type="submit"
          disabled={uploading}
          className="text-xs text-stone-500 hover:text-stone-800 disabled:opacity-40 transition-colors whitespace-nowrap"
        >
          {uploading ? 'processing…' : 'add circle'}
        </button>
        {uploadError && (
          <span className="text-xs text-red-400">{uploadError}</span>
        )}
      </form>

    </div>
  )
}
