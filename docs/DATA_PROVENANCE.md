# Data provenance — where every major metric comes from

**Last verified against the live engine:** 2026-09-07

This is the answer to "which endpoint produced this number, and in what units?" for every performance-critical value in the cockpit. It exists because the engine keeps **three independent sets of trading books that disagree with each other**, and picking the wrong one is not a rendering bug — it is the cockpit stating something false with full confidence.

---

## The three accounting surfaces

| Surface | Endpoint | What it accounts for | Reads (2026-09-07) |
|---|---|---|---|
| **Paper** | `/api/paper-stats` | The paper simulator's session | 59 trades · 44W/15L · 74.6% · **+$22.38** |
| **Live execution** | `/api/execution/status` | Real order flow through the execution engine | 0 trades · 0W/0L · 0% · **$0.00** |
| **Analytics** | `/api/analytics/*` | The analytics engine's own ledger | 62 trades · **0W/62L** · 0% · **$0.00** |

All three are "correct" about their own subject. The live surface reads zero because the engine is in paper mode and has placed no live orders — that is true and worth showing. The analytics surface is **wrong** (see `BACKEND_HANDOFF.md` B-2) and is not used for performance anywhere.

### The selection rule

Implemented in [`src/lib/display/performanceSource.ts`](../src/lib/display/performanceSource.ts), tested in `performanceSource.test.ts`.

```
engine mode = paper  →  performance from /api/paper-stats,        labelled "Paper session"
engine mode = live   →  performance from /api/execution/status,   labelled "Live execution"
engine mode = unknown→  NO performance figures are shown at all
```

Three constraints hold in every branch:

1. **Mode comes from the engine**, never inferred from which surface has data. `/api/runtime`, `/api/execution/status` and `/api/portfolio` all report it identically.
2. **Paper P&L is never presented as universal truth.** It is labelled as the paper session's result wherever it appears, and the panel carries a `Paper` chip.
3. **The other surface is never hidden.** It is kept as `counterpart` and rendered separately — in paper mode the Performance panel shows a "Live orders: None placed" row. When both surfaces claim to have traded and disagree, the conflict is stated on screen rather than resolved silently.

---

## Unit conventions

**The wire sends percentages (0–100). Every domain type uses fractions (0–1).** The conversion happens once, in the DTO adapters, via `pctToFraction`.

| Wire field | Endpoint(s) | Wire | Domain | Adapter |
|---|---|---|---|---|
| `win_rate` | `/api/paper-stats`, `/api/paper/status`, `/api/portfolio`, `/api/portfolio/history`, `/api/portfolio/summary`, `/api/survival/patterns`, `/api/trades/ledger`, `/api/analytics/summary`, `/api/performance/by-category`, `/api/execution/status` | 0–100 | 0–1 | ✅ all normalised |
| `pnl_percent` | `/api/positions`, `/api/positions/history`, `/api/trades/ledger` | 0–100 | 0–1 | ✅ |
| `capital_pct` | `/api/survival` | 0–100 | 0–100 (raw) | divided at the mapper (`overview.ts`) |
| `edge_pct` | `/api/edges`, `/api/positions` | 0–100 | 0–100 (raw) | rendered by `formatEdgePct` |
| `entry_price` / `yes_price` / `no_price` | markets, positions | 0–1 | cents (0–100) for rows; 0–1 for `MarketDetailItem` | ✅ |
| `size` | positions, ledger | **USD cost basis**, not a contract count | USD | ✅ |

> ### ⚠️ A zero cannot confirm a unit
>
> Two of the three unit defects found in this audit were invisible because the live value was exactly `0`, which is identical under both conventions:
>
> - `/api/execution/status` `win_rate` was annotated `// 0–1` and left unscaled. It reads 0 in paper mode. The first live order would have rendered 74.6% as **7460%**.
> - `toPerformanceBucket` carried the comment *"the wire already sends a 0–1 fraction — confirmed against the live payload"*. That confirmation was made when every category bucket was empty. The payload now reads `crypto.win_rate: 74.6`.
>
> Both are fixed and pinned by `src/lib/services/units.test.ts`, which asserts with 74.6 — a value that can actually distinguish the two conventions.

### Kalman probabilities are NOT complementary

`/api/math-layers/kalman` reports `probability_yes: 0.88, probability_no: 0.20` for BTC and ETH — summing to **1.08**. These are two independently-estimated directional confidences, not a distribution over a partition.

