'use client'

import { useEffect, useState } from 'react'

export default function GalleryAdmin() {
  const [images,  setImages]  = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/gallery/images')
      .then((r) => r.json())
      .then((d) => setImages(d.images ?? []))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(url: string) {
    if (!confirm('Delete this circle?')) return
    setDeleting(url)
    try {
      const res = await fetch('/api/admin/gallery', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if ((await res.json()).ok) {
        setImages((prev) => prev.filter((u) => u !== url))
      }
    } finally {
      setDeleting(null)
    }
  }

  if (loading) return <p className="text-white/20 text-xs italic">Loading…</p>
  if (images.length === 0) return <p className="text-white/20 text-xs italic">No circles uploaded yet.</p>

  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
      {images.map((url) => (
        <div key={url} className="group relative aspect-square">
          <img
            src={url}
            alt=""
            className="w-full h-full object-contain rounded border border-white/10 bg-white/5"
          />
          <button
            onClick={() => handleDelete(url)}
            disabled={deleting === url}
            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white/50 hover:text-white/90 text-[10px] px-1.5 py-0.5 rounded disabled:opacity-30"
          >
            {deleting === url ? '…' : '✕'}
          </button>
        </div>
      ))}
    </div>
  )
}
