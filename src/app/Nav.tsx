'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// ── Add future projects here ────────────────────────────────────────────────
const PROJECTS = [
  {
    label: 'childmindbody',
    href: '/stage',
    pages: [
      { href: '/stage',   label: 'childmindbody'    },
      { href: '/gallery', label: 'imperfect gallery' },
      { href: '/read',    label: "Mind's ruminations" },
    ],
  },
  // { label: 'next project', href: '/...', pages: [...] },
]

export default function Nav() {
  const path = usePathname()

  if (path.startsWith('/admin')) return null

  const activeProject = PROJECTS.find((p) =>
    p.pages.some((pg) => path === pg.href)
  )

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur border-b border-white/8"
      style={{ fontFamily: 'var(--font-geist-mono)' }}
    >
      {/* Top row: site name + project tabs */}
      <div className="flex items-center gap-8 px-8 h-11">
        <Link
          href="/"
          className={`text-xs tracking-widest uppercase transition-colors ${
            path === '/' ? 'text-white/70' : 'text-white/35 hover:text-white/55'
          }`}
        >
          Abnormally Normal
        </Link>

        <div className="flex items-center gap-6 ml-4">
          {PROJECTS.map((project) => {
            const isActive = !!activeProject && activeProject.label === project.label
            return (
              <Link
                key={project.label}
                href={project.href}
                className={`text-xs transition-colors ${
                  isActive
                    ? 'text-white/60'
                    : 'text-white/25 hover:text-white/45'
                }`}
              >
                {project.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Sub-row: pages within the active project — centered, more visible */}
      {activeProject && (
        <div className="flex items-center justify-center gap-10 h-10 border-t border-white/6">
          {activeProject.pages.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-xs transition-colors ${
                path === href
                  ? 'text-white/70 underline underline-offset-4'
                  : 'text-white/35 hover:text-white/60'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
