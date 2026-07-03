# PROBEX V3 — Implementation Blueprint

**Version 1.0 · 2026-07-03 · The engineering execution plan for V3**

> Strategy layer: `PROBEX_V3_RESTORATION_PLAN.md` (north star, dispositions,
> dependency matrix). This document is the *build order* — exact phases, files,
> stores, primitives, per-widget data sources, and acceptance criteria.
> No code is written until this is approved.
>
> **Reference model:** V1 = git `0e3833a4` (visual only). Foundation = current
> working tree (M0–M6 architecture, untouched).

---

## 1. What already exists (de-risk audit)

Restoration is cheaper than it looks — much of the V1 substrate survived M5:

| Asset | State | Consequence for V3 |
|---|---|---|
| `utils.ts` display helpers (`formatBias`, `biasColorVar`, `sentimentColorVar`, `formatConfidence`, `formatSignal`, `consensusScoreColorVar`, `probabilityColorVar`, `estimateYesPayout`, `estimateContracts`, `formatCompact`) | **Present** | Restored V1 widgets compile against the same formatting vocabulary |
| `types/consensus.ts`, `types/market.ts` (`ConsensusState`, `Bias`, `Market`, `SentimentBias`, `ConfidenceLevel`, `SignalLevel`) | **Present** | V1 widget prop types exist; wire to new data / AwaitingBackend |
| Endpoint registry with 43 `awaiting-backend` entries | **Present** | Availability switchboard already seeded |
| `parse-or-report` (`lib/mappers/parse.ts`) | **Present** | Row activation pattern proven; extend field sets, don't reinvent |
| Design system + 5 themes + `PROBEX_DESIGN_SYSTEM.md` | **Present** | Every restored widget re-themes for free |
| `applicationStore` + `ApplicationStateLoader` polling | **Present, untouched** | Live data spine; no fetch code changes |
| `lib/display/engine.ts` (survival color/label, uptime) | **Present** | Engine-reasoning widgets reuse it |
| V1 widget JSX/layout | **In git `0e3833a4`** | Visual reference via `git show`; rebuilt, not reverted |

**Implication:** most "restore unchanged visually" widgets are a *re-wire*
(swap `useMarkets`/`useConsensusMap` → `applicationStore` slice + parse-or-report
+ `useEndpointAvailability`), not a rewrite. The risk is concentrated in
(a) the Consensus flagship and (b) endpoints that don't exist yet.

---

## 2. Store strategy

**Reused untouched:** `applicationStore` (engine data), `themeStore`, `sidebarStore`.

**New — justified (not duplicates; nothing current covers product UI state):**

| Store | Scope | Persistence | Justification |
|---|---|---|---|
| `uiStore` | ephemeral product view state: market filters/search/sort, view-mode toggle, **focus-market id**, portfolio/analytics timeframe, active tabs | none (session) | V1 spread this across marketStore/analyticsStore/portfolioStore (5 stores). V3 consolidates to **one** — satisfies "no duplicate stores." The focus-market id is the cross-view context object (Plan §0). |
| `preferencesStore` | watchlist ids, research bookmarks, saved views | **localStorage** | Distinct persistence semantics from `uiStore`; real user data (V1 did the same via localStorage). Documents P3-02 for server sync. |

Two new stores, both single-instance, zero overlap with each other or with
engine/theme/sidebar. **Rule:** no store may hold engine data — that is
`applicationStore`'s sole domain; product stores hold only UI/user state.

---

## 3. Shared primitives (extract in Phase 0, before any page)

Everything pages compose from. Extracting first prevents per-page divergence.

