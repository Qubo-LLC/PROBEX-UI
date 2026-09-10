'use client'

// ProvenanceScope — how loudly a surface states its own plumbing.
//
// Every value in the product declares where it came from. On System that means
// the literal endpoint: an operator diagnosing a fault needs to know it was
// `/api/health` and not `/api/stats` that answered, and the path IS the
// information. On Overview it means the opposite. A trader glancing at the
// engine's state is answering "what is happening", and roughly forty badges
// reading `LIVE · /api/price-history` answer "which endpoint produced this"
// instead — developer vocabulary rendered at the same weight as the figures it
// annotates.
//
// The claim itself never changes. LIVE / STALE / DERIVED / SYNTHETIC / NO FEED
// stay exactly as visible, and the endpoint stays in the badge's `title` and
// its accessible name, so it is one hover or one screen-reader stop away.
// Nothing is hidden — it is demoted.
//
// This is a scope rather than a prop because the alternative is threading a
// flag through Panel, StatCard, ChartFrame and every intermediate composition
// that happens to contain a badge. A route declares its register once, at its
// own root, and every badge beneath it complies. A surface that declares
// nothing keeps the inline endpoint, so System and Diagnostics are correct by
// default and cannot be changed by accident from somewhere else.

import { createContext, useContext, type ReactNode } from 'react'

/**
 * `inline`  — the endpoint is printed in the badge. Instrument surfaces.
 * `tooltip` — the badge shows only its semantic word; the endpoint moves to
 *             the title attribute and the accessible name. Intelligence surfaces.
 */
export type ProvenanceDetailMode = 'inline' | 'tooltip'

const ProvenanceDetailContext = createContext<ProvenanceDetailMode>('inline')

export function ProvenanceScope({
  detail,
  children,
}: {
  detail: ProvenanceDetailMode
  children: ReactNode
}) {
  return (
    <ProvenanceDetailContext.Provider value={detail}>
      {children}
    </ProvenanceDetailContext.Provider>
  )
}

export function useProvenanceDetailMode(): ProvenanceDetailMode {
  return useContext(ProvenanceDetailContext)
}
