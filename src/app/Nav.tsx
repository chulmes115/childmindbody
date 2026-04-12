'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// ── Add future projects / pages here ────────────────────────────────────────
const TABS = [
  { href: '/stage',          label: 'childmindbody'     },
  { href: '/gallery',        label: 'imperfect gallery'  },
  { href: '/read',           label: "Mind's ruminations" },
  { href: '/bodys-message',  label: "Body's dream"       },
  // { href: '/next-project', label: 'next project' },
]

export default function Nav() {
  const path = usePathname()

  if (path.startsWith('/admin')) return null

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur border-b border-white/8"
      style={{ fontFamily: 'var(--font-geist-mono)' }}
    >
      <div className="flex items-center px-8 h-11">

        {/* Site name */}
        <Link
          href="/"
          className={`text-xs tracking-widest uppercase transition-colors shrink-0 ${
            path === '/' ? 'text-white/90' : 'text-white/55 hover:text-white/75'
          }`}
        >
          Abnormally Normal
        </Link>

        {/* Tabs — centered */}
        <div className="flex-1 flex items-center justify-center gap-10">
          {TABS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-xs transition-colors ${
                path === href
                  ? 'text-white/90 underline underline-offset-4'
                  : 'text-white/50 hover:text-white/75'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Spacer to balance site name width */}
        <div className="shrink-0 invisible text-xs tracking-widest uppercase">
          Abnormally Normal
        </div>

      </div>
    </header>
  )
}