| Primitive | Origin | Notes |
|---|---|---|
| `AwaitingBackend` | **new** | The fifth data-state frame: real title/description + provenance badge naming the endpoint (e.g. "Awaiting CE-2"). Optional non-interactive layout skeleton. |
| `useEndpointAvailability(entry)` | **new** hook | Reads endpoint registry `status`; returns `'live' \| 'awaiting'`. One-line gate per widget. |
| `ProvenanceBadge` | **new** | `live · derived · awaiting · stale` visual grammar (Plan §0 system 1). |
| `Sparkline` | V1 HeroCarousel (inline) → extract | Reused by cards, hero, price, watchlist. Pure SVG, no deps. |
| `RadialGauge` | V1 `ConsensusScoreCard` (270° arc) → extract | Powers Edge-Strength gauge, consensus gauge, capital gauge. The signature premium element. |
| `MetricStat` / `StatGrid` | generalize current `StatCard` | Adds provenance + flash-on-change (liveness system 4). |
| `DataTable` (+ `TableShell/Thead/Th/Tr/Td`) | **present** (M6) | Already shared; extend with sort headers + row-select for focus-market. |
| `EdgeTable`, `PriceCard`, `TargetProgress` | **present** (M6) | Reused as-is in product pages. |
| `SegmentTag`, `SentimentIndicator`, `ConfidenceMeter`, `ConsensusBadge` | V1 `markets/*` → extract to `shared/` | Small display atoms; wire to live fields or AwaitingBackend. |
| `ValueFlash` wrapper | **new** | Wraps any number; subtle flash on change (liveness). |
| `FilterBar`, `ViewToggle`, `TimeframeSelector` | V1 patterns → `shared/` | Driven by `uiStore`; reused by Markets/Positions/Analytics. |

---

## 4. Routing inversion

The core structural move: **engine consoles (currently top-level) become Admin
tabs; product pages (currently redirects) become real pages.**

| Route | Current (M6) | V3 |
|---|---|---|
| `/dashboard` | Command Center | **Overview** (rebuilt) |
| `/dashboard/markets` | →redirect live | **Markets** catalog |
| `/dashboard/markets/[id]` | →redirect live | **Market Detail** |
| `/dashboard/live` | LiveFeedConsole | **Live** (enriched) |
| `/dashboard/consensus` | →redirect strategy | **Consensus** flagship |
| `/dashboard/research` | →redirect home | **Research** |
| `/dashboard/analytics` | →redirect home | **Analytics** |
| `/dashboard/portfolio` | →redirect home | **Portfolio** |
| `/dashboard/positions` | PositionsConsole | **Positions** (enriched) |
| `/dashboard/watchlist` | →redirect home | **Watchlist** |
| `/dashboard/wallet` | →redirect exec | **Wallet** |
| `/dashboard/admin` | →redirect system | **Admin console** (tabbed) |
| `/dashboard/system` | SystemConsole | →redirect `admin#health` |
| `/dashboard/survival` | SurvivalConsole | →redirect `admin#survival` |
| `/dashboard/execution` | ExecutionConsole | →redirect `admin#execution` |
| `/dashboard/events` | EventLog | →redirect `admin#events` |
| `/dashboard/strategy` | StrategyConsole | →redirect `admin#strategy` |

`EngineStatusStrip` stays in global TopNavigation (engine *pulse* is premium);
engine *plumbing* lives in Admin.

---

## 5. Page scorecards (V1 vs current M6)

Scored /10 on five axes. "BR" = Backend Readiness (how much renders truthfully
live *today*). The gap between V1's richness and its backend readiness — and
M6's inverse — is exactly what V3 closes.

