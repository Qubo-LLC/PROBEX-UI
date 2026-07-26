'use client'

// Strategy domain — API group "Strategy & Analysis".
//
//   Pipeline  → /api/edges, /api/config — how a scan becomes a trade
//   Consensus → /api/consensus, /consensus/bias, /consensus/history
//   Survival  → /api/survival, /api/survival/patterns
//   Research  → /api/research/reports
//
// These were four sidebar entries answering one question — what the engine
// believes and why. Consensus, Survival and Research are each a single facet of
// the strategy picture rather than destinations in their own right.

import { DomainPage } from '@/components/layout/DomainPage'
import { StrategyConsole } from './StrategyConsole'
import { ConsensusPage } from '@/components/consensus/ConsensusPage'
import { SurvivalConsole } from '@/components/survival/SurvivalConsole'
import { ResearchLibrary } from '@/components/research/ResearchLibrary'
import type { TabDef } from '@/components/ui/Tabs'

const TABS: TabDef[] = [
  { id: 'pipeline',  label: 'Pipeline' },
  { id: 'consensus', label: 'Consensus' },
  { id: 'survival',  label: 'Survival' },
  { id: 'research',  label: 'Research' },
]

export function StrategyDomain() {
  return (
    <DomainPage
      title="Strategy"
      subtitle="What the engine believes and why — decision pipeline, consensus, capital protection, and research"
      tabs={TABS}
      render={(active) => {
        switch (active) {
          case 'consensus': return <ConsensusPage embedded />
          case 'survival':  return <SurvivalConsole embedded />
          case 'research':  return <ResearchLibrary />
          default:          return <StrategyConsole embedded />
        }
      }}
    />
  )
}
