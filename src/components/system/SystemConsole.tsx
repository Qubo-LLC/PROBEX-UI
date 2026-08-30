'use client'

// SystemConsole — the operational console for the engine's infrastructure
// (/system). Panels in operator-priority order
// (PROBEX_PRODUCT_SPEC.md §4):
//
//   0. System State — WHICH of frontend/reachability/engine/mode is actually
//                     known, and which is being simulated
//   1. Health       — is anything failing right now? (per-probe truth)
//   2. Runtime      — what is running, since when, in which mode?
//   3. Diagnostics  — is the dashboard↔engine link itself healthy?
//   4. Config       — what parameters is the engine running with?
//
// State comes first deliberately. Everything below it reports what the engine
// SAID; only the state panel reports whether anything actually answered. Read
// in the other order, a generated "4/4 probes healthy" is indistinguishable
// from a real one.
//
// All panels render natively from ApplicationStore slices; the legacy
// admin SystemHealth mapping and dev-only EngineChainProbe are retired.

import { PageHeader }        from '@/components/ui/PageHeader'
import { SystemStatePanel }  from './SystemStatePanel'
import { HealthPanel }       from './HealthPanel'
import { RuntimePanel }      from './RuntimePanel'
import { ConfigPanel }       from './ConfigPanel'
import { DiagnosticsPanel }  from './DiagnosticsPanel'
import { SystemMetricsPanel } from './SystemMetricsPanel'
import { pageShell, type EmbeddableProps } from '@/components/ui/pageShell'

export function SystemConsole({ embedded = false }: EmbeddableProps = {}) {
  return (
    <div className={pageShell(embedded, 'gap-4')}>
      {!embedded && (
        <PageHeader
          title="System"
          subtitle="Engine health, runtime components, connectivity diagnostics, and configuration"
        />
      )}

      <SystemStatePanel />
      <HealthPanel />
      <RuntimePanel />
      <SystemMetricsPanel />
      <DiagnosticsPanel />
      <ConfigPanel />
    </div>
  )
}
