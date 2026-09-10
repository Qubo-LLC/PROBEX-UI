# PROBEX — Current UI Inventory

**Captured:** 2026-09-08, post Stage-A closeout · **Backend mode:** LIVE against `https://qubo-probex.duckdns.org/api`

An audit of what each page currently does. Descriptive only — nothing here is a recommendation.

> **Reading the screenshots:** a circular "N / 1 Issue" pill appears bottom-left in several captures. That is the **Next.js development overlay**, not product UI. Ignore it.

---

## Global shell (every page)

**Top bar** — fixed 52px, three-column grid `[1fr auto 1fr]`:
- Left: sidebar collapse toggle, Probex lockup
- Centre: command palette trigger ("Jump to page… ⌘K"), fluid with a max-width
- Right: `BTC $79,163` · survival chip (`THRIVING`) · feed latency (`193ms`) · system status (`DEGRADED`) · heartbeat (`just now`) · session menu

**Sidebar** — 200px expanded / 52px collapsed, four labelled groups:
`OBSERVE` (Overview, Live Feed, Markets) · `CAPITAL` (Positions, Portfolio, Execution) · `INTELLIGENCE` (Strategy, Analytics) · `ENGINE` (System) · Settings pinned lower.

**Repeated patterns across every page**
- `Panel` with header: title · optional subtitle · `ProvenanceBadge` · `FreshnessIndicator` · action slot
- Provenance badges name the **literal endpoint path** (`LIVE · /api/price-history`)
- Numeric values use `tabular-nums`; metrics are large and weight-heavy
- Withheld values render as `—`, never as `0`
- Attention band at the top of Overview lists engine warnings

---

## 1 · Overview `/dashboard/`

**Hierarchy:** attention band → hero (BTC price + Engine Focus) → 4-panel instrument row → Markets.

| Section | Components | Source |
|---|---|---|
| Attention band | inline list, warning-toned | derived from health + survival |
| BTC / USD hero | `PriceCard` + `LiveChart` (line, windowed 40) | `/api/price-history` |
| Engine Focus | `RadialGauge` (edge %), market title, YES/NO, confidence | `/api/edges` |
| Under review / Detected / Threshold | three-up figure row | `/api/edges` |
| **Capital** | `Focal` + `Meter` + daily/weekly `TargetProgress` + runway | `/api/survival` |
| **Exposure** | open positions of max, unrealized, min edge, Kelly modifier, live orders | `/api/positions` |
| **Performance** | paper P&L, trades W/L, win rate, live orders | `/api/paper-stats` (mode-selected) |
| **System** | health verdict, uptime, price feed, components, errors | `/health` · `/api/stats` |
| Markets | Featured Markets cards + Hot Markets rail | `/api/markets` |

**Status indicators:** survival chip, per-panel provenance, `PAPER` chip on Performance, health verdict word (`Degraded`) in warning colour.
**Charts:** one line chart, one radial gauge, four `Meter` bars.
**Responsive:** 4-up instrument row → 2-up at `sm` → 1-up on mobile. Hero stacks; Hot Markets rail moves below.

---

## 2 · Live Feed `/dashboard/live`

**Hierarchy:** vitals strip → Engine Activity stream → price chart → markets → edges.

- **Pause control** freezes the rendered snapshot without stopping the poll — a genuinely unusual and well-considered affordance
- `EventStream` rows: newest-first, repeated events collapsed, severity-toned
- Four provenance badges: `/api/stats`, `/api/events`, `/api/price-history`, `/api/edges`

**Responsive:** single column throughout; the stream is the dominant element on mobile.

---

## 3 · Markets `/dashboard/markets`

Tabs: **Live** (count badge) · **Watchlist** · **Archive**

- Filters: `All` / `5m` / `15m` duration chips; grid ⇄ table view toggle
- Grid: market cards with `EVENT` tag, title, YES/NO cent prices, watchlist star
- Table: `DataTable` with numeric columns
- **Archive** is the densest table in the product (historical markets, min/max/avg pricing)

**Terminology exposed:** `event`, cent-denominated prices (`0¢` / `100¢`), `5m`/`15m` market durations.
**Responsive:** grid reflows 3→2→1; tables scroll horizontally inside their own container (document never scrolls sideways).

---

## 4 · Positions `/dashboard/positions`

- Panels: **Open Exposure** (`/api/positions`), **Resolution Record**, **Realized** (both `/api/execution/status`)
- Open positions table: market, side, size, entry, current, P&L, edge, held-for
- **Settled Positions** below (`/api/positions/history`)
- Direction filter chips (`YES` / `NO`) — captured in `interactions/positions-filtered-*`

