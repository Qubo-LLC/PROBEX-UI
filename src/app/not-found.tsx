import Link from 'next/link'
import { ROUTES } from '@/config/constants'

/**
 * Root 404 — rendered for any unmatched top-level route.
 */
export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6 text-center px-4"
      style={{ background: 'var(--synatra-bg)' }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'var(--synatra-surface)', border: '1px solid var(--synatra-border)' }}
        aria-hidden="true"
      >
        <span className="text-2xl font-black text-gradient-brand">404</span>
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold" style={{ color: 'var(--synatra-text-primary)' }}>Page not found</h1>
        <p className="text-sm max-w-sm" style={{ color: 'var(--synatra-text-muted)' }}>
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
      </div>
      <Link href={ROUTES.HOME} className="btn-primary px-6 py-2.5 text-sm no-underline">
        Go to dashboard
      </Link>
    </div>
  )
}