`KalmanAssetState.probabilitiesArePartition` is derived at adapter time and is `false` for live data. **No UI may render these as a stacked bar, a donut, or a "% YES vs % NO" split**, and `1 - probabilityYes` is not `probabilityNo`.

---

## Metric → source map

### Performance / P&L

| Metric | Source | Notes |
|---|---|---|
| Total P&L | mode-selected (see above) | Labelled `paper P&L` or `total P&L` |
| Trades · W/L · win rate | mode-selected | |
| Balance | mode-selected (`current_capital` / `balance`) | `/api/balance` for the wallet view |
| Realized / unrealized P&L | `/api/portfolio` `pnl.*` | The only surface splitting the two |
| Live orders placed | `/api/execution/status` `total_trades` | Shown separately, never as performance |
| Portfolio value history | `/api/portfolio/history` | Charts |
| Return % · drawdown | `/api/portfolio/summary`, `/api/portfolio/performance` | |

### Positions

| Metric | Source | Notes |
|---|---|---|
| Open positions | `/api/positions` | `count` is authoritative; `/api/stats.active_positions` disagrees — see B-3 |
| Cost basis | `size` | USD, not contracts |
| Contract count | derived: `size ÷ entry_price` | Marked derived |
| Unrealized P&L | `pnl`, `pnl_percent` | |
| Settled positions | `/api/positions/history` | Identical item shape to `/api/trades/ledger` |

### Markets

| Metric | Source | Notes |
|---|---|---|
| Live scanned markets | `/api/markets` | **Only what is being scanned now** — 1–10 items, not an archive |
| Single market | `/api/markets/:market_id` | Market **+ 100 history points** in one call |
| Historical archive | `/api/markets/history/summary` | A different dataset — do not conflate |
| Price history | `/api/markets/:id/history` | Newest-first on the wire; adapters sort oldest-first |
| Probability (YES) | `yes_price` | Already 0–1 on the wire |
| Category / segment | `asset_category` | **Not** `segment` — that key has never existed |
| Expiry | derived from `closes_at` | The only confirmed staleness signal — see B-4 |

### Engine / system state

| Metric | Source | Notes |
|---|---|---|
| Health status | `/api/health` `status` | Wire says `healthy`/`unhealthy`; normalised by `normalizeHealthStatus`, unknown → `null`, never → "healthy" |
| Per-probe health | `/api/health` `components[]` | `api_access` is where market staleness surfaces |
| Execution mode | `/api/runtime` `mode` | Corroborated by `/api/execution/status` and `/api/portfolio` |
| Component status | `/api/runtime` `components` | 14 booleans |
| Uptime / memory / CPU | `/api/system/metrics` | |
| BTC spot | `/api/stats` `current_price`, `/api/price-history` | |
| Feed health | `/api/stats` `feed_connected`, `feed_latency_ms` | |

### Timestamps

Every wire timestamp is ISO 8601 and is converted to **epoch ms** by `isoToMs` at the adapter boundary. No component parses a date string.

Note that the engine sends **two shapes**: some fields carry a `Z` suffix (`2026-09-07T20:11:49.604748Z`) and some do not (`2026-09-07T20:10:36.477523`). `Date.parse` treats the un-suffixed form as **local time**, so on a non-UTC host these differ by the UTC offset. Values are used for ordering and relative age within a single endpoint, where the shape is consistent, so this has not produced a visible defect — but it is a latent hazard if two endpoints' timestamps are ever compared directly.

---

## Freshness

Separate from provenance and tracked per slice — see `src/lib/services/response.ts` and `src/lib/display/freshness.ts`.

Every `ServiceState<T>` carries:

- `lastUpdatedAt` — when the reading was actually obtained (survives failed refreshes unchanged)
- `isStale` — the last refresh failed and what is on screen is retained
- `lastError` — why, retained *alongside* the good data (`error` stays null so the panel keeps rendering)

| Level | Meaning | Rendering |
|---|---|---|
| `fresh` | Last refresh succeeded, within cadence | Silent by default |
| `aging` | All refreshes succeeded, reading older than expected | Muted note — **not** a fault |
| `stale` | Last refresh **failed**; data is retained | Coloured, states age **and** cause |
| `never` | Nothing has arrived | The panel's own empty/error state speaks |

`aging` and `stale` are deliberately different claims. Polling pauses while the tab is hidden, so a returning operator sees an old-but-successful reading constantly; reporting that as a fault would train them to ignore the indicator that matters.

At the system level, `SystemState: 'data-stale'` outranks the healthy branch — the cockpit must not say "Connected to the engine" over readings that stopped refreshing.
