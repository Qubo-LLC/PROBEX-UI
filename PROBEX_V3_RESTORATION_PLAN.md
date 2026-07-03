# PROBEX V3 — Restoration Plan

**Version 1.0 · 2026-07-03 · The implementation roadmap for PROBEX Version 3**

> **Objective:** the premium prediction-intelligence experience of the original
> PROBEX (V1), powered entirely by the M0–M6 architecture (V2). Not a recreation
> of V1 — a merge: V1's layout richness and widget quality × V2's truth-first
> live data spine.
>
> Companion documents: `PROBEX_PRODUCT_SPEC.md` (V2 architecture, still
> authoritative for the data layer) · `PROBEX_DESIGN_SYSTEM.md` (visual
> language, still binding) · `INTEGRATION_CONTRACT_v1.md` (wire contracts).

---

## 0. Product North Star (final review — supersedes "recreate V1")

**V3 is not a prediction market you trade. It is an autonomous BTC trading
intelligence you observe, understand, and own.** The backend proved the user
never places a bet — the engine trades autonomously. So V3 restores V1's
*richness* but reframes its *narrative*: every page is a lens on the engine's
intelligence, not a shopping/betting surface. This is more honest (no
affordances the backend can't honor) and more premium (watching an AI trade >
another betting site).

**The synthesis.** V1's premium widgets (270° consensus gauge, intelligence-brief
carousel) were premium because they visualized *reasoning* — but the reasoning
was invented consensus. The engine's real reasoning (edge magnitude, pattern
funnel, survival-adjusted Kelly) is richer; V2 rendered it plainly. **V3 points
V1's visual vocabulary at the engine's real reasoning:** consensus gauge →
Edge-Strength gauge; hero market-brief → engine opportunity-brief; invented
"factor" explainability → the real pipeline (patterns evaluated → filtered →
threshold → sizing).

**Unifying spine — the Opportunity Lifecycle.** Every page is a stage of one
flow: Scan (Markets) → Assess (Consensus) → Decide (Strategy) → Execute
(Live/Execution) → Hold (Positions) → Resolve (Events) → Learn
(Portfolio/Analytics). Navigation follows the engine's own thought process.

### Six experience systems (what makes V3 beat both V1 and V2)

1. **Provenance grammar** — every value carries how it's known: `live` /
   `derived` / `awaiting` / `stale`. Truth-first becomes a premium data-lineage
   language (Aladdin-grade); `AwaitingBackend` is one node in it, not an apology.
2. **Focus-market context object** — selecting a market anywhere orients every
   view to it. Terminal continuity neither V1 nor V2 had. One product-UI-store
   slice; no duplication.
3. **Density tiers: glance → scan → study** — Overview breathes (30-sec read);
   Markets/Live scan; Consensus/Detail are dense study surfaces. Premium
   products modulate density; they don't max it everywhere.
4. **Liveness system** — make the 2s polling *felt*: value-change flashes,
   streaming price, a status-strip heartbeat. V1 was static mock; V3 is alive.
5. **Educational awaiting/empty states** — teach the engine while data loads;
   turn the backend gap into onboarding.
6. **Reasoning as hero content** — the engine's real "why" is the product and
   belongs front-of-house, beautifully rendered. Admin holds the *plumbing*
   (health/runtime/diagnostics/config); the *intelligence* stays consumer-facing.

### IA refinement (recommendation — for user decision, §3 shows literal fallback)

- **Markets + Live = two modes of one surface** (browse/analyze vs monitor),
  not two pages.
- **Consolidate Intelligence:** Consensus is the star; Research is thin until
  R-1; performance Analytics belongs *with* Portfolio (a book and its history
  are one story). One Intelligence hub + Portfolio-owns-performance beats V1's
  three-page sprawl.
- **Wallet folds into Portfolio in paper mode;** the full funding suite returns
  as a Wallet page when live-mode (P4-01) ships.

Net: fewer, denser, more coherent pages — richer by organization, not page
count. Every page section in §4 inherits the reframe (lens-on-intelligence),
the provenance grammar, and the density tier appropriate to its lifecycle stage.

