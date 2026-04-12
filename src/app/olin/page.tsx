'use client'

import { useEffect, useRef, useState } from 'react'

type OlinMessage = { text: string; timestamp: string }
type Viewport    = { w: number; h: number }

// ── Sun streak config (deterministic — same for all visitors) ─────────────────

const STREAK_COUNT = 28
const STREAK_PARAMS = Array.from({ length: STREAK_COUNT }, (_, i) => {
  const evenSpacing = (360 / STREAK_COUNT) * i
  const jitter      = Math.sin(i * 2.718) * 20
  return {
    angleDeg:       evenSpacing + jitter,
    opacity:        0.3 + Math.abs(Math.sin(i * 1.618)) * 0.5,
    width:          0.6 + Math.abs(Math.sin(i * 2.236)) * 2.4,
    lengthFraction: 0.4 + Math.abs(Math.sin(i * 3.14)) * 0.6,
    delaySec:       Math.abs(Math.sin(i * 4.66)) * 10,
  }
})

// ── Message grid positions (deterministic — same for all visitors) ────────────

function getMsgPos(index: number): { x: number; y: number } {
  const COLS  = 5
  const ROWS  = 4
  const col   = index % COLS
  const row   = Math.floor(index / COLS) % ROWS
  const cellW = 80 / COLS   // 16% per column, 10% margins total
  const cellH = 72 / ROWS   // 18% per row, starting at 14%
  const jx    = (Math.sin(index * 6.371) * 0.5 + 0.5) * cellW * 0.65
  const jy    = (Math.cos(index * 4.233) * 0.5 + 0.5) * cellH * 0.65
  return { x: 10 + col * cellW + jx, y: 14 + row * cellH + jy }
}

// ── Watermark triangle positions (% of viewport) ──────────────────────────────
// Equilateral triangle centered at ~(50%, 52%), circumradius ~28%

const WM_POSITIONS = [
  { top: '20%', left: '50%', transform: 'translateX(-50%)' },   // top
  { top: '64%', left: '23%', transform: 'none'               },   // bottom-left
  { top: '64%', left: '74%', transform: 'none'               },   // bottom-right
]