| Page | Version | Visual | Density | Professional | BR | Premium |
|---|---|---|---|---|---|---|
| **Overview** | V1 | 9 | 8 | 8 | 2 | 8 |
| | M6 | 5 | 6 | 8 | 9 | 6 |
| | **V3 target** | 9 | 8 | 9 | 7* | 9 |
| **Markets** | V1 | 8 | 8 | 7 | 2 | 7 |
| | M6 | — (redirect) | — | — | — | — |
| | **V3 target** | 9 | 9 | 9 | 6* | 9 |
| **Market Detail** | V1 | 8 | 8 | 7 | 2 | 8 |
| | M6 | — | — | — | — | — |
| | **V3 target** | 9 | 8 | 9 | 5* | 9 |
| **Live** | V1 | 7 | 8 | 7 | 2 | 6 |
| | M6 | 6 | 6 | 8 | 8 | 6 |
| | **V3 target** | 8 | 9 | 9 | 8 | 8 |
| **Consensus** | V1 | 9 | 9 | 8 | 1 | 9 |
| | M6 | 6 (as Strategy) | 7 | 8 | 9 | 7 |
| | **V3 target** | 10 | 9 | 9 | 6* | 10 |
| **Portfolio** | V1 | 8 | 9 | 8 | 2 | 8 |
| | M6 | — | — | — | — | — |
| | **V3 target** | 9 | 9 | 9 | 6* | 9 |
| **Positions** | V1 | 7 | 8 | 7 | 2 | 6 |
| | M6 | 5 | 6 | 8 | 7 | 6 |
| | **V3 target** | 8 | 8 | 9 | 7 | 8 |
| **Analytics** | V1 | 8 | 9 | 7 | 1 | 7 |
| | M6 | — | — | — | — | — |
| | **V3 target** | 8 | 9 | 9 | 4* | 8 |
| **Research** | V1 | 7 | 6 | 7 | 1 | 7 |
| | M6 | — | — | — | — | — |
| | **V3 target** | 8 | 6 | 9 | 3* | 8 |
| **Admin** | V1 | 6 | 7 | 7 | 1 | 5 |
| | M6 (consoles) | 7 | 8 | 9 | 10 | 7 |
| | **V3 target** | 8 | 9 | 10 | 10 | 8 |

\* BR climbs to 9–10 automatically as Jake ships endpoints (registry flip). The
starred targets are *today's* truthful floor; premium/visual scores are already
met because AwaitingBackend frames are designed, not blank.

---

## 6. Implementation Phases

Effort: S ≤½d · M ~1d · L 2–3d · XL 3–5d. Each phase gates on type-check +
build clean, zero `@/mock` imports (except `mock/engine.ts`), and browser
verification of live + awaiting + empty states.

---

### Phase 0 — Foundation

**Objective:** build the V3 substrate — availability mechanism, product stores,
shared primitives, navigation, and the Admin relocation — so every later phase
is pure page composition.

**Files affected (new unless noted):**
- `components/shared/AwaitingBackend.tsx`, `ProvenanceBadge.tsx`,
  `Sparkline.tsx`, `RadialGauge.tsx`, `ValueFlash.tsx`, `MetricStat.tsx`
- `config/hooks/useEndpointAvailability.ts`
- `store/uiStore.ts`, `store/preferencesStore.ts`
- `lib/api/endpoints.ts` (extend: add CE-1…4, MD-1, R-1, A-1…3 entries as `awaiting-backend`)
- `components/layout/Sidebar.tsx` (rewrite nav: Discover/Trade/Intelligence + Admin/Settings)
- `components/admin/AdminConsole.tsx` (new tabbed shell), tab wrappers relocating `HealthPanel`/`RuntimePanel`/`ConfigPanel`/`DiagnosticsPanel`/`ExecutionConsole`/`SurvivalConsole`/`EventLog`/`StrategyConsole`
- `app/dashboard/{system,survival,execution,events,strategy}/page.tsx` → redirect into `admin#tab`
- `app/dashboard/admin/page.tsx` → render AdminConsole

**Widgets restored:** none yet (infrastructure). Engine consoles relocated
verbatim (visual parity in Admin).

**Which M6 components remain:** all engine panels — moved, not modified.

**Dependencies:** none (all live/local).

**Risk:** **Low–Medium.** Main risk is the console wrappers carrying their own
`page-container`/PageHeader into tabs → double chrome. Mitigation: AdminConsole
renders panel bodies; strip the page wrapper from the relocated consoles into a
thin tab-content shape (behavioural no-op).

**Effort:** L.

**Acceptance:** new nav renders; `/dashboard/admin` shows all 8 engine tabs
identical to today's consoles; old console routes redirect; `AwaitingBackend`
renders a themed frame from a registry entry; `useEndpointAvailability` flips a
demo widget; build + type-check clean.

---

### Phase 1 — Overview restoration

**Objective:** the market-discovery landing returns, reframed as *the engine's
opportunity briefing*. Glance-tier density.

