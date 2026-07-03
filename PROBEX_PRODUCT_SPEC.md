# PROBEX Product Specification

**Version 1.0 · 2026-07-02 · Canonical reference for all future development**

> Supersedes `INTEGRATION_CONTRACT_v1.md` as the primary product document.
> The integration contract remains valid for wire-schema details it defines.

---

## 1. Product Vision

**PROBEX is the operational cockpit for the PROBEX Quant Engine** — a fully
autonomous quantitative trading bot ("BTC 5-Minute Trading Bot", v1.0.0) that
detects mispricings in Polymarket 5-minute Bitcoin markets, sizes positions
with fractional Kelly, and protects its bankroll with a survival state machine.

**The backend defines the product.** The frontend exists to let a single
operator observe, understand, and (eventually) steer the engine. Every screen
must answer an operator question:

- *Is my bot alive?* → Overview, System
- *Is my capital safe?* → Survival
- *Why is the engine trading (or not trading)?* → Strategy
- *How well is it executing?* → Execution
- *What is it holding?* → Positions
- *What happened while I was away?* → Events

The original prediction-market UI (markets catalog, consensus engine, research,
wallet, multi-user admin) was a prototype. It is a **reference implementation**,
not a specification. Git history is its archive.

### Flagship priorities

1. **Strategy** (`/dashboard/strategy`) — the signature experience. The
   intelligence center that explains the engine's decisions: edges found,
   patterns evaluated vs. filtered, live Kelly sizing, edge thresholds,
   strategy health and confidence. Long-term: natural-language trade rationale.
2. **System** (`/dashboard/system`) — a professional operational console:
   health, runtime components, configuration, execution quality, latency,
   retries, rate limiting, endpoint diagnostics.

---

## 2. Backend Contract (verified 2026-07-02 against live captures)

Base: `http://<host>:8000` · API base: `http://<host>:8000/api`
Registry: `src/lib/api/endpoints.ts` (single source of truth for paths).

| Endpoint | Method | Payload status | Feeds |
|---|---|---|---|
| `/` | GET | ✅ Rich | Identity: bot name, version, mode, components |
| `/health` | GET | ✅ Rich (⚠ ~5s server-side check) | System health panel |
| `/api/stats` | GET | ✅ Rich | Overview command center (aggregate) |
| `/api/runtime` | GET | ✅ Rich (⚠ stats seeded — see §6.2) | System, identity strip |
| `/api/survival` | GET | ✅ Rich | Survival page, risk chip, Strategy params |
| `/api/execution/status` | GET | ✅ Rich | Execution page (source of trading truth) |
| `/api/price-history` | GET | ✅ Rich (sub-minute buffer only) | Price sparkline/ticker |
| `/api/config` | GET | ✅ Rich (read-only) | System → Config |
| `/api/markets` | GET | ⚪ Envelope only (fetcher fix pending — Jake) | Market Scanner |
| `/api/positions` | GET | ⚪ Envelope only (`total_unrealized_pnl` live) | Positions |
| `/api/edges` | GET | ⚪ Envelope only | Strategy edge table |
| `/api/events` | GET | ⚪ Envelope only (`types` filter exists) | Events log |
| `/api/update-stats` | POST | ✅ Works — **frontend must never call it** | (backend internal) |

**Notes**
- `/health` and `/` live at the **host root**, outside `/api` — use `apiGetHost()`.
- All collection item schemas (`markets[]`, `positions[]`, `edges[]`,
  `events[]`, `patterns_summary[]`) are **unobserved**. DTOs proposed by the
  frontend (`src/lib/mappers/*.ts`) are *proposals awaiting confirmation*, not
  contracts. Do not build final row rendering against them without a captured
  sample.
- Everything is **in-memory**: a bot restart erases stats, events, and price
  history. No endpoint returns data older than the current process.

---

## 3. Information Architecture & Navigation

Eight routes in three sidebar sections, plus Settings:

```
OPERATE
  Overview    /dashboard            Command center (stats aggregate + price)
  Live Feed   /dashboard/live       Real-time price, current cycle, edges
TRADING
  Strategy    /dashboard/strategy   ★ Flagship — edges, patterns, sizing
  Positions   /dashboard/positions  Active positions + resolution outcomes
  Execution   /dashboard/execution  Latency, retries, rate limits, record
ENGINE
  Survival    /dashboard/survival   Capital state machine, runway, targets
  Events      /dashboard/events     Typed engine event log
  System      /dashboard/system     Health · Components · Config · Diagnostics
(footer)
  Settings    /dashboard/settings   Appearance · Accessibility · About
```

**Persistent status strip** (TopNavigation): BTC price · survival state chip ·
feed status dot · mode badge (`PAPER` / `LIVE`). The mode badge is
safety-critical — the operator must always know whether real money is moving.

**Removed from shell:** SearchBar, NotificationBell/Center, UserMenu, RoleBadge,
ActivityDrawer, TradingDrawer (no backend counterpart; see roadmap for return
conditions).

### Terminology (binding)

| Legacy term | Use instead |
|---|---|
| Consensus Engine / Score | Strategy Layer / Edge Strength |
| Prediction intelligence | Strategy intelligence |
| Portfolio | Capital / Bankroll |
| Activity feed | Event log |
| Connection status (mock WS) | Feed status (`feed_connected`, `feed_latency_ms`) |
| Admin | System |
| Risk (admin tab) | Survival |

---

## 4. Page Responsibilities & API Mappings

| Page | Primary endpoints | Key elements |
|---|---|---|
| **Overview** | `/api/stats`, `/api/price-history`, `/` | Identity strip · BTC price + sparkline · capital & PnL (execution-sourced) · survival chip · target progress · component summary · feed status · active position/edge counts |
| **Live Feed** | `/api/price-history` (fast), `/api/markets`, `/api/edges` | Streaming price · current 5-min cycle · edge alerts · feed latency |
| **Strategy ★** | `/api/edges`, `/api/survival`, `/api/config` | Edge table · pattern funnel (`total_patterns → filtered_patterns`) · `kelly_modifier`, `min_edge_threshold`, `kelly_fraction`, `min_edge` · `patterns_summary` · strategy health narrative |
| **Positions** | `/api/positions`, `/api/execution/status` (resolution_stats) | Active positions table · envelope `total_unrealized_pnl` · resolved/auto-closed counts |
| **Execution** | `/api/execution/status` | Trading record (trades, W/L, win rate, PnL, balance) · execution latency (avg/fastest/slowest) · retry breakdown · rate-limiter buckets · backoff state · resolution tracker |
| **Survival** | `/api/survival`, `/api/runtime` | State machine visual · capital gauge · burn/runway · daily/weekly target progress · recovery trades · behind-target |
| **Events** | `/api/events` | Typed log, client filters via `types` |
| **System** | `/health`, `/api/runtime`, `/api/config`, diagnostics singleton | Health components (per-component, never one red banner) · runtime component matrix · read-only config · endpoint diagnostics (promoted EngineChainProbe) |
| **Settings** | — (local) | Appearance · Accessibility · About. **Future integration hub**: Notification Prefs, Alert Rules, API Keys, Trading Prefs, Strategy Params, Profiles — each returns when its backend lands (see §7) |

---

## 5. Data Architecture & Polling Strategy

**Single-fetch principle:** `ApplicationStateLoader` (mounted once in
`DashboardLayout`) is the ONLY component that calls raw `useEngine*` fetch
hooks. It syncs every result into `applicationStore` (Zustand). All pages read
via presentation hooks — zero duplicate HTTP.