## 0b. Source of truth for the comparison

- **Original UI (V1):** commit `0e3833a4` — the full 159-component tree is
  intact in git history. Resurrection reference: `git show 0e3833a4:src/...`.
- **Current UI (V2/M6):** working tree — 9-page cockpit, 116 files.
- **Verified inventory:** V1 pages and their widget sets were read during the
  M1–M5 migration; dispositions below are grounded in that audit, not memory.

---

## 1. Architecture Rules (non-negotiable)

**Permanent foundation (keep, build on):**
`LiveEngineService` · `applicationStore` + `ApplicationStateLoader` centralized
polling · DTO contracts + `dto.ts` adapters · parse-or-report
(`lib/mappers/parse.ts`) · truth-first philosophy (four-state contract) ·
endpoint registry (`lib/api/endpoints.ts`) · diagnostics singleton · design
system + 5 themes · `AuthGate` / Axios-interceptor auth points.

**Never restored:** mock services & `src/mock/*` (except `engine.ts` for mock
mode) · duplicate stores/hooks/mappers · the simulated WebSocket
(`RealtimeProvider`/`liveStore` — real streaming arrives as P1-04) · fake data,
fake zeros, invented metrics.

**Resurrection protocol (how V1 widgets return):** each widget's JSX/layout is
recovered from `git show 0e3833a4:<path>` as a *visual reference*, then rebuilt
as a new component wired to `applicationStore` slices, parse-or-report rows, or
the awaiting-backend state. No `@/mock/*` import may reappear. Every
data-bearing widget declares which endpoint-registry entry powers it.

---

## 2. The Availability Mechanism (V3's key new primitive)

V1 widgets were rich because mock data was infinite. V3 keeps the richness
without the lies via a **fifth data state** added to the four-state contract:

```
loading · error · empty · data · AWAITING BACKEND
```

**`AwaitingBackend` panel** (new shared component): renders the widget's frame
— real title, real description of what it will show — with a quiet,
design-system notice: *"Awaiting backend — requires GET /api/consensus/global
(CE-1)."* Optionally a static skeleton of the layout (clearly non-interactive,
never fake numbers).

**`useEndpointAvailability(entry)`** (new hook): reads the endpoint registry.
`status: 'confirmed'` + data flowing → widget renders live;
`'awaiting-backend'` → `AwaitingBackend` frame. **Activation = flipping one
registry entry + adding the service method** — the widget lights up with zero
structural change, exactly like the parse-or-report pattern already proven for
collection items.

The registry already contains 43 `awaiting-backend` entries from the V1 era —
they become live documentation instead of dead weight.

---

## 3. Information Architecture

### Primary product (main navigation)

```
DISCOVER          TRADE               INTELLIGENCE
  Overview          Portfolio           Consensus
  Markets           Positions           Research
  Live              Watchlist           Analytics
                    Wallet
(bottom)  Admin · Settings
```

Routes: `/dashboard` (Overview) · `/dashboard/markets` (+ `[marketId]` detail)
· `/dashboard/live` · `/dashboard/consensus` · `/dashboard/research` ·
`/dashboard/analytics` · `/dashboard/portfolio` · `/dashboard/positions` ·
`/dashboard/watchlist` · `/dashboard/wallet` · `/dashboard/admin` ·
`/dashboard/settings`.

### Admin Console (`/dashboard/admin`)

The V2 cockpit relocates here **unchanged in truthfulness** — a tabbed console
(V1 AdminConsole pattern: KPI strip + hash-deep-linked tabs):