**Files:** `components/overview/OverviewPage.tsx` (replaces CommandCenter as the
route body) + section components: `GlobalConsensusBar`, `HeroCarousel`,
`FeaturedGrid`, `TrendingTable`, `ActivityFeed`, `EnginePulseCard`, `Footer`.

**Widgets restored / per-widget data source:**

| Widget | Disposition | Powered by |
|---|---|---|
| GlobalConsensusBar | redesign (engine reframe) | **live** stats/survival for engine pulse; **AwaitingBackend CE-1** for consensus score/participation |
| HeroCarousel | merge (V1 layout + engine data) | markets×edges join → **AwaitingBackend P0-01**; Sparkline from price-history live |
| FeaturedGrid (MarketCards) | merge | `parseMarketRows` **P0-01**; edge chip from `/api/edges` live-envelope |
| TrendingTable | restore | `parseMarketRows` **P0-01** (DataTable + sort) |
| ActivityFeed | restore **live now** | `/api/events` via `parseEventRows` |
| EnginePulseCard | new (distilled from M6 Command Center) | **live** price sparkline + capital + P&L (execution/survival) |
| AttentionBanner | reuse M6, fold into consensus bar | **live** derived |
| Footer | restore unchanged | — |

**M6 remains:** Command Center logic distilled into `EnginePulseCard`
(not discarded — its mappers/`useCommandCenter` feed the pulse card).

**Dependencies:** Phase 0. P0-01 for market widgets (else AwaitingBackend).

**Risk:** **Medium.** HeroCarousel is the most complex restore; its market-brief
needs the fuller market field set → extend `parseMarketRows` (segment,
volume, liquidity, sentiment). Extension of an existing pattern, low logic risk.

**Effort:** XL.

**Acceptance:** Overview renders V1-grade layout; ActivityFeed + EnginePulse are
live; market widgets show designed AwaitingBackend (or populate if P0-01 landed);
no fake numbers; passes glance-tier (key state readable in ~5s); 5 themes + mobile.

---

### Phase 2 — Markets restoration (+ Live, + Detail)

**Objective:** the opportunity surface — what the engine is watching — as a
scannable, filterable catalog with the V3 edge-chip signature. Live is its
real-time mode; Detail is the deep study view.

**Files:** `components/markets/MarketsPage.tsx`, `MarketCard.tsx`, `MarketTable.tsx`,
`MarketFilterBar.tsx`; `components/live/LivePage.tsx` (enrich M6 LiveFeedConsole),
`LiveTicker.tsx`, `LivePauseControl.tsx`; `components/market-detail/MarketDetailPage.tsx`
+ `MarketHeader`, `MarketCharts`, `EngineThesisPanel`, `RelatedMarkets`,
`MarketActivityFeed`, `AutoExecutionPanel`.

**Per-widget:**

| Widget | Disposition | Powered by |
|---|---|---|
| MarketCard | merge | `parseMarketRows` **P0-01**; probability/price live; **edge chip** `/api/edges` live; ConsensusBadge **AwaitingBackend CE-2**; watchlist star `preferencesStore` |
| MarketFilterBar / search / sort / view-toggle | restore | `uiStore` (client-side over live items) |
| MarketTable | reuse DataTable | **P0-01** |
| Live table | enrich M6 | items **P0-01** + edges live; consensus col **CE-2** |
| LiveTicker | redesign (real events, not mock stream) | `/api/events` live |
| LivePauseControl | redesign (client polling pause) | `uiStore` |
| MarketHeader / stats | restore | market item **P0-01** |
| MarketCharts | restore | **AwaitingBackend MD-1** (per-market history) |
| EngineThesisPanel | **redesign** (was ThesisPanel/consensus) | live edge for market (direction/magnitude/kelly/signal) + **AwaitingBackend P4-03** narrative |
| AutoExecutionPanel | new (replaces TradingDrawer) | **live** — engine's threshold + auto-trade explanation |
| RelatedMarkets | redesign | client-side same-segment (truthful label) |

**M6 remains:** LiveFeedConsole becomes LivePage's live-mode core; PriceCard,
EdgeTable reused.

**Dependencies:** Phase 0/1. P0-01 (catalog), CE-2 (consensus adornments), MD-1
(charts), P4-03 (thesis narrative) — all AwaitingBackend-gated.

