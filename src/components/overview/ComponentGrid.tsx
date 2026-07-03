'use client'

// Engine internals at a glance: health probes (with the backend's own
// messages) and the runtime component matrix.
//
// Truthfulness: an inactive runtime component renders neutral, not red —
// the boolean can mean "intentionally disabled" (e.g. telegram_alerter in
// paper mode). Failure signals belong to the health probes, which carry
// explicit healthy/unhealthy semantics and messages.

import type { HealthComponent } from '@/types/engine'
import type { RuntimeComponentChip } from '@/lib/mappers/overview'
import { Card } from '@/components/ui/Card'

interface ComponentGridProps {
  healthComponents:  HealthComponent[] | null
  runtimeComponents: RuntimeComponentChip[] | null
}

export function ComponentGrid({ healthComponents, runtimeComponents }: ComponentGridProps) {
  if (!healthComponents && !runtimeComponents) return null

  return (
    <Card className="flex flex-col gap-4">
      {healthComponents && (
        <div className="flex flex-col gap-2">
          <h3 className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>
            Health Probes
          </h3>
          <div className="flex flex-col gap-1.5">
            {healthComponents.map((c) => (
              <div key={c.name} className="flex items-center gap-2 text-xs">
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: c.healthy ? 'var(--probex-positive)' : 'var(--probex-negative)' }}
                  aria-hidden="true"
                />
                <span className="font-medium w-24 flex-shrink-0" style={{ color: 'var(--probex-text-secondary)' }}>
                  {c.name}
                </span>
                <span className="truncate" style={{ color: 'var(--probex-text-muted)' }} title={c.message}>
                  {c.message}
                </span>
                {c.latencyMs !== null && (
                  <span className="ml-auto tabular-nums flex-shrink-0" style={{ color: 'var(--probex-text-disabled)' }}>
                    {Math.round(c.latencyMs)}ms
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {runtimeComponents && (
        <div className="flex flex-col gap-2">
          <h3 className="text-2xs font-semibold uppercase tracking-wider" style={{ color: 'var(--probex-text-muted)' }}>
            Runtime Components
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {runtimeComponents.map((c) => (
              <span
                key={c.key}
                className="text-2xs font-medium rounded px-1.5 py-0.5"
                style={
                  c.active
                    ? { background: 'var(--probex-positive-dim)', color: 'var(--probex-positive)', border: '1px solid var(--probex-positive-border)' }
                    : { background: 'var(--probex-surface-2)', color: 'var(--probex-text-disabled)', border: '1px solid var(--probex-border)' }
                }
                title={c.active ? `${c.label}: active` : `${c.label}: inactive`}
              >
                {c.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
