# PROBEX — Implementation Report · Stage 3 (Overview)

**Date:** 2026-09-09 · **Scope:** emerald collision fix, then Overview only
**Nothing committed. Nothing pushed. No packages installed. `package.json` untouched. No backend, endpoint or data-contract changes.**

Evidence: `docs/design-export/evidence/stage-3/`

---

## 0 · Result

| | |
|---|---|
| Typecheck | **pass** (exit 0) |
| Tests | **162 passed / 13 files** — unchanged |
| Build | **pass** — 22 routes; Overview 12.6 kB (was 12.8), shared JS 102 kB unchanged |
| Files changed | **11** (2 new components) |
| Horizontal overflow, all 6 viewports | **0px** (document and `<main>`) |
| Smallest rendered font, all 6 viewports | **11px** |
| Endpoint paths visible on Overview | **0** (was ~10) |
| Keyboard focus | **23/23 product controls** show a ring |
| Reduced motion | 7 animations / 34 transitions → **0 / 0** |
| Arbitrary colours · palette classes | **0 · 0** |
| Invented data, actions or controls | **none** |

---

## 1 · Pre-work — the emerald collision, and one I found next to it

Emerald declared `--probex-yes` and `--probex-positive` as the same `#10B981`: a YES position and a financial gain were the same colour, collapsing two of the four semantic bands.

**`positive` moved, not `yes`.** Emerald green *is* that theme's market signature; moving YES to a teal would have fixed the collision by deleting the theme's identity. `#22C55E` is still unmistakably a gain green and measures ΔE 24.8 from YES, 114.5 from negative, 47.4 from primary, 6.46:1 on emerald's surface.

Then I extended the audit to make **YES-vs-POSITIVE** and **NO-vs-NEGATIVE** permanent checks rather than one-off ones — and it immediately caught **the same collision in quantum**, `yes = positive = #00FF88`.

My Stage 2 candidate script had *assumed* quantum's `positive` was `#10B981` and its `negative` was `#F87171`. Both were wrong — the theme actually declares `#00FF88` and `#FF4466`. Parsing the file instead of assuming is what surfaced it. Quantum's `positive` moved to `#22C55E` on the same reasoning.

**Full audit across all six themes, nine constraint families: 0 problems.** (`evidence/stage-3/theme-audit.txt`)

---

## 2 · Files changed

```
NEW  src/components/shared/ProvenanceScope.tsx    register declaration (context)
NEW  src/components/layout/BottomNav.tsx          mobile navigation rail

     src/components/overview/OverviewPage.tsx     hierarchy + register
     src/components/overview/EngineFocusHero.tsx  Engine Focus composition
     src/components/overview/EngineAttention.tsx  position + probe-detail demotion
     src/components/overview/EngineStateBand.tsx  compact rail
     src/components/shared/ProvenanceBadge.tsx    reads the register
     src/components/layout/DashboardLayout.tsx    mounts the rail, reserves its height
     src/components/system/SystemStatusIndicator.tsx  compact status word
     src/lib/display/systemStatus.ts              shortLabel (additive)
     src/styles/probex-tokens.css                 emerald + quantum positive
```

**`MarketChart.tsx` is not in that list.** Q-5 is structurally untouched.

---

## 3 · Endpoint paths — the core objective

Overview previously rendered `LIVE · /api/price-history`, `LIVE · /api/edges`, `LIVE · /api/survival`, `LIVE · /api/positions`, `LIVE · /health · /api/stats` and more — developer vocabulary at the same weight as the figures it annotated.

**Approach: a scope, not a prop.** Threading a flag through `Panel`, `StatCard`, `ChartFrame` and every intermediate composition would have touched a dozen files and been easy to get wrong at a new call site. `ProvenanceScope` lets a route declare its register once at its own root; every badge beneath complies.

```tsx
<ProvenanceScope detail="tooltip">   // Overview
```

The claim never changes — LIVE / STALE / DEGRADED / NO FEED / SYNTHETIC are exactly as visible. The endpoint moves to the badge's `title` and its accessible name, so it is one hover or one screen-reader stop away. **Nothing is hidden; it is demoted.**

A surface that declares nothing keeps the inline endpoint, so **System and Diagnostics are correct by default** and cannot be changed by accident from elsewhere.

**Measured: 0 endpoint paths rendered as text on Overview, at all six viewports.** Provenance vocabulary now reads as single words.

### The attention band was the worse offender

It printed `Health check failing: api_access` followed by the raw probe reading `Market data stale (48182.2s old, 7 markets cached)` — in mono, on the product's most-read surface. That is System's vocabulary.

