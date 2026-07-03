'use client'

// AuthGate — the single route-protection point for the cockpit
// (PROBEX_PRODUCT_SPEC.md §6.3).
//
// The engine API is currently unauthenticated (single-operator mode), so this
// gate passes through unconditionally. When the P3 auth backend lands
// (bearer token → JWT), protection is introduced HERE and nowhere else:
//
//   1. Read the session (token in storage / cookie).
//   2. Unauthenticated → redirect to the login route.
//   3. Attach the Authorization header in src/lib/api/client.ts (the single
//      request-interceptor point — see the note in that file).
//
// Every cockpit page renders inside this gate via DashboardLayout, so no
// per-page changes will be needed.

import type { ReactNode } from 'react'

interface AuthGateProps {
  children: ReactNode
}

export function AuthGate({ children }: AuthGateProps) {
  // Single-operator mode: no session requirement yet.
  return <>{children}</>
}