export default function Olin() {
  const [viewport,     setViewport]     = useState<Viewport | null>(null)
  const [messages,     setMessages]     = useState<OlinMessage[]>([])
  const [watermarks,   setWatermarks]   = useState<(string | null)[]>([null, null, null])
  const [visibleCount, setVisibleCount] = useState(0)

  const msgPositions = useRef<{ x: number; y: number }[]>([])

  // Compute viewport on mount
  useEffect(() => {
    setViewport({ w: window.innerWidth, h: window.innerHeight })
  }, [])

  // Fetch messages + watermarks
  useEffect(() => {
    Promise.all([
      fetch('/api/olin/messages').then((r) => r.json()) as Promise<{ messages: OlinMessage[] }>,
      fetch('/api/olin/watermarks').then((r) => r.json()) as Promise<{ watermarks: (string | null)[] }>,
    ]).then(([msgData, wmData]) => {
      setMessages(msgData.messages)
      setWatermarks(wmData.watermarks)
      // Pre-compute positions for all messages
      msgPositions.current = msgData.messages.map((_, i) => getMsgPos(i))
    })
  }, [])

  // Reveal messages one by one every 10 seconds, first after 3s
  useEffect(() => {
    if (messages.length === 0) return
    const first = setTimeout(() => {
      setVisibleCount(1)
      const interval = setInterval(() => {
        setVisibleCount((c) => {
          if (c >= messages.length) { clearInterval(interval); return c }
          return c + 1
        })
      }, 10_000)
      return () => clearInterval(interval)
    }, 3_000)
    return () => clearTimeout(first)
  }, [messages.length])

  // Compute SVG streaks once viewport is known
  const streaks = viewport
    ? STREAK_PARAMS.map((p) => {
        const rad = p.angleDeg * (Math.PI / 180)
        const diag = Math.sqrt(viewport.w * viewport.w + viewport.h * viewport.h)
        const len  = (diag / 2) * p.lengthFraction
        return {
          x1:       viewport.w / 2,
          y1:       viewport.h / 2,
          x2:       viewport.w / 2 + Math.cos(rad) * len,
          y2:       viewport.h / 2 + Math.sin(rad) * len,
          len,
          opacity:  p.opacity,
          width:    p.width,
          delay:    p.delaySec,
        }
      })
    : []

  return (
    <div
      style={{
        position:   'fixed',
        inset:      0,
        background: '#000',
        overflow:   'hidden',
      }}
    >

      {/* Growing crimson circle */}
      <div
        style={{
          position:     'absolute',
          top:          '50%',
          left:         '50%',
          transform:    'translate(-50%, -50%)',
          width:        '4px',
          height:       '4px',
          borderRadius: '50%',
          border:       '1.5px solid rgba(165, 0, 30, 0.7)',
          boxShadow:    '0 0 18px 4px rgba(165, 0, 30, 0.14), 0 0 50px 10px rgba(165, 0, 30, 0.06)',
          pointerEvents: 'none',
          zIndex:       2,
          animationName:           'olin-circle',
          animationDuration:       '1200s',
          animationTimingFunction: 'linear',
          animationFillMode:       'forwards',
        } as React.CSSProperties}
      />

      {/* Sun streaks SVG */}
      {viewport && (
        <svg
          style={{
            position:      'fixed',
            top:           0,
            left:          0,
            width:         '100%',
            height:        '100%',
            pointerEvents: 'none',
            zIndex:        1,
          }}
          viewBox={`0 0 ${viewport.w} ${viewport.h}`}
          preserveAspectRatio="none"
        >
          {streaks.map((s, i) => (
            <line
              key={i}
              x1={s.x1} y1={s.y1}
              x2={s.x2} y2={s.y2}
              stroke={`rgba(165, 0, 30, ${s.opacity})`}
              strokeWidth={s.width}
              strokeLinecap="round"
              style={{
                strokeDasharray:         s.len,
                strokeDashoffset:        s.len,
                animationName:           'draw-streak',
                animationDuration:       '1200s',
                animationTimingFunction: 'linear',
                animationFillMode:       'forwards',
                animationDelay:          `${s.delay}s`,
              }}
            />
          ))}
        </svg>
      )}

      {/* Three watermarks in equilateral triangle */}
      {watermarks.map((url, i) =>
        url ? (
          <img
            key={i}
            src={url}
            alt=""
            style={{
              position:  'fixed',
              top:       WM_POSITIONS[i].top,
              left:      WM_POSITIONS[i].left,
              transform: WM_POSITIONS[i].transform,
              width:     'clamp(120px, 14vw, 200px)',
              height:    'clamp(120px, 14vw, 200px)',
              objectFit: 'contain',
              opacity:   0.13,
              zIndex:    3,
              pointerEvents: 'none',
            }}
          />
        ) : null
      )}

      {/* Journal messages — scattered, appearing one by one */}
      {messages.map((msg, i) => {
        const pos = msgPositions.current[i] ?? getMsgPos(i)
        const visible = i < visibleCount
        return (
          <div
            key={msg.timestamp}
            style={{
              position:   'fixed',
              left:       `${pos.x}%`,
              top:        `${pos.y}%`,
              maxWidth:   '160px',
              zIndex:     10 + i,
              color:      'rgba(110, 170, 255, 0.92)',
              fontSize:   '11px',
              fontFamily: 'var(--font-geist-mono)',
              lineHeight: '1.5',
              wordBreak:  'break-word',
              textShadow: '0 0 10px rgba(0,0,0,1), 0 0 20px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,1)',
              opacity:    visible ? 1 : 0,
              transform:  visible ? 'none' : 'translateY(5px)',
              transition: 'opacity 2.5s ease, transform 2.5s ease',
              pointerEvents: 'none',
            }}
          >
            {msg.text}
          </div>
        )
      })}

    </div>
  )
}
