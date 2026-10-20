'use client'

// The dashboard login. Credentials are checked server-side
// (/dashboard/api/auth/login/) against the server's environment; the session is an
// httpOnly cookie the page never reads.

import { useState, type FormEvent } from 'react'
import { BASE_PATH } from '@/config/constants'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const res = await fetch(`${BASE_PATH}/api/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: form.get('username'), password: form.get('password') }),
      credentials: 'same-origin',
    }).catch(() => null)
    setBusy(false)
    if (res?.ok) {
      const next = new URLSearchParams(window.location.search).get('next') ?? '/'
      window.location.assign(`${BASE_PATH}${next.startsWith('/') ? next : '/'}`)
      return
    }
    setError(res?.status === 429 ? 'Too many failed attempts — wait a few minutes.'
      : res?.status === 503 ? 'Login is not configured on this server.' : 'Invalid username or password.')
  }

  return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--synatra-bg, #0b0d10)' }}>
      <form onSubmit={submit} className="flex flex-col gap-3 w-72 p-6 rounded-lg"
            style={{ background: 'var(--synatra-surface, #14171c)', border: '1px solid var(--synatra-border, #2a2f36)' }}>
        <h1 className="t-section-title">Synatra dashboard</h1>
        <label className="text-sm flex flex-col gap-1">Username
          <input name="username" autoComplete="username" required className="px-2 py-1 rounded" />
        </label>
        <label className="text-sm flex flex-col gap-1">Password
          <input name="password" type="password" autoComplete="current-password" required className="px-2 py-1 rounded" />
        </label>
        {error && <p role="alert" className="text-xs" style={{ color: 'var(--synatra-negative, #e5484d)' }}>{error}</p>}
        <button type="submit" disabled={busy} className="px-3 py-1 rounded"
                style={{ background: 'var(--synatra-primary, #3e63dd)', color: '#fff' }}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
