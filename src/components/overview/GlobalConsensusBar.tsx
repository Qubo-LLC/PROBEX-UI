'use client'

// GlobalConsensusBar — Phase 6A: now ONLY the Global Consensus Intelligence
// segment (CE-1, awaiting-backend). The "engine attention" line this used to
// share space with has moved to EngineHealthBanner — both were live health
// signals and now sit together near the top of Overview; Consensus is a
// promise about a future capability and has been demoted to the bottom of
// the page, after every live proof, per the Overview hierarchy directive
// ("lead with proof, not promise").

import { useEndpointAvailability } from '@/config/hooks/useEndpointAvailability'
import { ENDPOINTS } from '@/lib/api/endpoints'
import { AwaitingBackend } from '@/components/shared/AwaitingBackend'

export function GlobalConsensusBar() {
  const consensusGlobal = useEndpointAvailability(ENDPOINTS.consensus.global)

  if (consensusGlobal.available) return null

  return (
    <div
      role="region"
      aria-label="Global consensus intelligence"
      className="px-5 py-3 rounded-xl"
      style={{ background: 'var(--probex-surface)', border: '1px dashed var(--probex-border-default)' }}
    >
      <AwaitingBackend
        bare
        layout="inline"
        title="Global Consensus"
        description="Platform-wide score, participation, and bullish/bearish split across all markets."
        endpoint="CE-1"
      />
    </div>
  )
}
