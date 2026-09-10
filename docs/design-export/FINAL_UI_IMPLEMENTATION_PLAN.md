# PROBEX — Final UI Implementation Blueprint

**Date:** 2026-09-08 · **Status: NOT APPROVED — blueprint only. No application code modified.**
**Canonical direction:** `FINAL_VISUAL_DIRECTION.md` · **Validations:** `STITCH_RECONCILIATION.md`, `SYSTEM_DESIGN_VALIDATION.md`, `CHART_FLUIDITY_PLAN.md`
**Tracked separately:** `INDEPENDENT_DEBT_REGISTER.md` (D-1…D-5) — **not folded into any stage below**

---

## Approved decisions

| | Decision |
|---|---|
| **Q-1** | Geist + JetBrains Mono, **self-hosted** via `next/font/local` with vendored `.woff2`. **Never `fonts.googleapis.com`** — that mechanism degraded silently and is why no webfont ships today. |
| **Q-5** | Chart motion preserved; **displayed numeric values pinned to confirmed observations.** |
| **Direction** | Obsidian Cockpit Precision, in two registers: **A · Intelligence** and **B · Instrument**. |

## Still open (defaults noted; none blocks Stage 1)

**Q-2** icons — *default: keep inline SVG, add no font* · **Q-3** custom-target marker on Overview — *default: show it* · **Q-4** sidebar auto-collapse vs. user preference — *default: preference wins* · **Q-6** which 5 routes get mobile bottom-nav tabs — *default: Overview, Live Feed, Markets, Positions, System*.

## Rules that govern every route

1. **Nothing marked D or E** in the reconciliation table is built. The `Stake` button is rejected.
2. **Every figure traces to a real field.** If a composition needs a value that does not exist, the composition changes — not the data.
3. **Per-route purpose is preserved.** One design system; not one layout.
4. **Token layer before component layer.** Baseline to protect: **0** arbitrary colour values, **0** raw Tailwind palette classes.
5. **The safety model is untouchable** — write gate, confirm gate, paper-mode blocking, `available:false` two-shape handling, `—`-not-`0`, six distinct data states, PAPER ≠ SYNTHETIC.

---

# Part 1 — Route blueprint

Each route: **hierarchy · reuse · refine · new composition · responsive · charts/data · semantic state.**

---

## 1 · Overview — `/dashboard/` — *Register A*

**Hierarchy** ① BTC price + live chart (two-thirds) with Engine Focus (one-third) → ② 4-up instrument rail: Capital · Exposure · Performance · System → ③ Market discovery → ④ Imminent expirations. The attention band moves **below** the hero: today a fault list outranks the engine's own state.

**Reuse** `EngineStateBand` (the 4-up rail is already the product's strongest hierarchy and is exactly Stitch's "primary anchor") · `PriceCard` · `MarketChart` · `RadialGauge` · `Panel`/`Focal`/`Meter` · `ProvenanceBadge` · `FreshnessIndicator` · `selectPerformanceSource` · `selectExposureSource`.

**Refine** `EngineFocusHero` → two-thirds/one-third split · provenance badges → **semantic labels, endpoint to tooltip** (the single largest user-facing improvement) · `TargetProgress` (Q-3) · type ramp to `metric-xl`/`metric-md`.

**New composition** Hero grid · attention band reposition · `MarketCard` and `ExpiryRow` promoted to shared primitives (Stage 4).

