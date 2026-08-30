'use client'

// EngineStateBand — the Overview's instrument row: four panels answering the
// four questions the page previously left unanswered or answered badly.
//
//   CAPITAL    what is deployed, and how is it tracking against its targets
//   EXPOSURE   what is currently at risk, and under what constraints
//   EXECUTION  what has actually happened
//   SYSTEM     is the engine alive and operating normally
//
// ─── What this replaces ──────────────────────────────────────────────────────
// Capital (670×104px, 20 characters), Total P&L (670×104px, 20 characters) and
// Profit Targets (1352×190px, 115 characters) — 306px of vertical space for 157
// characters, none of which said anything about exposure or execution. Those
// three surfaces become one row of four panels carrying roughly forty figures
// in less height.
//
// ─── Everything here is already polled ───────────────────────────────────────
// Not one new request. The exposure and execution panels are built entirely
// from fields ApplicationStateLoader has been fetching since it was written and
// which no Overview component had ever read: activePositions, unrealizedPnl,
// realizedPnl, avgExecutionMs, backoff, daysOfRunway, kellyModifier,
// minEdgeThreshold, uptimeSeconds, and the execution policy's risk limits. The
// data was always there; the page just never asked.
//
// Where a field genuinely has not arrived, the panel keeps its frame and
// withholds the figure (PanelPending / AwaitingValue) rather than printing a
// zero that an operator would read as measured.

import { useApplicationStore } from '@/store/applicationStore'
import { formatCurrency, formatSignedCurrency, formatPercent } from '@/lib/utils'
import { survivalStateColor, survivalStateLabel, formatUptime, formatEdgePct } from '@/lib/display/engine'
import { StatusChip, toneForStatus } from '@/components/ui/StatusChip'
import { AwaitingValue } from '@/components/shared/AwaitingValue'
import { Panel, Focal, Row, RowGroup, Meter, PanelPending, type PanelState } from '@/components/ui/Panel'

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

const pnlColor = (v: number) =>
  v > 0 ? 'var(--probex-positive)' : v < 0 ? 'var(--probex-negative)' : undefined

export function EngineStateBand() {
  return (
    <section
      aria-label="Engine state"
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3"
    >
      <CapitalPanel />
      <ExposurePanel />
      <ExecutionPanel />
      <SystemPanel />
    </section>
  )
}

// ─── 1 · Capital ──────────────────────────────────────────────────────────────
// Absorbs the old Capital StatCard and the entire Profit Targets card. The
// personal-target override that lived in TargetProgress stays available on
// Survival and Wallet, where editing a target is a task rather than a glance;
// Overview shows the engine's own targets and gets out of the way.

function CapitalPanel() {
  const survival = useApplicationStore((s) => s.engine.survival)
  const d = survival.data

  return (
    <Panel
      title="Capital"
      provenance="live"
      source="/api/survival"
      action={
        d ? (
          <StatusChip tone={toneForStatus(d.state)} dot={false} title={`Survival state: ${survivalStateLabel(d.state)}`}>
            {survivalStateLabel(d.state)}
          </StatusChip>
        ) : undefined
      }
    >
      {!d ? (
        <PanelPending note="Awaiting the survival brain's first report." />
      ) : (
        <>
          <Focal
            value={formatCurrency(d.currentCapital)}
            unit={`of ${formatCurrency(d.initialCapital)}`}
            color={survivalStateColor(d.state)}
          />

          <Meter
            value={clamp01(d.capitalPct / 100)}
            color={survivalStateColor(d.state)}
            ariaLabel="Capital remaining against initial"
          />

          <RowGroup>
            <TargetRow label="Daily" pnl={d.dailyPnl} target={d.dailyTarget} />
            <TargetRow label="Weekly" pnl={d.weeklyPnl} target={d.weeklyTarget} />
            <Row
              label="Runway"
              value={d.daysOfRunway === null ? 'No burn' : `${d.daysOfRunway.toFixed(1)}d`}
              title={
                d.daysOfRunway === null
                  ? 'Burn rate is zero — the engine is not losing capital'
                  : `At the current daily burn rate of ${formatCurrency(d.dailyBurnRate)}`
              }
            />
          </RowGroup>
        </>
      )}
    </Panel>
  )
}

/**
 * A target as one line: name, progress against it, and the pair of figures.
 * The former card gave each of these a full-width row, an inline edit control,
 * a percentage, a reset link and a 6px bar. At a glance an operator wants to
 * know how far along the day is — the rest was a settings screen wearing a
 * dashboard's clothes.
 */
