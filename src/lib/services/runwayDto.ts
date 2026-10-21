// /api/runway and /api/runway/live → domain shapes. Pure functions; no defaults
// invented for absent figures (null stays null).

import type {
  Activity, ActivityDTO, CurvePoint, CurvePointDTO, LiveWindowDTO, LiveWindow, Runway, RunwayDTO,
  RunwayLive, RunwayLiveDTO, Sleeve, SleeveDTO, SizerView, SizerViewDTO,
} from '@/types/runway'

const SLEEVE_ORDER = ['CRYPTO', 'EVENTS', 'HOUSE']
const secToMs = (s: number | null | undefined) => (s === null || s === undefined ? null : Math.round(s * 1000))

function toCurve(points: CurvePointDTO[] | undefined): CurvePoint[] {
  return (points ?? []).map((p) => ({ tsMs: Math.round(p.ts * 1000), equity: p.equity, event: p.event ?? null }))
}

export function toSleeve(d: SleeveDTO): Sleeve {
  return {
    sleeveId: d.sleeve_id, allocation: d.allocation, cash: d.cash, equity: d.equity,
    openPositions: d.open_positions, openExposure: d.open_exposure,
    realizedPnl: d.realized_pnl, unrealizedPnl: d.unrealized_pnl,
    highWaterMark: d.high_water_mark, drawdown: d.drawdown, drawdownPct: d.drawdown_pct_of_allocation,
    reserve: d.reserve,
    halt: { state: d.halt.state, halted: d.halt.halted, reason: d.halt.reason, sinceMs: secToMs(d.halt.since) },
    counts: d.counts ?? {}, rejections: d.rejections ?? {},
    positions: (d.positions ?? []).map((p) => ({
      positionId: p.position_id, marketId: p.market_id, token: p.token, direction: p.direction, shares: p.shares,
      price: p.price, feePerShare: p.fee_per_share, openedAtMs: Math.round(p.opened_at * 1000),
      strategyId: p.strategy_id, sizing: p.sizing, mark: p.mark,
    })),
    researchSized: d.has_research_positions,
  }
}

function toActivity(a: ActivityDTO): Activity {
  return {
    kind: a.kind, sleeveId: a.sleeve_id, tsMs: Math.round(a.ts * 1000), window: a.window, marketId: a.market_id,
    token: a.token, price: a.price, shares: a.shares, cancelReason: a.cancel_reason, timeToFill: a.time_to_fill,
    payoutPerShare: a.payout_per_share, outcome: a.outcome, pnl: a.pnl, researchSized: a.research_sizing,
    positionId: a.position_id,
  }
}

function toSizerView(v: SizerViewDTO): SizerView {
  return { equityStart: v.equity_start, equity: v.equity, placed: v.placed, skipped: v.skipped ?? {},
           pnl: v.pnl, curve: toCurve(v.curve), sizing: v.sizing, balanceSource: v.balance_source ?? null }
}

export function toRunway(d: RunwayDTO): Runway {
  const sleeves = Object.values(d.sleeves ?? {}).map(toSleeve).sort((a, b) => {
    const ia = SLEEVE_ORDER.indexOf(a.sleeveId), ib = SLEEVE_ORDER.indexOf(b.sleeveId)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.sleeveId.localeCompare(b.sleeveId)
  })
  const c = d.combined
  return {
    generatedAtMs: Math.round(d.generated_at * 1000), source: d.source, label: d.label, sleeves,
    reserveTotal: d.reserve?.total ?? 0, reserveBySleeve: d.reserve?.by_sleeve ?? {},
    combined: c ? { allocation: c.allocation, cash: c.cash, equity: c.equity, openPositions: c.open_positions,
                    openExposure: c.open_exposure, realizedPnl: c.realized_pnl, unrealizedPnl: c.unrealized_pnl,
                    drawdown: c.drawdown, reserve: c.reserve } : null,
    equityCurves: Object.fromEntries(Object.entries(d.equity_curves ?? {}).map(([k, v]) => [k, toCurve(v)])),
    activity: (d.activity ?? []).map(toActivity),
    views: Object.fromEntries(Object.entries(d.views ?? {}).map(([k, v]) => [k, toSizerView(v)])),
  }
}

function toLiveWindow(w: LiveWindowDTO): LiveWindow {
  return {
    asset: w.asset, durationMinutes: w.duration_minutes, window: w.window,
    windowStartMs: Date.parse(w.window_start), windowEndMs: Date.parse(w.window_end),
    secondsLeft: w.seconds_left, elapsedSeconds: w.elapsed_seconds,
    tokens: w.tokens.map((t) => ({ token: t.token, bid: t.bid, ask: t.ask, mid: t.mid, quote: t.quote,
                                   notQuoting: t.not_quoting })),
  }
}

export function toRunwayLive(d: RunwayLiveDTO): RunwayLive {
  return { generatedAtMs: Math.round(d.generated_at * 1000), rule: d.rule, visibilityOnly: d.visibility_only,
           label: d.label, windows: (d.windows ?? []).map(toLiveWindow) }
}
