'use client'

// IntelligenceModule — Phase 6A grouping primitive. Multiple AwaitingBackend
// widgets belonging to one capability (e.g. Consensus's CE-3/CE-4 cluster,
// Portfolio's P2-01 charts) previously sat as N peer cards directly on the
// page — individually well-crafted, collectively reading as "a collection of
// absences." This wraps them in ONE framed bay with a single consolidated
// header and provenance badge, so the group reads as one premium instrument
// panel with several dials, not several unrelated waiting rooms. Every child
// widget is rendered completely unchanged — this only adds an outer frame.

import type { ReactNode } from 'react'
import { ProvenanceBadge } from './ProvenanceBadge'

interface IntelligenceModuleProps {
  title:       string
  description: string
  /** Endpoint id(s) shown in the consolidated badge, e.g. "CE-3 / CE-4". */
  endpoint:    string
  children:    ReactNode
  className?:  string
}

export function IntelligenceModule({ title, description, endpoint, children, className = '' }: IntelligenceModuleProps) {
  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 flex flex-col gap-4 ${className}`}
      style={{
        background: 'color-mix(in srgb, var(--probex-warning) 3%, var(--probex-surface))',
        border: '1px dashed var(--probex-border-default)',
      }}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--probex-text-primary)' }}>{title}</h2>
          <p className="text-2xs mt-0.5" style={{ color: 'var(--probex-text-muted)' }}>{description}</p>
        </div>
        <ProvenanceBadge provenance="awaiting" detail={endpoint} />
      </div>
      {children}
    </div>
  )
}
