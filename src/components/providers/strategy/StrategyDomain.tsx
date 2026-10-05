'use client'

// Strategy domain — API group "Strategy & Analysis".
//
//   Mechanism → /api/edges, /api/config, /api/survival — how a scan becomes a trade
//   Consensus → /api/consensus, /consensus/bias, /consensus/history
//   Survival  → /api/survival, /api/survival/patterns
//   (Research → /api/research/reports: retired as a tab 2026-09-16 — it
//   regenerated Survival's figures under another heading; the engine's
//   self-reports now sit at the foot of Mechanism. /research redirects here.)
//
// These were four sidebar entries answering one question — what the engine
// believes and why. Consensus and Survival are each a single facet of the
// strategy picture rather than destinations in their own right.

import { DomainPage } from '@/components/layout/DomainPage'
import { StrategyConsole } from './StrategyConsole'
import { ConsensusPage } from '@/components/consensus/ConsensusPage'
import { SurvivalConsole } from '@/components/survival/SurvivalConsole'
import type { TabDef } from '@/components/ui/Tabs'

const TABS: TabDef[] = [
  { id: 'pipeline',  label: 'Mechanism' },
  { id: 'consensus', label: 'Consensus' },
  { id: 'survival',  label: 'Survival' },
]

export function StrategyDomain() {
  return (
    <DomainPage
      title="Strategy"
      subtitle="How the engine operates — the cycle and its gates, the signal composite, and capital protection"
      tabs={TABS}
      render={(active) => {
        switch (active) {
          case 'consensus': return <ConsensusPage embedded />
          case 'survival':  return <SurvivalConsole embedded />
          default:          return <StrategyConsole embedded />
        }
      }}
    />
  )
}