**Risk:** **Medium.** Filtering/sort over live-updating polled data must be
stable (sort keys memoized). TradingDrawer deliberately *not* restored — replaced
by AutoExecutionPanel (honest to the autonomous model).

**Effort:** XL (Markets L + Live M + Detail L).

**Acceptance:** catalog filters/sorts/searches live items (or AwaitingBackend);
edge chip proves the V3 signature; Live ticker shows real events; Detail routes
and shows engine thesis live; no betting affordances; themes + mobile + focus-
market selection updates `uiStore`.

---

### Phase 3 — Consensus flagship

**Objective:** the signature experience — the engine's reasoning as hero,
rendered with V1's premium vocabulary. This is where V3 most clearly beats both
predecessors.

**Files:** `components/consensus/ConsensusPage.tsx` + `EdgeStrengthGauge` (from
RadialGauge), `RecommendationCard`, `MarketSelector`, `ReasoningPipeline`,
`ExplainabilityPanel`, `ConsensusScoreCard`, `BiasBreakdown`,
`ConfidenceEvolution`, `HistoricalSnapshots`, `ConsensusHistoryChart`.

**Two-column design — Engine Signal (live) | Consensus Intelligence (awaiting):**

| Widget | Disposition | Powered by |
|---|---|---|
| MarketSelector | restore | live markets (**P0-01**) / focus-market from `uiStore` |
| EdgeStrengthGauge | **redesign** (V1 consensus gauge → edge) | **live** `/api/edges` edge magnitude |
| RecommendationCard | merge | **live** edge recommendation/direction/signal |
| ReasoningPipeline | reuse M6 StrategyConsole pipeline | **live** survival/config/edges |
| ExplainabilityPanel | **redesign** (real pipeline, not invented factors) | **live** patterns evaluated→filtered→threshold→sizing |
| ConsensusScoreCard | restore visual | **AwaitingBackend CE-3** |
| BiasBreakdown | restore visual | **AwaitingBackend CE-4** |
| ConfidenceEvolution | restore visual | **AwaitingBackend CE-4** |
| HistoricalSnapshots | restore visual | **AwaitingBackend CE-3** |
| ConsensusHistoryChart | restore visual | **AwaitingBackend CE-3** |

**M6 remains:** StrategyConsole's pipeline/sizing/limits logic is *shared* between
this page (consumer lens) and Admin#strategy (ops lens) — one source, two frames.

**Dependencies:** Phase 0. CE-3/CE-4 (intelligence column). Engine-signal column
is fully live today.

**Risk:** **Medium–High.** The redesign judgment (consensus gauge → edge gauge)
must read as intentional, not a relabel. Requires the strongest visual polish.
RadialGauge extraction must be pixel-faithful to V1's 270° arc.

**Effort:** XL.

**Acceptance:** engine-signal column fully live and genuinely premium; intelligence
column shows designed AwaitingBackend frames (not blanks); a first-time user
understands *why the engine is/ isn't trading* in <15s; RadialGauge matches V1
fidelity; flagship-grade polish.

---

### Phase 4 — Portfolio / Positions (+ Wallet)

**Objective:** the capital the engine manages — V1's portfolio richness, filled
with the engine's real money story. Most metrics live *today*.

**Files:** `components/portfolio/PortfolioPage.tsx` + `PortfolioMetrics`,
`PortfolioOverview`, `AllocationChart`, `PerformanceCharts`(Value/PnL/WinRate),
`PortfolioInsights`, `PortfolioActivity`; `components/positions/PositionsPage.tsx`
(enrich M6 + filters/detail panel); `components/wallet/WalletPage.tsx`.

**Per-widget:**

