'use client'

import { useEffect, useRef, useState } from 'react'

type FloatingImage = {
  url:      string
  x:        number
  y:        number
  size:     number
  initRot:  number
  dx:       string
  dy:       string
  dr:       string
  duration: number
  delay:    number
  zIndex:   number
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

const CHAR_DELAY = 38

export default function Gallery() {
  const [images,      setImages]      = useState<FloatingImage[]>([])
  const [center,      setCenter]      = useState({ x: 0, y: 0 })
  const [arrivingUrl, setArrivingUrl] = useState<string | null>(null)

  // Raw URLs kept in a ref so resize can re-layout without refetching
  const rawUrlsRef = useRef<string[]>([])

  // Persistent compliment
  const [compliment,      setCompliment]      = useState<string | null>(null)
  const [complimentCount, setComplimentCount] = useState(0)

  const [uploading,   setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Layout from URLs (no fetch — called on load and resize) ───────────────

  function layoutImages(urls: string[], newUrl?: string) {
    if (urls.length === 0) { setImages([]); return }
    const vw = window.innerWidth
    const vh = window.innerHeight
    const cx = vw / 2
    const cy = vh / 2
    setCenter({ x: cx, y: cy })

    const n      = urls.length
    const radius = Math.min(vw, vh) * 0.40

    setImages(
      urls.map((url, i) => {
        const angle = (2 * Math.PI / n) * i + rand(-0.25, 0.25)
        const r     = radius + rand(-60, 60)
        const size  = rand(100, 160)
        return {
          url,
          x:        cx + r * Math.cos(angle) - size / 2,
          y:        cy + r * Math.sin(angle) - size / 2,
          size,
          initRot:  rand(-20, 20),
          dx:       `${rand(-50, 50).toFixed(1)}px`,
          dy:       `${rand(-50, 50).toFixed(1)}px`,
          dr:       `${rand(-16, 16).toFixed(1)}deg`,
          duration: rand(14, 28),
          delay:    newUrl && url === newUrl ? 1.4 : rand(-30, 0),
          zIndex:   Math.floor(rand(0, 10)),
        }
      })
    )
  }

  // ── Fetch images + compliment ─────────────────────────────────────────────

  async function fetchGalleryData(newUrl?: string) {
    const res = await fetch('/api/gallery/images')
    if (!res.ok) return
    const data = await res.json()
    const urls: string[] = data.images ?? []
    rawUrlsRef.current = urls
    layoutImages(urls, newUrl)

    if (newUrl) {
      setArrivingUrl(newUrl)
      setTimeout(() => setArrivingUrl(null), 1600)
    }

    if (!newUrl && data.compliment) {
      setCompliment(data.compliment)
      setComplimentCount(0)
    }
  }

  // ── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetchGalleryData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Resize: re-layout without refetching ──────────────────────────────────

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const handleResize = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (rawUrlsRef.current.length > 0) layoutImages(rawUrlsRef.current)
      }, 150)
    }
    window.addEventListener('resize', handleResize)
    return () => { clearTimeout(timer); window.removeEventListener('resize', handleResize) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Compliment typewriter ─────────────────────────────────────────────────

  useEffect(() => {
    if (!compliment || complimentCount >= compliment.length) return
    const t = setTimeout(() => setComplimentCount((c) => c + 1), CHAR_DELAY)
    return () => clearTimeout(t)
  }, [compliment, complimentCount])

  // ── Upload ────────────────────────────────────────────────────────────────

  async function handleFile(file: File) {
    setUploading(true)
    setUploadError('')

    const form = new FormData()
    form.append('image', file)

    const res  = await fetch('/api/gallery/upload', { method: 'POST', body: form })
    const data = await res.json()

    if (data.ok) {
      if (data.compliment) {
        setCompliment(null)
        setComplimentCount(0)
        setTimeout(() => {
          setCompliment(data.compliment)
          setComplimentCount(0)
        }, 1200)
      }
      await fetchGalleryData(data.url)
      if (fileRef.current) fileRef.current.value = ''
    } else {
      setUploadError(data.error ?? 'Upload failed')
    }
    setUploading(false)
  }

  const isDoneTyping = compliment !== null && complimentCount >= compliment.length

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: 'linear-gradient(to bottom, #0052ff 0%, #a8d4ff 100%)' }}
    >

      {/* Floating images */}
      {images.map((img) => {
        const isArriving = arrivingUrl === img.url
        return (
          <img
            key={img.url}
            src={img.url}
            alt=""
            style={{
              position:  'absolute',
              left:      img.x,
              top:       img.y,
              width:     img.size,
              height:    img.size,
              objectFit: 'contain',
              zIndex:    img.zIndex,
              ...(isArriving ? {
                '--from-x':              `${center.x - img.x - img.size / 2}px`,
                '--from-y':              `${center.y - img.y - img.size / 2}px`,
                animationName:           'place',
                animationDuration:       '1.4s',
                animationTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                animationFillMode:       'both',
                animationIterationCount: '1',
                opacity:                 0.78,
              } : {
                '--init-rot':            `${img.initRot}deg`,
                '--dx':                  img.dx,
                '--dy':                  img.dy,
                '--dr':                  img.dr,
                animationName:           'drift',
                animationDuration:       `${img.duration}s`,
                animationDelay:          `${img.delay}s`,
                animationTimingFunction: 'ease-in-out',
                animationIterationCount: 'infinite',
                animationDirection:      'alternate',
                opacity:                 0.78,
              }),
            } as React.CSSProperties}
          />
        )
      })}

      {/* Center title — always centered via flexbox, unaffected by image layout */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none"
        style={{ fontFamily: 'var(--font-geist-sans)' }}
      >
        <p className="text-white text-lg tracking-widest uppercase" style={{ letterSpacing: '0.2em' }}>
          ode to the blue sky
        </p>
        <p className="text-white/50 text-xs mt-1 tracking-wider">— Human created, Olin</p>
      </div>

      {/* AI compliment — left side, persists, labeled */}
      {compliment && (
        <div
          className="fixed z-20 pointer-events-none"
          style={{
            left:       '20px',
            top:        '50%',
            transform:  'translateY(-50%)',
            width:      '150px',
            fontFamily: 'var(--font-geist-sans)',
          }}
        >
          <p className="text-white/40 text-xs uppercase tracking-widest mb-2">AI generated</p>
          <p
            className="text-white/75 text-xs leading-relaxed"
            style={{ textShadow: '0 1px 12px rgba(0,10,80,0.7)' }}
          >
            {compliment.slice(0, complimentCount)}
            {!isDoneTyping && (
              <span
                style={{
                  display:       'inline-block',
                  width:         '1.5px',
                  height:        '0.85em',
                  background:    'rgba(255,255,255,0.6)',
                  marginLeft:    '1px',
                  verticalAlign: 'text-bottom',
                }}
              />
            )}
          </p>
        </div>
      )}

      {images.length === 0 && !uploading && (
        <p
          className="absolute inset-0 flex items-center justify-center text-white/40 text-sm pointer-events-none"
          style={{ zIndex: 5 }}
        >
          no circles yet
        </p>
      )}

      {/* Upload — top right */}
      <div
        className="fixed z-50"
        style={{ top: '56px', right: '20px', fontFamily: 'var(--font-geist-sans)' }}
      >
        <button
          onClick={() => { setUploadError(''); fileRef.current?.click() }}
          disabled={uploading}
          className="text-xs text-white/80 bg-white/15 backdrop-blur border border-white/30 px-4 py-2 rounded-full hover:bg-white/25 hover:text-white transition-all disabled:opacity-40"
        >
          {uploading ? 'processing…' : '+ add circle'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
        {uploadError && (
          <p className="absolute right-0 mt-2 text-xs text-white bg-black/50 backdrop-blur px-3 py-1.5 rounded whitespace-nowrap">
            {uploadError}
          </p>
        )}
      </div>

    </div>
  )
}