function TargetRow({ label, pnl, target }: { label: string; pnl: number; target: number }) {
  const hasTarget = target > 0
  const ratio = hasTarget ? pnl / target : 0
  const met = hasTarget && pnl >= target
  const color = pnl < 0 ? 'var(--probex-negative)' : met ? 'var(--probex-positive)' : 'var(--probex-primary)'

  return (
    <Meter
      value={clamp01(ratio)}
      color={color}
      ariaLabel={`${label} target progress`}
      label={
        <Row
          label={label}
          color={color}
          value={
            <>
              {formatSignedCurrency(pnl)}
              <span style={{ color: 'var(--probex-text-disabled)', fontWeight: 400 }}>
                {' / '}
                {hasTarget ? formatCurrency(target) : '—'}
              </span>
              {met && <span style={{ color: 'var(--probex-positive)' }}> ✓</span>}
            </>
          }
        />
      }
    />
  )
}

// ─── 2 · Exposure & Risk ──────────────────────────────────────────────────────
// Entirely new. The directive's "what is the current risk/exposure state" had
// no representation anywhere on the Overview, despite every field below being
// polled continuously.

function ExposurePanel() {
  const stats = useApplicationStore((s) => s.engine.stats)
  const survival = useApplicationStore((s) => s.engine.survival)
  const policy = useApplicationStore((s) => s.engine.executionPolicy)
  const execution = useApplicationStore((s) => s.engine.executionStatus)

  // /api/stats and /api/execution/status both report active positions. Stats is
  // the faster poll (2s vs 5s), so it leads; execution status is the fallback
  // when stats is the endpoint that is failing.
  const active = stats.data?.activePositions ?? execution.data?.activePositions ?? null
  const maxPositions = policy.data?.riskLimits.maxConcurrentPositions ?? null
  const unrealized = stats.data?.unrealizedPnl ?? null
  const minEdge = survival.data?.minEdgeThreshold ?? null
  const kelly = survival.data?.kellyModifier ?? null

  const nothingYet = active === null && unrealized === null && minEdge === null

  return (
    <Panel title="Exposure" provenance="live" source="/api/stats · /api/survival">
      {nothingYet ? (
        <PanelPending note="Awaiting position and risk state." />
      ) : (
        <>
          <Focal
            value={active !== null ? active : <AwaitingValue size="lg" />}
            unit={
              maxPositions !== null
                ? `of ${maxPositions} max`
                : active !== null
                  ? active === 1 ? 'open position' : 'open positions'
                  : undefined
            }
            color={active === 0 ? 'var(--probex-text-secondary)' : undefined}
            caption={
              active === 0 ? (
                <span className="t-helper">Flat — no capital currently at risk.</span>
              ) : undefined
            }
          />

          {active !== null && maxPositions !== null && maxPositions > 0 && (
            <Meter
              value={clamp01(active / maxPositions)}
              color={active >= maxPositions ? 'var(--probex-warning)' : 'var(--probex-primary)'}
              ariaLabel="Concurrent positions against the configured limit"
            />
          )}

          <RowGroup>
            <Row
              label="Unrealized"
              value={unrealized !== null ? formatSignedCurrency(unrealized) : '—'}
              color={unrealized !== null ? pnlColor(unrealized) : undefined}
            />
            <Row
              label="Min edge"
              value={minEdge !== null ? formatEdgePct(minEdge) : '—'}
              title="The edge an opportunity must clear before the engine will act"
            />
            <Row
              label="Kelly modifier"
              value={kelly !== null ? `${kelly.toFixed(2)}×` : '—'}
              title="Survival brain's current scaling factor on Kelly position sizing"
            />
          </RowGroup>
        </>
      )}
    </Panel>
  )
}

// ─── 3 · Execution ────────────────────────────────────────────────────────────
// Absorbs the old Total P&L StatCard and adds the record behind the number —
// which is the part that makes a P&L figure mean anything.

function ExecutionPanel() {
  const execution = useApplicationStore((s) => s.engine.executionStatus)
  const d = execution.data

  const backoffActive = d?.backoff.active ?? false

  return (
    <Panel
      title="Execution"
      provenance="live"
      source="/api/execution/status"
      action={
        backoffActive ? (
          <StatusChip tone="warning" live title={`${d?.backoff.recent429s5min ?? 0} rate-limit responses in the last 5 minutes`}>
            Backoff
          </StatusChip>
        ) : undefined
      }
    >
      {!d ? (
        <PanelPending note="Awaiting the execution engine's status." />
      ) : (
        <>
          <Focal
            value={formatSignedCurrency(d.totalPnl)}
            unit="total P&L"
            color={pnlColor(d.totalPnl)}
            caption={
              d.totalTrades === 0 ? (
                <span className="t-helper">No trades executed yet this session.</span>
              ) : undefined
            }
          />

          {d.totalTrades > 0 && (
            <Meter
              value={clamp01(d.winRate)}
              color={d.winRate >= 0.5 ? 'var(--probex-positive)' : 'var(--probex-warning)'}
              ariaLabel="Win rate"
            />
          )}

          <RowGroup>
            <Row
              label="Trades"
              value={
                d.totalTrades === 0
                  ? '0'
                  : <>
                      {d.totalTrades}
                      <span style={{ color: 'var(--probex-text-disabled)', fontWeight: 400 }}>
                        {' · '}{d.wins}W {d.losses}L
                      </span>
                    </>
              }
            />
            <Row
              label="Win rate"
              value={d.totalTrades > 0 ? formatPercent(d.winRate) : '—'}
              color={d.totalTrades > 0 ? (d.winRate >= 0.5 ? 'var(--probex-positive)' : undefined) : undefined}
            />
            <Row
              label="Avg fill"
              value={d.avgExecutionMs > 0 ? `${Math.round(d.avgExecutionMs)}ms` : '—'}
              title="Mean order execution time"
            />
          </RowGroup>
        </>
      )}
    </Panel>
  )
}