| Widget | Disposition | Powered by |
|---|---|---|
| PortfolioMetrics (6 stats) | merge — **mostly live** | value=execution balance; unrealized=positions envelope; realized/winrate/WL=execution; open=positions — all **live** |
| AllocationChart | merge | position items **P0-01** |
| PerformanceCharts (value/PnL/winrate over time) | restore visual | **AwaitingBackend P2-01** |
| ConsensusAlignment | restore visual | **AwaitingBackend CE-2** |
| PortfolioActivity | restore **live** | `/api/events` |
| PositionsTable + filters + detail panel | enrich M6 | envelope live; items **P0-01**; detail → market+edge |
| Settled tab | restore visual | **AwaitingBackend P2-02** |
| WalletBalanceCard | restore **live** | execution balance + cache age + PAPER badge |
| Funding suite | mode-gate | **AwaitingBackend P4-01** (paper-mode truthful panel) |
| TransactionHistory | restore visual | **AwaitingBackend P2-02** |

**M6 remains:** PositionsConsole logic + parse-or-report reused; execution/
survival mappers feed metrics.

**Dependencies:** Phase 0. Live today: execution, positions envelope, events.
Awaiting: P0-01 items, P2-01 history, P2-02 ledger, CE-2.

**Risk:** **Low–Medium.** Highest live-data payoff of any phase — proves the V3
thesis with real money numbers. Chart components need a clean AwaitingBackend
chart-skeleton (non-fake).

**Effort:** L (Portfolio L + Positions M + Wallet M, overlapping primitives).

**Acceptance:** portfolio value/PnL/winrate live from execution; activity live;
positions filterable with detail panel; wallet balance live w/ PAPER badge;
charts show AwaitingBackend chart-frames; no fabricated equity curve.

---

### Phase 5 — Analytics / Research (+ Watchlist)

**Objective:** breadth pages — honest about persistence dependencies, premium
in their awaiting states, educational.

**Files:** `components/analytics/AnalyticsPage.tsx` + section cards;
`components/research/ResearchPage.tsx` + sidebar/reader/cards;
`components/watchlist/WatchlistPage.tsx`.

**Per-widget:**

| Widget | Disposition | Powered by |
|---|---|---|
| Portfolio analytics (equity/winrate history) | restore visual | **AwaitingBackend P2-01/P2-02** |
| Market analytics (activity) | partial live | `/api/events` live; volume awaiting P0-01 |
| Consensus analytics | restore visual | **AwaitingBackend A-1/CE-4** |
| ETF / Institutional / OnChain analytics | restore frames — **decision point** | **AwaitingBackend A-2/A-3**; drop permanently if backend won't provide |
| Research grid/sidebar/reader | restore shell | **AwaitingBackend R-1**; bookmarks `preferencesStore` |
| Watchlist | restore **live-ish** | `preferencesStore` ids × live market items (**P0-01**); edge chip live |

**M6 remains:** none specific; reuses shared primitives.

**Dependencies:** Phase 0. Mostly awaiting (P2-01/02, A-series, R-1). Watchlist
localStorage live now.

**Risk:** **Low.** Mostly AwaitingBackend shells. Key decision: ETF/OnChain frames
— confirm Jake's intent (A-2/A-3) or remove to avoid permanent empty promises.

**Effort:** L.

**Acceptance:** analytics/research render educational AwaitingBackend layouts
(teach the engine, no fake charts); watchlist works on localStorage + live
markets; ETF/OnChain decision recorded.

---

### Phase 6 — Final premium polish

**Objective:** cross-page cohesion and the premium *feel* — provenance grammar,
liveness, density tiers, focus-market continuity, motion, responsive/theme sweep.

**Files:** cross-cutting — `ProvenanceBadge` applied consistently; `ValueFlash`
on live numbers; `uiStore` focus-market wired across Markets/Consensus/Detail;
motion + density audit per `PROBEX_DESIGN_SYSTEM.md`; TopNav SearchBar/Command
Palette (indexing live markets **P0-01** + pages/actions live); NotificationBell
slot (**AwaitingBackend P1-03**).

**Widgets:** SearchBar/CommandPalette (restore, pages/actions live now);
NotificationBell (AwaitingBackend). Liveness + provenance across all restored
widgets.

**Dependencies:** Phases 1–5.

**Risk:** **Low.** Polish only; no new data paths.

**Effort:** M–L.

