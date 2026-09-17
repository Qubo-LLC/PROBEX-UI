'use client'

// ProfileMenu — the top-bar session menu. There is no account layer: no
// /api/identity, no auth, no user. What the engine does publish about itself
// is on /api/runtime — its mode, when the process started, which components
// are up — and that is what the header of this menu shows, as the ENGINE
// SESSION. Its name and version are not on any /api/* endpoint (the host root
// that carries them is the marketing site behind the bridge), so none is
// shown; until 2026-09-17 the dashboard's own "Probex v2.0.0" stood here
// under the engine's label.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useApplicationStore } from '@/store/applicationStore'
import { ROUTES } from '@/config/constants'

export function ProfileMenu() {
  const identity = useApplicationStore((s) => s.engine.identity)
  const id = identity.status === 'success' ? identity.data : null

  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey  = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const mode = id?.mode ?? null
  const since = id ? new Date(id.initializedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null
  const up = id ? Object.values(id.components).filter(Boolean).length : null
  const all = id ? Object.keys(id.components).length : null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Session menu"
        className="focus-ring flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-transform duration-150 active:scale-95"
        style={{
          background: 'var(--probex-gradient-brand)',
          boxShadow: '0 0 0 1px color-mix(in srgb, var(--probex-primary) 30%, transparent), 0 0 14px -4px color-mix(in srgb, var(--probex-primary) 45%, transparent)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="#fff" stroke="none" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 rounded-lg overflow-hidden z-topnav"
          style={{ background: 'var(--probex-surface-2)', border: '1px solid var(--probex-border-default)', boxShadow: '0 12px 32px rgba(0,0,0,0.32)' }}
        >
          {/* Header — engine identity */}
          <div className="px-3.5 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--probex-border)' }}>
            <span
              className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0"
              style={{ background: 'var(--probex-gradient-brand)' }}
              aria-hidden="true"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold truncate" style={{ color: 'var(--probex-text-primary)' }}>{id?.bot ?? 'Engine session'}</span>
              <span className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>
                {id
                  ? `since ${since} · ${up}/${all} components`
                  : identity.status === 'error' ? 'runtime did not answer' : 'reading /api/runtime…'}
                {mode && (
                  <span
                    className="ml-1.5 font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{ color: mode === 'live' ? 'var(--probex-positive)' : 'var(--probex-warning)', background: mode === 'live' ? 'var(--probex-positive-dim)' : 'var(--probex-warning-dim)' }}
                  >
                    {mode}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Links */}
          <nav className="py-1" aria-label="Session menu">
            <MenuLink href={ROUTES.SETTINGS} label="Settings" onNavigate={() => setOpen(false)} />
            <MenuLink href={ROUTES.SYSTEM}   label="System & diagnostics" onNavigate={() => setOpen(false)} />
            <MenuLink href={ROUTES.SURVIVAL} label="Survival & capital" onNavigate={() => setOpen(false)} />
          </nav>

          <p className="px-3.5 py-2.5 text-2xs leading-relaxed" style={{ borderTop: '1px solid var(--probex-border)', color: 'var(--probex-text-disabled)' }}>
            No account layer — this is the running engine session (/api/runtime), not a signed-in user. Preferences are kept in this browser.
          </p>
        </div>
      )}
    </div>
  )
}

function MenuLink({ href, label, onNavigate }: { href: string; label: string; onNavigate: () => void }) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="block px-3.5 py-2 text-xs no-underline transition-colors duration-100 hover:bg-[var(--probex-surface-3)]"
      style={{ color: 'var(--probex-text-secondary)' }}
    >
      {label}
    </Link>
  )
}