// ─── 4 · System ───────────────────────────────────────────────────────────────
// Absorbs the standalone EngineHealthBanner strip, which spent a full-width
// 42px row on two words and a probe count.

function SystemPanel() {
  const health = useApplicationStore((s) => s.engine.health)
  const stats = useApplicationStore((s) => s.engine.stats)

  const h = health.data
  const probesTotal = h?.components.length ?? null
  const probesHealthy = h?.components.filter((c) => c.healthy).length ?? null
  const allHealthy = probesTotal !== null && probesHealthy === probesTotal

  const statusColor =
    h?.status === 'online' ? 'var(--probex-positive)'
    : h?.status === 'degraded' ? 'var(--probex-warning)'
    : h?.status === 'offline' ? 'var(--probex-negative)'
    : 'var(--probex-text-muted)'

  const feedConnected = stats.data?.feedConnected ?? null

  // Runtime components are the engine's own subsystem flags. A count is the
  // right density here — the per-component breakdown is the System console's
  // job, and duplicating fourteen chips on the Overview was never the answer.
  const rc = stats.data?.runtimeComponents ?? null
  const rcValues = rc ? Object.values(rc) : null
  const rcActive = rcValues ? rcValues.filter(Boolean).length : null
  const rcTotal = rcValues ? rcValues.length : null

  // The one panel on Overview that earns illumination. The engine's own health
  // report is the operator's most consequential fact, and it is currently the
  // least prominent — `degraded` and `offline` are conditions someone must act
  // on, so this panel lights up while they hold and goes quiet the moment the
  // engine reports online. Loading is NOT attention: an unresolved probe is not
  // a bad probe, and claiming otherwise would make the first second of every
  // page load look like an incident.
  const systemState: PanelState =
    h?.status === 'degraded' || h?.status === 'offline' ? 'attention' : 'live'

  return (
    <Panel title="System" provenance="live" source="/health · /api/stats" state={systemState}>
      {!h && !stats.data ? (
        <PanelPending note="Awaiting the first health probe." />
      ) : (
        <>
          <Focal
            value={
              h ? (
                <span className="capitalize" style={{ color: statusColor }}>{h.status}</span>
              ) : (
                <AwaitingValue size="lg" />
              )
            }
            unit={h ? formatUptime(h.uptimeSeconds) : undefined}
            caption={
              probesHealthy !== null && probesTotal !== null ? (
                <span className="t-helper">
                  {probesHealthy}/{probesTotal} probes healthy
                  {allHealthy ? '' : ' — check the System console'}
                </span>
              ) : undefined
            }
          />

          {probesTotal !== null && probesTotal > 0 && probesHealthy !== null && (
            <Meter
              value={probesHealthy / probesTotal}
              color={allHealthy ? 'var(--probex-positive)' : 'var(--probex-warning)'}
              ariaLabel="Healthy probes"
            />
          )}

          <RowGroup>
            <Row
              label="Price feed"
              value={
                feedConnected === null
                  ? '—'
                  : feedConnected
                    ? `${Math.round(stats.data?.feedLatencyMs ?? 0)}ms`
                    : 'Disconnected'
              }
              color={
                feedConnected === null ? undefined
                : feedConnected ? undefined
                : 'var(--probex-negative)'
              }
            />
            <Row
              label="Components"
              value={rcActive !== null && rcTotal !== null ? `${rcActive}/${rcTotal} active` : '—'}
              title="Engine subsystems reporting themselves as running"
            />
            <Row
              label="Errors"
              value={h ? `${h.stats.errors}` : '—'}
              color={h && h.stats.errors > 0 ? 'var(--probex-warning)' : undefined}
              title={h?.stats.lastError ?? 'No errors recorded since start'}
            />
          </RowGroup>
        </>
      )}
    </Panel>
  )
}