The alert stays (it is the operator's cue). The raw probe text moved to the row's `title`, and a **"System console →"** link points at where the full diagnostic belongs.

---

## 4 · Hierarchy

| | Before | After |
|---|---|---|
| 1 | Attention band | **Engine Focus hero** — chart + intelligence, the focal point |
| 2 | Hero | Attention band (only when something needs it) |
| 3 | Instrument row (`gap-3`, standard density) | **Compact rail** (`gap-2.5`, dense density) |
| 4 | Markets | Markets |

The attention band moving below the hero closes visual debt #4 — a degraded probe used to outrank the engine's own state on every load. The rail's dense padding makes its subordination structural rather than a matter of where the eye happens to land.

---

## 5 · Engine Focus

The engine's **subject** now leads. It previously sat at 13px beside an 84px gauge, so the loudest thing in the panel was a percentage and the thing the percentage was *about* came second — the panel answered "how much" before "what".

```
Bitcoin Up or Down - September 8, 5:45PM-6:00PM ET   ← 16px, reading size, first
   ◔ 45.5% EDGE      [YES]      62% confidence       ← supporting
```

The direction is now a **filled side chip** using `--probex-yes` / `--probex-no` with the per-theme `--probex-on-yes` / `--probex-on-no` ink, rather than coloured text — the same treatment a market card gives it, legible in all six themes.

The three honest states are unchanged: `EdgeFound` / `EdgeHolding` / `EdgeUnknown`. "Holding" still renders only when the engine actually answered, so an unreachable engine is never reported as deliberately standing aside.

One legibility fix: the `Detected` counter reaches seven figures and was unformatted. `1219561` → `1,219,561`.

---

## 6 · Mobile

**`BottomNav`** — a new component, five slots, below `md` only.

It does **not** replace the drawer. There are ten routes and five slots, so the drawer remains the complete index and keeps its focus trap; the rail is a shortcut to the five an operator actually moves between, plus a **More** slot that opens the drawer rather than hiding the rest behind a dead end. Nothing became unreachable and no route was invented.

- Touch targets **75×56 to 86×56px** — comfortably past 44px
- Active tab marked by colour **and** an underline rule, never colour alone
- `env(safe-area-inset-bottom)` respected; the layout reserves the rail's height so no page is covered

### The header was clipping at 375px

"ENGINE UNREACHABLE" is ~140px of tracked uppercase; the chip overlapped the session button.

Truncating would leave "ENGINE UNR…" — a status the reader has to guess at. Dropping the word for the coloured dot would make the state colour-only, which this product does not do. So each state got an explicit **short form** (`shortLabel`, a new additive field), rendered below `sm` while the full label stays above it and in the accessible name at every width.

Measured: 375px chip right edge **319/375**, 390px **334/390**, 1440px **1380/1440** — no overflow anywhere.

---

## 7 · Responsive validation

| Viewport | Overflow (doc / main) | Bottom rail | Min font | Endpoint paths |
|---|---|---|---|---|
| 1440×900 | 0 / 0 | hidden | 11px | 0 |
| 1024×768 | 0 / 0 | hidden | 11px | 0 |
| 768×1024 | 0 / 0 | hidden | 11px | 0 |
| 430×932 | 0 / 0 | **shown**, 86×56 | 11px | 0 |
| 390×844 | 0 / 0 | **shown**, 78×56 | 11px | 0 |
| 375×667 | 0 / 0 | **shown**, 75×56 | 11px | 0 |

---

## 8 · What was reused, changed, retired

**Reused unchanged:** `MarketChart` · `RadialGauge` · `ValueFlash` · `Panel` / `Focal` / `Meter` / `RowGroup` · `FreshnessIndicator` · `StatusChip` · `FeaturedMarkets` · `TrendingMarkets` · `HotMarkets` · `GlobalConsensusBar` · `useCommandCenter` · `useMarketSeries` · `useEnginePriceChart` · `useSystemStatus` · `parseMarketRows` · `parseEdgeRows` · `selectPerformanceSource` · `selectExposureSource`.

**Modified (composition only, no rewrites):** `OverviewPage` (order + register) · `EngineFocusHero` (`EdgeFound` composition) · `EngineAttention` (position, link, detail demotion) · `EngineStateBand` (density + gap) · `ProvenanceBadge` (reads the register) · `SystemStatusIndicator` (short form) · `DashboardLayout` (mounts the rail).

**New:** `ProvenanceScope`, `BottomNav`.

**Retired:** nothing. No hook, endpoint, data contract or state-machine was touched.

---

## 9 · Data truth

- **No new fields, no new endpoints, no new fetches.** Every figure on the page was already arriving in the store.
- Market cards show only real fields — identity, `asset_category` tag, YES side, cent price. **No Open Interest, Spread, Volume, Kelly EV, intervals or 24H metrics.**
- **No `Stake` or any order control** — grepped: 0 occurrences in `src/components/overview/`.
- `—` for withheld values is unchanged.
- Targets still come from `/api/survival` with `preferencesStore` as the single display-only override. **No new hardcoded goals.**
- The `OFFLINE` captures show the state rendering honestly: "No signal report / The engine did not answer", em dashes throughout, nothing fabricated.

---

## 10 · Accessibility

| Check | Result |
|---|---|
| Keyboard focus | **23/23 product controls** show a visible ring |
| Colour-only meaning | 10 status/provenance elements, **0** carrying no word |
| Minimum font | 11px at every viewport |
| Touch targets (rail) | 56px tall — past the 44px comfort threshold |
| Reduced motion | 7 animations / 34 transitions → **0 / 0** |

> **A correction to my own method.** My first focus probe used `el.focus()` and reported 2/20 — which would have been a serious finding. It was a measurement artifact: `:focus-visible` is only set when focus arrives from the *keyboard*, and script-initiated focus does not set it. Re-run with real `Input.dispatchKeyEvent` Tab traversal, the true figure is 23/29 stops — and all six without a ring are `NEXTJS-PORTAL`, the Next.js dev overlay, not product UI. This is the second probe-not-app error in this project (the first was reduced motion in Stage 0–1); both were caught by sanity-checking a surprising result rather than reporting it.

---

## 11 · Evidence

`docs/design-export/evidence/stage-3/`

| | |
|---|---|
| Before/after desktop | `BEFORE-overview-desktop-1440.png` · `after-overview-desktop-1440.png` |
| Before/after mobile | `BEFORE-overview-mobile-375.png` / `-390` · `after-overview-mobile-375.png` / `-390` |
| Before/after tablet | `BEFORE-overview-tablet-768.png` · `after-overview-tablet-768.png` |
| All six viewports | `after-overview-{desktop-1440,tablet-1024,tablet-768,mobile-430,mobile-390,mobile-375}.png` + `-scroll1` |
| Primary chart + Engine Focus | `after-hero-and-engine-focus.png` |
| Metric rail | `after-metric-rail.png` |
| Attention band | `after-attention-band.png` |
| Market/event section | `after-markets-section.png` |
| Header at every width | `after-header-{desktop-1440,mobile-390,mobile-375}.png` |
| Offline state | `OFFLINE-overview-desktop-1440.png` · `OFFLINE-overview-mobile-375.png` |
| Theme audit | `theme-audit.txt` |

Every `after-overview-*` capture **asserted `runtime.mode === 'live'` before saving** — the harness refuses to write a mislabelled screenshot.

---

## 12 · Remaining concerns

| # | Item | Status |
|---|---|---|
| **S3-1** | **The engine became unstable during final validation** — `/api/health` went 0.7s → 7.5s → 24s → **502**. The six LIVE captures were taken while it was healthy; the last Q-5 re-confirmation on the redesigned hero could not be re-run. Q-5 was verified in Stage 2 by pixel-diffing the price-axis canvas, and `MarketChart.tsx` is not among the 11 files changed — so it is structurally intact, but **the re-confirmation is owed once the backend is stable**. | **Honest gap** |
| **S3-2** | The engine's ~7.5s cold-connection latency exceeds the frontend's 5s probe budget, so local dev resolves OFFLINE on a cold start. That is the fail-safe working correctly. **It is a backend performance item**, and belongs in the handoff to Jake. | Backend |
| **S3-3** | The attention band lists **"Survival state: Thriving"** as needing attention — a healthy state flagged as a warning. Pre-existing, in `lib/mappers/overview`, not touched here. | Pre-existing |
| **S3-4** | Only Overview declares `detail="tooltip"`. Live Feed, Markets, Positions, Portfolio, Execution, Strategy and Analytics still print endpoint paths. That is correct for Stage 3's scope; they flip when their stages run. | By design |
| **S3-5** | The lightweight-charts price axis renders 2 decimals (`78514.30`), which is noisy at $78k and costs ~130px on a 375px screen. Not touched — changing price precision is a chart-behaviour decision, not an Overview one. | Deferred |
| **S3-6** | The Next.js dev overlay badge overlaps the bottom rail's first tab in dev captures. Dev-only, absent from production builds. | Not product |
| **S3-7** | The Engine Focus column has vertical dead space between the side chip and the signal ledger at desktop, because the block is vertically centred in a taller column. Cosmetic. | Minor |

---

## 13 · Environment

Your dev server on :3000 was stopped for each `.next` rebuild and **restarted afterwards** — it is running.

---

## 14 · Stopping here

**No other route was touched.** Live Feed, Markets, Market Detail, Positions, Portfolio, Execution, Strategy, Analytics, System and Settings are unchanged apart from what the token layer and the shared `ProvenanceBadge`/`SystemStatusIndicator` changes give every surface — and both of those default to the previous behaviour outside a declared scope.

Awaiting your review before Stage 4.