**Acceptance:** every live number flashes on change; every value carries
provenance; selecting a market anywhere orients other views; ⌘K search works;
full 5-theme + responsive pass; V3 screenshots; `PROBEX_PRODUCT_SPEC.md` +
`PROBEX_DESIGN_SYSTEM.md` updated for V3.

---

### Phase 4-bis (continuous) — Activation waves

Not a scheduled phase — a standing procedure. When Jake ships an endpoint:
1. Flip its `endpoints.ts` entry `awaiting-backend → confirmed` + add path.
2. Add the `LiveEngineService` method + `applicationStore` slice (if new).
3. Add/extend the parse-or-report guard.
Widgets flip from AwaitingBackend → live with **zero structural change**.
Waves: **items** (P0-01) → catalogs/carousel/positions/watchlist ·
**consensus** (CE-1…4) → intelligence column · **history** (P2-01/02) →
charts/ledgers · **research** (R-1) · **analytics** (A-series).

---

## 7. Widget disposition master table

| Disposition | Widgets |
|---|---|
| **Restore live now** (V1 skin, real data) | ActivityFeed, PortfolioActivity, PortfolioMetrics, WalletBalanceCard, EnginePulseCard, RecommendationCard, EdgeStrengthGauge, ReasoningPipeline, ExplainabilityPanel, LiveTicker, Watchlist, SearchBar/CommandPalette (pages/actions) |
| **Restore, awaiting P0-01 items** | HeroCarousel, MarketCard grid, MarketTable, TrendingTable, Live table, market filters, Watchlist join, AllocationChart, MarketHeader |
| **Restore as premium AwaitingBackend frame** | GlobalConsensusBar (consensus half), ConsensusScoreCard, BiasBreakdown, ConfidenceEvolution, HistoricalSnapshots, ConsensusHistoryChart, MarketCharts, PerformanceCharts, TransactionHistory, Settled positions, Research suite, Analytics suites, NotificationBell |
| **Redesign (not copy)** | GlobalConsensusBar (engine reframe), EngineThesisPanel (was ThesisPanel), ExplainabilityPanel (real pipeline), EdgeStrengthGauge (was consensus gauge), AutoExecutionPanel (replaces TradingDrawer), LiveTicker (real events), RelatedMarkets, LivePauseControl |
| **Become shared primitives** | Sparkline, RadialGauge, ValueFlash, MetricStat, ProvenanceBadge, AwaitingBackend, SegmentTag, SentimentIndicator, ConfidenceMeter, ConsensusBadge, FilterBar, ViewToggle, TimeframeSelector |
| **Move to Admin (unchanged)** | HealthPanel, RuntimePanel, DiagnosticsPanel, ConfigPanel, ExecutionConsole, SurvivalConsole, EventLog, StrategyConsole pipeline |
| **Remain removed (return condition)** | mock services / `@/mock/*` (never), simulated WebSocket (P1-04), TradingDrawer/manual trade (P4-02), auth pages (P3-01), Users/KYC/Audit/MarketMgmt admin tabs (P3-03/04), profile/security/notification settings (P3-02/P1-03), DevModeIndicator/EngineChainProbe (superseded) |

---

## 8. Pre-implementation validation

- [x] Every phase lists files, widgets, data source per widget, deps, risk, effort, acceptance
- [x] Every page scored V1 vs M6 vs V3 target (§5)
- [x] Store strategy: 3 reused + 2 new justified, zero duplication (§2)
- [x] Shared primitives extracted before pages (§3, Phase 0)
- [x] Routing inversion mapped (§4)
- [x] Every widget dispositioned incl. data source / endpoint (§7)
- [x] No mock services, fake data, or duplicate stores anywhere
- [x] Admin preserves M6 truthfulness unchanged
- [x] Activation requires no structural change (§Phase 4-bis)

**Open items for user before Phase 0:**
1. Confirm literal per-page IA (this blueprint follows it) vs Plan §0's
   consolidation recommendation (Markets+Live merge, Analytics→Portfolio).
2. Jake sign-off on CE-1…4, MD-1, R-1, A-1…3.
3. ETF/Institutional/OnChain analytics — keep as awaiting frames or drop?
4. Commit the working tree (clean V2→V3 boundary before file moves).
