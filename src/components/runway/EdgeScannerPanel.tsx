'use client'

// Universal edge scanner (v8.4 §5.5) from /api/research/scanner: rows per source, and the top rows by net edge with
// their execution type (taker or maker) and the recommendation gate's decision. Research (not trading).

import { useEdgeScanner } from '@/config/hooks/useServices'
import type { ScannerDTO } from '@/types/runway'

const c = (x: number | null | undefined) => (x === null || x === undefined ? '—' : `${x >= 0 ? '+' : ''}${(100 * x).toFixed(2)}¢`)

export function EdgeScannerTable({ data }: { data: ScannerDTO }) {
  return (
    <>
      <p className="t-description mb-2" data-testid="scanner-sources">
        {data.markets} markets · rows by source:{' '}
        {Object.entries(data.by_source ?? {}).map(([s, n]) => `${s} ${n}`).join(', ')} · net &gt; 0:{' '}
        {Object.entries(data.positive ?? {}).map(([s, n]) => `${s} ${n}`).join(', ') || 'none'}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Edge scanner">
          <thead>
            <tr className="t-label text-left">
              <th className="py-1 pr-3">Market</th><th className="py-1 pr-3">Side</th><th className="py-1 pr-3">Source</th>
              <th className="py-1 pr-3 text-right">p</th><th className="py-1 pr-3 text-right">p_lcb</th>
              <th className="py-1 pr-3 text-right">Taker net</th><th className="py-1 pr-3 text-right">Maker net</th>
              <th className="py-1 pr-3">Execution</th><th className="py-1">Gate</th>
            </tr>
          </thead>
          <tbody>
            {data.top.map((r, i) => (
              <tr key={`${r.market}-${r.side}-${i}`} data-testid="scanner-row">
                <td className="py-1 pr-3 max-w-[22rem]">{r.question}</td>
                <td className="py-1 pr-3">{r.side}</td>
                <td className="py-1 pr-3">{r.source}</td>
                <td className="py-1 pr-3 text-right">{r.p.toFixed(3)}</td>
                <td className="py-1 pr-3 text-right">{r.p_lcb.toFixed(3)}</td>
                <td className="py-1 pr-3 text-right">{c(r.taker_net)}</td>
                <td className="py-1 pr-3 text-right">{c(r.maker_net)}</td>
                <td className="py-1 pr-3">{r.exec}</td>
                <td className="py-1">{r.gate ? `${r.gate}: ${(r.gate_reason ?? '').replace(/_/g, ' ')}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export function EdgeScannerPanel() {
  const slice = useEdgeScanner(300_000)
  const data = slice.status === 'success' ? slice.data : null
  return (
    <section aria-labelledby="edge-scanner" data-testid="edge-scanner-panel">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h2 id="edge-scanner" className="t-section-title">Top rows by net edge (research, not trading)</h2>
        <span className="t-description">{data?.ts ? `updated ${new Date(data.ts * 1000).toISOString().slice(0, 16)}Z` : ''}</span>
      </div>
      {data === null ? (
        <p className="t-description">{slice.status === 'error' ? 'The engine did not answer /api/research/scanner.' : 'Loading…'}</p>
      ) : !data.available ? <p className="t-description">No scanner run published yet.</p> : <EdgeScannerTable data={data} />}
    </section>
  )
}
