'use client'

// CommandPalette — ⌘K / Ctrl+K quick navigator (Navigation Refinement). A
// local, keyboard-first overlay that jumps to any page. No backend: it indexes
// the app's own routes. Reinforces the "institutional operating system" feel.

import { useState, useEffect, useMemo, useRef, useCallback, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/config/constants'

interface Cmd { label: string; href: string; group: string }

const COMMANDS: Cmd[] = [
  { label: 'Overview',   href: ROUTES.HOME,      group: 'Operate' },
  { label: 'Consensus',  href: ROUTES.CONSENSUS, group: 'Operate' },
  { label: 'Markets',    href: ROUTES.MARKETS,   group: 'Operate' },
  { label: 'Live Feed',  href: ROUTES.LIVE,      group: 'Operate' },
  { label: 'Portfolio',  href: ROUTES.PORTFOLIO, group: 'Trading' },
  { label: 'Positions',  href: ROUTES.POSITIONS, group: 'Trading' },
  { label: 'Wallet',     href: ROUTES.WALLET,    group: 'Trading' },
  { label: 'Strategy',   href: ROUTES.STRATEGY,  group: 'Trading' },
  { label: 'Execution',  href: ROUTES.EXECUTION, group: 'Trading' },
  { label: 'Paper Trading', href: ROUTES.PAPER,  group: 'Trading' },
  { label: 'Analytics',  href: ROUTES.ANALYTICS, group: 'Insights' },
  { label: 'Research',   href: ROUTES.RESEARCH,  group: 'Insights' },
  { label: 'Watchlist',  href: ROUTES.WATCHLIST, group: 'Insights' },
  { label: 'Survival',   href: ROUTES.SURVIVAL,  group: 'Engine' },
  { label: 'Events',     href: ROUTES.EVENTS,    group: 'Engine' },
  { label: 'System',     href: ROUTES.SYSTEM,    group: 'Engine' },
  { label: 'Settings',   href: ROUTES.SETTINGS,  group: 'System' },
]

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [sel, setSel]     = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COMMANDS
    return COMMANDS.filter((c) => c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q))
  }, [query])

  useEffect(() => { setSel(0) }, [query, open])
  useEffect(() => {
    if (open) { setQuery(''); const t = setTimeout(() => inputRef.current?.focus(), 20); return () => clearTimeout(t) }
    return undefined
  }, [open])

  const choose = useCallback((c: Cmd) => { onClose(); router.push(c.href) }, [onClose, router])

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown')      { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
    else if (e.key === 'Enter')     { e.preventDefault(); const c = results[sel]; if (c) choose(c) }
    else if (e.key === 'Escape')    { e.preventDefault(); onClose() }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-modal flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="fixed inset-0" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose} aria-hidden="true" />
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div className="relative w-full max-w-[560px] rounded-md overflow-hidden card-elevated animate-fade-in-up" onKeyDown={onKeyDown}>
        <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: '1px solid var(--probex-border)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--probex-text-muted)' }} aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to page…"
            aria-label="Search pages"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--probex-text-primary)' }}
          />
          <kbd className="text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5" style={{ color: 'var(--probex-text-muted)', border: '1px solid var(--probex-border)' }}>Esc</kbd>
        </div>

        <div className="max-h-[320px] overflow-y-auto py-1.5" role="listbox" aria-label="Pages">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs" style={{ color: 'var(--probex-text-muted)' }}>No matching pages</p>
          ) : (
            results.map((c, i) => (
              <button
                key={c.href}
                type="button"
                role="option"
                aria-selected={i === sel}
                onMouseEnter={() => setSel(i)}
                onClick={() => choose(c)}
                className="w-full flex items-center justify-between gap-3 px-4 py-2 text-left cursor-pointer"
                style={{ background: i === sel ? 'var(--probex-primary-dim)' : 'transparent' }}
              >
                <span className="text-sm font-medium" style={{ color: i === sel ? 'var(--probex-primary)' : 'var(--probex-text-primary)' }}>{c.label}</span>
                <span className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>{c.group}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
