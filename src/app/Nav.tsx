'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

const TABS = [
  { href: '/stage',         label: 'childmindbody'     },
  { href: '/gallery',       label: 'imperfect gallery'  },
  { href: '/read',          label: "Mind's ruminations" },
  { href: '/bodys-message', label: "Body's dream"       },
  { href: '/disquiet',      label: "Child's disquiet"   },
]

export default function Nav() {
  const path = usePathname()
  const [open, setOpen] = useState(false)

  // Close menu on navigation
  useEffect(() => { setOpen(false) }, [path])

  if (path.startsWith('/admin')) return null

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur border-b border-white/8"
        style={{ fontFamily: 'var(--font-geist-mono)' }}
      >
        <div className="flex items-center px-6 h-11">

          {/* Site name */}
          <Link
            href="/"
            className={`text-xs tracking-widest uppercase transition-colors shrink-0 ${
              path === '/' ? 'text-white/90' : 'text-white/55 hover:text-white/75'
            }`}
          >
            Abnormally Normal
          </Link>

          {/* Desktop tabs — centered, hidden on mobile */}
          <div className="hidden md:flex flex-1 items-center justify-center gap-10">
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

          {/* Desktop spacer */}
          <div className="hidden md:block shrink-0 invisible text-xs tracking-widest uppercase">
            Abnormally Normal
          </div>

          {/* Mobile hamburger — shown on small screens */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden ml-auto text-white/55 hover:text-white/80 transition-colors p-1"
            aria-label="Menu"
          >
            {open ? (
              // X icon
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="3" y1="3" x2="15" y2="15" />
                <line x1="15" y1="3" x2="3" y2="15" />
              </svg>
            ) : (
              // Hamburger icon
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="2" y1="5"  x2="16" y2="5"  />
                <line x1="2" y1="9"  x2="16" y2="9"  />
                <line x1="2" y1="13" x2="16" y2="13" />
              </svg>
            )}
          </button>

        </div>
      </header>

      {/* Mobile dropdown */}
      {open && (
        <div
          className="fixed top-11 left-0 right-0 z-40 bg-black/95 backdrop-blur border-b border-white/8 md:hidden"
          style={{ fontFamily: 'var(--font-geist-mono)' }}
        >
          {TABS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`block px-6 py-4 text-sm border-b border-white/6 transition-colors ${
                path === href
                  ? 'text-white/90'
                  : 'text-white/50 hover:text-white/75'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