**Polling tiers** (backend advertises `dashboard_update_interval_ms: 500`;
we poll conservatively to respect the engine's own rate limiters):

| Tier | Interval | Endpoints | Rationale |
|---|---|---|---|
| Fast | 2 000 ms | `stats`, `price-history` | Live price + cockpit vitals |
| Medium | 5 000 ms | `survival`, `edges`, `positions`, `markets`, `events`, `execution/status` | Operational state; 5-min market cadence |
| Slow | 30 000 ms | `runtime`, `health`, `config` | `/health` takes ~5s server-side; config rarely changes |
| Static | On load | `/` identity | Changes only on restart |

Polling pauses when the tab is hidden (`document.hidden`). Poll refreshes never
reset UI to loading — data updates in place; errors surface truthfully.

**Layer flow:** `endpoints.ts` → `client.ts` (Axios + diagnostics) →
`LiveEngineService` (DTO → domain via `dto.ts`) → `applicationStore` →
presentation hooks (`useServices.ts`) → mappers (`src/lib/mappers/`) → pages.

---

## 6. Implementation Principles

### 6.1 Truth before aesthetics
- **Never fabricate data. Never display fake zeros as measurements.**
- Empty collections render designed empty states ("Engine is scanning — no
  qualifying markets this cycle"), never placeholder rows.
- Missing data hides the element; it does not render `0` or `–` as if measured.
- Health renders per-component; a single degraded probe must not paint the
  whole app red.

### 6.2 Source of trading truth
`runtime.stats` was seeded via `POST /api/update-stats` with test data
(edges=14, orders=3, pnl=3.15 — matching the Postman example) while
`/api/execution/status` shows `total_trades: 0`. **Until the backend reconciles
these, all trading statistics (trades, W/L, PnL, balance) come from
`/api/execution/status`.** `runtime.stats` may be displayed only as
"reported runtime counters" in System diagnostics.

### 6.3 Authentication-readiness
The API is currently unauthenticated (single-operator mode). The app must be
structured so auth can be added with minimal change:
- All cockpit routes live under `/dashboard/*` behind one layout — the future
  guard point (`AuthGate` wraps `DashboardLayout`; today it passes through).
- The Axios request interceptor in `src/lib/api/client.ts` is the single place
  to attach an `Authorization` header.
- No component may assume "no user exists" in a way that hard-codes it —
  identity flows through one provider.

### 6.4 Legacy feature policy
Classification: **ACTIVE** (in product) · **DEPRECATED** (out of nav, may
return) · **ARCHIVED** (needs backend that doesn't exist) · **FUTURE**
(long-term roadmap). Obsolete product features are **deleted** — Git history is
the archive. Generic reusable pieces (UI primitives, chart patterns, table
mechanics) are migrated into shared modules instead of dying with their pages.

### 6.5 Engineering standards
Strict TypeScript (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`) ·
all colors via CSS variables (5-theme system) · mappers are pure functions and
the only DTO→ViewModel translation point · `ServiceState<T>` drives all four UI
states (loading/success/empty/error) · build and type-check must stay clean at
every milestone.

---

## 7. Roadmap

### Frontend milestones
- **M0 Foundation** — execution-status + identity integration, polling tiers ✅
- **M1 Command Center** — new Overview ✅ (`src/components/overview/`,
  `src/lib/mappers/overview.ts`, `useCommandCenter()`; verified against the
  live engine 2026-07-02)
- **M2 Shell & IA cutover** ✅ — Operate/Trading/Engine sidebar,
  `EngineStatusStrip` top nav (BTC · survival · feed · mode), `AuthGate`
  pass-through guard, 5 new cockpit routes seeded with live data
  (`/strategy`, `/execution`, `/survival`, `/events`, `/system`), 9 legacy
  routes 302-redirected (removed in M5); search/notifications/profile chrome
  removed (return with P1 alerts / P3 auth)
- **M3 System + Survival + Execution consoles** ✅ — Survival: state-machine
  strip, capital/burn/runway vitals, brain-response card; Execution: trading
  record, latency (post-first-trade), retry reliability, rate-limiter gauges
  with saturation colouring, resolution tracker; System: native HealthPanel /
  RuntimePanel / ConfigPanel + production DiagnosticsPanel (diagnostics
  singleton now records per-endpoint status/latency/error-rate on every
  request, always-on — EngineChainProbe/DevModeIndicator retired). Shared
  modules extracted: `src/lib/display/engine.ts`,
  `src/components/shared/TargetProgress.tsx`
- **M4 Strategy + Live Feed + Events + Positions** ✅ — Strategy flagship
  (five-stage Decision Pipeline SCAN→DETECT→FILTER→SIZE→EXECUTE with live
  gate values, sizing-model equation, hard-limits card, edge table);
  LiveFeedConsole replaces the simulated-WebSocket page (RealtimeProvider
  unmounted app-wide — real polling only); PositionsConsole (envelope vitals
  + resolution record + honest P2-02 ledger note); EventLog (typed rows,
  data-derived type filter). **Parse-or-report pattern**
  (`src/lib/mappers/parse.ts`): collection items are runtime-validated
  against the proposed DTOs — matching items render automatically the moment
  the backend ships them; non-matching items yield a truthful
  "format not recognized (P0-01)" notice, never guessed fields. Shared:
  `EdgeTable`, `PriceCard` moved to `components/shared/`
- **M5 Product Consolidation** ✅ — 240 files / ~32k LOC removed (src tree
  353→116 files). Service registry collapsed 11 domains → engine-only
  (`interfaces`/`mock`/`live`/`index`/`dto`/`useServices` all engine-only).
  Deleted: 15 legacy component trees, mock stream + realtime lib, web3 lib,
  consensus lib, 8 domain stores, 6 dead hooks, all mock data except
  `engine.ts`, 11 orphan type files, dead barrels, auth routes. Settings
  trimmed to Appearance/Accessibility/About. Shared primitive extracted:
  `components/shared/DataTable.tsx` (TableShell/Thead/Th/Tr/Td) — now backs
  EdgeTable, Live Feed, Positions. Surviving stores: theme, sidebar,
  applicationStore
- **M6 Institutional Quality** ✅ — derived tone-border tokens via `color-mix`
  (last hardcoded rgba removed; verified in Midnight + Institutional light);
  signed P&L convention (`formatSignedCurrency`) across all consoles;
  labelled loading skeletons (zero layout shift); table row hover on the
  shared primitive; `fade-in-up` page enter on all nine roots
  (reduced-motion safe); SettingsView on PageHeader; orphaned chrome deleted
  (ThemeSwitcher, useKeyboardShortcut, QueryProvider/react-query unmounted).
  Visual language codified in **PROBEX_DESIGN_SYSTEM.md** (canonical).
  Note: hooks now live at `src/config/hooks/` (`@/hooks/*` alias re-pointed)

### Backend dependencies (abridged — full report in Phase 3 deliverable)
- **P0 (Critical):** collection item schemas · market fetcher fix (in progress)
  · runtime-stats integrity
- **P1 (High):** bot control (`POST /api/control`) · config mutation
  (`PATCH /api/config`) · alert rules + notifications (`/api/alerts`) ·
  WebSocket/SSE (`WS /ws`)
- **P2:** historical persistence (`/api/history/pnl`) · trade ledger
  (`/api/trades`) · OHLC candles · event retention/pagination
- **P3:** authentication (bearer token minimum — **the API is currently open
  on 0.0.0.0**) · preferences persistence · profiles/roles · audit history
- **P4 (Future):** live-mode capital ops · manual trade override · LLM trade
  rationale (`/api/edges/{id}/rationale`) · strategy presets

### Settings integration hub — return conditions
| Section | Returns when |
|---|---|
| Notification Preferences / Alert Rules | P1 alerts API |
| API Keys | P3 auth |
| Trading Preferences / Strategy Parameters | P1 config mutation |
| Profiles / User Preferences | P3 identity + preferences |
| Integrations (Telegram, webhooks) | P1 alerts channels |