| Tab | Content (today's components, moved as-is) |
|---|---|
| Health | `HealthPanel` |
| Runtime | `RuntimePanel` |
| Execution | `ExecutionConsole` (trading record, latency, retries, rate limiters, resolution) |
| Survival | `SurvivalConsole` (state machine, burn/runway, brain response) |
| Strategy Engine | `StrategyConsole`'s Decision Pipeline + Sizing Model + Hard Limits |
| Events | `EventLog` (full log w/ type filters) |
| Diagnostics | `DiagnosticsPanel` (endpoint monitoring) |
| Config | `ConfigPanel` |

Top-of-console KPI strip: engine status · mode · uptime · capital · total P&L
(all live today). The `EngineStatusStrip` stays in the global TopNavigation —
engine *pulse* is premium; engine *plumbing* moves to Admin.

Routes `/dashboard/{system,survival,execution,events,strategy}` → 302 to the
matching Admin tab (bookmarks survive).

---

## 4. Page-by-Page Plan

Format per page — **Current State → Original Version → Recommended Final
Version → Required Backend Endpoints → Priority → Complexity**.
Complexity: S (≤½ day) · M (~1 day) · L (2–3 days) · XL (3–5 days).
Priority: P1 (first wave) · P2 (second) · P3 (third).

### 4.1 Overview — `/dashboard`

- **Current:** Command Center (identity strip, attention banner, engine vitals,
  BTC price card, profit targets, component grid).
- **Original:** GlobalConsensusBar → HeroCarousel (rotating featured-market
  intelligence) → Featured Markets grid (6 MarketCards) → Trending table →
  ActivityFeed sidebar → Footer.
- **Recommended V3:** market-discovery landing restored, engine as pulse not
  plumbing. Top: **GlobalConsensusBar** (awaiting CE-1) with the live
  **AttentionBanner** folded into it (real alerts are premium). **HeroCarousel**
  restored — featured = markets carrying active edges (live join of
  markets×edges once items flow; awaiting until P0-01). **Featured grid +
  Trending table** from `/api/markets` via `parseMarketRows`. **ActivityFeed**
  restored *live* from `/api/events` via `parseEventRows` (V1 look, real
  rows). Right rail also gets a compact **Engine Pulse** micro-card (BTC price
  sparkline + capital + P&L — distilled from today's Command Center). Footer
  restored. Full Command Center vitals relocate to Admin.
- **Endpoints:** `/api/markets` items (P0-01, promised) · `/api/events` items
  (P0-01) · CE-1 global consensus · live: price-history, stats, survival,
  execution.
- **Priority:** P1 · **Complexity:** XL

### 4.2 Markets — `/dashboard/markets`

- **Current:** redirect → Live.
- **Original:** MarketsView — segment filter bar, search, sort, grid/table view
  toggle; MarketCard (probability display, consensus badge, sentiment
  indicator, confidence meter, watchlist star); MarketTable.
- **Recommended V3:** full catalog restored on `parseMarketRows` (the
  documented `EngineMarketItemDTO` already carries segment, sentiment, volume,
  liquidity, status — the V1 card renders from it directly). Client-side
  filter/search/sort over live items (marketStore-style UI state returns as
  *one* new slice in a product UI store — not a restored duplicate).
  **Edge chip** on cards showing the engine's live edge for that market (join
  via `/api/edges`) — V1 never had this; it's the V3 signature touch.
  ConsensusBadge → awaiting CE-2 (consensus map). Watchlist star → live via
  localStorage (real user data) with documented P3-02 sync endpoint.
- **Endpoints:** P0-01 markets items · `/api/edges` items (live envelope) ·
  CE-2 consensus map · P3-02 watchlist sync.
- **Priority:** P1 · **Complexity:** L

### 4.3 Market Detail — `/dashboard/markets/[marketId]`

- **Current:** redirect → Live.
- **Original:** MarketHeader, MarketCharts (probability/consensus/volume +
  timeframe), ThesisPanel, ResearchPanel, RelatedMarkets, MarketActivityFeed,
  TradingDrawer.
- **Recommended V3:** restored as a route. Header + stats from the market's
  item. Charts → awaiting MD-1 (per-market history). ThesisPanel → reframed as
  **Engine Thesis**: the live edge for this market (direction, magnitude,
  kelly size, signal, confidence — all in the edge DTO) + awaiting P4-03 for
  natural-language rationale. RelatedMarkets → derived client-side (same
  segment, truthfully labeled "same segment"). ActivityFeed → market-filtered
  events. TradingDrawer → **not restored** until P4-02; in its place an
  **Auto-Execution panel**: "the engine trades this automatically when the
  edge clears N%" with the live threshold — truthful and on-brand.
- **Endpoints:** P0-01 · MD-1 per-market history · CE-3 per-market consensus ·
  P4-03 rationale · P4-02 manual orders.
- **Priority:** P2 · **Complexity:** XL

### 4.4 Live — `/dashboard/live`

- **Current:** LiveFeedConsole (price stream, market cycle table, edge alerts)
  — real polling, already truthful.
- **Original:** LiveMarketsView — sortable all-markets table (consensus /
  probability / edge / signal columns), LiveTicker marquee, pause control,
  connection badge.
- **Recommended V3:** current console is the base (keep — it's real). Enrich to
  V1 density: full sortable market table (probability + edge + signal columns
  live from items+edges; consensus column awaiting CE-2), **LiveTicker**
  restored powered by real events (trades/edges as they happen — not the mock
  trade stream), **pause control** restored as a client-side polling pause
  (real behavior), feed badge stays (already truthful). Global stat pills:
  markets count (live), consensus/participation (awaiting CE-1).
- **Endpoints:** P0-01 items · CE-1/CE-2 · P1-04 WebSocket (upgrade path,
  not a blocker — polling is the contract today).
- **Priority:** P2 · **Complexity:** M

### 4.5 Consensus — `/dashboard/consensus`

- **Current:** redirect → Strategy.
- **Original (12 widgets — V1's crown jewels):** IntelligenceSummary,
  MarketSelector, ConsensusScoreCard, BiasBreakdown, ExplainabilityPanel,
  ConfidenceEvolution, HistoricalSnapshots, ConsensusHistory chart,
  RecommendationCard, ConsensusResearch, ConsensusPanel.
- **Recommended V3:** the intelligence flagship returns as a **two-source
  page**. Column A — **Engine Signal (live today)**: RecommendationCard driven
  by real edge recommendations, MarketSelector over live markets, an
  explainability panel powered by the real pipeline (patterns evaluated →
  filtered → threshold → sizing — the truthful "why" that V1 faked).
  Column B — **Consensus Intelligence (awaiting)**: ConsensusScoreCard,
  BiasBreakdown, ConfidenceEvolution, HistoricalSnapshots, ConsensusHistory —
  premium frames with documented CE-1…CE-4 endpoints, activating wave-by-wave.
  This is the page where "keep the widget, document the endpoint" matters most.
- **Endpoints:** CE-1 global · CE-2 map · CE-3 per-market + history ·
  CE-4 factor breakdown/explainability · live: edges, survival, markets.
- **Priority:** P2 (signature) · **Complexity:** XL

### 4.6 Research — `/dashboard/research`

- **Current:** redirect → home.
- **Original:** ResearchOverview grid, category Sidebar, Reader (markdown),
  Bookmarks, Filters, ReportCards.
- **Recommended V3:** shell restored intact (grid + sidebar + reader are pure
  layout). Content awaits R-1 (engine/LLM-generated research — the backend's
  `anthropic_api_key` slot is the intended producer). Bookmarks →
  localStorage now, P3-02 sync later. Until R-1, the page is a designed
  AwaitingBackend experience: category rails render, reader explains what
  will live here.
- **Endpoints:** R-1 research reports (list/get) · P4-03 per-edge rationale
  (feeds "engine notes") · P3-02 bookmarks sync.
- **Priority:** P3 · **Complexity:** M (shell) — content activates with R-1

### 4.7 Analytics — `/dashboard/analytics`

- **Current:** redirect → home.
- **Original:** AnalyticsOverview + six sections (Consensus, ETF,
  Institutional, Market, OnChain, Portfolio) + filters + timeframe selector.
- **Recommended V3:** layout restored with honest sequencing.
  **Portfolio analytics** activates with P2-01/P2-02 (equity curve, win rate
  history, per-trade returns — real once persistence exists).
  **Market analytics** partially live (activity from events; volume once items
  carry it). **Consensus analytics** awaits CE-4/A-1. **ETF / Institutional /
  OnChain** — restored as frames only if Jake commits to A-2/A-3 data sources;
  they carry `awaiting-backend` badges naming the dependency, and are the
  first candidates for permanent removal if the backend never plans them
  (decision point at V3-P3).
- **Endpoints:** P2-01 history · P2-02 ledger · A-1 consensus-accuracy series ·
  A-2 ETF/institutional flows · A-3 on-chain metrics.
- **Priority:** P3 · **Complexity:** L

### 4.8 Portfolio — `/dashboard/portfolio`

- **Current:** redirect → home (capital lives on Overview/Survival).
- **Original:** PortfolioMetrics (6 StatCards), Overview row (Top Exposure /
  Consensus Alignment / Performance Snapshot), Value + PnL + WinRate charts
  with timeframe selector, Allocation, Insights, ConsensusPerformance,
  Open/Settled positions embeds, PortfolioActivity.
- **Recommended V3:** V1 layout, and **most metrics go live immediately**:
  portfolio value = execution balance; unrealized P&L = positions envelope;
  realized P&L, win rate, W/L = execution status; open count = positions
  envelope. Exposure/Allocation → live once P0-01 position items flow.
  Charts (value/PnL/win-rate over time) → awaiting P2-01. Settled positions →
  awaiting P2-02. ConsensusPerformance/alignment → awaiting CE-2.
  PortfolioActivity → live from events. This page proves the V3 thesis: the
  V1 shape, filled with the engine's real money story.
- **Endpoints:** live today: execution, positions envelope, events · P0-01
  items · P2-01 history · P2-02 ledger · CE-2.
- **Priority:** P1 · **Complexity:** L

### 4.9 Positions — `/dashboard/positions`

- **Current:** PositionsConsole (live envelope vitals + guarded table +
  resolution record) — already live.
- **Original:** PositionsView — filters (segment/side/status), card/table
  toggle, detail side panel, Open + Settled tabs, consensus alignment column.
- **Recommended V3:** keep the live console as the data core; restore V1
  interaction richness on top — filters, card/table toggle, detail panel
  (opens the position's market + its edge). Settled tab → awaiting P2-02.
  Alignment column → awaiting CE-2.
- **Endpoints:** P0-01 position items · P2-02 ledger · CE-2.
- **Priority:** P2 · **Complexity:** M

### 4.10 Watchlist — `/dashboard/watchlist`

- **Current:** redirect → home.
- **Original:** WatchlistView/Table/Card, segment grouping, empty state.
- **Recommended V3:** restored on localStorage watchlist (real user data — V1
  did the same) joined against live market items; edge chip on watched
  markets ("your watched market has a live edge" is a genuinely premium
  moment). P3-02 documented for cross-device sync. Renders a designed empty
  state until markets items exist.
- **Endpoints:** P0-01 items · P3-02 sync.
- **Priority:** P3 · **Complexity:** S

### 4.11 Wallet — `/dashboard/wallet`

- **Current:** redirect → Execution.
- **Original:** WalletOverview, BalanceCard, FundingHub (deposit/withdraw/
  transfer panels, funding methods), ConnectedWallets, ConnectWalletModal,
  TransactionHistory, WalletInsights, PortfolioCrossLink.
- **Recommended V3:** restored with mode-aware truth. **BalanceCard live now**
  (execution balance + cache age + PAPER badge). PortfolioCrossLink live.
  TransactionHistory → awaiting P2-02. Funding suite (deposit/withdraw/
  connect) → collapsed behind one truthful panel in paper mode: "Paper
  account — funding operations activate in live mode (P4-01)"; the full V1
  funding UI returns when P4-01 ships. WalletInsights → awaiting P2-02.
- **Endpoints:** live: execution · P2-02 ledger · P4-01 live-mode capital ops.
- **Priority:** P3 · **Complexity:** M

### 4.12 Admin — `/dashboard/admin`

- **Current:** redirect → System.
- **Original:** AdminConsole (tabs: Users, Markets, KYC, Risk, Audit, Health).
- **Recommended V3:** the tabbed-console *pattern* returns, but the tabs are
  the **relocated V2 engine consoles** (§3 table) — zero redesign, they remain
  exactly as truthful as today. V1's Users/KYC/Audit/MarketManagement tabs
  stay removed (no identity backend); they're documented under P3-03/P3-04
  and return only with those endpoints.
- **Endpoints:** all live today · P1-01 bot control + P1-02 config write add
  action buttons later · P3-03/P3-04 for the people-ops tabs.
- **Priority:** P1 (unblocks every route move) · **Complexity:** M

### 4.13 Global chrome

- **SearchBar + CommandPalette (⌘K):** restored, indexing live markets +
  pages + actions (V1 indexed mocks). Awaiting P0-01 for market entries;
  pages/actions immediately. — P2 · M
- **NotificationBell/Center:** returns only with P1-03 alerts; until then the
  slot stays empty (documented). — P3 · S
- **EngineStatusStrip:** stays (BTC · survival · feed · mode). **UserMenu/
  RoleBadge:** stay removed until P3-01/P3-03. **Footer:** restored. —
  P1 · S

---

## 5. Widget Disposition Summary

**Restored & live immediately (real data behind V1 skin):** ActivityFeed
(events) · PortfolioMetrics (execution+positions+survival) · WalletBalanceCard
(execution) · PortfolioCrossLink · positions table interactions ·
RecommendationCard (edge recommendations) · LiveTicker (real events) ·
watchlist (localStorage) · SearchBar/CommandPalette (pages/actions).

**Restored, awaiting P0-01 items (promised):** HeroCarousel · MarketCard grid /
MarketTable · Trending · market filters/search · watchlist join · Live table.

**Restored as premium awaiting-backend frames:** GlobalConsensusBar ·
ConsensusScoreCard · BiasBreakdown · ConfidenceEvolution · HistoricalSnapshots
· ConsensusHistory · ExplainabilityPanel (consensus half) · Research suite ·
Analytics suites · portfolio charts · TransactionHistory · settled positions.

**Improved beyond V1:** MarketCard (+live edge chip) · ThesisPanel (→ Engine
Thesis from real edges) · explainability (real pipeline, not invented factors)
· Live page (real polling, honest feed status).

**Relocated to Admin (unchanged):** HealthPanel · RuntimePanel ·
DiagnosticsPanel · ConfigPanel · ExecutionConsole · SurvivalConsole ·
StrategyConsole (pipeline/sizing/limits) · EventLog · Command Center engine
vitals.

**Remain removed (with return condition):** mock services & all `@/mock/*`
data (never) · simulated WebSocket stream (P1-04 real WS) · TradingDrawer/
manual trading (P4-02) · auth pages (P3-01, rebuilt fresh) · Users/KYC/Audit/
MarketManagement admin tabs (P3-03/P3-04) · profile/security/notification
settings sections (P3-02/P1-03) · DevModeIndicator & EngineChainProbe
(superseded by DiagnosticsPanel).

---

## 6. Backend Dependency Matrix

| ID | Endpoint (proposed) | Unblocks | Priority | Status |
|---|---|---|---|---|
| P0-01 | items[] schemas for markets/positions/edges/events | Markets, Overview, Live, Positions, Watchlist, HeroCarousel, edge chips | **Critical** | Promised by Jake |
| P0-02 | market-fetcher rate-limit fix | everything above populating | **Critical** | In progress |
| CE-1 | `GET /api/consensus/global` → score, participation, bias split | GlobalConsensusBar, Live pills | **High** | New — needs Jake sign-off |
| CE-2 | `GET /api/consensus/map` → per-market scores | ConsensusBadge, alignment columns, Markets/Positions/Portfolio | **High** | New |
| CE-3 | `GET /api/consensus/{marketId}` + history | ConsensusScoreCard, ConsensusHistory, market detail | High | New |
| CE-4 | `GET /api/consensus/{marketId}/factors` | BiasBreakdown, ExplainabilityPanel, ConfidenceEvolution | Medium | New |
| MD-1 | `GET /api/markets/{id}/history` (prob/volume series) | MarketCharts, sparklines | High | New (supersedes P2-05) |
| P2-01 | `GET /api/history/pnl` | Portfolio charts, Analytics equity curve | **High** | Carried from V2 report |
| P2-02 | `GET /api/trades` ledger | TransactionHistory, Settled positions, WalletInsights, blotter | **High** | Carried |
| R-1 | `GET /api/research` (engine/LLM reports) | Research suite, ConsensusResearch | Medium | New |
| A-1 | consensus-accuracy series | ConsensusAnalytics | Medium | New |
| A-2/A-3 | ETF/institutional · on-chain feeds | ETF/Institutional/OnChain analytics | Low — confirm intent or drop frames | New |
| P1-03 | alerts + notifications | NotificationBell/Center | Medium | Carried |
| P1-04 | WebSocket stream | Live real-time upgrade, ticker push | Medium | Carried |
| P3-01 | auth (bearer minimum) | AuthGate activation, public exposure | **Critical for prod** | Carried |
| P3-02 | preferences (watchlist/bookmarks sync) | cross-device watchlist, bookmarks | Low | Carried |
| P4-01 | live-mode capital ops | Wallet funding suite | Low | Carried |
| P4-02 | manual orders | TradingDrawer | Low | Carried |
| P4-03 | `GET /api/edges/{id}/rationale` | Engine Thesis narrative, Research notes | Medium | Carried |

---

## 7. Implementation Order

**V3-P0 · Foundation (M)** — `AwaitingBackend` component +
`useEndpointAvailability` hook · Admin console shell with the eight relocated
tabs · new primary navigation + route moves/redirects · Footer + product UI
store (filters/view state, one store).
*Exit: cockpit fully relocated; primary nav shows the V3 map.*

**V3-P1 · Money & discovery (XL)** — Overview rebuild (hero, featured,
trending, activity, engine pulse) · Markets catalog + cards/table ·
Portfolio (live metrics + awaiting charts).
*Exit: the three pages users see first look like V1, powered live/awaiting.*

**V3-P2 · Intelligence & depth (XL)** — Consensus flagship (engine-signal
column live, consensus column awaiting) · Market Detail route · Positions
interaction richness · Live enrichment (table, ticker, pause) ·
SearchBar/CommandPalette.
*Exit: signature experience shipped; every discover/trade flow complete.*

**V3-P3 · Breadth (L)** — Analytics · Research shell · Watchlist · Wallet ·
decision point on ETF/OnChain frames.
*Exit: all ten primary pages routed and truthful.*

**V3-P4 · Activation waves (S each, as Jake ships)** — items wave (P0-01):
catalogs/carousel/positions fill · consensus wave (CE-1…4): intelligence
column lights up · history wave (P2-01/02): charts + ledgers · each wave =
registry flip + service method + DTO guard, zero structural change.

**V3-P5 · Premium polish (M)** — density/motion pass on restored widgets per
the design system; V3 screenshots; spec + design-system updates.

Per-phase gates: type-check + build clean · no `@/mock` imports outside
`mock/engine.ts` · every new widget bound to a registry entry · truth rules
verified in browser (live + awaiting + empty states).

---

## 8. Validation Checklist (before implementation begins)

- [x] Every V1 page compared against V2 (sections 4.1–4.13)
- [x] Every V1 widget dispositioned (restore-live / restore-awaiting /
      improve / relocate / remain-removed) — §5
- [x] No mock services, duplicate stores/hooks, or fake data anywhere in plan
- [x] Every restored widget has a named data source or a named endpoint ID
- [x] Activation path requires no structural change (registry + guards)
- [x] Admin console preserves V2 truthfulness unchanged
- [x] Backend asks consolidated into one matrix for Jake (§6)