**Responsive:** the widest table in the product; horizontal scroll on tablet and mobile.

---

## 5 · Portfolio `/dashboard/portfolio`

Tabs: **Overview** · **Capital**

- Account Value / Realized Performance / Open Exposure panels
- Three charts on `/api/portfolio/history`: Portfolio Value, Daily & Cumulative P&L, Rolling Win Rate
- `PerformanceWindow` with a user-selectable lookback (the one non-centrally-polled read)
- **Capital** tab carries the Capital Ledger (absorbed the former Wallet route)

---

## 6 · Execution `/dashboard/execution`

Tabs: **Engine** · **Paper**

- Trading Record / Account / Throughput panels
- `OrdersTable` (active + closed)
- **Paper**: session card, bucket tables (by edge bucket, by hour), `PaperTradingControls` with `MutationButton`s (start/stop/reset/resolve)
- Mutations are confirm-gated and write-gate aware (blocked unless paper mode is confirmed)

**Terminology exposed:** `/api/paper/*`, "order flow", rate-limit backoff, retry stats.

---

## 7 · Strategy `/dashboard/strategy`

Tabs: **Pipeline** · **Consensus** · **Survival** · **Research**

- **Pipeline**: `DecisionPipeline` stages, sizing terms, risk limits
- **Consensus**: market selector → Opportunity Intelligence → `RadialGauge` edge strength → Recommendation Engine → Bias Breakdown → Confidence Evolution + Consensus History charts → **Historical Snapshots** table
- **Survival**: survival console, pattern performance table
- **Research**: generated report library

Consensus is the most component-dense surface in the product.

---

## 8 · Analytics `/dashboard/analytics`

Longest page (3254px at 1440 width). Bands: **Edge & Sizing** → **Performance History** → **Attribution**.

- Edge Quality: four figure tiles + confidence distribution bar + by-signal-source
- Kelly Utilization: radial gauge + four term tiles + explanatory paragraph
- Drawdown (`DERIVED`) and Capital Growth (`LIVE`) — both on `/api/portfolio/history`
- Analytics Engine panel (segments, signals, hourly attribution)

---

## 9 · System `/dashboard/system`

Tabs: **Health & Config** · **Event Log** (count badge, 200)

- `SystemStatePanel` — layered truth: runtime mode, health, identity
- Health probe list (price_feed, main_loop, api_access, memory) with pass/fail
- Runtime component grid — 14 ON/OFF chips
- Process metrics: uptime, RSS, VMS, CPU
- **Endpoint Diagnostics** — per-endpoint request counts, latencies, circuit state

**Most technical surface in the product.** Raw endpoint paths, component identifiers (`clob_client`, `resolution_tracker`), byte-level memory, and a note about `POST /api/update-stats`.

---

## 10 · Settings `/dashboard/settings`

- Theme picker (6 themes)
- Accessibility: reduce motion, text size, high contrast, underline links
- Preference toggles

The one page with no live engine data.

---

## Cross-cutting observations

**Information hierarchy**
- Every domain page opens with `PageHeader` (title + one-line explanation) — consistent
- Panels are the universal unit; the eye has few other landmarks
- Overview's 4-up instrument row is the strongest hierarchy in the product

**Repeated patterns**
- Provenance badge in every panel header (~40 instances)
- `Focal` + `Meter` + `RowGroup` is the dominant panel interior
- `—` for withheld values, everywhere

**Technical terminology visible to users**
Endpoint paths · `available: false` semantics as "Not yet" · component snake_case names · `Kelly modifier` · `Brier` · `Shapley` · `Kalman` · `survival brain` · `edge bucket` · `CLOB` · `backoff` · `RSS`/`VMS`.

**Status indicators**
System status chip · provenance badge (7 states) · freshness indicator (4 levels) · StatusChip · health probe pass/fail · panel left-rail state.

**Chart types**
Line, area, radial gauge, horizontal meter, distribution bar, candles (market detail only, lightweight-charts).

**Responsive behaviour**
Sidebar → hamburger drawer below `lg`. Grids reflow 4→2→1. Tables scroll inside their containers. Document-level horizontal overflow is zero at all eight tested viewports.

**Visible inconsistencies** (recorded, not fixed — see `PROBEX_VISUAL_DEBT.md`)
- Same endpoint labelled `DERIVED` on one chart and `LIVE` on another (Analytics)
- Chart y-axis leading digits clipped on Analytics Drawdown (`34%` renders as `4%`)
- Kelly Utilization gauge reads `150% UTILIZED` with a fully-closed ring
- `StatCard` and `Panel` both render "labelled figure + provenance"
- Header vitals vanish entirely in offline mode rather than degrading
