'use client'

// OpportunityNotes — NEW to V3, not a V1 restore. V1's Research page was
// entirely LLM-authored mock articles (mock/research.ts) with no realistic
// backend equivalent. Rather than restore a "Research Library" experience
// with zero real content, this section gives Research genuine substance
// today: a structured, real-data note for each currently-active edge —
// the same fields ExplainabilityPanel and RecommendationCard already surface
// on the Consensus page, reframed here as "why the engine is watching this
// market" — templated from live fields, never invented prose.

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useApplicationStore } from '@/store/applicationStore'
import { parseEdgeRows } from '@/lib/mappers/edges'
import { MARKET_DETAIL_PATH } from '@/config/constants'
import { EdgeBadge } from '@/components/shared/EdgeBadge'
import { RecommendationBadge } from '@/components/shared/RecommendationBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'

const TOP_N = 6

export function OpportunityNotes() {
  const router = useRouter()
  const edgesSlice = useApplicationStore((s) => s.engine.edges)

  const notes = useMemo(() => {
    if (!edgesSlice.data) return null
    const parsed = parseEdgeRows(edgesSlice.data)
    if (parsed.kind !== 'rows') return []
    return [...parsed.rows].sort((a, b) => b.edgePct - a.edgePct).slice(0, TOP_N)
  }, [edgesSlice.data])

  if (edgesSlice.status === 'error') {
    return <ErrorState title="Opportunity notes unavailable" description={edgesSlice.error?.message ?? 'The /api/edges endpoint did not respond.'} fullPage={false} />
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-bold" style={{ color: 'var(--probex-text-primary)' }}>Opportunity Notes</h2>
        <p className="text-2xs mt-0.5" style={{ color: 'var(--probex-text-muted)' }}>Auto-generated from the engine's currently-active edges — real signals, plain-language summary</p>
      </div>

      {notes !== null && notes.length === 0 && (
        <EmptyState size="sm" title="No opportunity notes right now" description="Notes appear here the moment the engine detects an edge worth watching." />
      )}

      {notes !== null && notes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {notes.map((edge) => (
            <button
              key={edge.id}
              onClick={() => edge.marketId && router.push(MARKET_DETAIL_PATH(edge.marketId))}
              disabled={!edge.marketId}
              className={`flex flex-col gap-2.5 p-4 text-left focus-ring disabled:cursor-default ${edge.marketId ? 'card-interactive' : 'card'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <EdgeBadge edge={edge} size="sm" />
                {edge.recommendation && <RecommendationBadge recommendation={edge.recommendation} />}
              </div>
              <h3 className="text-sm font-semibold leading-snug line-clamp-2" style={{ color: 'var(--probex-text-primary)' }}>
                {edge.marketTitle ?? edge.id}
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--probex-text-secondary)' }}>
                The engine detected a {edge.edgePct.toFixed(1)}% edge on the {edge.direction.toUpperCase()} side
                {edge.signal ? ` via ${edge.signal}` : ''}
                {edge.confidence !== null ? `, with ${Math.round(edge.confidence * 100)}% confidence` : ''}.
              </p>
              {edge.detectedAt !== null && (
                <span className="text-2xs mt-auto" style={{ color: 'var(--probex-text-disabled)' }}>Detected {new Date(edge.detectedAt).toLocaleTimeString()}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
