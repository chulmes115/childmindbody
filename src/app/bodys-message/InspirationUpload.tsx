'use client'

import { useRef, useState } from 'react'
import { InspirationImage } from '@/lib/db'

export default function InspirationUpload({
  initial,
}: {
  initial: InspirationImage[]
}) {
  const [images, setImages]     = useState<InspirationImage[]>(initial)
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')
  const fileRef                   = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    const form = new FormData()
    form.append('image', file)

    const res  = await fetch('/api/bodys-message/upload', { method: 'POST', body: form })
    const data = await res.json()

    if (data.ok) {
      setImages((prev) => [
        { url: data.url, analysis: data.analysis, filename: file.name, timestamp: new Date().toISOString() },
        ...prev,
      ])
      if (fileRef.current) fileRef.current.value = ''
    } else {
      setError(data.error ?? 'Upload failed')
    }
    setUploading(false)
  }

  return (
    <div className="space-y-8">

      {/* Upload form */}
      <form onSubmit={handleUpload} className="flex items-center gap-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="text-xs text-white/40 file:mr-3 file:text-xs file:border-0 file:bg-transparent file:text-white/30 file:cursor-pointer"
        />
        <button
          type="submit"
          disabled={uploading}
          className="text-xs text-white/30 border border-white/15 px-4 py-1.5 rounded hover:text-white/55 hover:border-white/30 transition-colors disabled:opacity-30"
        >
          {uploading ? 'analyzing…' : 'add work'}
        </button>
        {error && <span className="text-xs text-red-400/70">{error}</span>}
      </form>

      {/* Grid */}
      {images.length === 0 ? (
        <p className="text-white/20 text-xs italic">No inspiration added yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((img) => (
            <div key={img.timestamp} className="group relative">
              <img
                src={img.url}
                alt={img.filename}
                className="w-full aspect-square object-cover rounded border border-white/10"
              />
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity rounded p-3 overflow-y-auto">
                <p className="text-white/60 text-xs leading-relaxed">{img.analysis}</p>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