**Responsive** 4-up → 2×2 at `lg` → 1-up mobile · hero stacks, chart first · Hot Markets rail below · **BTC price must reflow into the mobile header, not be dropped** (debt #27).

**Charts/data** `MarketChart` with Q-5 pinning. **Strip every invented metric:** no 24H high/low/volume, no volatility band, no momentum vector, no interval selector, no EV, no Kelly dollar allocation, no "8 market feeds", no "Strong Yes".

**Semantic state** Mode-aware performance provenance stays · positions authoritative for exposure, **no** stats fallback · `PAPER` and `SYNTHETIC` render independently.

---

## 2 · Live Feed — `/dashboard/live` — *Register A, instrument-leaning*

**Hierarchy** ① vitals strip → ② Engine Activity stream (dominant) → ③ price chart → ④ markets → ⑤ edges.

**Reuse** `EventStream` · `MarketChart` · `EdgeTable` · four provenance badges.

**Refine** Stream rows at `dense`, severity tone as a left rail rather than a full-row wash · **the pause control needs a real affordance** — it freezes the render while polling continues, which is the product's most interesting interaction and is currently understated (debt #21).

**New composition** Pause state needs an unmistakable frozen treatment — a border or header state, not just a toggled icon.

**Responsive** Single column throughout; the stream dominates mobile.

**Charts/data** Same `MarketChart` instance; no second chart treatment.

**Semantic state** Paused ≠ stale ≠ offline. **Three different things that currently risk reading alike** — the most important state distinction on this route.

---

## 3 · Markets — `/dashboard/markets` — *Register A*

**Hierarchy** ① tabs (Live · Watchlist · Archive) → ② filters → ③ grid or table.

**Reuse** `MarketFilterBar` · `DataTable` · `WatchlistButton` · `mappers/markets.ts`.

**Refine** Filter chips extended to the **engine's real `asset_category` vocabulary** — `crypto`, `macro`, `politics`, `sports`, `entertainment`, `science_tech`. **Not Stitch's `ESPORTS`.** · result-count feedback (debt #22) · grid/table toggle needs a visible persisted state (debt #23) · Archive is the densest table — `dense` mode.

**New composition** Shared `MarketCard`.

**Responsive** Grid 3→2→1 · tables scroll inside their container with fade rails.

**Charts/data** No charts. **`openInterest`, `liquidity`, `sentiment`, `tags`, `resolutionCriteria`, `status` are explicitly `null` — "not on the wire". They render as absent, never as `0` or a placeholder.** `volume24h` is real but small (~744); the design must not assume Stitch's `$642,810` magnitude.

**Semantic state** Watchlist is a local preference, not engine state — must not borrow provenance styling.

---

## 4 · Market Detail — `/dashboard/markets/{id}` — *Register A*

**Hierarchy** ① market identity + YES/NO → ② price/volume chart → ③ market stats → ④ related.

**Reuse** `MarketChart` (lightweight-charts, candles) · `MarketCharts` · `toMarketDetail`.

**Refine** **Axis, gridline and tooltip styling reconciled with the Recharts surfaces** — the two libraries currently disagree visually (debt #18). This route is where that is most visible.

**New composition** Header composition using the shared outcome chips.

**Responsive** Chart height adapts; candles must not compress into unreadability at 375px.

**Charts/data** Candles are discrete OHLC — **no window-pan animation**; sliding candles misrepresent them. `hasClosed` drives the resolved state.

**Semantic state** Closed vs open vs resolved must be visually distinct.

---

## 5 · Positions — `/dashboard/positions` — *Register A*

**Hierarchy** ① Open Exposure · Resolution Record · Realized → ② open positions table (dominant) → ③ settled positions.

**Reuse** `DataTable` · `PositionDetail` · `SettledPositions` · direction filter chips.

**Refine** **Widest table in the product** — `dense`, mono numerics, right-aligned, hover-only, no striping · **D-3 lands here** (two of the three hardcoded ink sites) · fade rails for horizontal scroll.

**New composition** None. **Positions stays a positions-focused experience** — it does not adopt the Overview composition.

**Responsive** Horizontal scroll on tablet and mobile with a scroll affordance (debt #29).

**Charts/data** No charts. P&L uses `positive`/`negative`, never brand colour.

**Semantic state** Open · settled · resolved are distinct. `/api/positions` remains the authoritative ledger — **no fallback to `/api/stats`.**

---

## 6 · Portfolio — `/dashboard/portfolio` — *Register A*

**Hierarchy** ① tabs (Overview · Capital) → ② Account Value · Realized · Open Exposure → ③ three charts → ④ Capital Ledger.

**Reuse** `PortfolioValueChart` · `PnLChart` · `WinRateChart` · `PerformanceWindow` · `CapitalLedger`.

**Refine** Chart restyle to new tokens · **`PerformanceWindow` is the one non-centrally-polled read** — its loading and freshness must not look like the polled panels.

**New composition** None.

**Responsive** Charts stack; `PerformanceWindow` control stays reachable.

**Charts/data** All three on `/api/portfolio/history`. **Historical series — no pan animation.** Apply `yDomain` (D-1's sibling fix). A flat real series must remain distinguishable from a render failure (debt #15).

**Semantic state** Targets vs actuals: `/api/survival` is the engine source; `preferencesStore.profitTargets` is the single display-only override. **No hardcoded goals anywhere** — already correct, keep it that way.

---

## 7 · Execution — `/dashboard/execution` — *Register A + B*

**Hierarchy** ① tabs (Engine · Paper) → ② Trading Record · Account · Throughput → ③ orders table → ④ paper session + bucket tables + controls.

**Reuse** `OrdersTable` · `PaperTradingControls` · `MutationButton` · `useWriteGate` · bucket tables.

**Refine** **Restyle only.** Throughput/backoff/retry panels take Register B (`dense`, mono) — they are diagnostics. `MutationButton`'s disabled reasoning currently lives only in a `title` attribute (debt #26) and deserves a visible treatment.

**New composition** None.

**Responsive** Bucket tables scroll; controls stay touch-reachable.

**Charts/data** No live charts.

**Semantic state** **The highest-stakes route.** Confirm gate, write gate and paper-mode blocking are untouchable. `PAPER` must never render as `SYNTHETIC`. **Under no circumstances does a one-tap execution control appear here or anywhere else.**

---

## 8 · Strategy — `/dashboard/strategy` — *Register A*

**Hierarchy** ① tabs (Pipeline · Consensus · Survival · Research) → ② per-tab composition.

**Reuse** `DecisionPipeline` · `RadialGauge` · `ConsensusScoreCard` · `BiasBreakdown` · `ConfidenceEvolution` · `ConsensusHistoryChart` · `HistoricalSnapshots` · `SurvivalConsole` · `ResearchLibrary`.

**Refine** **The densest surface in the product — the real test of whether the system holds.** Consensus needs the three-tier hierarchy most: score, confidence, signals and history currently carry near-equal weight.

**New composition** Consensus tab regrouping only.

**Responsive** Market selector and gauge stack; Historical Snapshots scrolls.

**Charts/data** `ConfidenceEvolution` and `ConsensusHistoryChart` are the **only Recharts candidates for window-pan animation** (30s regular cadence) — and only after the spike passes.

**Semantic state** `available: false` two-shape envelope must keep working — "not yet computed" is not an error. **`assetPrice` null-branch must not regress**: this is the site where a silent backend rename (`btc_price` → `asset_price`) took the page down through the error boundary. Interpretation stays the engine's own word (`NEUTRAL`); no invented vocabulary.

---

## 9 · Analytics — `/dashboard/analytics` — *Register A*

**Hierarchy** ① band nav → ② Edge & Sizing → ③ Performance History → ④ Attribution.

**Reuse** `KellyUtilization` · `PerformanceAnalytics` · `SegmentPerformance` · `AnalyticsEngineStatus` · `LiveChart`.

**Refine** 3254px at 1440 with no in-page navigation (debt #3). **Density is solved by navigation and grouping — never by deleting content.** In-page anchors for the three bands; sticky band headers; grouping within bands. **If any proposal requires removing meaningful information, it stops and is raised.**

**New composition** Band anchor navigation. No external input exists here — Stitch's Analytics stress test was never run.

**Responsive** Anchors become a horizontal scroller on mobile; tiles reflow 4→2→1.

**Charts/data** **D-1 (y-axis clipping) is on this route** — tracked independently, fixed on its own merits. **D-2 (the `150% UTILIZED` closed ring) is on this route** and must be fixed *before* the gauge is restyled. Historical/derived series — **no pan animation.** The same endpoint is labelled `DERIVED` on one chart and `LIVE` on the adjacent one (debt #49); pick one and be consistent.

**Semantic state** `unspecified` currently renders as a signal-source label — a null shown as a value (debt #51). Should render as withheld.

---

## 10 · System — `/dashboard/system` — *Register B, canonical*

**Reference:** `stitch-pilot/output/SYSTEM-reference-desktop-1440.png`

**Hierarchy** ① layered state (4 tiles) → ② instrument row: Health Probes · Process · Health Counters → ③ Runtime Topology (6 clusters) → ④ Endpoint Diagnostics + Configuration. **Six panels in 900px, where two fit today.**

**Reuse** `SystemStatePanel`'s layered-truth model (unchanged) · `HealthPanel` per-probe truth · `RuntimePanel` + `COMPONENT_LABELS` · `SystemMetricsPanel` readout order · `ConfigPanel`'s read-only statement · `DataTable` · `StatusChip`.

**Refine** **Migrate every System panel from `Card` to `Panel`** — the largest structural win, unlocking the state rail, density modes and freshness System currently cannot use · full-width rows → columnar grid (a 1300px label→value gap today) · counters promoted to their own panel (5,482 warnings against 5,488 checks is currently invisible) · **`DiagnosticsPanel`: one `RadialGauge` per endpoint → a `DataTable`** — the gauges are why it is unscannable · topology grouped into six clusters derived from the real names.

**New composition** Cluster wells on `surface-lowest`; probe rows as inset instrument slots.

**Responsive** Desktop-first operator surface. 3-col → 2-col at `lg`; layers 4 → 2×2 at `md`; single column below, diagnostics scrolling horizontally. **Degrade correctly; do not optimise for mobile at the cost of desktop density.**

**Charts/data** No time-series. Meters only where a real ceiling exists — **RSS has one (500MB); VMS does not, so it gets a figure and no bar.**

**Semantic state** The one route where **literal endpoint paths and `snake_case` identifiers stay in plain sight.** `DEGRADED` is a live fault surface, never a decorative accent. **`CLOSED`/`OPEN` only — `HALF-OPEN` is not representable** (`circuitBreaker.ts` does not track it) and must not be invented.

**Also:** surface the real-but-hidden fields found during validation — `min_edge_yes`, `min_edge_no`, `min_volume`, `min_alignment`, `blocked_hours`, `edge_confirmation_count`, `early_exit_threshold`, low-liquidity hours, `memory_cleanups`. Requires small DTO additions; all confirmed live.

---

## 11 · Settings — `/dashboard/settings` — *Register A*

**Hierarchy** ① Appearance → ② Accessibility → ③ Preferences.

**Reuse** `AppearanceSettings` · accessibility toggles · `preferencesStore`.

**Refine** **The theme picker must preview all six re-valued themes** — this is where the 36 new theme declarations get verified by eye · `AppearanceSettings` legitimately holds theme-swatch hex literals; that stays.

**New composition** None.

**Responsive** Single column; controls are the one place 44px targets clearly matter.

**Charts/data** None. The only route with no live engine data — its loading and provenance language differs and should.

**Semantic state** `data-reduce-motion`, `data-text-size`, `data-high-contrast`, `data-underline-links` must all still work after the token changes.

---

# Part 2 — Final chart strategy

**`MarketChart` / lightweight-charts remains the primary live-chart implementation.** Its existing truth constraints are preserved verbatim: only the leading point animates; the tip is written back to its exact confirmed value before appending; viewport scroll caps when the feed goes stale; motion is gated on live data *and* user consent; `setData()` once then `series.update()`.

**Q-5 applied:** the curve keeps its fluid motion; **the displayed numeric read-out is pinned to the last confirmed observation.** The line moves continuously; the number changes only when the engine says so.

**Never fabricate a market observation.** Interpolation is a camera operation, not a measurement, and never a labellable data state.

### Surfaces requiring change

| Surface | Library | Change | Priority |
|---|---|---|---|
| BTC hero / Live Feed (`MarketChart`) | lightweight | **Q-5 tip-value pinning** + token restyle | **High** |
| All 7 `LiveChart` consumers | recharts | **D-1 y-axis width** (independent) | **High** |
| `KellyUtilization` gauge | — | **D-2 domain** (independent) | **High** |
| Analytics Drawdown / Capital Growth | recharts | `yDomain`; resolve the `DERIVED` vs `LIVE` label conflict | Medium |
| Portfolio ×3 | recharts | Token restyle only | Medium |
| Market Detail candles | lightweight | Axis/gridline/tooltip reconciliation with Recharts | Medium |
| `ConfidenceEvolution` | recharts | **Window-pan spike site.** Generalise only if it passes | Low |
| `ConsensusHistoryChart` | recharts | Pan, only if the spike passes | Low |

### Surfaces already correct

`ChartFrame`'s six states and required `aria-label` · `MarketChart`'s incremental update and write-back · the two-party motion gate · `isAnimationActive={false}` on every Recharts series · `type="monotone"` (curves are already smooth in shape) · the `pulse-ring` arrival marker · windowing at 40 points · `PendingChart` for endpoints that do not exist.

### Never animate

Portfolio value / P&L / win rate · Analytics performance and drawdown · market-detail candles · anything derived · anything under stale, offline, mock or synthetic data.

---

# Part 3 — Sequence

| Stage | Work | Gate |
|---|---|---|
| **0** | **D-3** (`on-accent`, stale hex) | Must precede any palette change |
| **1** | Tokens: 8 re-valued + 6 new × 6 themes (36 declarations) · 11px floor · asymmetric density · radius → 3 · retire `shadow-surface*` (**D-4**) · Q-1 vendored fonts | All six themes render; 0 arbitrary values; greyscale distinguishes six states |
| **2** | **D-1**, **D-2** · Q-5 pinning · both stacks restyled · axis reconciliation | No wrong numbers; no history contamination |
| **3** | Overview | Every figure traces to a real field; no D/E items |
| **4** | Shared primitives: `MarketCard`, `ExpiryRow`, `DataTable`, filters; **retire `StatCard`** | Null fields render as absent |
| **5** | **System** (canonical Register B) | Six panels in 900px; no invented state |
| **6** | Remaining desktop routes | Each keeps its IA; no route gains a control |
| **7** | Responsive + bottom nav + **D-5** | 8 viewports; zero horizontal overflow; focus trap intact |
| **8** | Regression: 118-shot re-capture · contrast · greyscale · keyboard · reduced-motion · `document.fonts` assertion · vitest (162) · typecheck · build | No regression except intended |

**System moves to Stage 5** — earlier than the previous draft — because it is now the *validated* half of the language rather than the extrapolated one. Stages 6 and 7 can overlap.

---

## Residual risks

| # | Risk | Mitigation |
|---|---|---|
| **F-1** | Invented metrics implemented because they look authoritative | The reconciliation §4 table names every one |
| **F-2** | Webfont regression — silent fallback ships again | Vendored `.woff2` only; assert `document.fonts` in Stage 8 |
| **F-3** | 36 theme declarations drift | One commit, all six themes |
| **F-4** | Hex pasted into components | 0-arbitrary-value baseline is the regression test |
| **F-5** | Overview composition forced onto other routes | Per-route blueprints above are the contract |
| **F-6** | `HALF-OPEN` invented to match Stitch | Not representable; documented |
| **F-7** | Independent debt buried in a redesign commit | Separate register; D-3 and D-1/D-2 land before their stages |
| **F-8** | Capture harness assumes current shell geometry | Update for bottom nav before Stage 8 |
| **F-9** | Full re-capture needs a healthy backend | The engine was fully unresponsive at the end of the last export — budget for retries |

---

## Readiness

**Ready to implement now:** Stage 0 and Stage 1 (steps not dependent on Q-1), Stage 2's D-1/D-2.
**Ready once fonts are vendored:** the remainder of Stage 1.
**Blocked on nothing else.** Q-2, Q-3, Q-4 and Q-6 have workable defaults and can be confirmed in flight.

**One caveat, unchanged:** Overview and System are both validated, but every other route is being designed from the *language* rather than from a rendered reference. That is the intended method — but it means Stage 6 will produce more surprises than Stages 3 and 5, and should be reviewed route by route rather than as one batch.
