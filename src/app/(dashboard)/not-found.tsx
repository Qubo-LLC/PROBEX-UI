import Link from 'next/link'
import { ROUTES } from '@/config/constants'

/**
 * Dashboard 404 — rendered for unknown cockpit routes, keeping the
 * dashboard shell (sidebar/top nav) in place around it.
 */
export default function DashboardNotFound() {
  return (
    <div className="page-container flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'var(--probex-surface)', border: '1px solid var(--probex-border)' }}
        aria-hidden="true"
      >
        <span className="text-2xl font-black text-gradient-brand">404</span>
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold" style={{ color: 'var(--probex-text-primary)' }}>This page doesn&apos;t exist</h1>
        <p className="text-sm max-w-sm" style={{ color: 'var(--probex-text-muted)' }}>
          The dashboard view you requested couldn&apos;t be found. It may have been moved or renamed.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Link href={ROUTES.HOME} className="btn-primary px-6 py-2.5 text-sm no-underline">Dashboard home</Link>
        <Link href={ROUTES.MARKETS} className="btn-ghost px-6 py-2.5 text-sm no-underline">Browse markets</Link>
      </div>
    </div>
  )
}
